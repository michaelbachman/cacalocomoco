// Browser-compatible database client for Kraken alerts
// Uses Netlify Functions for secure database operations

import NetlifyClient from './api/NetlifyClient.js'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined'

// Initialize Netlify client
const netlifyClient = new NetlifyClient()

// Initialize database tables if they don't exist
export async function initializeDatabase() {
  try {
    if (!isBrowser) {
      console.warn('Database functions not available in server environment')
      return false
    }

    // In browser, we'll use Netlify Functions
    console.log('Database initialized successfully (Netlify Functions mode)')
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

    // Use Netlify Functions for storage
    const result = await netlifyClient.storePriceData(pairName, price)
    console.log(`Stored ${pairName} price: $${price}`)
    return result.success
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

    // Use Netlify Functions for storage
    const result = await netlifyClient.storeConnectionLog(eventType, message, status)
    console.log(`Stored connection log: ${eventType} - ${message}`)
    return result.success
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

    // Use Netlify Functions for retrieval
    const result = await netlifyClient.getPriceHistory(pairName, limit)
    return result.data
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

    // Use Netlify Functions for retrieval
    const result = await netlifyClient.getConnectionLogs(limit)
    return result.data
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

    // Test Netlify Functions connection
    const isHealthy = await netlifyClient.healthCheck()
    console.log('Netlify Functions connection test:', isHealthy ? 'successful' : 'failed')
    return isHealthy
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

    // Get stats from Netlify Functions
    const clientStats = netlifyClient.getStats()
    return {
      ...clientStats,
      type: 'Netlify Functions'
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

    // Use Netlify Functions for storage
    const result = await netlifyClient.storeTechnicalIndicators(symbol, interval, indicators)
    console.log(`Stored technical indicators for ${symbol} (${interval})`)
    return result.success
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

    // Use Netlify Functions for storage
    const result = await netlifyClient.storeTechnicalAnalysis(analysis)
    console.log(`Stored technical analysis result (${analysis.overall.recommendation})`)
    return result.success
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

    // Use Netlify Functions for storage
    const result = await netlifyClient.storeAnalysisSession(symbol, interval, status, details)
    console.log(`Stored analysis session for ${symbol} (${interval}) - ${status}`)
    return result.success
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

    // Use Netlify Functions for retrieval
    const result = await netlifyClient.getTechnicalAnalysis(limit)
    return result.data
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

    // Use Netlify Functions for retrieval
    const result = await netlifyClient.getAnalysisSessions(limit)
    return result.data
  } catch (error) {
    console.error('Failed to get analysis sessions:', error)
    return []
  }
}
