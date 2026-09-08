import secrets
import string

from sqlalchemy.orm import Session

from models import Room, RoomMembership, User
from schemas import RoomCreate
from exceptions import (
    ForbiddenError,
    RoomAlreadyJoined,
    RoomNotFound,
    RoomMembershipNotFound,
)
from dependencies import check_room_admin


def generate_join_code(length: int = 8) -> str:
    characters = string.ascii_uppercase + string.digits

    return "".join(
        secrets.choice(characters)
        for _ in range(length)
    )


def create_room(
    room_data: RoomCreate,
    current_user: User,
    db: Session,
):
    while True:
        join_code = generate_join_code()

        existing_room = (
            db.query(Room)
            .filter(Room.join_code == join_code)
            .first()
        )

        if not existing_room:
            break

    room = Room(
        name=room_data.name,
        join_code=join_code,
        created_by=current_user.id,
    )

    db.add(room)
    db.flush()

    membership = RoomMembership(
        room_id=room.id,
        user_id=current_user.id,
        status="APPROVED",
        role="ADMIN"
    )

    db.add(membership)
    db.commit()
    db.refresh(room)

    return room


def join_room(
    join_code: str,
    current_user: User,
    db: Session,
):
    room = (
        db.query(Room)
        .filter(Room.join_code == join_code)
        .first()
    )

    if not room:
        raise RoomNotFound()

    existing_membership = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.room_id == room.id,
            RoomMembership.user_id == current_user.id,
        )
        .first()
    )

    if existing_membership:
        raise RoomAlreadyJoined()

    membership = RoomMembership(
        room_id=room.id,
        user_id=current_user.id,
        status="PENDING",
        role="USER"
    )

    db.add(membership)
    db.commit()
    db.refresh(membership)

    return membership

def get_room_requests(
    room_id: int,
    current_user: User,
    db: Session,
):
    check_room_admin(db, current_user.id, room_id)

    memberships = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.room_id == room_id,
            RoomMembership.status == "PENDING",
        )
        .all()
    )

    requests = []

    for membership in memberships:
        user = (
            db.query(User)
            .filter(
                User.id == membership.user_id
            )
            .first()
        )

        if not user:
            continue

        requests.append(
            {
                "id": membership.id,
                "room_id": membership.room_id,
                "user_id": membership.user_id,
                "full_name": user.full_name,
                "email": user.email,
                "status": membership.status,
                "created_at": membership.created_at,
            }
        )

    return requests


def approve_room_request(
    room_id: int,
    membership_id: int,
    current_user: User,
    db: Session,
):
    check_room_admin(db, current_user.id, room_id)

    membership = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.id == membership_id,
            RoomMembership.room_id == room_id,
            RoomMembership.status == "PENDING",
        )
        .first()
    )

    if not membership:
        raise RoomMembershipNotFound()

    membership.status = "APPROVED"
    membership.role = "USER"

    db.commit()
    db.refresh(membership)

    return membership


def reject_room_request(
    room_id: int,
    membership_id: int,
    current_user: User,
    db: Session,
):
    check_room_admin(db, current_user.id, room_id)

    membership = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.id == membership_id,
            RoomMembership.room_id == room_id,
            RoomMembership.status == "PENDING",
        )
        .first()
    )

    if not membership:
        raise RoomMembershipNotFound()

    membership.status = "REJECTED"

    db.commit()
    db.refresh(membership)

    return membership

def get_my_rooms(
    current_user: User,
    db: Session,
):
    memberships = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.user_id == current_user.id
        )
        .all()
    )

    room_ids = [
        membership.room_id
        for membership in memberships
    ]

    if not room_ids:
        return []

    rooms = (
        db.query(Room)
        .filter(Room.id.in_(room_ids))
        .all()
    )

    membership_status_map = {
        membership.room_id: membership.status
        for membership in memberships
    }
    
    membership_role_map = {
        membership.room_id: membership.role
        for membership in memberships
    }

    return [
        {
            "id": room.id,
            "name": room.name,
            "join_code": room.join_code,
            "created_by": room.created_by,
            "membership_status": membership_status_map.get(
                room.id,
                "PENDING",
            ),
            "role": membership_role_map.get(
                room.id,
                "USER"
            ),
            "created_at": room.created_at,
        }
        for room in rooms
    ]
    
def get_room_members(
    room_id: int,
    current_user: User,
    db: Session,
):
    check_room_admin(db, current_user.id, room_id)

    memberships = (
        db.query(RoomMembership)
        .filter(
            RoomMembership.room_id == room_id,
            RoomMembership.status == "APPROVED",
        )
        .all()
    )

    members = []

    for membership in memberships:
        user = (
            db.query(User)
            .filter(
                User.id == membership.user_id
            )
            .first()
        )

        if not user:
            continue

        members.append(
            {
                "id": membership.id,
                "room_id": membership.room_id,
                "user_id": membership.user_id,
                "full_name": user.full_name,
                "email": user.email,
                "status": membership.status,
                "role": membership.role,
                "created_at": membership.created_at,
            }
        )

    return members