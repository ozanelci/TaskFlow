from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from database import get_db
from models import User, Task, TaskHistory
from schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    TaskCreate,
    TaskResponse,
    TaskHistoryResponse,
    TaskUpdate,
    TaskSummary,
    LoginRequest,
    TokenResponse,
    TaskStatus,
    TaskPriority,
    TaskSortBy,
    TaskSortOrder,
    DeadlineStatus
)
from security import hash_password, verify_password, create_access_token, decode_access_token


app = FastAPI()
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Geçersiz veya süresi dolmuş token."
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Token içerisinde kullanıcı bilgisi bulunamadı."
        )

    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Kullanıcı bulunamadı."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Kullanıcı hesabı aktif değil."
        )

    return user

def get_deadline_status(task):
    if task.due_date is None:
        return DeadlineStatus.NO_DUE_DATE

    if task.status in [
        TaskStatus.DONE,
        TaskStatus.CANCELLED
    ]:
        return DeadlineStatus.NORMAL

    now = datetime.now()

    if task.due_date < now:
        return DeadlineStatus.OVERDUE

    if task.due_date <= now + timedelta(days=3):
        return DeadlineStatus.UPCOMING

    return DeadlineStatus.NORMAL



def require_role(required_role: str):
    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail="Bu işlem için yetkiniz yok."
            )

        return current_user

    return role_checker


@app.get("/")
def root():
    return {"message": "TaskFlow API çalışıyor"}


@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT current_database();"))
    database_name = result.scalar()

    return {
        "database": database_name
    }


@app.post("/users", response_model=UserResponse, status_code=201)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Bu email adresi zaten kayıtlı."
        )

    hashed_password = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
        role=user_data.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.get("/users", response_model=list[UserResponse])
def get_users(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    users = db.query(User).all()

    return users


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == "USER" and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Başka kullanıcıların bilgilerini görüntüleme yetkiniz yok."
        )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Kullanıcı bulunamadı."
        )

    return user


@app.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # USER başka bir kullanıcıyı güncelleyemez
    if current_user.role == "USER" and current_user.id != user_id:
        raise HTTPException(
            status_code=403,
            detail="Başka kullanıcıların bilgilerini güncelleme yetkiniz yok."
        )

    # USER sadece full_name değiştirebilir
    update_data = user_data.model_dump(exclude_unset=True)
    
    if "due_date" in update_data:
        new_due_date = update_data["due_date"]

        if new_due_date is not None:
            if new_due_date < datetime.now(new_due_date.tzinfo):
                raise HTTPException(
                    status_code=400,
                    detail="Son teslim tarihi geçmiş bir tarih olamaz."
            )

    if current_user.role == "USER":
        allowed_fields = {"full_name"}

        for field in update_data:
            if field not in allowed_fields:
                raise HTTPException(
                    status_code=403,
                    detail="USER sadece kendi adını değiştirebilir."
                )

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Kullanıcı bulunamadı."
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Kullanıcı bulunamadı."
        )

    user.is_active = False

    db.commit()
    db.refresh(user)

    return {
        "message": "Kullanıcı pasif hale getirildi."
    }


@app.post("/tasks", response_model=TaskResponse)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Sadece ADMIN görev oluşturabilir."
        )

    assigned_user = (
        db.query(User)
        .filter(User.id == task_data.assigned_to)
        .first()
    )

    if not assigned_user:
        raise HTTPException(
            status_code=404,
            detail="Atanan kullanıcı bulunamadı."
        )

    if not assigned_user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Pasif kullanıcıya görev atanamaz."
        )
        
    if task_data.due_date:
        if task_data.due_date < datetime.now(task_data.due_date.tzinfo):
            raise HTTPException(
                status_code=400,
                detail="Son teslim tarihi geçmiş bir tarih olamaz."
        )    
        
    task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date)
    
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

    # Buradan sonra sende bulunan mevcut Task oluşturma kodu devam eder

@app.get("/tasks", response_model=list[TaskResponse])
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
    
@app.get("/tasks/summary", response_model=TaskSummary)
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

@app.get("/tasks/{task_id}", response_model=TaskResponse)
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
        raise HTTPException(
            status_code=404,
            detail="Görev bulunamadı."
        )

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

@app.patch("/tasks/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
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
        raise HTTPException(
            status_code=404,
            detail="Görev bulunamadı."
        )

    update_data = task_data.model_dump(
        exclude_unset=True
    )

    if current_user.role == "USER":
        allowed_fields = {"status"}

        for field in update_data:
            if field not in allowed_fields:
                raise HTTPException(
                    status_code=403,
                    detail="USER sadece görev durumunu değiştirebilir."
                )

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

        # Görev iptal ediliyorsa mevcut durumunu kaydet
        if new_status == TaskStatus.CANCELLED:

            if task.status != TaskStatus.CANCELLED:
                task.previous_status = task.status

        # Görev iptal durumundaysa sadece eski durumuna dönebilir
        elif task.status == TaskStatus.CANCELLED:

            if new_status != task.previous_status:
                raise HTTPException(
                    status_code=400,
                    detail="İptal edilen görev sadece iptal edilmeden önceki durumuna geri döndürülebilir."
                )

            task.previous_status = None

        # Normal status geçişleri
        else:

            current_status = TaskStatus(task.status)

            if new_status not in allowed_transitions[current_status]:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"{current_status.value} durumundan "
                        f"{new_status.value} durumuna geçilemez."
                    )
                )

    if "assigned_to" in update_data:
        assigned_user = (
            db.query(User)
            .filter(User.id == update_data["assigned_to"])
            .first()
        )

        if not assigned_user:
            raise HTTPException(
                status_code=404,
                detail="Atanan kullanıcı bulunamadı."
            )

        if not assigned_user.is_active:
            raise HTTPException(
                status_code=400,
                detail="Pasif kullanıcıya görev atanamaz."
            )

    for field, value in update_data.items():
        setattr(task, field, value)

    # Status değiştirildiyse history kaydı oluştur
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
    
@app.get(
    "/tasks/{task_id}/history",
    response_model=list[TaskHistoryResponse]
)
def get_task_history(
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
        raise HTTPException(
            status_code=404,
            detail="Görev bulunamadı."
        )

    history = (
        db.query(TaskHistory)
        .filter(TaskHistory.task_id == task.id)
        .order_by(TaskHistory.changed_at.asc())
        .all()
    )

    return history

@app.delete("/tasks/{task_id}")
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
        raise HTTPException(
            status_code=404,
            detail="Görev bulunamadı."
        )

    db.delete(task)
    db.commit()

    return {
        "message": "Görev başarıyla silindi."
    }
    
@app.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email veya şifre hatalı."
        )

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Email veya şifre hatalı."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Kullanıcı hesabı aktif değil."
        )

    access_token = create_access_token(
        {
            "sub": str(user.id),
            "role": user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }    
    
@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
    }    
    
@app.get("/admin-test")
def admin_test(
    current_user: User = Depends(require_role("ADMIN"))
):
    return {
        "message": "Admin alanına hoş geldiniz.",
        "user": current_user.full_name,
        "role": current_user.role
    }    