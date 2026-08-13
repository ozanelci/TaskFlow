from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db
from models import User, Task
from schemas import (
    UserCreate,
    UserResponse,
    UserUpdate,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    LoginRequest,
    TokenResponse,
    TaskStatus,
    TaskPriority,
    TaskSortBy,
    TaskSortOrder
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
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.id).all()

    return users


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
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

    return user


@app.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
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

    if user_data.email is not None:
        existing_user = (
            db.query(User)
            .filter(
                User.email == user_data.email,
                User.id != user_id
            )
            .first()
        )

        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="Bu email adresi başka bir kullanıcı tarafından kullanılıyor."
            )

    update_data = user_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
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

    return {
        "message": "Kullanıcı pasif hale getirildi."
    }


@app.post("/tasks", response_model=TaskResponse, status_code=201)
def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
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

    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task

@app.get("/tasks", response_model=list[TaskResponse])
def get_tasks(
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
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

    tasks = (
        query
        .offset(skip)
        .limit(limit)
        .all()
    )

    return tasks

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

    return task

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

    db.commit()
    db.refresh(task)

    return task

@app.delete("/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail="Sadece ADMIN görev silebilir."
        )

    task = (
        db.query(Task)
        .filter(Task.id == task_id)
        .first()
    )

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