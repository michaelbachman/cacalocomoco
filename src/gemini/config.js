export const GEMINI_CONFIG = {
  // API Configuration
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_API_KEY_HERE',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  
  // Model Configuration
  model: 'gemini-2.0-flash-exp', // Free tier model
  maxTokens: 8192,
  temperature: 0.1, // Low temperature for consistent analysis
  topP: 0.8,
  topK: 40,
  
  // Rate Limiting (Free Tier)
  requestsPerMinute: 15,
  requestsPerHour: 150,
  requestsPerDay: 1500,
  concurrentRequests: 1,
  
  // Caching Configuration
  cacheDuration: 10 * 60 * 1000, // 10 minutes
  maxCacheSize: 100, // Maximum cached responses
  
  // Retry Configuration
  maxRetries: 3,
  retryDelay: 2000, // 2 seconds
  
  // Request Timeout
  timeout: 30000, // 30 seconds
  
  // Development Mode
  isDevelopment: import.meta.env.DEV,
  debugLogging: import.meta.env.DEV
}

// Validation function
export const validateGeminiConfig = () => {
  const errors = []
  
  if (!GEMINI_CONFIG.apiKey || GEMINI_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
    errors.push('Gemini API key not configured')
  }
  
  if (GEMINI_CONFIG.requestsPerMinute > 15) {
    errors.push('Free tier limit: 15 requests per minute')
  }
  
  if (GEMINI_CONFIG.requestsPerHour > 150) {
    errors.push('Free tier limit: 150 requests per hour')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Rate limit checker
export const checkRateLimits = () => {
  // This will be implemented with actual rate limiting logic
  return {
    canMakeRequest: true,
    remainingRequests: 15,
    resetTime: Date.now() + (60 * 1000) // 1 minute from now
  }
}


