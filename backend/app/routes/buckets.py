from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.database import get_db
from app.schemas import BucketCreate, BucketUpdate, BucketResponse, MessageResponse
from app.models import Bucket, AdminUser
from app.auth import get_current_user
from app.minio_client import minio_service

router = APIRouter(prefix="/buckets", tags=["Buckets"])


@router.get("", response_model=List[BucketResponse])
async def list_buckets(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bucket).order_by(Bucket.created_at.desc()))
    buckets = result.scalars().all()
    
    response = []
    for bucket in buckets:
        bucket_data = BucketResponse.model_validate(bucket)
        try:
            objects = minio_service.list_objects(bucket.name)
            bucket_data.object_count = len(objects)
            bucket_data.current_size = sum(o["size"] for o in objects if not o["is_dir"])
        except:
            bucket_data.object_count = 0
            bucket_data.current_size = 0
        response.append(bucket_data)
    
    return response


@router.post("", response_model=BucketResponse, status_code=status.HTTP_201_CREATED)
async def create_bucket(
    bucket: BucketCreate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Check if bucket exists in DB
    result = await db.execute(select(Bucket).where(Bucket.name == bucket.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bucket already exists"
        )
    
    # Create in MinIO
    try:
        minio_service.create_bucket(bucket.name)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    # Create in DB
    db_bucket = Bucket(
        name=bucket.name,
        description=bucket.description,
        versioning_enabled=bucket.versioning_enabled,
        lifecycle_days=bucket.lifecycle_days,
        quota_bytes=bucket.quota_bytes,
        is_public=bucket.is_public
    )
    db.add(db_bucket)
    await db.commit()
    await db.refresh(db_bucket)
    
    # Apply settings
    try:
        if bucket.versioning_enabled:
            minio_service.set_bucket_versioning(bucket.name, True)
        if bucket.lifecycle_days:
            minio_service.set_bucket_lifecycle(bucket.name, bucket.lifecycle_days)
    except Exception as e:
        pass  # Non-critical, log but continue
    
    return BucketResponse.model_validate(db_bucket)


@router.get("/{bucket_name}", response_model=BucketResponse)
async def get_bucket(
    bucket_name: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    response = BucketResponse.model_validate(bucket)
    try:
        objects = minio_service.list_objects(bucket.name)
        response.object_count = len(objects)
        response.current_size = sum(o["size"] for o in objects if not o["is_dir"])
    except Exception as e:
        print(f"Error getting bucket stats for {bucket.name}: {e}")
        response.object_count = 0
        response.current_size = 0
    
    return response


@router.put("/{bucket_name}", response_model=BucketResponse)
async def update_bucket(
    bucket_name: str,
    update: BucketUpdate,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    # Update DB fields
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(bucket, key, value)
    
    await db.commit()
    await db.refresh(bucket)
    
    # Apply MinIO settings
    try:
        if update.versioning_enabled is not None:
            minio_service.set_bucket_versioning(bucket_name, update.versioning_enabled)
        if "lifecycle_days" in update_data:
            minio_service.set_bucket_lifecycle(bucket_name, update.lifecycle_days)
    except Exception as e:
        pass  # Log but continue
    
    return BucketResponse.model_validate(bucket)


@router.delete("/{bucket_name}", response_model=MessageResponse)
async def delete_bucket(
    bucket_name: str,
    force: bool = False,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    # Delete from MinIO
    try:
        minio_service.delete_bucket(bucket_name, force=force)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
    
    # Delete from DB
    await db.delete(bucket)
    await db.commit()
    
    return MessageResponse(message=f"Bucket '{bucket_name}' deleted successfully")
