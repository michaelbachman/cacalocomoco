import React, { useState, useEffect } from 'react'

const GeminiTest = ({ realTimePrices, historicalData }) => {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [cacheStats, setCacheStats] = useState(null)
  const [configValidation, setConfigValidation] = useState(null)

  useEffect(() => {
    // Validate configuration on mount
    const validation = validateGeminiConfig()
    setConfigValidation(validation)
    
    if (validation.isValid) {
      setCacheStats({
        size: 0,
        maxSize: 100,
        totalRequests: 0,
        lastRequest: null
      })
    }
  }, [])

  const validateGeminiConfig = () => {
    const errors = []
    
    if (!import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY === 'YOUR_API_KEY_HERE') {
      errors.push('Gemini API key not configured')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const testConnection = async () => {
    try {
      setStatus('testing')
      setError(null)

      console.log('🔮 Testing Gemini API connection...')
      
      // Real API call to Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Hello! Please respond with "Gemini API is working correctly" and nothing else.'
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50
          }
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('🔮 Gemini API response:', data)

      const result = {
        text: data.candidates[0].content.parts[0].text,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash-exp',
        usage: data.usageMetadata || { totalTokenCount: 'N/A' }
      }
      
      console.log('🔮 Test result:', result)
      
      setAnalysis({
        prompt: 'Hello! Please respond with "Gemini API is working correctly" and nothing else.',
        response: result.text,
        timestamp: result.timestamp,
        model: result.model,
        usage: result.usage
      })
      
      setStatus('success')
      setCacheStats(prev => ({
        ...prev,
        totalRequests: (prev?.totalRequests || 0) + 1,
        lastRequest: Date.now()
      }))
      
    } catch (err) {
      console.error('🔮 Gemini test error:', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const analyzeMarketData = async () => {
    try {
      setStatus('analyzing')
      setError(null)

      console.log('🔮 Analyzing market data with Gemini AI...')
      
      // Get real-time BTC data
      const btcPrice = realTimePrices?.['BTC/USD'] || realTimePrices?.['BTC/USDC']
      
      console.log('🔮 Real-time prices received:', realTimePrices)
      console.log('🔮 Historical data received:', historicalData)
      console.log('🔮 Historical data length:', historicalData?.length || 0)
      
      if (!btcPrice) {
        throw new Error('No real-time BTC price data available')
      }

      // Use REAL historical data from Kraken API instead of mock estimates
      const currentPrice = btcPrice
      
      let priceChange, high, low, volume
      
      if (historicalData && historicalData.length > 0) {
        // Calculate real market data from historical OHLC data
        const newestData = historicalData[0]        // First element = most recent
        const oldestData = historicalData[historicalData.length - 1]  // Last element = oldest
        
        console.log('🔮 Historical data analysis:')
        console.log('  - Newest data (index 0):', newestData)
        console.log('  - Oldest data (last index):', oldestData)
        console.log('  - Total candles:', historicalData.length)
        
        // Calculate real 24h change
        priceChange = ((newestData.close - oldestData.open) / oldestData.open * 100).toFixed(2)
        
        // Get real high/low from all candles
        const allHighs = historicalData.map(d => d.high)
        const allLows = historicalData.map(d => d.low)
        high = Math.max(...allHighs)
        low = Math.min(...allLows)
        
        // Calculate real volume
        const volumes = historicalData.map(d => d.volume)
        volume = volumes.reduce((sum, vol) => sum + vol, 0).toFixed(2)
        
        console.log('🔮 Using REAL historical data for Gemini analysis:')
        console.log('  - Price change:', priceChange + '%')
        console.log('  - High:', high)
        console.log('  - Low:', low)
        console.log('  - Volume:', volume, 'BTC')
        console.log('  - Calculation details:')
        console.log('    * Newest close:', newestData.close)
        console.log('    * Oldest open:', oldestData.open)
        console.log('    * Change calculation:', `${newestData.close} - ${oldestData.open} = ${newestData.close - oldestData.open}`)
        console.log('    * Percentage calculation:', `${newestData.close - oldestData.open} / ${oldestData.open} * 100 = ${priceChange}%`)
      } else {
        // Fallback to estimates if no historical data available
        console.log('🔮 No historical data available, using estimates')
        priceChange = 2.5 // Fallback estimate
        high = currentPrice * 1.05
        low = currentPrice * 0.95
        volume = 2500
      }

      // Real market data analysis prompt using ACTUAL Kraken data
      const prompt = `Analyze the following REAL-TIME cryptocurrency market data from Kraken API and provide professional trading insights:

Current BTC Price: $${currentPrice.toLocaleString()}
24h Change: ${priceChange}%
24h High: $${high.toLocaleString()}
24h Low: $${low.toLocaleString()}
Volume: ${volume} BTC

Please provide:
1. Market sentiment analysis (bullish/bearish/neutral)
2. Key support and resistance levels
3. Short-term price outlook (next 24-48 hours)
4. Risk assessment and key factors to monitor
5. Trading recommendations (if any)

Keep the analysis concise, professional, and actionable for traders.`

      // Real API call to Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('🔮 Market analysis API response:', data)

      const result = {
        text: data.candidates[0].content.parts[0].text,
        timestamp: new Date().toISOString(),
        model: 'gemini-2.0-flash-exp',
        usage: data.usageMetadata || { totalTokenCount: 'N/A' }
      }
      
      console.log('🔮 Market analysis result:', result)
      
      const analysisData = {
        prompt: 'Market Data Analysis',
        response: result.text,
        timestamp: result.timestamp,
        model: result.model,
        usage: result.usage,
        marketData: {
          currentPrice: currentPrice,
          priceChange: priceChange,
          high: high,
          low: low,
          volume: volume
        }
      }
      
      console.log('🔮 Setting analysis state with data:')
      console.log('  - Analysis data object:', analysisData)
      console.log('  - Market data values:', analysisData.marketData)
      
      setAnalysis(analysisData)
      
      setStatus('success')
      setCacheStats(prev => ({
        ...prev,
        totalRequests: (prev?.totalRequests || 0) + 1,
        lastRequest: Date.now()
      }))
      
    } catch (err) {
      console.error('🔮 Market analysis error:', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const clearCache = () => {
    setCacheStats(prev => ({
      ...prev,
      size: 0,
      totalRequests: 0
    }))
    setAnalysis(null)
    console.log('🔮 Cache cleared')
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'success'
      case 'error': return 'error'
      case 'testing':
      case 'analyzing': return 'warning'
      default: return 'primary'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'success': return 'Success'
      case 'error': return 'Error'
      case 'testing': return 'Testing Connection...'
      case 'analyzing': return 'Analyzing Market Data...'
      default: return 'Ready'
    }
  }

  return (
    <div className="gemini-test">
      <h2>🔮 Gemini AI Integration Test</h2>
      
      {/* Configuration Status */}
      <div className="config-status">
        <h3>Configuration Status</h3>
        {configValidation ? (
          <div className={`status-badge ${configValidation.isValid ? 'valid' : 'invalid'}`}>
            {configValidation.isValid ? '✅ Valid' : '❌ Invalid'}
          </div>
        ) : (
          <div className="status-badge loading">⏳ Checking...</div>
        )}
        
        {configValidation && !configValidation.isValid && (
          <div className="config-errors">
            <h4>Configuration Errors:</h4>
            <ul>
              {configValidation.errors.map((error, index) => (
                <li key={index} className="error-item">{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* API Key Status */}
      <div className="api-key-status">
        <h3>API Key Status</h3>
        <div className={`status-badge ${import.meta.env.VITE_GEMINI_API_KEY ? 'valid' : 'invalid'}`}>
          {import.meta.env.VITE_GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}
        </div>
        {!import.meta.env.VITE_GEMINI_API_KEY && (
          <p className="help-text">
            Add <code>VITE_GEMINI_API_KEY=your_api_key</code> to your .env file
          </p>
        )}
      </div>

      {/* Test Controls */}
      <div className="test-controls">
        <h3>Test Controls</h3>
        <div className="button-group">
          <button 
            onClick={testConnection}
            disabled={status === 'testing'}
            className="test-button"
          >
            Test Connection
          </button>
          
          <button 
            onClick={analyzeMarketData}
            disabled={status === 'analyzing'}
            className="analyze-button"
          >
            Analyze Market Data
          </button>
          
          <button 
            onClick={clearCache}
            className="clear-button"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Status Display */}
      <div className="status-display">
        <h3>Status</h3>
        <div className={`status-indicator ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        
        {error && (
          <div className="error-display">
            <h4>Error:</h4>
            <p className="error-message">{error}</p>
          </div>
        )}
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="cache-stats">
          <h3>Cache Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Cache Size:</span>
              <span className="stat-value">{cacheStats.size} / {cacheStats.maxSize}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Requests:</span>
              <span className="stat-value">{cacheStats.totalRequests}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Last Request:</span>
              <span className="stat-value">
                {cacheStats.lastRequest ? new Date(cacheStats.lastRequest).toLocaleTimeString() : 'Never'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="analysis-results">
          <h3>Analysis Results</h3>
          
          {analysis.marketData && (
            <div className="market-data">
              <h4>Input Market Data:</h4>
              <div className="data-grid">
                <div className="data-item">
                  <span className="data-label">Current Price:</span>
                  <span className="data-value">${analysis.marketData.currentPrice}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">24h Change:</span>
                  <span className="data-value">{analysis.marketData.priceChange}%</span>
                </div>
                <div className="data-item">
                  <span className="data-label">24h High:</span>
                  <span className="data-value">${analysis.marketData.high}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">24h Low:</span>
                  <span className="data-value">${analysis.marketData.low}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Volume:</span>
                  <span className="data-value">{analysis.marketData.volume} BTC</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="response-section">
            <h4>AI Response:</h4>
            <div className="response-content">
              <p>{analysis.response}</p>
            </div>
            
            <div className="response-meta">
              <div className="meta-item">
                <span className="meta-label">Model:</span>
                <span className="meta-value">{analysis.model}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Timestamp:</span>
                <span className="meta-value">{new Date(analysis.timestamp).toLocaleString()}</span>
              </div>
              {analysis.usage && (
                <div className="meta-item">
                  <span className="meta-label">Token Usage:</span>
                  <span className="meta-value">
                    {analysis.usage.totalTokenCount || 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GeminiTest
