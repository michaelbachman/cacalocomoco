# Kraken Realtime Alerts Application

## Version History

### v1.1 (Current Stable Build) - 2025-01-29
**Status: ✅ STABLE - FULLY FUNCTIONAL**

**Features Working:**
- ✅ Real-time WebSocket connection to Kraken API
- ✅ Live price updates for BTC/USD, BTC/USDC, SOL/USD
- ✅ Connection quality monitoring with ping/pong latency
- ✅ Automatic reconnection with exponential backoff
- ✅ Database integration (mock database for development)
- ✅ Historical data module with Kraken REST API
- ✅ Alpha Vantage API integration for technical indicators
- ✅ Gemini AI integration for market analysis
- ✅ Profit/Loss tracker component
- ✅ Material Design 3 UI with responsive design
- ✅ Connection log panel with real-time updates
- ✅ Heartbeat message handling (no more "Unhandled" errors)

**Technical Specifications:**
- **WebSocket Connection:** Kraken WS API with robust error handling
- **Trading Pairs:** BTC/USD, BTC/USDC, SOL/USD
- **API Integrations:** Kraken (real-time + historical), Alpha Vantage (technical), Gemini AI
- **Database:** Browser-compatible mock database with technical analysis storage
- **UI Framework:** React + Vite + Material Design 3
- **Connection Management:** Health checks, ping/pong, exponential backoff, rate limiting

**Known Working State:**
- All three trading pairs receiving real-time data
- Connection logs updating continuously
- No "Unhandled message type" errors
- Clean heartbeat handling
- All components rendering correctly
- Database operations working
- Historical data fetching and calculations working
- Alpha Vantage API integration functional
- Gemini AI integration working with live data

**Revert Command:**
```bash
# To revert to this stable build:
git checkout v1.1
# or
git reset --hard v1.1
```

---

### v1.0 (Initial Build)
**Status: ❌ DEPRECATED - Multiple issues**

**Issues:**
- Connection quality calculation bugs
- Backoff calculation errors
- Missing components after failed integrations
- Styling inconsistencies
- Database connection problems

---

## Quick Start

1. **Navigate to app directory:**
   ```bash
   cd apps/realtime-alerts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   # Create .env file
   echo "VITE_ALPHA_VANTAGE_API_KEY=QF9N2ES5BCACPYX4" > .env
   ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

- `VITE_ALPHA_VANTAGE_API_KEY`: Alpha Vantage API key for technical indicators

## API Keys Required

- **Kraken API:** No key required (public endpoints)
- **Alpha Vantage API:** Required for technical analysis (free tier: 25 requests/day)
- **Gemini AI API:** Required for AI analysis (free tier available)

## Build Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Architecture

- **Frontend:** React + Vite
- **Styling:** Material Design 3 + CSS
- **APIs:** Kraken WebSocket/REST, Alpha Vantage, Gemini AI
- **Database:** Browser mock database (development)
- **State Management:** React hooks + refs
- **WebSocket Management:** Custom connection handling with health checks

## Troubleshooting

**If connection logs stop updating:**
1. Check browser console for errors
2. Verify WebSocket connection status
3. Check network connectivity
4. Restart development server

**If prices not updating in UI:**
1. Check connection logs for data reception
2. Verify React state updates
3. Check component rendering

**To revert to v1.1:**
```bash
git checkout v1.1
npm install
npm run dev
```
