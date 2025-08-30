import React, { useState, useEffect } from 'react'
import { 
  testDatabaseConnection, 
  initializeDatabase, 
  storePriceData, 
  getPriceHistory, 
  getConnectionLogs, 
  getDatabaseStats,
  getTechnicalAnalysis,
  getAnalysisSessions
} from './db.js'

export default function DatabaseTest() {
  const [dbStatus, setDbStatus] = useState('unknown')
  const [dbStats, setDbStats] = useState({ priceRecords: 0, logRecords: 0, alertRecords: 0, analysisRecords: 0 })
  const [priceHistory, setPriceHistory] = useState([])
  const [connectionLogs, setConnectionLogs] = useState([])
  const [technicalAnalysis, setTechnicalAnalysis] = useState([])
  const [analysisSessions, setAnalysisSessions] = useState([])
  const [testMessage, setTestMessage] = useState('')

  // Test database connection on component mount - NON-BLOCKING
  useEffect(() => {
    // Delay the database test to avoid blocking app startup
    const timer = setTimeout(() => {
      testConnection()
    }, 2000) // Wait 2 seconds before testing database
    
    return () => clearTimeout(timer)
  }, [])

  const testConnection = async () => {
    setDbStatus('testing')
    const isConnected = await testDatabaseConnection()
    setDbStatus(isConnected ? 'connected' : 'failed')
    
    if (isConnected) {
      await loadDatabaseStats()
    }
  }

  const initializeDB = async () => {
    setTestMessage('Initializing database...')
    const success = await initializeDatabase()
    setTestMessage(success ? 'Database initialized successfully!' : 'Database initialization failed!')
    
    if (success) {
      await loadDatabaseStats()
    }
  }

  const loadDatabaseStats = async () => {
    const stats = await getDatabaseStats()
    setDbStats(stats)
  }

  const testStorePrice = async () => {
    setTestMessage('Storing test price data...')
    const testPrice = Math.random() * 50000 + 20000 // Random price between 20k-70k
    const success = await storePriceData('BTC/USD', testPrice)
    setTestMessage(success ? `Test price $${testPrice.toFixed(2)} stored successfully!` : 'Failed to store test price!')
    
    if (success) {
      await loadDatabaseStats()
      await loadPriceHistory()
    }
  }

  const loadPriceHistory = async () => {
    const history = await getPriceHistory('BTC/USD', 10)
    setPriceHistory(history)
  }

  const loadConnectionLogs = async () => {
    const logs = await getConnectionLogs(10)
    setConnectionLogs(logs)
  }

  const loadTechnicalAnalysis = async () => {
    const analysis = await getTechnicalAnalysis(10)
    setTechnicalAnalysis(analysis)
  }

  const loadAnalysisSessions = async () => {
    const sessions = await getAnalysisSessions(10)
    setAnalysisSessions(sessions)
  }

  const clearTestMessage = () => {
    setTestMessage('')
  }

  return (
    <div className="db-test">
      <div className="db-header">
        <h3>Database Test Panel</h3>
        <div className="db-status">
          Status: <span className={`status-${dbStatus}`}>{dbStatus}</span>
        </div>
      </div>

      <div className="db-controls">
        <md-filled-button onClick={testConnection} disabled={dbStatus === 'testing'}>
          Test Connection
        </md-filled-button>
        <md-filled-button onClick={initializeDB}>
          Initialize Database
        </md-filled-button>
        <md-filled-button onClick={testStorePrice}>
          Store Test Price
        </md-filled-button>
        <md-filled-button onClick={loadPriceHistory}>
          Load Price History
        </md-filled-button>
        <md-filled-button onClick={loadConnectionLogs}>
          Load Connection Logs
        </md-filled-button>
        <md-filled-button onClick={loadTechnicalAnalysis}>
          Load Technical Analysis
        </md-filled-button>
        <md-filled-button onClick={loadAnalysisSessions}>
          Load Analysis Sessions
        </md-filled-button>
      </div>

      {testMessage && (
        <div className="test-message" onClick={clearTestMessage}>
          {testMessage}
        </div>
      )}

      <div className="db-stats">
        <h4>Database Statistics</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value">{dbStats.priceRecords}</div>
            <div className="stat-label">Price Records</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{dbStats.logRecords}</div>
            <div className="stat-label">Connection Logs</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{dbStats.alertRecords}</div>
            <div className="stat-label">Alerts</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{dbStats.analysisRecords}</div>
            <div className="stat-label">Analysis Records</div>
          </div>
        </div>
      </div>

      {priceHistory.length > 0 && (
        <div className="db-data">
          <h4>Recent Price History (BTC/USD)</h4>
          <div className="data-table">
            <div className="table-header">
              <div>Price</div>
              <div>Timestamp</div>
            </div>
            {priceHistory.map((record, index) => (
              <div key={index} className="table-row">
                <div>${parseFloat(record.price).toFixed(2)}</div>
                <div>{new Date(record.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {connectionLogs.length > 0 && (
        <div className="db-data">
          <h4>Recent Connection Logs</h4>
          <div className="data-table">
            <div className="table-header">
              <div>Event</div>
              <div>Message</div>
              <div>Status</div>
              <div>Timestamp</div>
            </div>
            {connectionLogs.map((log, index) => (
              <div key={index} className="table-row">
                <div>{log.event_type}</div>
                <div>{log.message}</div>
                <div>{log.status || '—'}</div>
                <div>{new Date(log.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {technicalAnalysis.length > 0 && (
        <div className="db-data">
          <h4>Recent Technical Analysis</h4>
          <div className="data-table">
            <div className="table-header">
              <div>Recommendation</div>
              <div>Overall Rating</div>
              <div>Moving Averages</div>
              <div>Oscillators</div>
              <div>Timestamp</div>
            </div>
            {technicalAnalysis.map((analysis, index) => (
              <div key={index} className="table-row">
                <div className={`recommendation-${analysis.overall.recommendation.toLowerCase().replace(' ', '-')}`}>
                  {analysis.overall.recommendation}
                </div>
                <div>{analysis.overall.rating.toFixed(2)}</div>
                <div>{analysis.movingAverages.recommendation}</div>
                <div>{analysis.oscillators.recommendation}</div>
                <div>{new Date(analysis.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysisSessions.length > 0 && (
        <div className="db-data">
          <h4>Recent Analysis Sessions</h4>
          <div className="data-table">
            <div className="table-header">
              <div>Symbol</div>
              <div>Interval</div>
              <div>Status</div>
              <div>Details</div>
              <div>Timestamp</div>
            </div>
            {analysisSessions.map((session, index) => (
              <div key={index} className="table-row">
                <div>{session.symbol}</div>
                <div>{session.interval}</div>
                <div className={`status-${session.status}`}>{session.status}</div>
                <div>{session.details.indicators ? session.details.indicators.join(', ') : '—'}</div>
                <div>{new Date(session.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
