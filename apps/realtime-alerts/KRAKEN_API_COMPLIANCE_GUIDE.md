# Kraken API Compliance Guide

## Overview
This document outlines our implementation of Kraken API compliance measures to ensure we stay within their rate limits and follow their guidelines.

## Kraken API Limits & Guidelines

### Public (Market Data) Endpoints
- **REST API**: Limited to ~1 request per second per IP address
- **WebSocket API**: No strict message rate limit, but connection and subscription limits apply
- **Max Subscriptions**: 100 per connection
- **Connection Rate**: Max 1 connection per second
- **Recommendation**: Use WebSocket for real-time data to reduce REST API calls

### Private (Account Management) Endpoints
- **Rate Limits**: Based on counter system varying by account verification level
- **Starter Tier**: Max counter 15, decreasing at 0.33/sec
- **Intermediate Tier**: Max counter 20, decreasing at 0.5/sec
- **Pro Tier**: Max counter 20, decreasing at 1/sec

### Trading Endpoints
- **Rate Limits**: Based on counter system for order actions
- **Starter Tier**: Max counter 60, decreasing at 1/sec
- **Intermediate Tier**: Max counter 125, decreasing at 2.34/sec
- **Pro Tier**: Max counter 180, decreasing at 3.75/sec

## Our Implementation Compliance

### ✅ WebSocket Connection Management
```javascript
// Connection rate limiting (max 1 per second)
const now = Date.now();
const timeSinceLastConnection = now - lastConnectionTime;
if (timeSinceLastConnection < 1000) {
    const waitTime = 1000 - timeSinceLastConnection;
    logger.log(`🔄 Kraken API compliance: Waiting ${waitTime}ms before reconnecting`);
    setTimeout(connect, waitTime);
    return;
}
```

### ✅ Subscription Compliance
- **Current Subscriptions**: 12 trading pairs
- **Kraken Limit**: 100 subscriptions per connection
- **Status**: Well within limits (12/100)
- **Trading Pairs**: BTC/USD, SOL/USD, ETH/USD, DOGE/USD, SHIB/USD, ADA/USD, DOT/USD, MATIC/USD, AVAX/USD, PUMP/USD, PEPE/USD, UNI/USD

### ✅ Ping/Pong Health Monitoring
```javascript
// Conservative ping/pong frequency (60 seconds)
pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        lastPingTime = Date.now();
        ws.send(JSON.stringify({ event: 'ping' }));
        logger.log('🏓 Ping sent (60s interval)');
        
        // Generous pong timeout (15 seconds)
        pongTimeout = setTimeout(() => {
            logger.error('🏓 Pong timeout - connection may be stale');
            if (ws) {
                ws.close();
            }
        }, 15000);
    }
}, 60000);
```

### ✅ Message Throttling
```javascript
// Throttle UI updates to reduce processing load
if (!renderThrottleTimeout) {
    renderThrottleTimeout = setTimeout(() => {
        renderPrices().catch(logger.error);
        updateLastUpdated();
        renderThrottleTimeout = null;
    }, 500); // Max 2 renders per second
}
```

### ✅ Force Refresh Mechanism
```javascript
// Force data refresh every 5 seconds to ensure UI stays current
setInterval(() => {
    if (Object.keys(prices).length > 0) {
        logger.log('🔄 Force refresh: Re-rendering prices to ensure UI is current');
        renderPrices().catch(logger.error);
    }
}, 5000);
```

## Compliance Checklist

### Connection Management
- [x] Single WebSocket connection only
- [x] Rate limiting: max 1 connection per second
- [x] Exponential backoff for reconnections
- [x] Proper cleanup on disconnect

### Subscription Management
- [x] 12 subscriptions (well under 100 limit)
- [x] Single subscription message for all pairs
- [x] Proper subscription cleanup

### Message Handling
- [x] Throttled UI updates (max 2 renders/sec)
- [x] Force refresh every 5 seconds
- [x] Proper error handling and logging

### Health Monitoring
- [x] Ping/pong every 60 seconds
- [x] 15-second pong timeout
- [x] Automatic reconnection on timeout
- [x] Connection health logging

## Best Practices Implemented

1. **Use WebSocket for Real-Time Data**: Reduces REST API calls
2. **Implement Throttling**: Controls rate of updates
3. **Monitor API Usage**: Enhanced logging for compliance
4. **Conservative Approach**: 60s ping/pong, generous timeouts
5. **Proper Error Handling**: Graceful degradation and reconnection

## Monitoring & Logging

### Connection Health Logs
- `🔄 Kraken API compliance: Waiting Xms before reconnecting`
- `🔌 Kraken API compliance: X subscriptions (limit: 100)`
- `🏓 Ping sent (60s interval)`
- `🏓 Pong received, connection healthy`
- `🏓 Pong timeout - connection may be stale`

### Data Refresh Logs
- `🔄 Force refresh: Re-rendering prices to ensure UI is current`
- `📊 [timestamp] Re-rendering prices for pair with live price $X`

## Maintenance Guidelines

1. **Monitor Connection Health**: Check logs for ping/pong timeouts
2. **Track Subscription Count**: Ensure we stay under 100 limit
3. **Review Rate Limits**: Monitor for any rate limit errors
4. **Update Guidelines**: Check Kraken documentation for changes
5. **Performance Monitoring**: Ensure throttling doesn't impact user experience

## Version History

- **v1.3D**: Initial Kraken API compliance implementation
  - Added connection rate limiting
  - Optimized ping/pong frequency (60s)
  - Added subscription count logging
  - Implemented message throttling
  - Added force refresh mechanism

## References

- [Kraken API Rate Limits](https://support.kraken.com/hc/en-us/articles/206548367-what-are-the-api-rate-limits-)
- [Kraken WebSocket API](https://docs.kraken.com/websockets-api/)
- [Kraken REST API Guidelines](https://docs.kraken.com/api/docs/guides/spot-rest-ratelimits/)
