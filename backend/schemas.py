from datetime import datetime

from pydantic import BaseModel, EmailStr

from enum import Enum

class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"
    CANCELLED = "CANCELLED"
    
class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"    

class TaskSortBy(str, Enum):
    ID = "id"
    TITLE = "title"
    PRIORITY = "priority"
    DUE_DATE = "due_date"


class TaskSortOrder(str, Enum):
    ASC = "asc"
    DESC = "desc"

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    role: str
    is_active: bool

    model_config = {
        "from_attributes": True
    }


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: int
    due_date: datetime | None = None
    
class DeadlineStatus(str, Enum):
    NO_DUE_DATE = "NO_DUE_DATE"
    NORMAL = "NORMAL"
    OVERDUE = "OVERDUE"
    UPCOMING = "UPCOMING"


class TaskResponse(BaseModel):
    id: int
    title: str
    description: str | None
    status: str
    priority: str
    assigned_to: int
    created_by: int
    due_date: datetime | None
    created_at: datetime
    updated_at: datetime
    deadline_status: DeadlineStatus
    previous_status: TaskStatus | None

    model_config = {
        "from_attributes": True
    }
    
class TaskHistoryResponse(BaseModel):
    id: int
    task_id: int
    old_status: TaskStatus | None
    new_status: TaskStatus
    changed_by: int
    changed_at: datetime

    model_config = {
        "from_attributes": True
    }
    
class TaskSummary(BaseModel):
    total: int
    todo: int
    in_progress: int
    done: int
    cancelled: int
    overdue: int
    upcoming: int
    no_due_date: int
    low_priority: int
    medium_priority: int
    high_priority: int



class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assigned_to: int | None = None
    due_date: datetime | None = None
    
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str