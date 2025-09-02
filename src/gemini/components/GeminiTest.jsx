import React, { useState, useEffect } from 'react'
import GeminiClient from '../services/GeminiClient.js'
import { validateGeminiConfig } from '../config.js'

const GeminiTest = () => {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [cacheStats, setCacheStats] = useState(null)
  const [client, setClient] = useState(null)
  const [configValidation, setConfigValidation] = useState(null)

  useEffect(() => {
    // Validate configuration on mount
    const validation = validateGeminiConfig()
    setConfigValidation(validation)
    
    if (validation.isValid) {
      const geminiClient = new GeminiClient()
      setClient(geminiClient)
      setCacheStats(geminiClient.getCacheStats())
    }
  }, [])

  const testConnection = async () => {
    if (!client) {
      setError('Gemini client not initialized')
      return
    }

    try {
      setStatus('testing')
      setError(null)

      console.log('🔮 Testing Gemini API connection...')
      
      // Simple test prompt
      const testPrompt = 'Hello! Please respond with "Gemini API is working correctly" and nothing else.'
      
      const result = await client.generateContent(testPrompt)
      console.log('🔮 Test result:', result)
      
      setAnalysis({
        prompt: testPrompt,
        response: result.text,
        timestamp: result.timestamp,
        model: result.model,
        usage: result.usage
      })
      
      setStatus('success')
      setCacheStats(client.getCacheStats())
      
    } catch (err) {
      console.error('🔮 Gemini test error:', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const analyzeMarketData = async () => {
    if (!client) {
      setError('Gemini client not initialized')
      return
    }

    try {
      setStatus('analyzing')
      setError(null)

      console.log('🔮 Analyzing market data...')
      
      // Mock market data for testing
      const mockMarketData = {
        currentPrice: 108000,
        priceChange: 2.5,
        high: 110000,
        low: 106000,
        volume: 2500
      }
      
      const result = await client.analyzeMarketData(mockMarketData)
      console.log('🔮 Market analysis result:', result)
      
      setAnalysis({
        prompt: 'Market Data Analysis',
        response: result.text,
        timestamp: result.timestamp,
        model: result.model,
        usage: result.usage,
        marketData: mockMarketData
      })
      
      setStatus('success')
      setCacheStats(client.getCacheStats())
      
    } catch (err) {
      console.error('🔮 Market analysis error:', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const clearCache = () => {
    if (client) {
      client.clearCache()
      setCacheStats(client.getCacheStats())
      setAnalysis(null)
      console.log('🔮 Cache cleared')
    }
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
          <md-filled-button 
            onClick={testConnection}
            disabled={!client || status === 'testing'}
            className="test-button"
          >
            Test Connection
          </md-filled-button>
          
          <md-filled-button 
            onClick={analyzeMarketData}
            disabled={!client || status === 'analyzing'}
            className="analyze-button"
          >
            Analyze Market Data
          </md-filled-button>
          
          <md-outlined-button 
            onClick={clearCache}
            disabled={!client}
            className="clear-button"
          >
            Clear Cache
          </md-outlined-button>
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

