from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import (
    RoomCreate,
    RoomResponse,
    RoomJoinRequest,
    RoomMembershipResponse,
    MyRoomResponse,
    RoomMemberResponse,
    RoomRequestResponse,
)
from room_service import (
    create_room,
    join_room,
    get_room_requests,
    approve_room_request,
    reject_room_request,
    get_my_rooms,
    get_room_members,
)

router = APIRouter(
    prefix="/rooms",
    tags=["Rooms"],
)


@router.post(
    "",
    response_model=RoomResponse,
    status_code=201,
)
def create_new_room(
    room_data: RoomCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return create_room(
        room_data=room_data,
        current_user=current_user,
        db=db,
    )
    
@router.get(
    "/my",
    response_model=list[MyRoomResponse],
)
def get_my_rooms_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_my_rooms(
        current_user=current_user,
        db=db,
    )


@router.post(
    "/join",
    response_model=RoomMembershipResponse,
    status_code=201,
)
def join_existing_room(
    join_data: RoomJoinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return join_room(
        join_code=join_data.join_code,
        current_user=current_user,
        db=db,
    )

@router.get(
    "/{room_id}/members",
    response_model=list[RoomMemberResponse],
)
def get_members(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_room_members(
        room_id=room_id,
        current_user=current_user,
        db=db,
    )

@router.get(
    "/{room_id}/requests",
    response_model=list[RoomRequestResponse],
)
def get_join_requests(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_room_requests(
        room_id=room_id,
        current_user=current_user,
        db=db,
    )


@router.post(
    "/{room_id}/requests/{membership_id}/approve",
    response_model=RoomMembershipResponse,
)
def approve_join_request(
    room_id: int,
    membership_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return approve_room_request(
        room_id=room_id,
        membership_id=membership_id,
        current_user=current_user,
        db=db,
    )


@router.post(
    "/{room_id}/requests/{membership_id}/reject",
    response_model=RoomMembershipResponse,
)
def reject_join_request(
    room_id: int,
    membership_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return reject_room_request(
        room_id=room_id,
        membership_id=membership_id,
        current_user=current_user,
        db=db,
    )