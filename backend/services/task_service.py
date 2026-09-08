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
from dependencies import get_current_user, check_room_admin, check_room_user_or_admin

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
        check_room_admin(db, current_user.id, task_data.room_id)
        check_room_user_or_admin(db, task_data.assigned_to, task_data.room_id)

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

    if task.room_id is None:
        if task.assigned_to != current_user.id:
            raise ForbiddenError()
    else:
        membership = check_room_user_or_admin(db, current_user.id, task.room_id)
        if membership.role == "USER":
            if task.assigned_to != current_user.id:
                raise ForbiddenError()
            
            if task_data.status is None:
                raise ForbiddenError()
            
            if any([
                task_data.title is not None,
                task_data.description is not None,
                task_data.priority is not None,
                task_data.assigned_to is not None,
                task_data.due_date is not None
            ]):
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
            check_room_user_or_admin(db, task_data.assigned_to, task.room_id)

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

    if task.room_id is None:
        if task.created_by != current_user.id:
            raise ForbiddenError()
    else:
        check_room_admin(db, current_user.id, task.room_id)

    db.delete(task)
    db.commit()

    return {
        "message": "Görev başarıyla silindi."
    }
    
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

    if task.room_id is None:
        if task.assigned_to != current_user.id:
            raise ForbiddenError()
    else:
        membership = check_room_user_or_admin(db, current_user.id, task.room_id)
        if membership.role == "USER":
            if task.assigned_to != current_user.id:
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
    task = db.query(Task).filter(Task.id == task_id).first()

    if not task:
        raise TaskNotFound()

    if task.room_id is None:
        if task.assigned_to != current_user.id:
            raise ForbiddenError()
    else:
        membership = check_room_user_or_admin(db, current_user.id, task.room_id)
        if membership.role == "USER":
            if task.assigned_to != current_user.id:
                raise ForbiddenError()

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
    db: Session = Depends(get_db),
    room_id: int | None = None,
):
    query = db.query(Task)

    if room_id is None:
        query = query.filter(Task.room_id.is_(None), Task.assigned_to == current_user.id)
    else:
        membership = check_room_user_or_admin(db, current_user.id, room_id)
        query = query.filter(Task.room_id == room_id)
        if membership.role == "USER":
            query = query.filter(Task.assigned_to == current_user.id)

    tasks = query.all()

    my_tasks = [t for t in tasks if t.assigned_to == current_user.id]

    return {
        "total": len(tasks),
        "todo": sum(task.status == TaskStatus.TODO for task in tasks),
        "in_progress": sum(task.status == TaskStatus.IN_PROGRESS for task in tasks),
        "done": sum(task.status == TaskStatus.DONE for task in tasks),
        "cancelled": sum(task.status == TaskStatus.CANCELLED for task in tasks),
        "overdue": sum(get_deadline_status(task) == DeadlineStatus.OVERDUE for task in tasks),
        "upcoming": sum(get_deadline_status(task) == DeadlineStatus.UPCOMING for task in tasks),
        "no_due_date": sum(get_deadline_status(task) == DeadlineStatus.NO_DUE_DATE for task in tasks),
        "low_priority": sum(task.priority == TaskPriority.LOW for task in tasks),
        "medium_priority": sum(task.priority == TaskPriority.MEDIUM for task in tasks),
        "high_priority": sum(task.priority == TaskPriority.HIGH for task in tasks),
        "my_total": len(my_tasks),
        "my_done": sum(task.status == TaskStatus.DONE for task in my_tasks)
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
    room_id: int | None = None,
):
    query = db.query(Task)

    if room_id is None:
        query = query.filter(Task.room_id.is_(None), Task.assigned_to == current_user.id)
    else:
        membership = check_room_user_or_admin(db, current_user.id, room_id)
        query = query.filter(Task.room_id == room_id)
        if membership.role == "USER":
            query = query.filter(Task.assigned_to == current_user.id)

    if status:
        query = query.filter(Task.status == status)

    if priority:
        query = query.filter(Task.priority == priority)

    if search:
        search_text = f"%{search}%"
        query = query.filter(
            (Task.title.ilike(search_text))
            | (Task.description.ilike(search_text))
        )

    if due_date_from:
        query = query.filter(Task.due_date >= due_date_from)

    if due_date_to:
        query = query.filter(Task.due_date <= due_date_to)

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
            task for task in tasks if get_deadline_status(task) == deadline_status
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