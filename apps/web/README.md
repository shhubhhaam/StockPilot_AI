# StockPilot AI - Frontend Web App (Next.js 14)

Modern financial analytics and decision-support web application for Indian Equities built with Next.js App Router, TypeScript, Tailwind CSS, and Recharts.

## Features
- **Design System**: Rich financial terminal styling with deep navy dark mode (`#0A0E17`), crisp light mode, emerald green gains, crimson losses, and amber risk badges.
- **Responsive Layout**: Sidebar navigation, sticky top navbar with instant autocomplete search across all NSE stocks, and mobile drawer.
- **Interactive Candlestick Chart**: Custom SVG candlestick rendering (wicks + bodies), timeframe selectors (1M, 3M, 6M, 1Y), technical overlay toggles (SMA 20, SMA 50, EMA 20), and synchronized volume subchart.
- **Portfolio Management**: Complete holdings CRUD, live valuation, unrealized P&L in INR (`₹`), percentage returns, portfolio weights, and sector concentration alerts.
- **Stock Directory & Details**: Search, sector filters, 52-week ranges, company fundamentals (TTM revenue, EPS, P/E, P/B, ROE, ROCE), and news sentiment.
- **AI Insights & Transparency**: Decision support postures (Positive, Neutral, Negative, Monitor, Insufficient Data), model status banner, and feature attribution contributions.
- **Watchlists**: Multiple named watchlists with quick addition and removal.

## Local Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 4. Build for Production
```bash
npm run build
npm start
```
