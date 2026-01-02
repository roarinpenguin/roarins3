from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import json
import os
from pathlib import Path

from app.database import get_db
from app.models import AdminUser
from app.auth import get_password_hash
from sqlalchemy import select

router = APIRouter(prefix="/setup", tags=["Setup"])

CONFIG_FILE = Path("/data/config/roarins3.json")


class SetupRequest(BaseModel):
    admin_username: str
    admin_password: str
    jwt_secret: str


class SetupStatus(BaseModel):
    is_configured: bool
    requires_restart: bool = False
    message: str = ""


def get_config() -> dict:
    """Load config from file"""
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}


def save_config(config: dict):
    """Save config to file"""
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)


def is_setup_complete() -> bool:
    """Check if initial setup has been completed"""
    config = get_config()
    return config.get('setup_complete', False)


@router.get("/status", response_model=SetupStatus)
async def get_setup_status():
    """Check if system is configured"""
    if is_setup_complete():
        return SetupStatus(
            is_configured=True,
            message="System is configured"
        )
    return SetupStatus(
        is_configured=False,
        message="Initial setup required"
    )


@router.post("/initialize", response_model=SetupStatus)
async def initialize_system(
    request: SetupRequest,
    db: AsyncSession = Depends(get_db)
):
    """Perform initial system setup"""
    if is_setup_complete():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="System is already configured. Use reset to reconfigure."
        )
    
    # Validate inputs
    if len(request.admin_password) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin password must be at least 4 characters"
        )
    
    # Check if admin already exists
    result = await db.execute(
        select(AdminUser).where(AdminUser.username == request.admin_username)
    )
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        # Update existing admin
        existing_admin.password_hash = get_password_hash(request.admin_password)
    else:
        # Create admin user
        admin = AdminUser(
            username=request.admin_username,
            password_hash=get_password_hash(request.admin_password)
        )
        db.add(admin)
    
    await db.commit()
    
    # Save configuration
    config = {
        'setup_complete': True,
        'admin_username': request.admin_username,
        'jwt_secret': request.jwt_secret,
    }
    save_config(config)
    
    return SetupStatus(
        is_configured=True,
        requires_restart=False,
        message="Setup complete! You can now login with your admin credentials."
    )


@router.get("/reset-instructions")
async def get_reset_instructions():
    """Get instructions for resetting the system"""
    return {
        "title": "How to Reset RoarinS3",
        "instructions": [
            "1. Stop the container: docker-compose down",
            "2. Remove the config file: docker volume exec or manually delete /data/config/roarins3.json",
            "3. Optionally remove all data: docker-compose down -v",
            "4. Restart: docker-compose up -d",
            "5. Access the UI to run setup wizard again"
        ],
        "quick_reset_command": "docker-compose down && docker volume rm roarins3_roarins3_data && docker-compose up -d",
        "config_only_reset": "docker exec roarins3 rm -f /data/config/roarins3.json && docker-compose restart",
        "warning": "Removing the volume will delete all stored objects and audit logs!"
    }
