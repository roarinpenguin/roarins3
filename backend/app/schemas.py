from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime


# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# API Key Schemas
class APIKeyCreate(BaseModel):
    name: str
    permissions: List[str] = []  # List of bucket names


class APIKeyResponse(BaseModel):
    id: str
    name: str
    access_key: str
    permissions: List[str]
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime]

    class Config:
        from_attributes = True


class APIKeyWithSecret(APIKeyResponse):
    secret_key: str  # Only returned on creation


# Bucket Schemas
class BucketCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=63, pattern=r'^[a-z0-9][a-z0-9.-]*[a-z0-9]$')
    description: Optional[str] = None
    versioning_enabled: bool = False
    lifecycle_days: Optional[int] = Field(None, ge=1)
    quota_bytes: Optional[int] = Field(None, ge=0)
    is_public: bool = False


class BucketUpdate(BaseModel):
    description: Optional[str] = None
    versioning_enabled: Optional[bool] = None
    lifecycle_days: Optional[int] = None
    quota_bytes: Optional[int] = None
    is_public: Optional[bool] = None


class BucketResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    versioning_enabled: bool
    lifecycle_days: Optional[int]
    quota_bytes: Optional[int]
    is_public: bool
    created_at: datetime
    current_size: Optional[int] = None
    object_count: Optional[int] = None

    class Config:
        from_attributes = True


# Object Schemas
class ObjectInfo(BaseModel):
    name: str
    size: int
    etag: Optional[str]
    last_modified: Optional[datetime]
    is_dir: bool = False


class ObjectUploadResponse(BaseModel):
    bucket: str
    object: str
    etag: str
    version_id: Optional[str]


# Audit Log Schemas
class AuditLogResponse(BaseModel):
    id: int
    timestamp: datetime
    operation: str
    bucket_name: Optional[str]
    object_key: Optional[str]
    api_key_id: Optional[str]
    client_ip: Optional[str]
    user_agent: Optional[str]
    request_size: Optional[int]
    response_size: Optional[int]
    duration_ms: Optional[int]
    status_code: Optional[int]
    success: bool
    error_message: Optional[str]
    extra_data: Optional[dict]

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    operation: Optional[str] = None
    bucket_name: Optional[str] = None
    success: Optional[bool] = None
    limit: int = Field(100, ge=1, le=1000)


class AuditLogPullResponse(BaseModel):
    logs: List[AuditLogResponse]
    last_id: int
    has_more: bool
    total_returned: int


# Log Token Schemas
class LogTokenCreate(BaseModel):
    name: str


class LogTokenResponse(BaseModel):
    id: str
    token: str
    name: str
    last_pulled_id: int
    is_active: bool
    created_at: datetime
    last_pull_at: Optional[datetime]

    class Config:
        from_attributes = True


# Dashboard Schemas
class DashboardStats(BaseModel):
    total_buckets: int
    total_objects: int
    total_size_bytes: int
    total_api_keys: int
    active_api_keys: int
    operations_today: int
    operations_this_week: int
    recent_errors: int


# Generic Response
class MessageResponse(BaseModel):
    message: str
    success: bool = True
