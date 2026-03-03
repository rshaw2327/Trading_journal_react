# Trading Journal React

<img width="1311" height="906" alt="image" src="https://github.com/user-attachments/assets/702e725c-b78d-4cf2-b871-2427b9f0757d" />

A modern, responsive trading journal dashboard built with React and Vite. Track trades, review performance, and explore key analytics in a clean UI.

## Features

- **Trade journal** with automatic P/L and % calculations
- **Dashboard metrics** including win rate, drawdown, Sharpe/Sortino, expectancy, and more
- **Growth metrics**: CAGR, investment multiple, annualized return, total return
- **Risk metrics**: max drawdown, volatility, downside deviation, recovery factor
- **Quant grade analysis**: regime-based returns, drawdown clustering, skew/kurtosis, conditional VaR
- **Time range selector** UI with sub-tabs (Since Inception, YTD, 1Y/3Y/Custom)
- **Responsive layout** with sidebar navigation

## Getting Started

### Prerequisites

- Node.js 16+ (18+ recommended)
- npm

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

## Backend (Express + MongoDB)

The backend lives in `server/` and exposes a small REST API.

### Setup

1. Create `server/.env` based on the example:

```bash
cp server/.env.example server/.env
```

2. Update `server/.env` with your MongoDB connection string:

```
MONGODB_URI=your_mongodb_uri_here
PORT=5000
```

3. Install backend dependencies and run:

```bash
npm --prefix server install
npm run server
```

API runs at `http://localhost:5000` with:

- `GET /api/health`
- `GET /api/trades`
- `POST /api/trades`
- `DELETE /api/trades/:id`

## Scripts

- `npm run dev` - start the dev server
- `npm run build` - build for production
- `npm run preview` - preview the production build

## Notes

- Metrics are computed from the trades entered in the table.
- Time range tabs are UI-only at the moment (no filtering applied yet).

## Tech Stack

- React 18
- Vite
- JavaScript (ES6+)
