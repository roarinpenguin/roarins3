from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog
import time


class AuditLogger:
    def __init__(self):
        self._start_time: Optional[float] = None
    
    def start_timer(self):
        self._start_time = time.time()
    
    def get_duration_ms(self) -> Optional[int]:
        if self._start_time is None:
            return None
        return int((time.time() - self._start_time) * 1000)
    
    async def log(
        self,
        db: AsyncSession,
        operation: str,
        bucket_name: Optional[str] = None,
        object_key: Optional[str] = None,
        api_key_id: Optional[str] = None,
        client_ip: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_size: Optional[int] = None,
        response_size: Optional[int] = None,
        duration_ms: Optional[int] = None,
        status_code: Optional[int] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> AuditLog:
        log_entry = AuditLog(
            timestamp=datetime.utcnow(),
            operation=operation,
            bucket_name=bucket_name,
            object_key=object_key,
            api_key_id=api_key_id,
            client_ip=client_ip,
            user_agent=user_agent,
            request_size=request_size,
            response_size=response_size,
            duration_ms=duration_ms or self.get_duration_ms(),
            status_code=status_code,
            success=success,
            error_message=error_message,
            metadata=metadata
        )
        
        db.add(log_entry)
        await db.commit()
        await db.refresh(log_entry)
        
        return log_entry


def get_client_ip(request) -> str:
    """Extract client IP from request, handling proxies"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def get_user_agent(request) -> str:
    return request.headers.get("User-Agent", "unknown")
