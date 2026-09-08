from datetime import datetime

from sqlalchemy.orm import Session

from models import User
from security import hash_password, verify_password, create_access_token
from schemas import UserCreate, UserUpdate, LoginRequest

from exceptions import (
    UserNotFound,
    UserAlreadyExists,
    ForbiddenError,
    UnauthorizedError,
    InvalidRequestError,
)


def create_user(
    db: Session,
    user_data: UserCreate,
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise UserAlreadyExists()

    hashed_password = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def get_users(db: Session):
    return db.query(User).all()


def get_user(
    db: Session,
    user_id: int,
    current_user: User,
):
    if current_user.id != user_id:
        raise ForbiddenError()

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise UserNotFound()

    return user


def update_user(
    db: Session,
    user_id: int,
    user_data: UserUpdate,
    current_user: User,
):
    if current_user.id != user_id:
        raise ForbiddenError()

    update_data = user_data.model_dump(exclude_unset=True)

    if "due_date" in update_data:
        new_due_date = update_data["due_date"]

        if new_due_date is not None:
            if new_due_date < datetime.now(new_due_date.tzinfo):
                raise InvalidRequestError(
                    "Son teslim tarihi geçmiş bir tarih olamaz."
                )

    allowed_fields = {"full_name"}

    for field in update_data:
        if field not in allowed_fields:
            raise ForbiddenError()

    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise UserNotFound()

    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    return user


def delete_user(
    db: Session,
    user_id: int,
):
    user = (
        db.query(User)
        .filter(User.id == user_id)
        .first()
    )

    if not user:
        raise UserNotFound()

    user.is_active = False

    db.commit()
    db.refresh(user)

    return {
        "message": "Kullanıcı pasif hale getirildi."
    }
    

def login(
    db: Session,
    login_data: LoginRequest,
):
    user = (
        db.query(User)
        .filter(User.email == login_data.email)
        .first()
    )

    if not user:
        raise UnauthorizedError()

    if not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise UnauthorizedError()

    if not user.is_active:
        raise ForbiddenError()

    access_token = create_access_token(
        {
            "sub": str(user.id),
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
    }
    
def register_user(
    db: Session,
    user_data: UserCreate,
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise UserAlreadyExists()

    hashed_password = hash_password(user_data.password)

    new_user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        password_hash=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user