from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import init_db
from app.routes import auth, buckets, api_keys, objects, logs, dashboard, setup


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    yield
    # Shutdown


app = FastAPI(
    title="RoarinS3",
    description="On-premises S3-compatible object storage with management UI and audit logging",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(setup.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(buckets.router, prefix="/api")
app.include_router(api_keys.router, prefix="/api")
app.include_router(objects.router, prefix="/api")
app.include_router(logs.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "roarins3"}


@app.get("/api/debug/test-audit")
async def test_audit():
    """Debug endpoint to test audit logging"""
    from app.audit import AuditLogger
    from app.database import async_session
    from app.models import AuditLog
    from sqlalchemy import select, func
    
    audit = AuditLogger()
    audit.start_timer()
    
    # Try to create an audit log entry
    result = await audit.log(
        operation="TEST",
        bucket_name="debug-test",
        status_code=200,
        success=True,
        extra_data={"test": True}
    )
    
    # Count existing audit logs
    async with async_session() as db:
        count_result = await db.execute(select(func.count(AuditLog.id)))
        total_logs = count_result.scalar()
    
    return {
        "audit_log_created": result is not None,
        "audit_log_id": result.id if result else None,
        "total_audit_logs": total_logs
    }


@app.get("/")
async def root():
    return {
        "name": "RoarinS3",
        "description": "On-premises S3-compatible object storage",
        "docs": "/docs",
        "api": "/api"
    }
