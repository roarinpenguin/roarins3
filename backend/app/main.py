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


@app.get("/")
async def root():
    return {
        "name": "RoarinS3",
        "description": "On-premises S3-compatible object storage",
        "docs": "/docs",
        "api": "/api"
    }
