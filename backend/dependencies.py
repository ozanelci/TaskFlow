from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from database import get_db
from models import User
from security import decode_access_token
from exceptions import UnauthorizedError, ForbiddenError


security = HTTPBearer()


from models import User, RoomMembership

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





def check_room_admin(db: Session, user_id: int, room_id: int):
    """
    Check if the user is an APPROVED member of the room with ADMIN role.
    """
    membership = db.query(RoomMembership).filter(
        RoomMembership.room_id == room_id,
        RoomMembership.user_id == user_id,
        RoomMembership.status == "APPROVED",
        RoomMembership.role == "ADMIN"
    ).first()
    
    if not membership:
        raise ForbiddenError()
    
    return membership


def check_room_user_or_admin(db: Session, user_id: int, room_id: int):
    """
    Check if the user is an APPROVED member of the room (any role).
    """
    membership = db.query(RoomMembership).filter(
        RoomMembership.room_id == room_id,
        RoomMembership.user_id == user_id,
        RoomMembership.status == "APPROVED"
    ).first()
    
    if not membership:
        raise ForbiddenError()
    
    return membership