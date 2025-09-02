import React, { useState, useEffect } from 'react'
import { TechnicalAnalysisService, validateConfig } from './api/index.js'

export default function ApiTest() {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [configErrors, setConfigErrors] = useState([])

  useEffect(() => {
    // Validate configuration on component mount
    const errors = validateConfig()
    setConfigErrors(errors)
    
    if (errors.length > 0) {
      setStatus('config-error')
      setError(errors.join(', '))
    }
  }, [])

  const testConnection = async () => {
    try {
      setStatus('testing')
      setError(null)
      
      console.log('🔧 Starting API test...')
      console.log('🔧 API Key:', import.meta.env.VITE_ALPHA_VANTAGE_API_KEY ? '✅ Configured' : '❌ Missing')
      
      // Create technical analysis service
      const service = new TechnicalAnalysisService(import.meta.env.VITE_ALPHA_VANTAGE_API_KEY)
      
      // Set current BTC price (mock for testing)
      service.setCurrentPrice(108000)
      console.log('🔧 Current price set:', 108000)
      
      // Test fetching indicators with progressive loading
      console.log('🔧 Fetching indicators...')
      
      // Initialize analysis state
      setAnalysis({
        timestamp: new Date().toISOString(),
        currentPrice: 108000,
        interval: 'daily',
        movingAverages: { rating: 0, signals: [], details: {} },
        oscillators: { rating: 0, signals: [], details: {} },
        overall: { rating: 0, recommendation: 'NEUTRAL' },
        indicators: {}
      })
      
      const result = await service.getFullAnalysis('daily')
      console.log('🔧 Analysis result:', result)
      
      setAnalysis(result)
      setStatus('success')
    } catch (err) {
      console.error('🔧 API test error:', err)
      setError(err.message)
      setStatus('error')
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'var(--md-sys-color-primary)'
      case 'error': return 'var(--md-sys-color-error)'
      case 'testing': return 'var(--md-sys-color-secondary)'
      case 'config-error': return 'var(--md-sys-color-error)'
      default: return 'var(--md-sys-color-outline)'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'success': return '✅ API Test Successful'
      case 'error': return '❌ API Test Failed'
      case 'testing': return '⏳ Testing API Connection...'
      case 'config-error': return '⚠️ Configuration Error'
      default: return 'Ready to Test'
    }
  }

  return (
    <div className="api-test">
      <div className="api-test-header">
        <h3>Alpha Vantage API Test</h3>
        <div 
          className="api-status" 
          style={{ 
            color: getStatusColor(),
            padding: '8px 16px',
            borderRadius: '20px',
            border: `1px solid ${getStatusColor()}`,
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          {getStatusText()}
        </div>
      </div>

      {configErrors.length > 0 && (
        <div className="config-error">
          <h4>Configuration Issues:</h4>
          <ul>
            {configErrors.map((error, index) => (
              <li key={index} style={{ color: 'var(--md-sys-color-error)' }}>
                {error}
              </li>
            ))}
          </ul>
          <p>
            To fix this, create a <code>.env</code> file in your project root with:
            <br />
            <code>VITE_ALPHA_VANTAGE_API_KEY=your_actual_api_key_here</code>
          </p>
        </div>
      )}

      {!configErrors.length && (
        <div className="api-test-controls">
          <button 
            onClick={testConnection}
            disabled={status === 'testing'}
            style={{
              padding: '12px 24px',
              backgroundColor: 'var(--md-sys-color-primary)',
              color: 'var(--md-sys-color-on-primary)',
              border: 'none',
              borderRadius: '8px',
              cursor: status === 'testing' ? 'not-allowed' : 'pointer',
              opacity: status === 'testing' ? 0.6 : 1
            }}
          >
            {status === 'testing' ? 'Testing...' : 'Test API Connection'}
          </button>
        </div>
      )}

      {error && (
        <div className="api-error">
          <h4>Error Details:</h4>
          <p style={{ color: 'var(--md-sys-color-error)' }}>{error}</p>
        </div>
      )}

      {analysis && (
        <div className="api-results">
          <h4>Test Results:</h4>
          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">Overall Rating:</span>
              <span className="result-value">{analysis.overall.recommendation}</span>
              <span className="result-number">({analysis.overall.rating.toFixed(3)})</span>
            </div>
            <div className="result-item">
              <span className="result-label">Moving Averages:</span>
              <span className="result-value">{analysis.movingAverages.recommendation}</span>
              <span className="result-number">({analysis.movingAverages.rating.toFixed(3)})</span>
            </div>
            <div className="result-item">
              <span className="result-label">Oscillators:</span>
              <span className="result-value">{analysis.oscillators.recommendation}</span>
              <span className="result-number">({analysis.oscillators.rating.toFixed(3)})</span>
            </div>
            <div className="result-item">
              <span className="result-label">Current Price:</span>
              <span className="result-value">${analysis.currentPrice?.toLocaleString()}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Interval:</span>
              <span className="result-value">{analysis.interval}</span>
            </div>
            <div className="result-item">
              <span className="result-label">Timestamp:</span>
              <span className="result-value">{new Date(analysis.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <div className="api-info">
        <h4>API Information:</h4>
        <ul>
          <li><strong>Rate Limit:</strong> 5 requests per minute (12 seconds between requests)</li>
          <li><strong>Cache Duration:</strong> 5 minutes</li>
          <li><strong>Retry Logic:</strong> 3 attempts with exponential backoff</li>
          <li><strong>Indicators:</strong> RSI, MACD, Stochastic, SMA, EMA, Williams %R, CCI, ADX</li>
        </ul>
      </div>
    </div>
  )
}
