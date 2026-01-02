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
    """Debug endpoint to test audit logging directly"""
    from app.database import async_session
    from app.models import AuditLog
    from sqlalchemy import select, func
    from datetime import datetime
    
    error_msg = None
    log_id = None
    
    # Try to create audit log entry directly (bypass AuditLogger class)
    try:
        async with async_session() as db:
            log_entry = AuditLog(
                timestamp=datetime.utcnow(),
                operation="TEST",
                bucket_name="debug-test",
                status_code=200,
                success=True,
                extra_data={"test": True}
            )
            db.add(log_entry)
            await db.commit()
            await db.refresh(log_entry)
            log_id = log_entry.id
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"
    
    # Count existing audit logs
    total_logs = 0
    try:
        async with async_session() as db:
            count_result = await db.execute(select(func.count(AuditLog.id)))
            total_logs = count_result.scalar()
    except Exception as e:
        error_msg = (error_msg or "") + f"\nCount error: {e}"
    
    return {
        "audit_log_created": log_id is not None,
        "audit_log_id": log_id,
        "total_audit_logs": total_logs,
        "error": error_msg
    }


@app.get("/api/debug/test-minio")
async def test_minio():
    """Debug endpoint to test MinIO mc CLI"""
    import subprocess
    from app.config import get_settings
    
    settings = get_settings()
    results = {}
    
    # Check if mc exists
    try:
        which_result = subprocess.run(["which", "mc"], capture_output=True, text=True)
        results["mc_path"] = which_result.stdout.strip() if which_result.returncode == 0 else None
        results["mc_exists"] = which_result.returncode == 0
    except Exception as e:
        results["mc_exists"] = False
        results["mc_error"] = str(e)
    
    # Try to set up alias
    try:
        alias_result = subprocess.run(
            ["mc", "alias", "set", "local", 
             f"http://{settings.minio_endpoint}",
             settings.minio_access_key,
             settings.minio_secret_key],
            capture_output=True, text=True, timeout=10
        )
        results["alias_success"] = alias_result.returncode == 0
        results["alias_stdout"] = alias_result.stdout
        results["alias_stderr"] = alias_result.stderr
    except Exception as e:
        results["alias_success"] = False
        results["alias_error"] = str(e)
    
    # Try to list service accounts
    try:
        list_result = subprocess.run(
            ["mc", "admin", "user", "svcacct", "list", "local", "minioadmin"],
            capture_output=True, text=True, timeout=10
        )
        results["list_success"] = list_result.returncode == 0
        results["list_stdout"] = list_result.stdout
        results["list_stderr"] = list_result.stderr
    except Exception as e:
        results["list_success"] = False
        results["list_error"] = str(e)
    
    results["minio_endpoint"] = settings.minio_endpoint
    
    return results


@app.get("/")
async def root():
    return {
        "name": "RoarinS3",
        "description": "On-premises S3-compatible object storage",
        "docs": "/docs",
        "api": "/api"
    }
