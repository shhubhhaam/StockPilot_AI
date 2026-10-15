# StockPilot AI

> Full-stack, multi-user stock analysis and portfolio decision-support web application focused initially on the Indian equity market (NSE/BSE).

---

## 1. Overview & Architecture

StockPilot AI delivers portfolio tracking, financial analytics, technical indicator computation, fundamental analysis, and transparent ML quantitative decision support tailored for Indian retail and institutional equities.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        StockPilot AI Web Client                        │
│                   (Next.js 14, Tailwind, Recharts)                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (JWT Auth)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      StockPilot AI FastAPI Backend                     │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  API Routers (/auth, /stocks, /portfolio, /watchlists, /ml, ...)   │ │
│ └─────────────────────────────────┬──────────────────────────────────┘ │
│                                   │                                    │
│         ┌─────────────────────────┼─────────────────────────┐          │
│         ▼                         ▼                         ▼          │
│ ┌───────────────┐        ┌─────────────────┐       ┌─────────────────┐ │
│ │  SQLAlchemy   │        │    Technical    │       │  Model Adapter  │ │
│ │  PostgreSQL / │        │   Indicators    │       │   (ml/adapter)  │ │
│ │    Alembic    │        │  (Vectorized)   │       │  Zero-Leakage   │ │
│ └───────────────┘        └─────────────────┘       └─────────────────┘ │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
            ┌──────────────────────┐ ┌──────────────────────┐
            │ Supabase PostgreSQL  │ │ NSE Market Feed /    │
            │  (Timezone-aware)    │ │ Public Filings / SEBI│
            └──────────────────────┘ └──────────────────────┘
```

---

## 2. Monorepo Organization

```text
stockpilot-ai/
├── apps/
│   ├── web/                     # Next.js 14 App Router Frontend
│   │   ├── src/
│   │   │   ├── app/             # (auth), (dashboard) overview, portfolio, stocks, etc.
│   │   │   ├── components/      # charts, layout, portfolio, ui
│   │   │   ├── hooks/           # useAuth, useTheme
│   │   │   ├── lib/             # api client, formatters, utils
│   │   │   └── types/           # Strongly typed data models
│   │   ├── package.json
│   │   └── tailwind.config.js
│   │
│   └── api/                     # FastAPI Python Backend
│       ├── app/
│       │   ├── main.py          # FastAPI application & lifespan
│       │   ├── api/v1/          # Endpoints for auth, stocks, portfolio, etc.
│       │   ├── auth/            # JWT dependencies & security
│       │   ├── core/            # Config, database engine, bcrypt
│       │   ├── data_providers/  # NSE data provider & market abstractions
│       │   ├── ml/              # Model Adapter & feature extraction
│       │   ├── models/          # SQLAlchemy 2.x database models
│       │   ├── schemas/         # Pydantic v2 schemas
│       │   └── services/        # Indicators math & portfolio analytics
│       ├── alembic/             # Database migration environment
│       ├── tests/               # Pytest automated test suite
│       └── requirements.txt
│
├── ml/
│   ├── README.md                # ML architecture & integration guide
│   ├── artifacts/               # Trained model weights & metadata
│   ├── feature_schemas/         # Time-aligned feature schemas
│   └── evaluation/              # Backtesting & outcome evaluations
│
├── docker-compose.yml           # Local multi-container development
├── pytest.ini                   # Python test configuration
├── .env.example                 # Environment variable templates
└── README.md
```

---

## 3. Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript (strict), Tailwind CSS, Lucide React, Recharts, Axios, TanStack Query.
- **Backend**: Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2.x, Alembic, PyJWT, bcrypt, NumPy, pandas, scikit-learn.
- **Database**: PostgreSQL (Supabase / local PostgreSQL) with SQLite async fallback for local testing.

---

## 4. Getting Started Locally

### Prerequisites
- Python 3.12+ (or 3.14)
- Node.js 18+ and npm

### Step 1: Set Up Backend
```bash
# In repository root:
python -m venv .venv

# Activate virtual environment:
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies:
pip install -r apps/api/requirements.txt
```

### Step 2: Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration uses local SQLite async for immediate out-of-the-box operation. To use Supabase PostgreSQL:
```env
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
DATABASE_SYNC_URL=postgresql+psycopg://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require
```

### Step 3: Run Backend Tests
Verify calculation correctness, JWT authorization, and multi-user data isolation:
```bash
pytest -v apps/api/tests
```

### Step 4: Start FastAPI Backend
```bash
uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base: `http://localhost:8000/api/v1`
- OpenAPI Swagger Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Step 5: Start Next.js Frontend
In a new terminal:
```bash
cd apps/web
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 5. Pre-Seeded Liquid NSE Universe

StockPilot AI comes pre-configured with 15 liquid NSE equities across diverse sectors:
- `RELIANCE` (Reliance Industries - Energy & Conglomerate)
- `TCS` (Tata Consultancy Services - IT Services)
- `INFY` (Infosys - IT Services)
- `HDFCBANK` (HDFC Bank - Banking)
- `ICICIBANK` (ICICI Bank - Banking)
- `SBIN` (State Bank of India - Public Sector Banking)
- `BHARTIARTL` (Bharti Airtel - Telecom)
- `ITC` (ITC Limited - FMCG)
- `KOTAKBANK` (Kotak Mahindra Bank - Banking)
- `LT` (Larsen & Toubro - Infrastructure)
- `HINDUNILVR` (Hindustan Unilever - FMCG)
- `TATAMOTORS` (Tata Motors - Automotive)
- `SUNPHARMA` (Sun Pharma - Healthcare)
- `BAJFINANCE` (Bajaj Finance - NBFC)
- `MARUTI` (Maruti Suzuki - Automotive)

---

## 6. Machine Learning Model Adapter & Transparency

- **Model Adapter Pattern**: Located in `apps/api/app/ml/adapter.py`.
- **Zero-Lookahead Guarantee**: Features (`rsi_14`, `macd_histogram`, `bb_percent_b`, `volatility_20d`, `return_5d`, `atr_14_normalized`, `volume_ratio_20d`) are computed strictly using historical bars available at the prediction timestamp.
- **Safe Standby Mode**: When model weight files (`ml/artifacts/stockpilot_model.joblib`) are not uploaded, the application reports `ModelStatus.UNAVAILABLE` with exact missing requirements and transparent quantitative postures. It **never** fabricates fake uncalibrated probabilities.

---

## 7. Security & User Isolation

- Passwords hashed using bcrypt.
- Signed short-lived JWT access tokens.
- Strict database ownership filters: User A cannot read, modify, or delete holdings or watchlists owned by User B (verified by automated tests in `apps/api/tests/test_api_auth_isolation.py`).
- No credentials or API secrets exposed to frontend bundles.

---

## 8. License & Attribution

- Built as an analysis and decision-support tool for educational and research purposes.
- Does not execute real-money trades or brokerage orders.
