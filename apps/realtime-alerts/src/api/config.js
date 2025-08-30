/**
 * API Configuration
 * Centralized configuration for all API connections
 * Follows the same pattern as existing Kraken configuration
 */

// Alpha Vantage API Configuration
export const ALPHA_VANTAGE_CONFIG = {
  // Get API key from environment variable or use placeholder
  apiKey: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || 'YOUR_API_KEY_HERE',
  
  // API Limits & Best Practices (Alpha Vantage Free Tier):
  // - Rate limit: 5 requests per minute (1 request per 12 seconds)
  // - Cache results to minimize API calls
  // - Respectful intervals: Don't hammer the API with rapid requests
  // - User experience: Show cached data while fetching fresh data
  
  // Rate limiting configuration
  rateLimitDelay: 12000, // 12 seconds between requests (respectful of 5 req/min limit)
  maxRetries: 3,
  retryDelay: 5000,
  cacheDuration: 5 * 60 * 1000, // 5 minutes cache
  
  // Technical indicators configuration
  defaultInterval: 'daily',
  defaultTimePeriod: 14,
  
  // Available intervals for Alpha Vantage
  availableIntervals: [
    { value: '1min', label: '1 minute', description: '1 minute intervals' },
    { value: '5min', label: '5 minutes', description: '5 minute intervals' },
    { value: '15min', label: '15 minutes', description: '15 minute intervals' },
    { value: '30min', label: '30 minutes', description: '30 minute intervals' },
    { value: '60min', label: '1 hour', description: '1 hour intervals' },
    { value: 'daily', label: 'Daily', description: 'Daily intervals (default)' },
    { value: 'weekly', label: 'Weekly', description: 'Weekly intervals' },
    { value: 'monthly', label: 'Monthly', description: 'Monthly intervals' }
  ],
  
  // Default technical indicators to fetch (limited to 3 for free tier daily limits)
  defaultIndicators: [
    { type: 'RSI', timePeriod: 14, description: 'Relative Strength Index' },
    { type: 'MACD', description: 'Moving Average Convergence Divergence' },
    { type: 'Stochastic', description: 'Stochastic Oscillator' }
  ]
}

// Kraken API Configuration (existing, for reference)
export const KRAKEN_CONFIG = {
  // WebSocket endpoint
  wsUrl: 'wss://ws.kraken.com',
  
  // REST API endpoint
  restUrl: 'https://api.kraken.com/0/public',
  
  // Rate limits & best practices
  rateLimitDelay: 500, // 2 requests per second
  cacheDuration: 5 * 60 * 1000, // 5 minutes cache
  maxRetries: 3,
  retryDelay: 5000
}

// General API configuration
export const API_CONFIG = {
  // Global settings
  requestTimeout: 15000, // 15 seconds
  maxConcurrentRequests: 5,
  
  // Error handling
  maxErrorCount: 10,
  errorResetInterval: 60 * 1000, // 1 minute
  
  // Logging
  enableApiLogging: true,
  logLevel: 'info' // 'debug', 'info', 'warn', 'error'
}

// Environment check
export const isDevelopment = import.meta.env.DEV
export const isProduction = import.meta.env.PROD

// Configuration validation
export function validateConfig() {
  const errors = []
  
  // Check Alpha Vantage API key
  if (!ALPHA_VANTAGE_CONFIG.apiKey || ALPHA_VANTAGE_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    errors.push('Alpha Vantage API key not configured. Please set VITE_ALPHA_VANTAGE_API_KEY environment variable.')
  }
  
  // Check if we're in development mode
  if (isDevelopment) {
    console.warn('🔧 Development mode: API calls will be logged and cached aggressively')
  }
  
  return errors
}

// Export default configuration
export default {
  alphaVantage: ALPHA_VANTAGE_CONFIG,
  kraken: KRAKEN_CONFIG,
  api: API_CONFIG,
  validateConfig
}
