from fastapi import Depends, FastAPI
from fastapi.security import HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session
from services import user_service
from database import get_db
from dependencies import get_current_user
from models import User
from routers import tasks, task_requests, users
from schemas import (LoginRequest, TokenResponse, UserCreate, UserResponse,UserUpdate)
from fastapi.middleware.cors import CORSMiddleware
from routers.auth import router as auth_router
from routers.rooms import router as rooms_router
from exceptions import (
    UserNotFound,
    UserAlreadyExists,
    ForbiddenError,
    UnauthorizedError,
    InvalidRequestError,
    TaskNotFound,
    RoomNotFound,
    RoomMembershipNotFound,
    RoomAlreadyJoined,
)


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://10.3.0.36:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(tasks.router)
app.include_router(users.router)
app.include_router(task_requests.router)
app.include_router(auth_router)
app.include_router(rooms_router)
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
    
@app.exception_handler(RoomNotFound)
async def room_not_found_handler(request, exc):

    return JSONResponse(
        status_code=404,
        content={
            "error": "ROOM_NOT_FOUND",
            "message": "Oda bulunamadı."
        }
    )


@app.exception_handler(RoomMembershipNotFound)
async def room_membership_not_found_handler(request, exc):

    return JSONResponse(
        status_code=404,
        content={
            "error": "ROOM_MEMBERSHIP_NOT_FOUND",
            "message": "Oda üyelik isteği bulunamadı."
        }
    )


@app.exception_handler(RoomAlreadyJoined)
async def room_already_joined_handler(request, exc):

    return JSONResponse(
        status_code=409,
        content={
            "error": "ROOM_ALREADY_JOINED",
            "message": "Bu kullanıcı için bu odada zaten bir üyelik kaydı bulunuyor."
        }
    )


@app.get("/")
def root():
    return {"message": "Taskozz API çalışıyor"}


@app.get("/db-test")
def database_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT current_database();"))
    database_name = result.scalar()

    return {
        "database": database_name
    }




@app.post(
    "/register",
    response_model=UserResponse,
    status_code=201
)
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    return user_service.register_user(
        db=db,
        user_data=user_data,
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
    
from schemas import PasswordUpdate
from security import verify_password, hash_password

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
    }

@app.patch("/me", response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if user_data.full_name is not None:
        current_user.full_name = user_data.full_name
    if user_data.email is not None:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing and existing.id != current_user.id:
            raise UserAlreadyExists()
        current_user.email = user_data.email
        
    db.commit()
    db.refresh(current_user)
    return current_user

@app.patch("/me/password")
def update_my_password(
    password_data: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not verify_password(password_data.old_password, current_user.password_hash):
        raise InvalidRequestError("Eski şifre yanlış.")
        
    current_user.password_hash = hash_password(password_data.new_password)
    db.commit()
    return {"message": "Şifre başarıyla güncellendi."}
    