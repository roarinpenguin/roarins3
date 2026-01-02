from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import secrets
from app.database import get_db
from app.schemas import APIKeyCreate, APIKeyResponse, APIKeyWithSecret, MessageResponse
from app.models import APIKey, AdminUser
from app.auth import get_current_user, get_password_hash
from app.minio_client import minio_service
from app.audit import AuditLogger, get_client_ip, get_user_agent

router = APIRouter(prefix="/api-keys", tags=["API Keys"])


def generate_access_key() -> str:
    return f"ROAK{secrets.token_hex(16).upper()}"


def generate_secret_key() -> str:
    return secrets.token_urlsafe(32)


@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APIKey).order_by(APIKey.created_at.desc()))
    keys = result.scalars().all()
    return [APIKeyResponse.model_validate(k) for k in keys]


@router.post("", response_model=APIKeyWithSecret, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    audit = AuditLogger()
    audit.start_timer()
    access_key = generate_access_key()
    secret_key = generate_secret_key()
    
    # Create in MinIO first
    minio_created = minio_service.create_service_account(access_key, secret_key)
    if not minio_created:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create MinIO service account"
        )
    
    api_key = APIKey(
        name=key_data.name,
        access_key=access_key,
        secret_key_hash=get_password_hash(secret_key),
        permissions=key_data.permissions
    )
    
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    
    response = APIKeyWithSecret(
        id=api_key.id,
        name=api_key.name,
        access_key=api_key.access_key,
        secret_key=secret_key,  # Only returned once!
        permissions=api_key.permissions,
        is_active=api_key.is_active,
        created_at=api_key.created_at,
        last_used=api_key.last_used
    )
    
    # Log API key creation
    await audit.log(
        db=db,
        operation="CREATE_API_KEY",
        client_ip=get_client_ip(request),
        user_agent=get_user_agent(request),
        status_code=201,
        success=True,
        extra_data={"key_name": key_data.name, "permissions": key_data.permissions}
    )
    
    return response


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    
    return APIKeyResponse.model_validate(api_key)


@router.put("/{key_id}/permissions", response_model=APIKeyResponse)
async def update_api_key_permissions(
    key_id: str,
    permissions: List[str],
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    
    api_key.permissions = permissions
    await db.commit()
    await db.refresh(api_key)
    
    return APIKeyResponse.model_validate(api_key)


@router.post("/{key_id}/deactivate", response_model=MessageResponse)
async def deactivate_api_key(
    key_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    
    api_key.is_active = False
    await db.commit()
    
    return MessageResponse(message="API Key deactivated successfully")


@router.post("/{key_id}/activate", response_model=MessageResponse)
async def activate_api_key(
    key_id: str,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    
    api_key.is_active = True
    await db.commit()
    
    return MessageResponse(message="API Key activated successfully")


@router.delete("/{key_id}", response_model=MessageResponse)
async def delete_api_key(
    key_id: str,
    request: Request,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    audit = AuditLogger()
    audit.start_timer()
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API Key not found"
        )
    
    # Delete from MinIO (best effort - don't fail if MinIO delete fails)
    minio_service.delete_service_account(api_key.access_key)
    
    await db.delete(api_key)
    await db.commit()
    
    # Log API key deletion
    await audit.log(
        db=db,
        operation="DELETE_API_KEY",
        client_ip=get_client_ip(request),
        user_agent=get_user_agent(request),
        status_code=200,
        success=True,
        extra_data={"key_name": api_key.name}
    )
    
    return MessageResponse(message="API Key deleted successfully")
