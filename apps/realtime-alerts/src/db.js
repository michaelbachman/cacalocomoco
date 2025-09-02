// Browser-compatible database client for Kraken alerts
// Uses fetch to call serverless functions or falls back to mock functions in development

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Mock database functions for development (when no serverless function is available)
const mockDatabase = {
  priceRecords: 0,
  logRecords: 0,
  alertRecords: 0,
  analysisRecords: 0,
  priceHistory: [],
  connectionLogs: [],
  technicalIndicators: [],
  technicalAnalysis: [],
  analysisSessions: []
}

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // In browser, we'll use mock functions for now
    // TODO: Implement serverless function calls when ready
    console.log('Database initialized successfully (mock mode)')
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// Store price data
export async function storePriceData(pairName, price) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock storage for development
    mockDatabase.priceRecords++
    mockDatabase.priceHistory.unshift({
      pair_name: pairName,
      price: price,
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 100 records
    if (mockDatabase.priceHistory.length > 100) {
      mockDatabase.priceHistory = mockDatabase.priceHistory.slice(0, 100)
    }

    console.log(`Mock: Stored ${pairName} price: $${price}`)
    return true
  } catch (error) {
    console.error('Failed to store price data:', error)
    return false
  }
}

// Store connection log
export async function storeConnectionLog(eventType, message, status = null) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock storage for development
    mockDatabase.logRecords++
    mockDatabase.connectionLogs.unshift({
      event_type: eventType,
      message: message,
      status: status,
      timestamp: new Date().toISOString()
    })
    
    // Keep only last 50 records
    if (mockDatabase.connectionLogs.length > 50) {
      mockDatabase.connectionLogs = mockDatabase.connectionLogs.slice(0, 50)
    }

    console.log(`Mock: Stored connection log: ${eventType} - ${message}`)
    return true
  } catch (error) {
    console.error('Failed to store connection log:', error)
    return false
  }
}

// Get recent price history for a pair
export async function getPriceHistory(pairName, limit = 100) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return []
    }

    // Mock retrieval for development
    const filtered = mockDatabase.priceHistory.filter(record => record.pair_name === pairName)
    return filtered.slice(0, limit)
  } catch (error) {
    console.error('Failed to get price history:', error)
    return []
  }
}

// Get recent connection logs
export async function getConnectionLogs(limit = 50) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return []
    }

    // Mock retrieval for development
    return mockDatabase.connectionLogs.slice(0, limit)
  } catch (error) {
    console.error('Failed to get connection logs:', error)
    return []
  }
}

// Test database connection
export async function testDatabaseConnection() {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock connection test for development
    console.log('Mock: Database connection test successful')
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

// Get database stats
export async function getDatabaseStats() {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return { priceRecords: 0, logRecords: 0, alertRecords: 0, analysisRecords: 0 }
    }

    // Mock stats for development
    return {
      priceRecords: mockDatabase.priceRecords,
      logRecords: mockDatabase.logRecords,
      alertRecords: mockDatabase.alertRecords,
      analysisRecords: mockDatabase.analysisRecords
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return { priceRecords: 0, logRecords: 0, alertRecords: 0, analysisRecords: 0 }
  }
}

// Store technical indicators data
export async function storeTechnicalIndicators(symbol, interval, indicators) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock storage for development
    const indicatorRecord = {
      symbol: symbol,
      interval: interval,
      indicators: indicators,
      timestamp: new Date().toISOString()
    }
    
    mockDatabase.technicalIndicators.unshift(indicatorRecord)
    
    // Keep only last 100 records
    if (mockDatabase.technicalIndicators.length > 100) {
      mockDatabase.technicalIndicators = mockDatabase.technicalIndicators.slice(0, 100)
    }

    console.log(`Mock: Stored technical indicators for ${symbol} (${interval})`)
    return true
  } catch (error) {
    console.error('Failed to store technical indicators:', error)
    return false
  }
}

// Store technical analysis results
export async function storeTechnicalAnalysis(analysis) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock storage for development
    mockDatabase.analysisRecords++
    const analysisRecord = {
      ...analysis,
      timestamp: new Date().toISOString(),
      id: `analysis_${Date.now()}`
    }
    
    mockDatabase.technicalAnalysis.unshift(analysisRecord)
    
    // Keep only last 50 records
    if (mockDatabase.technicalAnalysis.length > 50) {
      mockDatabase.technicalAnalysis = mockDatabase.technicalAnalysis.slice(0, 50)
    }

    console.log(`Mock: Stored technical analysis result (${analysis.overall.recommendation})`)
    return true
  } catch (error) {
    console.error('Failed to store technical analysis:', error)
    return false
  }
}

// Store analysis session
export async function storeAnalysisSession(symbol, interval, status, details = {}) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // Mock storage for development
    const sessionRecord = {
      symbol: symbol,
      interval: interval,
      status: status,
      details: details,
      timestamp: new Date().toISOString()
    }
    
    mockDatabase.analysisSessions.unshift(sessionRecord)
    
    // Keep only last 100 records
    if (mockDatabase.analysisSessions.length > 100) {
      mockDatabase.analysisSessions = mockDatabase.analysisSessions.slice(0, 100)
    }

    console.log(`Mock: Stored analysis session for ${symbol} (${interval}) - ${status}`)
    return true
  } catch (error) {
    console.error('Failed to store analysis session:', error)
    return false
  }
}

// Get recent technical analysis results
export async function getTechnicalAnalysis(limit = 20) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return []
    }

    // Mock retrieval for development
    return mockDatabase.technicalAnalysis.slice(0, limit)
  } catch (error) {
    console.error('Failed to get technical analysis:', error)
    return []
  }
}

// Get recent analysis sessions
export async function getAnalysisSessions(limit = 20) {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return []
    }

    // Mock retrieval for development
    return mockDatabase.analysisSessions.slice(0, limit)
  } catch (error) {
    console.error('Failed to get analysis sessions:', error)
    return []
  }
}
