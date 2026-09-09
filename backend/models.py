from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )



    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )

    assigned_tasks: Mapped[list["Task"]] = relationship(
        foreign_keys="Task.assigned_to",
        back_populates="assignee"
    )

    created_tasks: Mapped[list["Task"]] = relationship(
        foreign_keys="Task.created_by",
        back_populates="creator"
    )
    
class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    join_code: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )

class RoomMembership(Base):
    __tablename__ = "room_memberships"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    room_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("rooms.id"),
        nullable=False
    )

    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="USER"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )    


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="TODO"
    )

    previous_status: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    @property
    def deadline_status(self) -> str:
        from utils import get_deadline_status
        return get_deadline_status(self)

    priority: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="MEDIUM"
    )

    assigned_to: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )

    created_by: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id"),
        nullable=False
    )
    
    room_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("rooms.id"),
        nullable=True
)

    due_date: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP")
    )

    assignee: Mapped[User] = relationship(
        foreign_keys=[assigned_to],
        back_populates="assigned_tasks"
    )

    creator: Mapped[User] = relationship(
        foreign_keys=[created_by],
        back_populates="created_tasks"
    )


class TaskHistory(Base):
    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)

    task_id = Column(
        Integer,
        ForeignKey("tasks.id"),
        nullable=False
    )

    old_status = Column(String, nullable=True)

    new_status = Column(
        String,
        nullable=False
    )

    changed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    changed_at = Column(
        DateTime,
        default=datetime.now
    )


class TaskRequest(Base):
    __tablename__ = "task_requests"
    
    room_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("rooms.id"),
        nullable=True,
)

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    description = Column(String, nullable=True)

    priority = Column(
        String,
        nullable=False
    )

    due_date = Column(
        DateTime,
        nullable=True
    )

    requested_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    status = Column(
        String,
        nullable=False,
        default="PENDING"
    )

    reviewed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    reviewed_at = Column(
        DateTime,
        nullable=True
    )

    review_comment = Column(
        String,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.now
    )