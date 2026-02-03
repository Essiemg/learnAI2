"""
LearnAI Backend API
===================
FastAPI application for the AI tutoring platform.

This is the main entry point for the backend API. It:
1. Loads configuration from .env file
2. Connects to PostgreSQL database
3. Loads ML models for tutoring
4. Serves REST API endpoints

Usage:
    # Development
    uvicorn main:app --reload --port 8000
    
    # Production
    uvicorn main:app --host 0.0.0.0 --port 8000

Environment Variables Required:
    DATABASE_URL: PostgreSQL connection string
    JWT_SECRET_KEY: Secret key for JWT tokens
    
See .env.example for all configuration options.
"""
import sys
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables first (before other imports that depend on them)
from dotenv import load_dotenv
load_dotenv()

from config import get_settings
from db import engine, verify_database_connection, init_database
from ml_models import load_policy_model, load_phi3_model

# Import routers
from routers.auth_routes import router as auth_router
from routers.tutor_routes import router as tutor_router
from routers.progress_routes import router as progress_router
from routers.goals_routes import router as goals_router
from routers.chat_routes import router as chat_router
from routers.quiz_routes import router as quiz_router
from routers.flashcard_routes import router as flashcard_router
from routers.essay_routes import router as essay_router
from routers.summary_routes import router as summary_router
from routers.diagram_routes import router as diagram_router
from routers.voice_routes import router as voice_router
from routers.voice_routes_v2 import router as voice_v2_router
from routers.ocr_routes import router as ocr_router

# =============================================================================
# Logging Configuration
# =============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load settings
settings = get_settings()

# Validate critical environment variables
if not settings.DATABASE_URL:
    logger.error("FATAL: DATABASE_URL environment variable is not set!")
    logger.error("Please create a .env file with your database connection string.")
    logger.error("Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/ai_tutor")
    sys.exit(1)

if settings.JWT_SECRET_KEY == "your-super-secret-key-change-in-production":
    logger.warning("WARNING: Using default JWT_SECRET_KEY. Please change this in production!")


# =============================================================================
# Application Lifespan (Startup/Shutdown)
# =============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    
    Handles startup and shutdown events:
    - Startup: Verify database connection, load ML models
    - Shutdown: Clean up resources
    """
    # -------------------------------------------------------------------------
    # STARTUP
    # -------------------------------------------------------------------------
    logger.info("=" * 60)
    logger.info("Starting LearnAI Backend API...")
    logger.info("=" * 60)
    
    # Step 1: Verify database connection
    logger.info("Step 1: Verifying database connection...")
    if not verify_database_connection():
        logger.error("FATAL: Cannot connect to database. Exiting.")
        sys.exit(1)
    
    # Step 1b: Initialize database tables (auto-create for SQLite)
    logger.info("Step 1b: Initializing database tables...")
    init_database()
    
    # Step 2: Load ML models
    logger.info("Step 2: Loading ML models...")
    
    # Load policy model for strategy prediction
    policy_model = load_policy_model(settings.POLICY_MODEL_PATH)
    if policy_model:
        logger.info("✓ Policy model loaded successfully")
    else:
        logger.warning("⚠ Policy model not found - using fallback strategy selection")
    
    # Load Phi-3 model (optional - can be slow and memory-intensive)
    if settings.DEBUG:
        logger.info("Debug mode: Skipping Phi-3 model loading for faster startup")
    else:
        phi3, tokenizer = load_phi3_model(
            settings.PHI3_MODEL_PATH,
            settings.PHI3_LORA_PATH
        )
        if phi3:
            logger.info("✓ Phi-3 model loaded successfully")
        else:
            logger.warning("⚠ Phi-3 model not found - using fallback responses")
    
    # Startup complete
    logger.info("=" * 60)
    logger.info("LearnAI Backend API started successfully!")
    logger.info(f"API Docs: http://localhost:8000/api/docs")
    logger.info(f"Database: {settings.DATABASE_URL.split('@')[-1]}")  # Log without password
    logger.info("=" * 60)
    
    yield
    
    # -------------------------------------------------------------------------
    # SHUTDOWN
    # -------------------------------------------------------------------------
    logger.info("Shutting down LearnAI Backend API...")
    logger.info("Cleanup complete. Goodbye!")


# =============================================================================
# FastAPI Application
# =============================================================================
app = FastAPI(
    title="LearnAI API",
    description="AI Tutoring Platform Backend API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    debug=True  # Enable debug mode for detailed error messages
)

# Debug exception handler
from fastapi.responses import JSONResponse
from fastapi import Request

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()}
    )

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(tutor_router, prefix="/api")
app.include_router(progress_router, prefix="/api")
app.include_router(goals_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(quiz_router, prefix="/api")
app.include_router(flashcard_router, prefix="/api")
app.include_router(essay_router, prefix="/api")
app.include_router(summary_router, prefix="/api")
app.include_router(diagram_router, prefix="/api")
app.include_router(voice_router, prefix="/api")
app.include_router(voice_v2_router, prefix="/api/v2")  # New voice routes with emotions

# Add WebSocket route at root level (not under /api prefix)
# Re-export the websocket endpoint from voice_v2_router
from routers.voice_routes_v2 import live_lecture_websocket
app.add_api_websocket_route("/ws/live-lecture", live_lecture_websocket)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LearnAI API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "learnai-api"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
