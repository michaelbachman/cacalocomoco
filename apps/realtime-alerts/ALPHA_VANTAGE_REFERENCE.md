# Alpha Vantage Integration Reference

## 🎯 **Overview**

This document explains how Alpha Vantage API integrates with our Kraken Realtime Alerts application, the key differences between the two APIs, and how they work together to provide comprehensive trading insights.

## 🔌 **API Types & Connection Methods**

### **Alpha Vantage (REST API)**
- **Connection Type:** HTTP REST endpoints
- **Data Flow:** Request → Response (one-time)
- **Real-time:** No - data is historical/snapshot
- **Subscription:** No - each request is independent
- **Rate Limits:** 5 requests per minute (free tier)
- **Use Case:** Technical analysis, historical data, indicators
- **Endpoint:** `https://www.alphavantage.co/query`

### **Kraken (WebSocket API)**
- **Connection Type:** WebSocket (persistent connection)
- **Data Flow:** Continuous stream of updates
- **Real-time:** Yes - live price updates
- **Subscription:** Yes - subscribe to specific pairs
- **Rate Limits:** Much higher, designed for streaming
- **Use Case:** Live trading data, real-time prices
- **Endpoint:** `wss://ws.kraken.com`

## 📊 **How They Work Together**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Kraken WS     │    │  Alpha Vantage   │    │   Your App      │
│                 │    │                  │    │                 │
│ • Live prices   │───▶│ • Technical      │───▶│ • Real-time     │
│ • Real-time     │    │   indicators     │    │   prices        │
│ • Streaming     │    │ • Historical     │    │ • Technical     │
│ • Subscriptions │    │   analysis       │    │   signals       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🏗️ **Architecture**

### **Hybrid Approach**
- **Kraken WebSocket:** Live BTC/USD and BTC/USDC prices
- **Alpha Vantage REST:** Technical analysis every 5 minutes
- **Best of both worlds:** Real-time prices + periodic technical analysis

### **Data Flow**
1. **Kraken WebSocket** provides continuous price updates
2. **Alpha Vantage REST** fetches technical indicators periodically
3. **Application** combines both data sources for comprehensive analysis

## 📈 **Technical Indicators Available**

### **Current Implementation (5 indicators for free tier)**
1. **RSI** (Relative Strength Index) - 14 period
2. **MACD** (Moving Average Convergence Divergence)
3. **Stochastic** (Stochastic Oscillator) - 14,3,3
4. **SMA** (Simple Moving Average) - 20 period
5. **EMA** (Exponential Moving Average) - 20 period

### **Future Expansion (when needed)**
- **Williams %R** - 14 period
- **CCI** (Commodity Channel Index) - 20 period
- **ADX** (Average Directional Index) - 14 period
- **Additional SMA periods** (50, 100, 200)

## ⚡ **Rate Limiting Strategy**

### **Free Tier Constraints**
- **Limit:** 5 requests per minute
- **Strategy:** 2-second delays between requests
- **Indicators:** Limited to 5 per test
- **Cache Duration:** 5 minutes

### **Implementation Details**
```javascript
// Add small delay between requests to be respectful of free tier
if (indicators.indexOf(indicator) < indicators.length - 1) {
  console.log(`🔧 Waiting 2 seconds before next request...`)
  await new Promise(resolve => setTimeout(resolve, 2000))
}
```

## 🔑 **Configuration**

### **Environment Variables**
```bash
# .env file
VITE_ALPHA_VANTAGE_API_KEY=your_actual_api_key_here
```

### **API Key Usage**
- **Method:** Query parameter (not header)
- **Format:** `?apikey=YOUR_KEY`
- **Reason:** CORS compatibility (no preflight issues)

## 🚀 **Current Status**

### **✅ Completed**
- [x] Base API client infrastructure
- [x] Alpha Vantage client implementation
- [x] Technical analysis service
- [x] Rate limiting and caching
- [x] CORS and CSP configuration
- [x] Debug logging and error handling
- [x] Integration with existing app

### **🔄 In Progress**
- [x] API testing and validation
- [x] Rate limit optimization
- [x] Error handling improvements

### **📋 Next Steps**
- [ ] Integrate technical analysis into main UI
- [ ] Display real-time ratings alongside prices
- [ ] Create trading signal alerts
- [ ] Enhance historical data with technical indicators

## 🧪 **Testing**

### **Test Component**
- **Location:** `src/ApiTest.jsx`
- **Purpose:** Verify API integration
- **Features:** Connection testing, error display, results viewing

### **Debug Logging**
- **Enabled:** Yes (development mode)
- **Format:** 🔧 prefixed logs
- **Coverage:** API calls, responses, errors, timing

## 🔧 **Technical Implementation**

### **Key Files**
- `src/api/ApiClient.js` - Base API client and Alpha Vantage client
- `src/api/TechnicalAnalysis.js` - Technical analysis service
- `src/api/config.js` - Configuration and constants
- `src/ApiTest.jsx` - Testing component

### **Class Structure**
```
BaseApiClient
├── Rate limiting
├── Caching
├── Retry logic
└── Error handling

AlphaVantageClient extends BaseApiClient
├── Technical indicators
├── Query parameter API key
└── Alpha Vantage specific logic

TechnicalAnalysisService
├── Indicator fetching
├── Rating calculations
└── Signal generation
```

## 📚 **API Documentation References**

### **Alpha Vantage**
- **Website:** https://www.alphavantage.co/
- **Documentation:** https://www.alphavantage.co/documentation/
- **Free Tier:** 5 requests per minute
- **Premium Plans:** Available for higher limits

### **Kraken**
- **Website:** https://www.kraken.com/
- **API Docs:** https://docs.kraken.com/
- **WebSocket:** Real-time streaming
- **REST API:** Historical data and ticker

## 🎯 **Best Practices**

### **API Usage**
1. **Respect rate limits** - Use delays between requests
2. **Cache responses** - Reduce unnecessary API calls
3. **Handle errors gracefully** - Provide user feedback
4. **Monitor usage** - Track request counts and errors

### **Performance**
1. **Batch requests** - Fetch multiple indicators together
2. **Smart caching** - Cache based on data freshness
3. **Background updates** - Don't block UI for API calls
4. **Progressive loading** - Show cached data while fetching fresh

## 🚨 **Troubleshooting**

### **Common Issues**
1. **CORS errors** - Fixed with proper CSP configuration
2. **Rate limiting** - Fixed with request delays
3. **API key issues** - Fixed with query parameter approach
4. **Symbol format** - Use 'BTCUSD' for Alpha Vantage

### **Debug Steps**
1. Check browser console for 🔧 logs
2. Verify API key configuration
3. Check network tab for failed requests
4. Validate rate limiting compliance

## 📝 **Notes**

- **No WebSocket needed** for Alpha Vantage
- **REST API is sufficient** for technical analysis
- **Hybrid approach** provides best user experience
- **Future expansion** possible with premium plans

---

*Last updated: August 29, 2025*
*Version: 1.0*
