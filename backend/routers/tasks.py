from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from services import task_service
from database import get_db
from models import User, Task
from schemas import (
    TaskResponse,
    TaskListResponse,
    TaskStatus,
    TaskPriority,
    DeadlineStatus,
    TaskSortBy,
    TaskSortOrder,
    TaskCreate,
    TaskUpdate,
    UserResponse,
)
from dependencies import get_current_user


router = APIRouter()


@router.get("/tasks", response_model=TaskListResponse)
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
    room_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_tasks(
        db=db,
        status=status,
        priority=priority,
        search=search,
        deadline_status=deadline_status,
        due_date_from=due_date_from,
        due_date_to=due_date_to,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        room_id=room_id,
        current_user=current_user,
    )


@router.get("/tasks/summary")
def get_task_summary(
    room_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_task_summary(
        db=db,
        room_id=room_id,
        current_user=current_user,
    )


@router.post("/tasks", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.create_task(
        db=db,
        task_data=task_data,
        current_user=current_user,
    )


@router.get("/tasks/my", response_model=list[TaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    tasks = (
        db.query(Task)
        .filter(Task.assigned_to == current_user.id)
        .all()
    )

    return tasks


@router.get("/personnel", response_model=list[UserResponse])
def get_personnel(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from dependencies import check_room_admin
    from models import RoomMembership
    
    check_room_admin(db, current_user.id, room_id)

    user_ids = (
        db.query(RoomMembership.user_id)
        .filter(
            RoomMembership.room_id == room_id,
            RoomMembership.status == "APPROVED",
            RoomMembership.user_id != current_user.id,
        )
        .distinct()
        .all()
    )

    ids = [row[0] for row in user_ids]

    if not ids:
        return []

    return (
        db.query(User)
        .filter(User.id.in_(ids))
        .all()
    )


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_task(
        db=db,
        task_id=task_id,
        current_user=current_user,
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Önce görevi güncelle
    task_service.update_task(
        db=db,
        task_id=task_id,
        task_data=task_data,
        current_user=current_user,
    )

    # Güncellenmiş görevi tekrar getir.
    # get_task() deadline_status dahil doğru response'u hazırlar.
    return task_service.get_task(
        db=db,
        task_id=task_id,
        current_user=current_user,
    )


@router.get("/tasks/{task_id}/history")
def get_task_history(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.get_task_history(
        db=db,
        task_id=task_id,
        current_user=current_user,
    )


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return task_service.delete_task(
        db=db,
        task_id=task_id,
        current_user=current_user,
    )