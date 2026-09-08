from datetime import datetime

from sqlalchemy.orm import Session

from models import (
    TaskRequest,
    Task,
    User,
    Room,
    RoomMembership,
)
from schemas import TaskRequestCreate
from exceptions import (
    ForbiddenError,
    InvalidRequestError,
    TaskNotFound,
    RoomNotFound,
)
from dependencies import check_room_admin, check_room_user_or_admin


def create_task_request(
    request_data: TaskRequestCreate,
    current_user: User,
    db: Session,
):
    if request_data.room_id is None:
        raise InvalidRequestError("Kişisel görev için görev talebi oluşturamazsınız.")

    membership = check_room_user_or_admin(db, current_user.id, request_data.room_id)
    
    if membership.role == "ADMIN":
        raise ForbiddenError()

    request = TaskRequest(
        title=request_data.title,
        description=request_data.description,
        priority=request_data.priority.value if hasattr(request_data.priority, 'value') else request_data.priority,
        status="PENDING",
        requested_by=current_user.id,
        room_id=request_data.room_id,
        due_date=request_data.due_date,
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def get_task_requests(
    db: Session,
    current_user: User,
    room_id: int,
):
    if room_id is None:
        raise InvalidRequestError("room_id zorunludur.")

    membership = check_room_user_or_admin(db, current_user.id, room_id)

    query = db.query(TaskRequest).filter(TaskRequest.room_id == room_id)

    if membership.role == "USER":
        query = query.filter(TaskRequest.requested_by == current_user.id)

    requests = query.order_by(TaskRequest.created_at.desc()).all()

    result = []
    
    room = db.query(Room).filter(Room.id == room_id).first()

    for request in requests:
        user = db.query(User).filter(User.id == request.requested_by).first()

        result.append(
            {
                "id": request.id,
                "title": request.title,
                "description": request.description,
                "priority": request.priority,
                "status": request.status,
                "requested_by": request.requested_by,
                "room_id": request.room_id,
                "room_name": room.name if room else None,
                "full_name": user.full_name if user else None,
                "email": user.email if user else None,
                "reviewed_by": request.reviewed_by,
                "reviewed_at": request.reviewed_at,
                "review_comment": request.review_comment,
                "due_date": request.due_date,
                "created_at": request.created_at,
            }
        )

    return result


def approve_task_request(
    db: Session,
    request_id: int,
    current_user: User,
):
    task_request = (
        db.query(TaskRequest)
        .filter(TaskRequest.id == request_id)
        .first()
    )

    if not task_request:
        raise TaskNotFound()

    if task_request.room_id is None:
        raise InvalidRequestError("Geçersiz talep.")

    if task_request.status != "PENDING":
        raise InvalidRequestError("Bu görev talebi zaten değerlendirilmiş.")

    check_room_admin(db, current_user.id, task_request.room_id)

    requester_membership = check_room_user_or_admin(db, task_request.requested_by, task_request.room_id)

    new_task = Task(
        title=task_request.title,
        description=task_request.description,
        status="TODO",
        priority=task_request.priority,
        assigned_to=task_request.requested_by,
        created_by=current_user.id,
        due_date=task_request.due_date,
        room_id=task_request.room_id,
    )

    db.add(new_task)

    task_request.status = "APPROVED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(task_request)

    return task_request


def reject_task_request(
    db: Session,
    request_id: int,
    current_user: User,
    review_comment: str | None = None,
):
    task_request = (
        db.query(TaskRequest)
        .filter(TaskRequest.id == request_id)
        .first()
    )

    if not task_request:
        raise TaskNotFound()

    if task_request.room_id is None:
        raise InvalidRequestError("Geçersiz talep.")

    if task_request.status != "PENDING":
        raise InvalidRequestError("Bu görev talebi zaten değerlendirilmiş.")

    check_room_admin(db, current_user.id, task_request.room_id)

    task_request.status = "REJECTED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.utcnow()
    task_request.review_comment = review_comment

    db.commit()
    db.refresh(task_request)

    return task_request