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
    if current_user.role != "ADMIN":
        raise ForbiddenError()

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
    if current_user.role != "USER":
        raise ForbiddenError()

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
    room = (
        db.query(Room)
        .filter(
            Room.id == room_id
        )
        .first()
    )

    if not room:
        raise RoomNotFound()

    if room.created_by != current_user.id:
        raise ForbiddenError()

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
    room = (
        db.query(Room)
        .filter(Room.id == room_id)
        .first()
    )

    if not room:
        raise RoomNotFound()

    if room.created_by != current_user.id:
        raise ForbiddenError()

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

    db.commit()
    db.refresh(membership)

    return membership


def reject_room_request(
    room_id: int,
    membership_id: int,
    current_user: User,
    db: Session,
):
    room = (
        db.query(Room)
        .filter(Room.id == room_id)
        .first()
    )

    if not room:
        raise RoomNotFound()

    if room.created_by != current_user.id:
        raise ForbiddenError()

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
    if current_user.role == "ADMIN":
        rooms = (
            db.query(Room)
            .filter(
                Room.created_by == current_user.id
            )
            .all()
        )

        return [
            {
                "id": room.id,
                "name": room.name,
                "join_code": room.join_code,
                "created_by": room.created_by,
                "membership_status": "APPROVED",
                "created_at": room.created_at,
            }
            for room in rooms
        ]

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

    membership_map = {
        membership.room_id: membership.status
        for membership in memberships
    }

    return [
        {
            "id": room.id,
            "name": room.name,
            "join_code": room.join_code,
            "created_by": room.created_by,
            "membership_status": membership_map.get(
                room.id,
                "PENDING",
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
    if current_user.role != "ADMIN":
        raise ForbiddenError()

    room = (
        db.query(Room)
        .filter(
            Room.id == room_id,
            Room.created_by == current_user.id,
        )
        .first()
    )

    if not room:
        raise RoomNotFound()

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
                "created_at": membership.created_at,
            }
        )

    return members