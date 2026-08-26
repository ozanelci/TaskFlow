from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import decode_access_token
from exceptions import UnauthorizedError, ForbiddenError


security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    payload = decode_access_token(token)

    if payload is None:
        raise UnauthorizedError()

    user_id = payload.get("sub")

    if user_id is None:
        raise UnauthorizedError()

    user = db.query(User).filter(
        User.id == int(user_id)
    ).first()

    if user is None:
        raise UnauthorizedError()

    if not user.is_active:
        raise ForbiddenError()

    return user


def require_role(required_role: str):
    def role_checker(
        current_user: User = Depends(get_current_user)
    ):
        if current_user.role != required_role:
            raise ForbiddenError()

        return current_user

    return role_checker