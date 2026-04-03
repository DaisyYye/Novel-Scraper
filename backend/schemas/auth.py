from datetime import datetime
from typing import Literal

from backend.schemas.common import APIModel

UserRole = Literal["admin", "reader"]


class CurrentUserData(APIModel):
    id: int
    clerk_user_id: str
    email: str
    role: UserRole
    created_at: datetime
    updated_at: datetime


class CurrentUserResponse(APIModel):
    user: CurrentUserData
