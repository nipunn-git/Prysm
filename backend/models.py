import datetime
import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    website = Column(String, nullable=True)
    twitter = Column(String, nullable=True)
    status_emoji = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repositories = relationship("Repository", back_populates="owner", cascade="all, delete-orphan")

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String, default="Other", index=True)  # Coding, Research, Education, Writing, Productivity, Other
    visibility = Column(String, default="Public", index=True)  # Public, Private
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="repositories")
    versions = relationship("PromptVersion", back_populates="repository", cascade="all, delete-orphan", order_by="desc(PromptVersion.created_at)")

class PromptVersion(Base):
    __tablename__ = "prompt_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False)
    version = Column(String, nullable=False)  # e.g., v1.0, v1.1
    content = Column(Text, nullable=False)
    change_description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    repository = relationship("Repository", back_populates="versions")

class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(String, primary_key=True, default=generate_uuid)
    follower_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    following_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class RepositoryStar(Base):
    __tablename__ = "repository_stars"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    repository_id = Column(String, ForeignKey("repositories.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    type = Column(String, default="follow", index=True)  # follow, star, system
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Integer, default=0, index=True)  # 0 = unread, 1 = read
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    recipient = relationship("User", foreign_keys=[recipient_id])
    sender = relationship("User", foreign_keys=[sender_id])


