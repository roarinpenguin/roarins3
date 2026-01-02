from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, BigInteger, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class APIKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    access_key = Column(String(64), unique=True, nullable=False)
    secret_key_hash = Column(String(255), nullable=False)
    permissions = Column(JSON, default=list)  # List of bucket names with access
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    
    audit_logs = relationship("AuditLog", back_populates="api_key_rel")


class Bucket(Base):
    __tablename__ = "buckets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), unique=True, nullable=False)
    versioning_enabled = Column(Boolean, default=False)
    lifecycle_days = Column(Integer, nullable=True)  # Auto-delete after X days, null = never
    quota_bytes = Column(BigInteger, nullable=True)  # Max size in bytes, null = unlimited
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    description = Column(Text, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    operation = Column(String(50), nullable=False, index=True)  # PUT, GET, DELETE, LIST, etc.
    bucket_name = Column(String(255), nullable=True, index=True)
    object_key = Column(Text, nullable=True)
    api_key_id = Column(String(36), ForeignKey("api_keys.id"), nullable=True)
    client_ip = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    request_size = Column(BigInteger, nullable=True)
    response_size = Column(BigInteger, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    status_code = Column(Integer, nullable=True)
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    extra_data = Column(JSON, nullable=True)
    
    api_key_rel = relationship("APIKey", back_populates="audit_logs")


class LogToken(Base):
    __tablename__ = "log_tokens"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    token = Column(String(64), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    last_pulled_id = Column(BigInteger, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_pull_at = Column(DateTime, nullable=True)


class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
