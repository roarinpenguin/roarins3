from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import io
from app.database import get_db
from app.schemas import ObjectInfo, ObjectUploadResponse, MessageResponse
from app.models import Bucket, AdminUser
from app.auth import get_current_user
from app.minio_client import minio_service
from app.audit import AuditLogger, get_client_ip, get_user_agent

router = APIRouter(prefix="/buckets/{bucket_name}/objects", tags=["Objects"])


@router.get("", response_model=List[ObjectInfo])
async def list_objects(
    bucket_name: str,
    prefix: Optional[str] = None,
    request: Request = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify bucket exists
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    audit = AuditLogger()
    audit.start_timer()
    
    try:
        objects = minio_service.list_objects(bucket_name, prefix=prefix)
        
        # Log the operation
        await audit.log(
            db=db,
            operation="LIST",
            bucket_name=bucket_name,
            object_key=prefix,
            client_ip=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            status_code=200,
            success=True,
            metadata={"count": len(objects)}
        )
        
        return [ObjectInfo(**obj) for obj in objects]
    except Exception as e:
        await audit.log(
            db=db,
            operation="LIST",
            bucket_name=bucket_name,
            status_code=500,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/{object_key:path}", response_model=ObjectUploadResponse)
async def upload_object(
    bucket_name: str,
    object_key: str,
    file: UploadFile = File(...),
    request: Request = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify bucket exists
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    audit = AuditLogger()
    audit.start_timer()
    
    try:
        # Read file content
        content = await file.read()
        content_length = len(content)
        
        # Check quota
        if bucket.quota_bytes:
            current_size = minio_service.get_bucket_size(bucket_name)
            if current_size + content_length > bucket.quota_bytes:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Bucket quota exceeded"
                )
        
        # Upload to MinIO
        result = minio_service.put_object(
            bucket_name=bucket_name,
            object_name=object_key,
            data=io.BytesIO(content),
            length=content_length,
            content_type=file.content_type or "application/octet-stream"
        )
        
        # Log the operation
        await audit.log(
            db=db,
            operation="PUT",
            bucket_name=bucket_name,
            object_key=object_key,
            client_ip=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            request_size=content_length,
            status_code=201,
            success=True,
            metadata={"etag": result["etag"], "content_type": file.content_type}
        )
        
        return ObjectUploadResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        await audit.log(
            db=db,
            operation="PUT",
            bucket_name=bucket_name,
            object_key=object_key,
            status_code=500,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{object_key:path}")
async def download_object(
    bucket_name: str,
    object_key: str,
    request: Request = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify bucket exists
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    audit = AuditLogger()
    audit.start_timer()
    
    try:
        data, content_type = minio_service.get_object(bucket_name, object_key)
        
        # Log the operation
        await audit.log(
            db=db,
            operation="GET",
            bucket_name=bucket_name,
            object_key=object_key,
            client_ip=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            response_size=len(data),
            status_code=200,
            success=True
        )
        
        filename = object_key.split("/")[-1]
        return StreamingResponse(
            io.BytesIO(data),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        await audit.log(
            db=db,
            operation="GET",
            bucket_name=bucket_name,
            object_key=object_key,
            status_code=500,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.delete("/{object_key:path}", response_model=MessageResponse)
async def delete_object(
    bucket_name: str,
    object_key: str,
    request: Request = None,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify bucket exists
    result = await db.execute(select(Bucket).where(Bucket.name == bucket_name))
    bucket = result.scalar_one_or_none()
    
    if not bucket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bucket not found"
        )
    
    audit = AuditLogger()
    audit.start_timer()
    
    try:
        minio_service.delete_object(bucket_name, object_key)
        
        # Log the operation
        await audit.log(
            db=db,
            operation="DELETE",
            bucket_name=bucket_name,
            object_key=object_key,
            client_ip=get_client_ip(request) if request else None,
            user_agent=get_user_agent(request) if request else None,
            status_code=200,
            success=True
        )
        
        return MessageResponse(message=f"Object '{object_key}' deleted successfully")
    except Exception as e:
        await audit.log(
            db=db,
            operation="DELETE",
            bucket_name=bucket_name,
            object_key=object_key,
            status_code=500,
            success=False,
            error_message=str(e)
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
