# 🔮 Gemini AI Integration Setup Guide

## 🚀 **Quick Start**

### 1. Get Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" → "Create API key in new project"
4. Copy the generated API key (starts with `AIza...`)

### 2. Configure Environment Variable
Add to your `.env` file in the `/apps/realtime-alerts/` directory:

```bash
# Add this line to your .env file
VITE_GEMINI_API_KEY=AIzaSyYourActualApiKeyHere
```

### 3. Test the Integration
- **Option A**: Click the "🔮 Gemini AI" button in the main app
- **Option B**: Navigate directly to `/gemini-test.html`
- **Option C**: Access via the main app navigation

## 📁 **Module Structure**

```
src/gemini/
├── components/
│   ├── GeminiPage.jsx      # Main page component
│   └── GeminiTest.jsx      # Test component
├── services/
│   └── GeminiClient.js     # API client with caching
├── config.js               # Configuration & validation
└── index.js                # Module exports
```

## ⚙️ **Configuration**

### Free Tier Limits
- **Requests per minute**: 15
- **Requests per hour**: 150  
- **Requests per day**: 1,500
- **Concurrent requests**: 1

### Caching
- **Cache duration**: 10 minutes
- **Max cache size**: 100 responses
- **Automatic cleanup**: Yes

### Rate Limiting
- **Built-in delays**: Respects API limits
- **Exponential backoff**: Yes
- **Request queuing**: Yes

## 🧪 **Testing Features**

### 1. Connection Test
- Basic API connectivity
- Configuration validation
- Error handling

### 2. Market Analysis
- Mock BTC market data
- AI-powered insights
- Response parsing

### 3. Cache Management
- Cache statistics
- Manual cache clearing
- Performance monitoring

## 🔧 **Troubleshooting**

### Common Issues

#### "Gemini API key not configured"
- Check `.env` file exists in `/apps/realtime-alerts/`
- Verify `VITE_GEMINI_API_KEY` is set correctly
- Restart development server after changes

#### "Rate limit exceeded"
- Wait for rate limit reset (1 minute)
- Check cache for existing responses
- Reduce request frequency

#### "Request timeout"
- Check internet connection
- Verify API key is valid
- Check Google AI Studio status

### Debug Mode
Enable debug logging by setting in browser console:
```javascript
localStorage.setItem('gemini-debug', 'true')
```

## 📊 **Performance Monitoring**

### Cache Hit Rate
- Monitor cache effectiveness
- Adjust cache duration if needed
- Clear cache for fresh data

### Rate Limit Usage
- Track request frequency
- Monitor remaining quota
- Optimize request patterns

## 🚀 **Next Steps**

### Phase 2: Real-time Integration
- Connect to live Kraken data
- Implement real-time analysis
- Add market sentiment tracking

### Phase 3: Advanced Features
- Pattern recognition
- Trading signal generation
- Risk assessment

### Phase 4: Personalization
- User preferences
- Risk profiles
- Custom strategies

## 📚 **API Documentation**

- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API Reference](https://ai.google.dev/docs)
- [Rate Limits](https://ai.google.dev/pricing)

## 🆘 **Support**

For issues or questions:
1. Check browser console for errors
2. Verify API key configuration
3. Test with simple prompts first
4. Check rate limit status

---

**Happy AI Trading! 🤖📈**


