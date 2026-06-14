import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from app.core.config import get_settings
from app.core.database import init_db
from app.routes import license, admin

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events"""
    # Startup
    await init_db()
    yield
    # Shutdown (if needed)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# CORS - allow local development
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Starlette's ServerErrorMiddleware catches unhandled exceptions before the
# CORS middleware can add headers, so we handle them explicitly here.
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

# Routes
app.include_router(license.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Admin UI (statički Next.js export iz admin/out) — servira se sa istog origina.
# Build: cd admin && NEXT_OUTPUT=export npm run build
_admin_dist = Path(
    os.environ.get(
        "LICENSE_ADMIN_DIST",
        Path(__file__).resolve().parent.parent / "admin" / "out",
    )
)

if _admin_dist.is_dir():
    app.mount("/", StaticFiles(directory=_admin_dist, html=True), name="admin-ui")
else:
    @app.get("/")
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "status": "running"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
