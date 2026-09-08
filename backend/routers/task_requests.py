from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user

from models import User
from schemas import (
    TaskRequestCreate,
    TaskRequestResponse,
)

from services import task_request_service


router = APIRouter(
    prefix="/task-requests",
    tags=["Task Requests"],
)


@router.post(
    "",
    response_model=TaskRequestResponse,
    status_code=201,
)
def create_new_task_request(
    request_data: TaskRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ensure a room_id is sent in the body, although schemas.py might allow None.
    # The service layer will reject it anyway.
    return task_request_service.create_task_request(
        request_data=request_data,
        current_user=current_user,
        db=db,
    )


@router.get(
    "",
    response_model=list[TaskRequestResponse],
)
def get_all_task_requests(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_request_service.get_task_requests(
        db=db,
        current_user=current_user,
        room_id=room_id,
    )


@router.post(
    "/{request_id}/approve",
    response_model=TaskRequestResponse,
)
def approve_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_request_service.approve_task_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
    )


@router.post(
    "/{request_id}/reject",
    response_model=TaskRequestResponse,
)
def reject_request(
    request_id: int,
    review_comment: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_request_service.reject_task_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        review_comment=review_comment,
    )