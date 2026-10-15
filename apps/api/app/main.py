from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from apps.api.app.core.config import settings
from apps.api.app.core.database import engine, Base, AsyncSessionLocal
from apps.api.app.models.stock import Stock
from apps.api.app.data_providers.nse_provider import NSE_UNIVERSE
from apps.api.app.api.v1.auth import router as auth_router
from apps.api.app.api.v1.users import router as users_router
from apps.api.app.api.v1.stocks import router as stocks_router
from apps.api.app.api.v1.portfolio import router as portfolio_router
from apps.api.app.api.v1.watchlists import router as watchlists_router
from apps.api.app.api.v1.predictions import router as predictions_router
from apps.api.app.api.v1.news import router as news_router
from apps.api.app.api.v1.regulatory import router as regulatory_router
from apps.api.app.api.v1.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial NSE stocks if empty
    async with AsyncSessionLocal() as session:
        result = await session.execute(text("SELECT count(*) FROM stocks"))
        count = result.scalar()
        if count == 0:
            for sym, meta in NSE_UNIVERSE.items():
                stock = Stock(
                    symbol=sym,
                    exchange="NSE",
                    company_name=meta["company_name"],
                    sector=meta["sector"],
                    industry=meta["industry"],
                    currency="INR",
                    is_active=True,
                )
                session.add(stock)
            await session.commit()
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="StockPilot AI - Financial Analysis & Portfolio Decision-Support Backend API for Indian Equities (NSE/BSE)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global safe error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log cleanly without leaking internal credentials
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact support."},
    )

# Health & Operational Endpoints
@app.get("/health", tags=["Operational"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "model_version": settings.MODEL_VERSION,
    }


@app.get("/ready", tags=["Operational"])
async def readiness_check():
    # Verify database connectivity
    db_healthy = False
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_healthy = True
    except Exception:
        db_healthy = False

    if not db_healthy:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "unready", "database": "disconnected"},
        )

    return {
        "status": "ready",
        "database": "connected",
        "data_provider": settings.MARKET_DATA_PROVIDER,
    }

# Mount v1 routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(users_router, prefix=settings.API_V1_STR)
app.include_router(stocks_router, prefix=settings.API_V1_STR)
app.include_router(portfolio_router, prefix=settings.API_V1_STR)
app.include_router(watchlists_router, prefix=settings.API_V1_STR)
app.include_router(predictions_router, prefix=settings.API_V1_STR)
app.include_router(news_router, prefix=settings.API_V1_STR)
app.include_router(regulatory_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)
