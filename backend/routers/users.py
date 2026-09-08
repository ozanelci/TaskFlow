from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import UserResponse, UserUpdate
from services import user_service

router = APIRouter()


@router.get(
    "/users",
    response_model=list[UserResponse]
)
def get_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # TODO: This global endpoint is unsafe in the new room-based architecture.
    # It must be refactored to only return users sharing a room with current_user.
    from exceptions import InvalidRequestError
    raise InvalidRequestError("Global user listing is pending room-context refactor.")


@router.get(
    "/users/{user_id}",
    response_model=UserResponse
)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_service.get_user(
        db=db,
        user_id=user_id,
        current_user=current_user
    )


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse
)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_service.update_user(
        db=db,
        user_id=user_id,
        user_data=user_data,
        current_user=current_user
    )


@router.delete(
    "/users/{user_id}"
)
def delete_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.id != user_id:
        from exceptions import ForbiddenError
        raise ForbiddenError()

    return user_service.delete_user(
        db=db,
        user_id=user_id
    )