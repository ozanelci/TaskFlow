from fastapi import Depends, FastAPI
from fastapi.security import HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from services import user_service
from database import get_db
from dependencies import get_current_user, require_role
from exceptions import TaskNotFound
from models import User
from routers import tasks
from schemas import (LoginRequest, TokenResponse, UserCreate, UserResponse,UserUpdate)

app = FastAPI()
app.include_router(tasks.router)
security = HTTPBearer()

from fastapi.responses import JSONResponse

from exceptions import (ForbiddenError, InvalidRequestError, UnauthorizedError,
                        UserAlreadyExists, UserNotFound)


@app.exception_handler(UserNotFound)
async def user_not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "USER_NOT_FOUND",
            "message": "Kullanıcı bulunamadı."
        }
    )


@app.exception_handler(UserAlreadyExists)
async def user_already_exists_handler(request, exc):
    return JSONResponse(
        status_code=409,
        content={
            "error": "USER_ALREADY_EXISTS",
            "message": "Bu email adresi zaten kayıtlı."
        }
    )


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request, exc):
    return JSONResponse(
        status_code=403,
        content={
            "error": "FORBIDDEN",
            "message": "Bu işlemi yapmaya yetkiniz yok."
        }
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request, exc):
    return JSONResponse(
        status_code=401,
        content={
            "error": "UNAUTHORIZED",
            "message": "Kimlik doğrulaması başarısız."
        }
    )
    
@app.exception_handler(InvalidRequestError)
async def invalid_request_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": "INVALID_REQUEST",
            "message": str(exc)
        }
    )
    
@app.exception_handler(TaskNotFound)
async def task_not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "TASK_NOT_FOUND",
            "message": "Görev bulunamadı."
        }
    )


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
    return user_service.create_user(
        db=db,
        user_data=user_data,
    )


@app.get("/users", response_model=list[UserResponse])
def get_users(
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    return user_service.get_users(db=db)


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_service.get_user(
        db=db,
        user_id=user_id,
        current_user=current_user,
    )


@app.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return user_service.update_user(
        db=db,
        user_id=user_id,
        user_data=user_data,
        current_user=current_user,
    )


@app.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    return user_service.delete_user(
        db=db,
        user_id=user_id,
    )

    
@app.post("/login", response_model=TokenResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    return user_service.login(
        db=db,
        login_data=login_data,
    )
    
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