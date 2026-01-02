from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from app.database import get_db
from app.schemas import DashboardStats
from app.models import Bucket, APIKey, AuditLog, AdminUser
from app.auth import get_current_user
from app.minio_client import minio_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Count buckets
    bucket_result = await db.execute(select(func.count(Bucket.id)))
    total_buckets = bucket_result.scalar() or 0
    
    # Count API keys
    key_result = await db.execute(select(func.count(APIKey.id)))
    total_api_keys = key_result.scalar() or 0
    
    active_key_result = await db.execute(
        select(func.count(APIKey.id)).where(APIKey.is_active == True)
    )
    active_api_keys = active_key_result.scalar() or 0
    
    # Calculate total objects and size
    total_objects = 0
    total_size = 0
    try:
        buckets = minio_service.list_buckets()
        for bucket in buckets:
            objects = minio_service.list_objects(bucket["name"])
            total_objects += len(objects)
            total_size += sum(o["size"] for o in objects if not o.get("is_dir"))
    except:
        pass
    
    # Operations today
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ops_today_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.timestamp >= today_start)
    )
    operations_today = ops_today_result.scalar() or 0
    
    # Operations this week
    week_start = today_start - timedelta(days=today_start.weekday())
    ops_week_result = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.timestamp >= week_start)
    )
    operations_this_week = ops_week_result.scalar() or 0
    
    # Recent errors (last 24 hours)
    errors_result = await db.execute(
        select(func.count(AuditLog.id)).where(
            AuditLog.timestamp >= today_start - timedelta(days=1),
            AuditLog.success == False
        )
    )
    recent_errors = errors_result.scalar() or 0
    
    return DashboardStats(
        total_buckets=total_buckets,
        total_objects=total_objects,
        total_size_bytes=total_size,
        total_api_keys=total_api_keys,
        active_api_keys=active_api_keys,
        operations_today=operations_today,
        operations_this_week=operations_this_week,
        recent_errors=recent_errors
    )
