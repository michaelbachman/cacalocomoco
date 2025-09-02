# Alpha Vantage API Setup Guide

## Overview
This application now includes a robust Alpha Vantage API integration for technical analysis data, following the same robust patterns established in the Kraken connection.

## Setup Steps

### 1. Get Alpha Vantage API Key
- Visit: https://www.alphavantage.co/support/#api-key
- Sign up for a free account
- Copy your API key

### 2. Configure Environment Variable
Create a `.env` file in the project root (`/apps/realtime-alerts/`) with:

```bash
VITE_ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

**Important:** Replace `your_actual_api_key_here` with your actual API key.

### 3. Restart Development Server
After creating the `.env` file, restart your development server:

```bash
npm run dev
```

## Features

### Technical Indicators Available
- **Moving Averages:** SMA, EMA (10, 20, 30, 50, 100, 200 periods)
- **Oscillators:** RSI, Stochastic, CCI, Williams %R, Ultimate Oscillator
- **Trend Indicators:** MACD, ADX
- **Momentum:** Momentum indicator

### Rating System
The API implements the exact rating system from your brief:
- **Moving Averages Group:** Buy/Sell based on MA vs current price
- **Oscillators Group:** Buy/Sell based on indicator thresholds and trends
- **Overall Rating:** Average of both groups
- **Recommendations:** Strong Sell, Sell, Neutral, Buy, Strong Buy

### API Limits & Best Practices
- **Rate Limit:** 5 requests per minute (12 seconds between requests)
- **Cache Duration:** 5 minutes
- **Retry Logic:** 3 attempts with exponential backoff
- **Error Handling:** Graceful degradation, non-blocking operations

## Testing

1. The **API Test Component** will appear below the Historical Data
2. If no API key is configured, you'll see a configuration error
3. Once configured, click "Test API Connection" to verify everything works
4. The test will fetch technical indicators and display ratings

## Architecture

### Files Created
- `src/api/ApiClient.js` - Reusable API client infrastructure
- `src/api/config.js` - Centralized API configuration
- `src/api/TechnicalAnalysis.js` - Technical analysis service
- `src/api/index.js` - Centralized exports
- `src/ApiTest.jsx` - Test component for verification

### Design Principles
- **Same Robust Patterns:** Follows Kraken connection standards
- **Rate Limiting:** Respectful of API limits
- **Caching:** Minimizes API calls
- **Error Handling:** Graceful degradation
- **Non-blocking:** Database operations don't interfere with real-time data

## Troubleshooting

### Common Issues

1. **"Alpha Vantage API key not configured"**
   - Ensure `.env` file exists in project root
   - Check that `VITE_ALPHA_VANTAGE_API_KEY` is set correctly
   - Restart development server after changes

2. **"Rate limit exceeded"**
   - The API automatically handles rate limiting
   - Wait 12 seconds between requests
   - Check the API Test component for status

3. **"Failed to fetch technical indicators"**
   - Check your internet connection
   - Verify API key is valid
   - Check Alpha Vantage service status

### Debug Information
The API Test component shows:
- Connection status
- Error details
- Test results with ratings
- API statistics and limits

## Next Steps

Once the API is working:
1. The technical analysis data can be integrated into the main UI
2. Real-time ratings can be displayed alongside price data
3. Trading signals can be generated based on the rating system
4. Historical analysis can be enhanced with technical indicators

## Support

For Alpha Vantage API issues:
- Check their documentation: https://www.alphavantage.co/documentation/
- Free tier limits: 5 requests per minute
- Paid plans available for higher limits
