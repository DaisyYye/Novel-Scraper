from fastapi import APIRouter, Depends

from backend.api.deps import get_current_user
from backend.models import User
from backend.schemas.auth import CurrentUserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=CurrentUserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(user=current_user)
