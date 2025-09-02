import { GEMINI_CONFIG } from '../config.js'

class GeminiClient {
  constructor(apiKey = null) {
    this.apiKey = apiKey || GEMINI_CONFIG.apiKey
    this.baseUrl = GEMINI_CONFIG.baseUrl
    this.model = GEMINI_CONFIG.model
    this.cache = new Map()
    this.requestQueue = []
    this.isProcessing = false
    this.requestCount = 0
    this.lastRequestTime = 0
    
    // Initialize cache cleanup
    this.startCacheCleanup()
  }

  // Cache management
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupCache()
    }, GEMINI_CONFIG.cacheDuration)
  }

  cleanupCache() {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > GEMINI_CONFIG.cacheDuration) {
        this.cache.delete(key)
      }
    }
    
    // Limit cache size
    if (this.cache.size > GEMINI_CONFIG.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      const toRemove = entries.slice(0, entries.length - GEMINI_CONFIG.maxCacheSize)
      toRemove.forEach(([key]) => this.cache.delete(key))
    }
  }

  // Rate limiting
  canMakeRequest() {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    const minInterval = 60000 / GEMINI_CONFIG.requestsPerMinute // 60 seconds / requests per minute
    
    return timeSinceLastRequest >= minInterval
  }

  async waitForRateLimit() {
    if (!this.canMakeRequest()) {
      const now = Date.now()
      const timeSinceLastRequest = now - this.lastRequestTime
      const minInterval = 60000 / GEMINI_CONFIG.requestsPerMinute
      const waitTime = minInterval - timeSinceLastRequest
      
      if (GEMINI_CONFIG.debugLogging) {
        console.log(`🔮 Rate limited, waiting ${Math.ceil(waitTime / 1000)}s...`)
      }
      
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  // Caching
  getCachedResponse(prompt) {
    const cacheKey = this.generateCacheKey(prompt)
    const cached = this.cache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < GEMINI_CONFIG.cacheDuration) {
      if (GEMINI_CONFIG.debugLogging) {
        console.log('🔮 Using cached response')
      }
      return cached.response
    }
    
    return null
  }

  setCachedResponse(prompt, response) {
    const cacheKey = this.generateCacheKey(prompt)
    this.cache.set(cacheKey, {
      response,
      timestamp: Date.now()
    })
  }

  generateCacheKey(prompt) {
    // Simple hash for prompt
    return btoa(prompt).slice(0, 50)
  }

  // Main API call method
  async generateContent(prompt, options = {}) {
    try {
      // Check cache first
      const cached = this.getCachedResponse(prompt)
      if (cached && !options.forceRefresh) {
        return cached
      }

      // Wait for rate limit
      await this.waitForRateLimit()

      // Make API request
      const response = await this.makeApiRequest(prompt, options)
      
      // Cache response
      this.setCachedResponse(prompt, response)
      
      // Update rate limiting
      this.lastRequestTime = Date.now()
      this.requestCount++
      
      return response
      
    } catch (error) {
      if (GEMINI_CONFIG.debugLogging) {
        console.error('🔮 Gemini API error:', error)
      }
      throw error
    }
  }

  // Actual API request
  async makeApiRequest(prompt, options = {}) {
    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: options.temperature || GEMINI_CONFIG.temperature,
        topP: options.topP || GEMINI_CONFIG.topP,
        topK: options.topK || GEMINI_CONFIG.topK,
        maxOutputTokens: options.maxTokens || GEMINI_CONFIG.maxTokens
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_CONFIG.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`)
      }

      const data = await response.json()
      
      if (GEMINI_CONFIG.debugLogging) {
        console.log('🔮 Gemini API response:', data)
      }

      return this.parseResponse(data)
      
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timeout')
      }
      throw error
    }
  }

  // Parse Gemini response
  parseResponse(data) {
    try {
      const content = data.candidates?.[0]?.content
      if (!content) {
        throw new Error('No content in response')
      }

      const text = content.parts?.[0]?.text
      if (!text) {
        throw new Error('No text in response')
      }

      return {
        text,
        usage: data.usageMetadata,
        timestamp: new Date().toISOString(),
        model: this.model
      }
      
    } catch (error) {
      throw new Error(`Failed to parse response: ${error.message}`)
    }
  }

  // Utility methods
  async analyzeMarketData(marketData) {
    const prompt = this.buildMarketAnalysisPrompt(marketData)
    return this.generateContent(prompt)
  }

  buildMarketAnalysisPrompt(marketData) {
    return `Analyze the following cryptocurrency market data and provide insights:

Current BTC Price: $${marketData.currentPrice}
24h Change: ${marketData.priceChange}%
24h High: $${marketData.high}
24h Low: $${marketData.low}
Volume: ${marketData.volume} BTC

Please provide:
1. Market sentiment analysis
2. Key technical levels to watch
3. Short-term price outlook
4. Risk assessment

Keep the analysis concise and actionable for traders.`
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: GEMINI_CONFIG.maxCacheSize,
      hitRate: this.cache.size > 0 ? 'N/A' : '0%',
      lastRequest: this.lastRequestTime,
      totalRequests: this.requestCount
    }
  }

  // Clear cache
  clearCache() {
    this.cache.clear()
    if (GEMINI_CONFIG.debugLogging) {
      console.log('🔮 Cache cleared')
    }
  }
}

export default GeminiClient

