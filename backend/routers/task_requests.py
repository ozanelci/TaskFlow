from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user

from models import (
    TaskRequest,
    Task,
    User,
    Room,
    RoomMembership,
)

from schemas import (
    TaskRequestCreate,
    TaskRequestResponse,
)

from exceptions import (
    ForbiddenError,
    InvalidRequestError,
    TaskNotFound,
    RoomNotFound,
)


router = APIRouter(
    prefix="/task-requests",
    tags=["Task Requests"],
)


def create_task_request(
    request_data,
    current_user,
    db,
):
    room_id = request_data.room_id

    # USER personal görev için Task Request kullanmaz.
    # Personal görevini doğrudan oluşturabilir.
    if current_user.role == "USER" and room_id is None:
        raise InvalidRequestError(
            "Kişisel görev için görev talebi oluşturamazsınız."
        )

    # Oda seçilmediyse
    if room_id is None:
        request = TaskRequest(
            title=request_data.title,
            description=request_data.description,
            priority=request_data.priority.value,
            status="PENDING",
            requested_by=current_user.id,
            room_id=None,
            due_date=request_data.due_date,
        )

        db.add(request)
        db.commit()
        db.refresh(request)

        return request

    # Odayı bul
    room = (
        db.query(Room)
        .filter(Room.id == room_id)
        .first()
    )

    if not room:
        raise RoomNotFound()

    # Talebi oluşturan kişinin bu odada
    # APPROVED üye olması gerekiyor.
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
        priority=request_data.priority.value,
        status="PENDING",
        requested_by=current_user.id,
        room_id=room.id,
        due_date=request_data.due_date,
    )

    db.add(request)
    db.commit()
    db.refresh(request)

    return request


def get_task_requests(
    db,
    current_user,
):
    query = db.query(TaskRequest)

    # USER sadece kendi oluşturduğu talepleri görür.
    if current_user.role == "USER":
        query = query.filter(
            TaskRequest.requested_by == current_user.id
        )

    # ADMIN:
    # - kendi oluşturduğu personal talepleri
    # - kendi oluşturduğu odalara ait talepleri
    # görür.
    elif current_user.role == "ADMIN":
        owned_room_ids = (
            db.query(Room.id)
            .filter(
                Room.created_by == current_user.id
            )
            .subquery()
        )

        query = query.filter(
            or_(
                TaskRequest.requested_by == current_user.id,
                TaskRequest.room_id.in_(owned_room_ids),
            )
        )

    requests = (
        query
        .order_by(TaskRequest.created_at.desc())
        .all()
    )

    result = []

    for request in requests:

        user = (
            db.query(User)
            .filter(
                User.id == request.requested_by
            )
            .first()
        )

        room = None

        if request.room_id is not None:
            room = (
                db.query(Room)
                .filter(
                    Room.id == request.room_id
                )
                .first()
            )

        result.append(
            {
                "id": request.id,
                "title": request.title,
                "description": request.description,
                "priority": request.priority,
                "status": request.status,

                "requested_by": request.requested_by,

                "room_id": request.room_id,

                "room_name": (
                    room.name
                    if room
                    else None
                ),

                "full_name": (
                    user.full_name
                    if user
                    else None
                ),

                "email": (
                    user.email
                    if user
                    else None
                ),

                "reviewed_by": request.reviewed_by,
                "reviewed_at": request.reviewed_at,
                "review_comment": request.review_comment,

                "due_date": request.due_date,

                "created_at": request.created_at,
            }
        )

    return result


def approve_task_request(
    db,
    request_id,
    current_user,
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
            "Bu talep zaten işleme alınmış."
        )

    # Oda görevi
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
        # odanın APPROVED üyesi mi?
        membership = (
            db.query(RoomMembership)
            .filter(
                RoomMembership.room_id == room.id,
                RoomMembership.user_id
                == task_request.requested_by,
                RoomMembership.status == "APPROVED",
            )
            .first()
        )

        if not membership:
            raise ForbiddenError()

    # Personal request
    else:
        if (
            task_request.requested_by
            != current_user.id
        ):
            raise ForbiddenError()

    # Task oluştur
    new_task = Task(
        title=task_request.title,
        description=task_request.description,
        status="TODO",
        priority=task_request.priority,
        assigned_to=task_request.requested_by,
        created_by=current_user.id,
        room_id=task_request.room_id,
        due_date=task_request.due_date,
    )

    db.add(new_task)

    task_request.status = "APPROVED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.utcnow()

    db.commit()
    db.refresh(task_request)

    return task_request


def reject_task_request(
    db,
    request_id,
    current_user,
    review_comment=None,
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
            "Bu talep zaten işleme alınmış."
        )

    # Oda talebi
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

    # Personal request
    else:
        if (
            task_request.requested_by
            != current_user.id
        ):
            raise ForbiddenError()

    task_request.status = "REJECTED"
    task_request.reviewed_by = current_user.id
    task_request.reviewed_at = datetime.utcnow()
    task_request.review_comment = review_comment

    db.commit()
    db.refresh(task_request)

    return task_request


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
    return create_task_request(
        request_data=request_data,
        current_user=current_user,
        db=db,
    )


@router.get(
    "",
    response_model=list[TaskRequestResponse],
)
def get_all_task_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_task_requests(
        db=db,
        current_user=current_user,
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
    return approve_task_request(
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
    return reject_task_request(
        db=db,
        request_id=request_id,
        current_user=current_user,
        review_comment=review_comment,
    )