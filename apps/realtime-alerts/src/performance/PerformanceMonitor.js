/**
 * Performance Monitoring System for v1.2
 * Tracks: Cache performance, connection health, memory usage, response times
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cache: {
        price: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        historical: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        technical: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 }
      },
      connections: {
        websocket: { status: 'disconnected', latency: 0, uptime: 0, reconnectCount: 0 },
        api: { requests: 0, errors: 0, avgResponseTime: 0, rateLimitHits: 0 }
      },
      memory: {
        used: 0,
        peak: 0,
        cacheUsage: 0,
        totalUsage: 0
      },
      performance: {
        fps: 0,
        renderTime: 0,
        updateTime: 0
      }
    }
    
    this.history = []
    this.maxHistorySize = 1000
    this.monitoringInterval = null
    this.startTime = Date.now()
    
    // Start monitoring
    this.startMonitoring()
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
      this.updateHistory()
      this.cleanupHistory()
    }, 5000) // Collect metrics every 5 seconds
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  /**
   * Collect current performance metrics
   */
  collectMetrics() {
    // Memory metrics
    if (typeof performance !== 'undefined' && performance.memory) {
      this.metrics.memory.used = performance.memory.usedJSHeapSize
      this.metrics.memory.peak = Math.max(this.metrics.memory.peak, performance.memory.usedJSHeapSize)
    }

    // Cache metrics (will be updated by cache managers)
    this.updateCacheMetrics()

    // Connection metrics (will be updated by connection managers)
    this.updateConnectionMetrics()

    // Performance metrics
    this.updatePerformanceMetrics()
  }

  /**
   * Update cache performance metrics
   */
  updateCacheMetrics() {
    try {
      // For now, we'll use placeholder metrics until cache integration is complete
      // This prevents circular dependency issues during initialization
      this.metrics.cache.price.hitRate = 0
      this.metrics.cache.historical.hitRate = 0
      this.metrics.cache.technical.hitRate = 0
      this.metrics.memory.cacheUsage = 0
      
      // TODO: Integrate with cache managers once they're fully initialized
      console.log('Cache metrics placeholder - will integrate with cache managers in next step')
    } catch (err) {
      console.warn('Cache metrics update failed:', err)
    }
  }

  /**
   * Update connection metrics
   */
  updateConnectionMetrics() {
    // This will be called by connection managers
    // For now, we'll track basic metrics
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    // FPS calculation (simplified)
    const now = Date.now()
    const timeDiff = now - (this.lastFrameTime || now)
    this.metrics.performance.fps = timeDiff > 0 ? Math.round(1000 / timeDiff) : 0
    this.lastFrameTime = now
  }

  /**
   * Record cache operation timing
   */
  recordCacheOperation(cacheType, operation, duration) {
    const key = `${cacheType}_${operation}_times`
    if (!this[key]) {
      this[key] = []
    }
    
    this[key].push(duration)
    
    // Keep only last 100 measurements
    if (this[key].length > 100) {
      this[key] = this[key].slice(-100)
    }
  }

  /**
   * Calculate average response time for cache type
   */
  calculateAverageResponseTime(cacheType) {
    const times = this[`${cacheType}_get_times`] || []
    if (times.length === 0) return 0
    
    const sum = times.reduce((acc, time) => acc + time, 0)
    return Math.round(sum / times.length)
  }

  /**
   * Update connection status
   */
  updateConnectionStatus(type, status, latency = 0) {
    if (this.metrics.connections[type]) {
      this.metrics.connections[type].status = status
      this.metrics.connections[type].latency = latency
      
      if (status === 'connected') {
        this.metrics.connections[type].uptime = Date.now() - this.startTime
      }
    }
  }

  /**
   * Record API request
   */
  recordApiRequest(responseTime, success = true) {
    const conn = this.metrics.connections.api
    conn.requests++
    
    if (!success) {
      conn.errors++
    }
    
    // Update average response time
    const times = this.api_response_times || []
    times.push(responseTime)
    if (times.length > 100) times.shift()
    this.api_response_times = times
    
    conn.avgResponseTime = Math.round(times.reduce((acc, time) => acc + time, 0) / times.length)
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit() {
    this.metrics.connections.api.rateLimitHits++
  }

  /**
   * Update history with current metrics
   */
  updateHistory() {
    const snapshot = {
      timestamp: Date.now(),
      metrics: JSON.parse(JSON.stringify(this.metrics)) // Deep copy
    }
    
    this.history.push(snapshot)
  }

  /**
   * Cleanup old history entries
   */
  cleanupHistory() {
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize)
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      historySize: this.history.length
    }
  }

  /**
   * Get performance summary
   */
  getSummary() {
    const metrics = this.getMetrics()
    
    return {
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      cacheHitRate: {
        price: metrics.cache.price.hitRate,
        historical: metrics.cache.historical.hitRate,
        technical: metrics.cache.technical.hitRate
      },
      connections: {
        websocket: metrics.connections.websocket.status,
        api: {
          requests: metrics.connections.api.requests,
          errors: metrics.connections.api.errors,
          avgResponseTime: metrics.connections.api.avgResponseTime
        }
      },
      memory: {
        used: Math.round(metrics.memory.used / 1024 / 1024 * 100) / 100, // MB
        peak: Math.round(metrics.memory.peak / 1024 / 1024 * 100) / 100, // MB
        cacheUsage: Math.round(metrics.memory.cacheUsage / 1024 / 1024 * 100) / 100 // MB
      }
    }
  }

  /**
   * Get performance trends (last N minutes)
   */
  getTrends(minutes = 5) {
    const cutoff = Date.now() - (minutes * 60 * 1000)
    const recentHistory = this.history.filter(entry => entry.timestamp > cutoff)
    
    if (recentHistory.length === 0) return null
    
    const trends = {
      cacheHitRate: {
        price: this.calculateTrend(recentHistory, 'cache.price.hitRate'),
        historical: this.calculateTrend(recentHistory, 'cache.historical.hitRate'),
        technical: this.calculateTrend(recentHistory, 'cache.technical.hitRate')
      },
      memoryUsage: this.calculateTrend(recentHistory, 'memory.used'),
      apiResponseTime: this.calculateTrend(recentHistory, 'connections.api.avgResponseTime')
    }
    
    return trends
  }

  /**
   * Calculate trend (positive/negative/stable)
   */
  calculateTrend(history, path) {
    if (history.length < 2) return 'stable'
    
    const values = history.map(entry => {
      const keys = path.split('.')
      let value = entry.metrics
      for (const key of keys) {
        value = value[key]
        if (value === undefined) return 0
      }
      return value
    })
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100
    
    if (change > 5) return 'improving'
    if (change < -5) return 'degrading'
    return 'stable'
  }

  /**
   * Export performance data
   */
  exportData() {
    return {
      metrics: this.getMetrics(),
      summary: this.getSummary(),
      trends: this.getTrends(),
      history: this.history.slice(-100) // Last 100 entries
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      cache: {
        price: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        historical: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 },
        technical: { hits: 0, misses: 0, hitRate: 0, avgResponseTime: 0 }
      },
      connections: {
        websocket: { status: 'disconnected', latency: 0, uptime: 0, reconnectCount: 0 },
        api: { requests: 0, errors: 0, avgResponseTime: 0, rateLimitHits: 0 }
      },
      memory: {
        used: 0,
        peak: 0,
        cacheUsage: 0,
        totalUsage: 0
      },
      performance: {
        fps: 0,
        renderTime: 0,
        updateTime: 0
      }
    }
    
    this.history = []
    this.startTime = Date.now()
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    this.stopMonitoring()
    this.history = []
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// Export the class for custom instances
export default PerformanceMonitor
