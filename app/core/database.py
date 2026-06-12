from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.core.config import get_settings

settings = get_settings()

# SQLite (lokalni dev/test) ne podržava pool_size/max_overflow
_pool_kwargs = (
    {}
    if settings.DATABASE_URL.startswith("sqlite")
    else {"pool_size": 5, "max_overflow": 10}
)

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    **_pool_kwargs,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    """Initialize database tables"""
    from app.models.models import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
