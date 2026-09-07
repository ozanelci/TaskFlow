from datetime import datetime
from database import get_db

from fastapi import Depends
from sqlalchemy.orm import Session
from exceptions import (
    ForbiddenError,
    InvalidRequestError,
    UserNotFound,
    TaskNotFound,
    RoomNotFound,
)

from models import Task, TaskHistory, TaskRequest, User, Room, RoomMembership
from schemas import TaskUpdate,TaskSortBy, TaskSortOrder, TaskStatus, TaskCreate, DeadlineStatus, TaskPriority
from utils import get_deadline_status
from dependencies import get_current_user

def create_task(
    task_data: TaskCreate,
    current_user: User,
    db: Session,
):
    if task_data.due_date is not None:
        from datetime import datetime

        if task_data.due_date < datetime.now():
            raise InvalidRequestError(
                "Son tarih geçmiş bir tarih olamaz."
            )

    assigned_user = (
        db.query(User)
        .filter(
            User.id == task_data.assigned_to,
            User.is_active.is_(True),
        )
        .first()
    )

    if not assigned_user:
        raise UserNotFound()

    # KİŞİSEL GÖREV
    if task_data.room_id is None:
        if task_data.assigned_to != current_user.id:
            raise ForbiddenError()

    # ODA GÖREVİ
    else:
        if current_user.role != "ADMIN":
            raise ForbiddenError()

        room = (
            db.query(Room)
            .filter(
                Room.id == task_data.room_id,
                Room.created_by == current_user.id,
            )
            .first()
        )

        if not room:
            raise RoomNotFound()

        membership = (
            db.query(RoomMembership)
            .filter(
                RoomMembership.room_id == room.id,
                RoomMembership.user_id == task_data.assigned_to,
                RoomMembership.status == "APPROVED",
            )
            .first()
        )

        if not membership:
            raise ForbiddenError()

    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        room_id=task_data.room_id,
        due_date=task_data.due_date,
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return task
    
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User,
    db: Session,
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id)
        .first()
    )

    if not task:
        raise TaskNotFound()

    # USER sadece kendisine atanmış kişisel görevi güncelleyebilir.
    # Oda görevini doğrudan güncelleyemez.
    if current_user.role == "USER":
        if task.assigned_to != current_user.id:
            raise ForbiddenError()

        if task.room_id is not None:
            # USER oda görevinde sadece durumunu değiştirebilir.
            if task_data.status is None:
                raise ForbiddenError()

            if task_data.title is not None:
                raise ForbiddenError()

            if task_data.description is not None:
                raise ForbiddenError()

            if task_data.priority is not None:
                raise ForbiddenError()

            if task_data.assigned_to is not None:
                raise ForbiddenError()

            if task_data.due_date is not None:
                raise ForbiddenError()

    # ADMIN
    elif current_user.role == "ADMIN":
        # Kişisel görev veya kendi oluşturduğu görev
        if task.created_by == current_user.id:
            pass

        # Oda görevi ise oda kendisine ait olmalı
        elif task.room_id is not None:
            room = (
                db.query(Room)
                .filter(
                    Room.id == task.room_id,
                    Room.created_by == current_user.id,
                )
                .first()
            )

            if not room:
                raise ForbiddenError()

        else:
            raise ForbiddenError()

    # Son tarih kontrolü
    if task_data.due_date is not None:
        from datetime import datetime

        if task_data.due_date < datetime.now():
            raise InvalidRequestError(
                "Son tarih geçmiş bir tarih olamaz."
            )

    # Güncellenecek alanlar
    if task_data.title is not None:
        task.title = task_data.title

    if task_data.description is not None:
        task.description = task_data.description

    if task_data.status is not None:
        task.status = task_data.status

    if task_data.priority is not None:
        task.priority = task_data.priority

    if task_data.assigned_to is not None:
        assigned_user = (
            db.query(User)
            .filter(
                User.id == task_data.assigned_to,
                User.is_active.is_(True),
            )
            .first()
        )

        if not assigned_user:
            raise UserNotFound()

        if task.room_id is not None:
            membership = (
                db.query(RoomMembership)
                .filter(
                    RoomMembership.room_id == task.room_id,
                    RoomMembership.user_id == task_data.assigned_to,
                    RoomMembership.status == "APPROVED",
                )
                .first()
            )

            if not membership:
                raise ForbiddenError()

        task.assigned_to = task_data.assigned_to

    if task_data.due_date is not None:
        task.due_date = task_data.due_date

    db.commit()
    db.refresh(task)

    return task

def delete_task(
    task_id: int,
    current_user: User,
    db: Session,
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id)
        .first()
    )

    if not task:
        raise TaskNotFound()

    # USER görev silemez.
    if current_user.role == "USER":
        raise ForbiddenError()

    # ADMIN kendi oluşturduğu kişisel görevi silebilir.
    if task.created_by == current_user.id:
        db.delete(task)
        db.commit()
        return {
            "message": "Görev başarıyla silindi."
        }

    # Oda görevi ise oda ADMIN'e ait olmalı.
    if task.room_id is not None:
        room = (
            db.query(Room)
            .filter(
                Room.id == task.room_id,
                Room.created_by == current_user.id,
            )
            .first()
        )

        if not room:
            raise ForbiddenError()

        db.delete(task)
        db.commit()

        return {
            "message": "Görev başarıyla silindi."
        }

    raise ForbiddenError()
    
def get_task(
    task_id: int,
    current_user: User,
    db: Session,
):
    task = (
        db.query(Task)
        .filter(Task.id == task_id)
        .first()
    )

    if not task:
        raise TaskNotFound()

    if current_user.role == "USER":
        if task.assigned_to != current_user.id:
            raise ForbiddenError()

    elif current_user.role == "ADMIN":
        if task.created_by != current_user.id:
            room_is_owned = False

            if task.room_id is not None:
                room = (
                    db.query(Room)
                    .filter(
                        Room.id == task.room_id,
                        Room.created_by == current_user.id,
                    )
                    .first()
                )

                room_is_owned = room is not None

            if not room_is_owned:
                raise ForbiddenError()

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "assigned_to": task.assigned_to,
        "created_by": task.created_by,
        "room_id": task.room_id,
        "due_date": task.due_date,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "previous_status": task.previous_status,
        "deadline_status": get_deadline_status(task),
    }
    
def get_task_history(
    db: Session,
    task_id: int,
    current_user: User
):
    query = db.query(Task).filter(
        Task.id == task_id
    )

    if current_user.role == "USER":
        query = query.filter(
            Task.assigned_to == current_user.id
        )

    task = query.first()

    if not task:
        raise TaskNotFound()

    history_entries = (
        db.query(TaskHistory)
        .filter(TaskHistory.task_id == task_id)
        .order_by(TaskHistory.changed_at.desc())
        .all()
    )

    return [
        {
            "id": entry.id,
            "task_id": entry.task_id,
            "old_status": entry.old_status,
            "new_status": entry.new_status,
            "changed_by": entry.changed_by,
            "changed_at": entry.changed_at
        }
        for entry in history_entries
    ]
    
def get_task_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Task)

    if current_user.role == "USER":
        query = query.filter(
            Task.assigned_to == current_user.id
        )

    tasks = query.all()

    return {
    "total": len(tasks),

    "todo": sum(
        task.status == TaskStatus.TODO
        for task in tasks
    ),

    "in_progress": sum(
        task.status == TaskStatus.IN_PROGRESS
        for task in tasks
    ),

    "done": sum(
        task.status == TaskStatus.DONE
        for task in tasks
    ),

    "cancelled": sum(
        task.status == TaskStatus.CANCELLED
        for task in tasks
    ),

    "overdue": sum(
        get_deadline_status(task) == DeadlineStatus.OVERDUE
        for task in tasks
    ),

    "upcoming": sum(
        get_deadline_status(task) == DeadlineStatus.UPCOMING
        for task in tasks
    ),

    "no_due_date": sum(
        get_deadline_status(task) == DeadlineStatus.NO_DUE_DATE
        for task in tasks
    ),

    "low_priority": sum(
        task.priority == TaskPriority.LOW
        for task in tasks
    ),

    "medium_priority": sum(
        task.priority == TaskPriority.MEDIUM
        for task in tasks
    ),

    "high_priority": sum(
        task.priority == TaskPriority.HIGH
        for task in tasks
    )
}
    
def get_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    search: str | None = None,
    deadline_status: DeadlineStatus | None = None,
    due_date_from: datetime | None = None,
    due_date_to: datetime | None = None,
    skip: int = 0,
    limit: int = 10,
    sort_by: TaskSortBy = TaskSortBy.ID,
    sort_order: TaskSortOrder = TaskSortOrder.ASC,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Task)

    if current_user.role == "USER":
        query = query.filter(
            Task.assigned_to == current_user.id
        )

    elif current_user.role == "ADMIN":
        owned_room_ids = (
    db.query(Room.id)
    .filter(
        Room.created_by == current_user.id
    )
)

        query = query.filter(
            (Task.created_by == current_user.id)
            | (Task.room_id.in_(owned_room_ids))
        )

    if status:
        query = query.filter(
            Task.status == status
        )

    if priority:
        query = query.filter(
            Task.priority == priority
        )

    if search:
        search_text = f"%{search}%"

        query = query.filter(
            (Task.title.ilike(search_text))
            | (Task.description.ilike(search_text))
        )

    if due_date_from:
        query = query.filter(
            Task.due_date >= due_date_from
        )

    if due_date_to:
        query = query.filter(
            Task.due_date <= due_date_to
        )

    if sort_by == TaskSortBy.ID:
        sort_column = Task.id

    elif sort_by == TaskSortBy.TITLE:
        sort_column = Task.title

    elif sort_by == TaskSortBy.PRIORITY:
        sort_column = Task.priority

    elif sort_by == TaskSortBy.DUE_DATE:
        sort_column = Task.due_date

    if sort_order == TaskSortOrder.ASC:
        query = query.order_by(sort_column)
    else:
        query = query.order_by(sort_column.desc())

    tasks = query.all()

    if deadline_status:
        tasks = [
            task
            for task in tasks
            if get_deadline_status(task) == deadline_status
        ]

    total = len(tasks)

    tasks = tasks[skip:skip + limit]

    items = [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "assigned_to": task.assigned_to,
            "created_by": task.created_by,
            "room_id": task.room_id,
            "due_date": task.due_date,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "previous_status": task.previous_status,
            "deadline_status": get_deadline_status(task),
        }
        for task in tasks
    ]

    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
    }