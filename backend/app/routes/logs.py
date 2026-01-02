from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from datetime import datetime
import secrets
from app.database import get_db
from app.schemas import (
    AuditLogResponse, AuditLogPullResponse, AuditLogFilter,
    LogTokenCreate, LogTokenResponse, MessageResponse
)
from app.models import AuditLog, LogToken, AdminUser
from app.auth import get_current_user

router = APIRouter(tags=["Audit Logs"])


# === Log Token Management (Admin) ===

@router.get("/log-tokens", response_model=List[LogTokenResponse])
async def list_log_tokens(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(LogToken).order_by(LogToken.created_at.desc()))
    tokens = result.scalars().all()
    return [LogTokenResponse.model_validate(t) for t in tokens]


@router.post("/log-tokens", response_model=LogTokenResponse, status_code=status.HTTP_201_CREATED)
async def create_log_token(
    token_data: LogTokenCreate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    token = LogToken(
        name=token_data.name,
        token=secrets.token_urlsafe(32)
    )
    
    db.add(token)
    await db.commit()
    await db.refresh(token)
    
    return LogTokenResponse.model_validate(token)


@router.delete("/log-tokens/{token_id}", response_model=MessageResponse)
async def delete_log_token(
    token_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(LogToken).where(LogToken.id == token_id))
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log token not found"
        )
    
    await db.delete(token)
    await db.commit()
    
    return MessageResponse(message="Log token deleted successfully")


@router.post("/log-tokens/{token_id}/reset", response_model=MessageResponse)
async def reset_log_token_cursor(
    token_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(LogToken).where(LogToken.id == token_id))
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Log token not found"
        )
    
    token.last_pulled_id = 0
    await db.commit()
    
    return MessageResponse(message="Log token cursor reset successfully")


# === Admin Log Viewing ===

@router.get("/logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    operation: Optional[str] = None,
    bucket_name: Optional[str] = None,
    success: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)
    
    conditions = []
    if start_date:
        conditions.append(AuditLog.timestamp >= start_date)
    if end_date:
        conditions.append(AuditLog.timestamp <= end_date)
    if operation:
        conditions.append(AuditLog.operation == operation)
    if bucket_name:
        conditions.append(AuditLog.bucket_name == bucket_name)
    if success is not None:
        conditions.append(AuditLog.success == success)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return [AuditLogResponse.model_validate(log) for log in logs]


# === Token-Based Pull API (External) ===

@router.get("/pull", response_model=AuditLogPullResponse)
async def pull_logs(
    token: str = Query(..., description="Log pull token"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    operation: Optional[str] = None,
    bucket_name: Optional[str] = None,
    success: Optional[bool] = None,
    limit: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
):
    """
    Pull audit logs using a token. By default, returns all logs since last pull.
    The cursor is automatically updated after each successful pull.
    """
    # Verify token
    result = await db.execute(
        select(LogToken).where(LogToken.token == token, LogToken.is_active == True)
    )
    log_token = result.scalar_one_or_none()
    
    if not log_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive token"
        )
    
    # Build query - always start from last pulled ID
    query = select(AuditLog).where(AuditLog.id > log_token.last_pulled_id)
    
    conditions = []
    if start_date:
        conditions.append(AuditLog.timestamp >= start_date)
    if end_date:
        conditions.append(AuditLog.timestamp <= end_date)
    if operation:
        conditions.append(AuditLog.operation == operation)
    if bucket_name:
        conditions.append(AuditLog.bucket_name == bucket_name)
    if success is not None:
        conditions.append(AuditLog.success == success)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.order_by(AuditLog.id.asc()).limit(limit + 1)  # +1 to check if there's more
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    has_more = len(logs) > limit
    logs = logs[:limit]  # Trim to requested limit
    
    # Update token cursor if we got logs
    if logs:
        log_token.last_pulled_id = logs[-1].id
        log_token.last_pull_at = datetime.utcnow()
        await db.commit()
    
    return AuditLogPullResponse(
        logs=[AuditLogResponse.model_validate(log) for log in logs],
        last_id=logs[-1].id if logs else log_token.last_pulled_id,
        has_more=has_more,
        total_returned=len(logs)
    )
