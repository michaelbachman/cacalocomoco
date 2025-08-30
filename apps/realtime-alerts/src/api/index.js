/**
 * API Module Index
 * Centralized exports for all API-related functionality
 */

// Core API infrastructure
export { BaseApiClient, AlphaVantageClient } from './ApiClient.js'

// Configuration
export { 
  ALPHA_VANTAGE_CONFIG, 
  KRAKEN_CONFIG, 
  API_CONFIG, 
  validateConfig,
  isDevelopment,
  isProduction 
} from './config.js'

// Technical analysis service
export { default as TechnicalAnalysisService } from './TechnicalAnalysis.js'

// Default configuration export
export { default as apiConfig } from './config.js'
