from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    username: str
    name: Optional[str] = None
    email: str
    avatar: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    status_emoji: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar: Optional[str] = None
    name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    twitter: Optional[str] = None
    status_emoji: Optional[str] = None

class UserResponse(UserBase):
    id: str
    created_at: datetime
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    repos_count: Optional[int] = 0
    is_following: Optional[bool] = False

    class Config:
        from_attributes = True

# PromptVersion Schemas
class PromptVersionBase(BaseModel):
    version: str
    content: str
    change_description: Optional[str] = None

class PromptVersionCreate(BaseModel):
    content: str
    change_description: Optional[str] = "Updated prompt"
    version_bump: Optional[str] = "patch" # patch (v1.1) or major (v2.0) or custom

class PromptVersionResponse(PromptVersionBase):
    id: str
    repository_id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Repository Schemas
class RepositoryBase(BaseModel):
    name: str
    description: Optional[str] = ""
    category: str = "Other"  # Coding, Research, Education, Writing, Productivity, Other
    visibility: str = "Public"  # Public, Private

class RepositoryCreate(RepositoryBase):
    initial_prompt: Optional[str] = ""

class RepositoryUpdate(BaseModel):
    description: Optional[str] = None
    category: Optional[str] = None
    visibility: Optional[str] = None

class RepositoryResponse(RepositoryBase):
    id: str
    owner_id: str
    owner_username: str = "user"
    owner_name: str
    owner_avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    versions_count: int = 0
    latest_version: Optional[str] = None
    latest_prompt: Optional[str] = None
    stars_count: Optional[int] = 0
    forks_count: Optional[int] = 0
    is_starred: Optional[bool] = False

    class Config:
        from_attributes = True


class RepositoryDetailResponse(RepositoryResponse):
    versions: List[PromptVersionResponse] = []

# AI Optimizer Schemas
class OptimizationRequest(BaseModel):
    prompt: str
    instructions: Optional[str] = ""

class OptimizationResponse(BaseModel):
    improved_prompt: str
    changes: List[str]

# Compare Request & Response
class CompareResponse(BaseModel):
    version_a: PromptVersionResponse
    version_b: PromptVersionResponse

# AI Create Repo Request
class AICreateRepoRequest(BaseModel):
    query: str
    action_type: Optional[str] = "custom"
    user_id: Optional[str] = None
    visibility: Optional[str] = "Public"

# Notification Schemas
class NotificationResponse(BaseModel):
    id: str
    recipient_id: str
    sender_id: Optional[str] = None
    sender_username: Optional[str] = None
    sender_name: Optional[str] = None
    sender_avatar: Optional[str] = None
    type: str = "follow"
    title: str
    message: str
    link: Optional[str] = None
    is_read: bool = False
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    unread_count: int


