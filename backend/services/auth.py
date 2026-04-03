from __future__ import annotations

from dataclasses import dataclass

import jwt
import requests
from fastapi import HTTPException, status
from jwt import InvalidTokenError, PyJWKClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.models import User


@dataclass
class AuthenticatedPrincipal:
    clerk_user_id: str
    email: str


class ClerkTokenVerifier:
    def __init__(self) -> None:
        self._jwks_client: PyJWKClient | None = None

    def verify_session_token(self, token: str) -> AuthenticatedPrincipal:
        if not settings.clerk_jwks_url or not settings.clerk_issuer:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Clerk authentication is not configured on the backend.",
            )

        try:
            signing_key = self._get_jwks_client().get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                issuer=settings.clerk_issuer,
                audience=settings.clerk_audience,
                options={
                    "require": ["exp", "iat", "iss", "sub"],
                    "verify_aud": settings.clerk_audience is not None,
                },
            )
        except InvalidTokenError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
            ) from exc

        clerk_user_id = payload.get("sub")
        if not isinstance(clerk_user_id, str) or not clerk_user_id.strip():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token is missing a subject.",
            )

        email = payload.get("email")
        if not isinstance(email, str) or not email.strip():
            email = self._fetch_email_from_clerk(clerk_user_id)

        return AuthenticatedPrincipal(
            clerk_user_id=clerk_user_id,
            email=email.strip().lower(),
        )

    def _get_jwks_client(self) -> PyJWKClient:
        if self._jwks_client is None:
            self._jwks_client = PyJWKClient(settings.clerk_jwks_url)
        return self._jwks_client

    def _fetch_email_from_clerk(self, clerk_user_id: str) -> str:
        if not settings.clerk_secret_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="CLERK_SECRET_KEY is required to resolve user emails.",
            )

        try:
            response = requests.get(
                f"https://api.clerk.com/v1/users/{clerk_user_id}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"},
                timeout=10,
            )
        except requests.RequestException as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to contact Clerk to load the authenticated user.",
            ) from exc

        if response.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to load the authenticated Clerk user.",
            )

        payload = response.json()
        email_addresses = payload.get("email_addresses") or []
        primary_email_address_id = payload.get("primary_email_address_id")

        for email_entry in email_addresses:
            if email_entry.get("id") == primary_email_address_id and email_entry.get("email_address"):
                return str(email_entry["email_address"])

        for email_entry in email_addresses:
            email_address = email_entry.get("email_address")
            if email_address:
                return str(email_address)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The authenticated Clerk user does not have an email address.",
        )


token_verifier = ClerkTokenVerifier()


def sync_user_from_principal(db: Session, principal: AuthenticatedPrincipal) -> User:
    user = db.scalar(select(User).where(User.clerk_user_id == principal.clerk_user_id))
    expected_role = "admin" if settings.admin_email and principal.email == settings.admin_email else "reader"

    if user is None:
        user = User(
            clerk_user_id=principal.clerk_user_id,
            email=principal.email,
            role=expected_role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    changed = False
    if user.email != principal.email:
        user.email = principal.email
        changed = True
    if user.role != expected_role:
        user.role = expected_role
        changed = True

    if changed:
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
