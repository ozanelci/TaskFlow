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


def create_task_request(
    request_data: TaskRequestCreate,
    current_user: User,
    db: Session,
):
    # Kişisel görev talebi
    if request_data.room_id is None:
        request = TaskRequest(
            title=request_data.title,
            description=request_data.description,
            priority=request_data.priority,
            created_by=current_user.id,
            room_id=None,
        )

        db.add(request)
        db.commit()
        db.refresh(request)

        return request

    # Oda talebi
    room = (
        db.query(Room)
        .filter(Room.id == request_data.room_id)
        .first()
    )

    if not room:
        raise RoomNotFound()

    # Kullanıcının bu odada onaylı üye olması gerekir.
    membership = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.room_id == room.id,
            RoomMembership.user_id == current_user.id,
            RoomMembership.status == "APPROVED",
        )
        .first()
    )

    if not membership:
        raise ForbiddenError()

    request = TaskRequest(
        title=request_data.title,
        description=request_data.description,
        priority=request_data.priority,
        created_by=current_user.id,
        room_id=room.id,
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def get_task_requests(
    db: Session,
    current_user: User,
):
    query = db.query(TaskRequest)

    if current_user.role == "USER":
        query = query.filter(
            TaskRequest.created_by == current_user.id
        )

    elif current_user.role == "ADMIN":
        # ADMIN sadece kendi odalarına ait
        # talepleri ve kendi oluşturduğu kişisel
        # talepleri görebilir.

        owned_room_ids = (
            db.query(Room.id)
            .filter(
                Room.created_by == current_user.id
            )
            .subquery()
        )

        query = query.filter(
            (TaskRequest.created_by == current_user.id)
            | (
                TaskRequest.room_id.in_(
                    owned_room_ids
                )
            )
        )

    return query.order_by(
        TaskRequest.created_at.desc()
    ).all()


def approve_task_request(
    db: Session,
    request_id: int,
    current_user: User,
):
    if current_user.role != "ADMIN":
        raise ForbiddenError()

    task_request = (
        db.query(TaskRequest)
        .filter(TaskRequest.id == request_id)
        .first()
    )

    if not task_request:
        raise TaskNotFound()

    if task_request.status != "PENDING":
        raise InvalidRequestError(
            "Bu görev talebi zaten değerlendirilmiş."
        )

    # Oda görevi ise:
    # Talebin ait olduğu oda bu ADMIN'in odası olmalı.
    if task_request.room_id is not None:
        room = (
            db.query(Room)
            .filter(
                Room.id == task_request.room_id,
                Room.created_by == current_user.id,
            )
            .first()
        )

        if not room:
            raise ForbiddenError()

        # Talebi oluşturan kullanıcı hâlâ
        # odanın APPROVED üyesi olmalı.
        membership = (
            db.query(RoomMembership)
            .filter(
                RoomMembership.room_id == room.id,
                RoomMembership.user_id
                == task_request.created_by,
                RoomMembership.status == "APPROVED",
            )
            .first()
        )

        if not membership:
            raise ForbiddenError()

    # Kişisel talepte ise ADMIN yalnızca
    # kendi oluşturduğu talebi onaylayabilir.
    elif task_request.created_by != current_user.id:
        raise ForbiddenError()

    new_task = Task(
        title=task_request.title,
        description=task_request.description,
        status="TODO",
        priority=task_request.priority,
        assigned_to=task_request.created_by,
        created_by=current_user.id,
        due_date=task_request.due_date,
        room_id=task_request.room_id,
    )

    db.add(new_task)

    task_request.status = "APPROVED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.now()

    db.commit()
    db.refresh(task_request)

    return task_request


def reject_task_request(
    db: Session,
    request_id: int,
    current_user: User,
    review_comment: str | None = None,
):
    if current_user.role != "ADMIN":
        raise ForbiddenError()

    task_request = (
        db.query(TaskRequest)
        .filter(TaskRequest.id == request_id)
        .first()
    )

    if not task_request:
        raise TaskNotFound()

    if task_request.status != "PENDING":
        raise InvalidRequestError(
            "Bu görev talebi zaten değerlendirilmiş."
        )

    # Oda talebi ise yalnızca
    # o odanın sahibi ADMIN reddedebilir.
    if task_request.room_id is not None:
        room = (
            db.query(Room)
            .filter(
                Room.id == task_request.room_id,
                Room.created_by == current_user.id,
            )
            .first()
        )

        if not room:
            raise ForbiddenError()

    # Kişisel talep ise yalnızca
    # talebin oluşturucusu olan ADMIN yönetebilir.
    elif task_request.created_by != current_user.id:
        raise ForbiddenError()

    task_request.status = "REJECTED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.now()
    task_request.review_comment = review_comment

    db.commit()
    db.refresh(task_request)

    return task_request