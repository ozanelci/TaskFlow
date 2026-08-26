from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from services import task_service
from database import get_db
from models import User
from schemas import (
    TaskResponse,
    TaskStatus,
    TaskPriority,
    DeadlineStatus,
    TaskSortBy,
    TaskSortOrder,
    TaskCreate,
    TaskUpdate,
)
from dependencies import get_current_user

router = APIRouter()

@router.get("/tasks", response_model=list[TaskResponse])
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
        current_user=current_user
    )

    
@router.get("/tasks/summary")
def get_task_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.get_task_summary(
        db=db,
        current_user=current_user
    )
    
@router.post("/tasks", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.create_task(
        db=db,
        task_data=task_data,
        current_user=current_user
    )

@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.get_task(
        db=db,
        task_id=task_id,
        current_user=current_user
    )


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.update_task(
        db=db,
        task_id=task_id,
        task_data=task_data,
        current_user=current_user
    )
    
@router.get("/tasks/{task_id}/history")
def get_task_history(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.get_task_history(
        db=db,
        task_id=task_id,
        current_user=current_user
    )


@router.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return task_service.delete_task(
        db=db,
        task_id=task_id,
        current_user=current_user
    )