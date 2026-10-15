# StockPilot AI - Backend API (FastAPI)

FastAPI REST backend for StockPilot AI providing multi-user authentication, PostgreSQL persistence with SQLAlchemy 2.x and Alembic migrations, technical indicator calculations, market data adapters, and ML model inference.

## Features
- **Native JWT Authentication**: Registration, login, token refresh, and user profile management with bcrypt password hashing.
- **Strict Data Isolation**: Multi-tenant authorization ensuring User A cannot read, modify, or delete User B's portfolio holdings or watchlists.
- **Market Data Provider**: NSE Indian equities data provider for 15 liquid assets with OHLCV history, fundamentals, corporate events, and SEBI regulatory circulars.
- **Technical Indicators Engine**: Rock-solid, tested calculations for RSI(14), MACD(12,26,9), Bollinger Bands(20,2), ATR(14), rolling volatility, and candlestick pattern detection (Doji, Hammer, Engulfing, Morning Star).
- **ML Model Adapter**: Strict schema enforcement, zero lookahead bias, and explicit `UNAVAILABLE` status handling when artifacts are missing.

## Local Setup & Development

### 1. Python Virtual Environment
```bash
python -m venv .venv
# Windows:
.\.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Environment Variables
Copy `.env.example` to `.env`:
```bash
# In development, local SQLite async is default:
DATABASE_URL=sqlite+aiosqlite:///./stockpilot.db
DATABASE_SYNC_URL=sqlite:///./stockpilot.db

# In production with Supabase PostgreSQL:
# DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
# DATABASE_SYNC_URL=postgresql+psycopg://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
```

### 4. Database Migrations
Initialize database tables with Alembic or automatic startup creation:
```bash
alembic upgrade head
```

### 5. Start the Development Server
```bash
uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI documentation will be accessible at: `http://localhost:8000/docs`

### 6. Run Automated Test Suite
```bash
pytest -v apps/api/tests
```
