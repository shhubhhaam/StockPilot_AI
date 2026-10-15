from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from apps.api.app.core.database import get_db
from apps.api.app.core.security import get_password_hash
from apps.api.app.models.user import User
from apps.api.app.schemas.auth import UserResponse, UserUpdate
from apps.api.app.auth.deps import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.patch("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user_update.display_name is not None:
        current_user.display_name = user_update.display_name
    if user_update.password is not None:
        current_user.password_hash = get_password_hash(user_update.password)

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
