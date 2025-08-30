/**
 * Reusable API Client System
 * Follows the same robust patterns established in the Kraken connection
 * Provides rate limiting, caching, error handling, and reconnection logic
 */

// Base API Client Class
export class BaseApiClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || ''
    this.apiKey = config.apiKey || ''
    this.rateLimitDelay = config.rateLimitDelay || 1000 // Default 1 second
    this.maxRetries = config.maxRetries || 3
    this.retryDelay = config.retryDelay || 5000
    this.cacheDuration = config.cacheDuration || 5 * 60 * 1000 // 5 minutes
    
    // Internal state
    this.lastRequestTime = 0
    this.requestCount = 0
    this.errorCount = 0
    this.cache = new Map()
    this.retryQueue = []
    this.isRetrying = false
    
    // Event callbacks
    this.onError = config.onError || (() => {})
    this.onRateLimit = config.onRateLimit || (() => {})
    this.onRetry = config.onRetry || (() => {})
  }

  // Rate limiting with queue system
  async rateLimitedRequest(requestFn) {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    // If we're making requests too quickly, queue them
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const delay = this.rateLimitDelay - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    this.lastRequestTime = Date.now()
    this.requestCount++
    
    return requestFn()
  }

  // Caching system
  getCachedData(key) {
    const cached = this.cache.get(key)
    if (!cached) return null
    
    const now = Date.now()
    if (now - cached.timestamp < this.cacheDuration) {
      return cached.data
    }
    
    // Expired, remove from cache
    this.cache.delete(key)
    return null
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    // Limit cache size to prevent memory issues
    if (this.cache.size > 50) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
  }

  // Retry logic with exponential backoff
  async retryRequest(requestFn, attempt = 1) {
    try {
      return await requestFn()
    } catch (error) {
      if (attempt >= this.maxRetries) {
        this.errorCount++
        this.onError(error, attempt)
        throw error
      }
      
      const delay = this.retryDelay * Math.pow(2, attempt - 1)
      this.onRetry(error, attempt, delay)
      
      await new Promise(resolve => setTimeout(resolve, delay))
      return this.retryRequest(requestFn, attempt + 1)
    }
  }

  // Main request method
  async request(endpoint, options = {}) {
    const cacheKey = options.cacheKey || `${endpoint}-${JSON.stringify(options)}`
    
    // Check cache first if not disabled
    if (options.useCache !== false) {
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    const requestFn = async () => {
      let url = `${this.baseUrl}${endpoint}`
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }
      
      // Add API key if available (as header for most APIs)
      if (this.apiKey && !this.useQueryParamForApiKey) {
        requestOptions.headers['X-API-Key'] = this.apiKey
      }
      
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        if (response.status === 429) {
          this.onRateLimit(response)
          throw new Error(`Rate limit exceeded: ${response.statusText}`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache successful responses
      if (options.useCache !== false) {
        this.setCachedData(cacheKey, data)
      }
      
      return data
    }
    
    return this.retryRequest(() => 
      this.rateLimitedRequest(requestFn)
    )
  }

  // Utility methods
  clearCache() {
    this.cache.clear()
  }

  getStats() {
    return {
      requestCount: this.requestCount,
      errorCount: this.errorCount,
      cacheSize: this.cache.size,
      lastRequestTime: this.lastRequestTime
    }
  }
}

// Alpha Vantage specific client
export class AlphaVantageClient extends BaseApiClient {
  constructor(apiKey, config = {}) {
    super({
      baseUrl: 'https://www.alphavantage.co/query',
      apiKey,
      rateLimitDelay: 12000, // Alpha Vantage free tier: 5 requests per minute = 12 seconds
      maxRetries: 3,
      retryDelay: 5000,
      cacheDuration: 5 * 60 * 1000, // 5 minutes cache
      useQueryParamForApiKey: true, // Alpha Vantage requires API key as query parameter
      ...config
    })
  }

  // Override request method to handle query parameters properly for Alpha Vantage
  async request(endpoint, options = {}) {
    const cacheKey = options.cacheKey || `${endpoint}-${JSON.stringify(options)}`
    
    // Check cache first if not disabled
    if (options.useCache !== false) {
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return cached
      }
    }
    
    const requestFn = async () => {
      let url = `${this.baseUrl}${endpoint}`
      
      // Build query string for Alpha Vantage (including API key)
      if (options.params) {
        const queryParams = new URLSearchParams(options.params)
        // Always add API key as query parameter for Alpha Vantage
        queryParams.set('apikey', this.apiKey)
        url += `?${queryParams.toString()}`
      } else {
        url += `?apikey=${this.apiKey}`
      }
      
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }
      
      const response = await fetch(url, requestOptions)
      
      if (!response.ok) {
        if (response.status === 429) {
          this.onRateLimit(response)
          throw new Error(`Rate limit exceeded: ${response.statusText}`)
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      // Cache successful responses
      if (options.useCache !== false) {
        this.setCachedData(cacheKey, data)
      }
      
      return data
    }
    
    return this.retryRequest(() => 
      this.rateLimitedRequest(requestFn)
    )
  }

  // Technical Indicators
  async getRSI(symbol, interval = 'daily', timePeriod = 14, seriesType = 'close') {
    return this.request('', {
      params: {
        function: 'RSI',
        symbol,
        interval,
        time_period: timePeriod,
        series_type: seriesType
      },
      cacheKey: `rsi-${symbol}-${interval}-${timePeriod}-${seriesType}`
    })
  }

  async getMACD(symbol, interval = 'daily', seriesType = 'close', fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    return this.request('', {
      params: {
        function: 'MACD',
        symbol,
        interval,
        series_type: seriesType,
        fastperiod: fastPeriod,
        slowperiod: slowPeriod,
        signalperiod: signalPeriod
      },
      cacheKey: `macd-${symbol}-${interval}-${fastPeriod}-${slowPeriod}-${signalPeriod}`
    })
  }

  async getStochastic(symbol, interval = 'daily', fastKPeriod = 5, slowKPeriod = 3, slowDPeriod = 3) {
    return this.request('', {
      params: {
        function: 'STOCH',
        symbol,
        interval,
        fastkperiod: fastKPeriod,
        slowkperiod: slowKPeriod,
        slowdperiod: slowDPeriod
      },
      cacheKey: `stoch-${symbol}-${interval}-${fastKPeriod}-${slowKPeriod}-${slowDPeriod}`
    })
  }

  async getSMA(symbol, interval = 'daily', timePeriod = 20, seriesType = 'close') {
    return this.request('', {
      params: {
        function: 'SMA',
        symbol,
        interval,
        time_period: timePeriod,
        series_type: seriesType
      },
      cacheKey: `sma-${symbol}-${interval}-${timePeriod}-${seriesType}`
    })
  }

  async getEMA(symbol, interval = 'daily', timePeriod = 20, seriesType = 'close') {
    return this.request('', {
      params: {
        function: 'EMA',
        symbol,
        interval,
        time_period: timePeriod,
        series_type: seriesType
      },
      cacheKey: `ema-${symbol}-${interval}-${timePeriod}-${seriesType}`
    })
  }

  async getWilliamsR(symbol, interval = 'daily', timePeriod = 14) {
    return this.request('', {
      params: {
        function: 'WILLR',
        symbol,
        interval,
        time_period: timePeriod
      },
      cacheKey: `willr-${symbol}-${interval}-${timePeriod}`
    })
  }

  async getCCI(symbol, interval = 'daily', timePeriod = 20) {
    return this.request('', {
      params: {
        function: 'CCI',
        symbol,
        interval,
        time_period: timePeriod
      },
      cacheKey: `cci-${symbol}-${interval}-${timePeriod}`
    })
  }

  async getADX(symbol, interval = 'daily', timePeriod = 14) {
    return this.request('', {
      params: {
        function: 'ADX',
        symbol,
        interval,
        time_period: timePeriod
      },
      cacheKey: `adx-${symbol}-${interval}-${timePeriod}`
    })
  }

  // Batch request for multiple indicators
  async getTechnicalIndicators(symbol, interval = 'daily', indicators = []) {
    console.log('🔧 getTechnicalIndicators called with:', { symbol, interval, indicators })
    const results = {}
    
    for (const indicator of indicators) {
      try {
        console.log(`🔧 Fetching ${indicator.type}...`)
        switch (indicator.type) {
          case 'RSI':
            results.RSI = await this.getRSI(symbol, interval, indicator.timePeriod || 14)
            break
          case 'MACD':
            results.MACD = await this.getMACD(symbol, interval, indicator.seriesType || 'close')
            break
          case 'Stochastic':
            results.Stochastic = await this.getStochastic(symbol, interval)
            break
          case 'SMA':
            results.SMA = await this.getSMA(symbol, interval, indicator.timePeriod || 20)
            break
          case 'EMA':
            results.EMA = await this.getEMA(symbol, interval, indicator.timePeriod || 20)
            break
          case 'WilliamsR':
            results.WilliamsR = await this.getWilliamsR(symbol, interval, indicator.timePeriod || 14)
            break
          case 'CCI':
            results.CCI = await this.getCCI(symbol, interval, indicator.timePeriod || 20)
            break
          case 'ADX':
            results.ADX = await this.getADX(symbol, interval, indicator.timePeriod || 14)
            break
        }
        console.log(`🔧 ${indicator.type} result:`, results[indicator.type])
        
        // Add small delay between requests to be respectful of free tier
        if (indicators.indexOf(indicator) < indicators.length - 1) {
          console.log(`🔧 Waiting 500ms before next request...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`🔧 Failed to fetch ${indicator.type}:`, error)
        results[indicator.type] = { error: error.message }
      }
    }
    
    console.log('🔧 All indicators fetched:', results)
    return results
  }
}
