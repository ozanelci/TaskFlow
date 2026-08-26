from datetime import datetime
from database import get_db

from fastapi import Depends
from sqlalchemy.orm import Session
from exceptions import (
    ForbiddenError,
    InvalidRequestError,
    UserNotFound,
    TaskNotFound
)

from models import Task, User, TaskHistory
from schemas import TaskUpdate,TaskSortBy, TaskSortOrder, TaskStatus, TaskCreate, DeadlineStatus, TaskPriority
from utils import get_deadline_status
from dependencies import get_current_user

def create_task(
    db: Session,
    task_data: TaskCreate,
    current_user: User
):

    if current_user.role != "ADMIN":
        raise ForbiddenError()

    assigned_user = (
        db.query(User)
        .filter(User.id == task_data.assigned_to)
        .first()
    )

    if not assigned_user:
        raise UserNotFound()
    

    if not assigned_user.is_active:
        raise InvalidRequestError()

    if task_data.due_date:
        if task_data.due_date < datetime.now(task_data.due_date.tzinfo):
            raise InvalidRequestError()

    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date
    )

    db.add(task)
    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "assigned_to": task.assigned_to,
        "created_by": task.created_by,
        "due_date": task.due_date,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "previous_status": task.previous_status,
        "deadline_status": get_deadline_status(task)
    }
    
def update_task(
    db: Session,
    task_id: int,
    task_data: TaskUpdate,
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

    update_data = task_data.model_dump(
        exclude_unset=True
    )

    if current_user.role == "USER":
        allowed_fields = {"status"}

        for field in update_data:
            if field not in allowed_fields:
                raise ForbiddenError()

    if "status" in update_data:

        new_status = update_data["status"]

        if new_status != task.status:
            old_status = task.status

        allowed_transitions = {
            TaskStatus.TODO: {
                TaskStatus.IN_PROGRESS,
                TaskStatus.CANCELLED
            },

            TaskStatus.IN_PROGRESS: {
                TaskStatus.TODO,
                TaskStatus.DONE,
                TaskStatus.CANCELLED
            },

            TaskStatus.DONE: {
                TaskStatus.IN_PROGRESS
            },

            TaskStatus.CANCELLED: set()
        }

        if new_status == TaskStatus.CANCELLED:

            if task.status != TaskStatus.CANCELLED:
                task.previous_status = task.status

        elif task.status == TaskStatus.CANCELLED:

            if new_status != task.previous_status:
                raise InvalidRequestError()

            task.previous_status = None

        else:

            current_status = TaskStatus(task.status)

            if new_status not in allowed_transitions[current_status]:
                raise InvalidRequestError(
                    f"{current_status.value} durumundan "
                    f"{new_status.value} durumuna geçilemez."
                )
                

    if "assigned_to" in update_data:

        assigned_user = (
            db.query(User)
            .filter(
                User.id == update_data["assigned_to"]
            )
            .first()
        )

        if not assigned_user:
            raise UserNotFound()

        if not assigned_user.is_active:
            raise InvalidRequestError(
                "Pasif kullanıcıya görev atanamaz."
            )

    for field, value in update_data.items():
        setattr(task, field, value)

    if "status" in update_data:
        if update_data["status"] != old_status:
            history = TaskHistory(
                task_id=task.id,
                old_status=old_status,
                new_status=new_status,
                changed_by=current_user.id
            )

            db.add(history)

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "status": task.status,
        "priority": task.priority,
        "assigned_to": task.assigned_to,
        "created_by": task.created_by,
        "due_date": task.due_date,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "previous_status": task.previous_status,
        "deadline_status": get_deadline_status(task)
    }

def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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

    db.delete(task)
    db.commit()

    return {
        "message": "Görev başarıyla silindi."
    }
    
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
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

    return {
    "id": task.id,
    "title": task.title,
    "description": task.description,
    "status": task.status,
    "priority": task.priority,
    "assigned_to": task.assigned_to,
    "created_by": task.created_by,
    "due_date": task.due_date,
    "created_at": task.created_at,
    "updated_at": task.updated_at,
    "previous_status": task.previous_status,
    "deadline_status": get_deadline_status(task)
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
            (Task.title.ilike(search_text)) |
            (Task.description.ilike(search_text))
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

    tasks = tasks[skip:skip + limit]

    return [
        {
            "id": task.id,
            "title": task.title,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "assigned_to": task.assigned_to,
            "created_by": task.created_by,
            "due_date": task.due_date,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "previous_status": task.previous_status,
            "deadline_status": get_deadline_status(task)
        }
        for task in tasks
    ]
    
