/**
 * Advanced Caching System for v1.2
 * Features: LRU eviction, TTL support, memory limits, performance metrics
 */

class CacheEntry {
  constructor(key, value, ttl = null) {
    this.key = key
    this.value = value
    this.createdAt = Date.now()
    this.lastAccessed = Date.now()
    this.accessCount = 0
    this.ttl = ttl // Time to live in milliseconds
  }

  isExpired() {
    if (!this.ttl) return false
    return Date.now() - this.createdAt > this.ttl
  }

  touch() {
    this.lastAccessed = Date.now()
    this.accessCount++
  }

  getSize() {
    // Estimate memory usage (rough calculation)
    const valueSize = JSON.stringify(this.value).length * 2 // UTF-16 characters
    const metadataSize = 100 // Key, timestamps, counters
    return valueSize + metadataSize
  }
}

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100 // Maximum number of entries
    this.maxMemory = options.maxMemory || 10 * 1024 * 1024 // 10MB default
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000 // 5 minutes default
    this.cleanupInterval = options.cleanupInterval || 30000 // 30 seconds
    
    this.cache = new Map()
    this.accessOrder = [] // Track access order for LRU
    this.currentMemory = 0
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      memoryUsage: 0
    }
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.cleanupInterval)
  }

  /**
   * Set a value in the cache
   */
  set(key, value, ttl = null) {
    const entry = new CacheEntry(key, value, ttl || this.defaultTTL)
    const entrySize = entry.getSize()
    
    // Check if we need to evict entries
    while (this.shouldEvict(entrySize)) {
      this.evictLRU()
    }
    
    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      this.removeEntry(key)
    }
    
    // Add new entry
    this.cache.set(key, entry)
    this.accessOrder.push(key)
    this.currentMemory += entrySize
    
    this.updateStats()
    return true
  }

  /**
   * Get a value from the cache
   */
  get(key) {
    this.stats.totalRequests++
    
    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // Check if expired
    if (entry.isExpired()) {
      this.removeEntry(key)
      this.stats.misses++
      return null
    }
    
    // Update access info
    entry.touch()
    this.moveToFront(key)
    this.stats.hits++
    
    return entry.value
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key)
    if (!entry) return false
    if (entry.isExpired()) {
      this.removeEntry(key)
      return false
    }
    return true
  }

  /**
   * Remove a specific entry
   */
  delete(key) {
    this.removeEntry(key)
  }

  /**
   * Clear all entries
   */
  clear() {
    this.cache.clear()
    this.accessOrder = []
    this.currentMemory = 0
    this.updateStats()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      currentMemory: this.currentMemory,
      maxMemory: this.maxMemory,
      hitRate: this.stats.totalRequests > 0 ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0
    }
  }

  /**
   * Get cache keys (for debugging)
   */
  keys() {
    return Array.from(this.cache.keys())
  }

  /**
   * Check if we should evict entries
   */
  shouldEvict(newEntrySize) {
    return this.cache.size >= this.maxSize || 
           (this.currentMemory + newEntrySize) > this.maxMemory
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.length === 0) return
    
    const keyToEvict = this.accessOrder.shift()
    this.removeEntry(keyToEvict)
    this.stats.evictions++
  }

  /**
   * Remove entry and update memory tracking
   */
  removeEntry(key) {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentMemory -= entry.getSize()
      this.cache.delete(key)
      
      // Remove from access order
      const index = this.accessOrder.indexOf(key)
      if (index > -1) {
        this.accessOrder.splice(index, 1)
      }
    }
  }

  /**
   * Move key to front of access order (most recently used)
   */
  moveToFront(key) {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }
  }

  /**
   * Cleanup expired entries and update stats
   */
  cleanup() {
    const expiredKeys = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        expiredKeys.push(key)
      }
    }
    
    expiredKeys.forEach(key => this.removeEntry(key))
    this.updateStats()
  }

  /**
   * Update memory usage stats
   */
  updateStats() {
    this.stats.memoryUsage = this.currentMemory
  }

  /**
   * Destroy the cache manager and cleanup timers
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    this.clear()
  }
}

// Create specialized cache instances
export const priceCache = new CacheManager({
  maxSize: 1000,
  maxMemory: 5 * 1024 * 1024, // 5MB for price data
  defaultTTL: 30 * 1000, // 30 seconds for price data
  cleanupInterval: 15000 // 15 seconds cleanup
})

export const historicalDataCache = new CacheManager({
  maxSize: 100,
  maxMemory: 20 * 1024 * 1024, // 20MB for historical data
  defaultTTL: 5 * 60 * 1000, // 5 minutes for historical data
  cleanupInterval: 60000 // 1 minute cleanup
})

export const technicalIndicatorsCache = new CacheManager({
  maxSize: 200,
  maxMemory: 10 * 1024 * 1024, // 10MB for technical indicators
  defaultTTL: 10 * 60 * 1000, // 10 minutes for technical indicators
  cleanupInterval: 30000 // 30 seconds cleanup
})

export const connectionCache = new CacheManager({
  maxSize: 50,
  maxMemory: 1 * 1024 * 1024, // 1MB for connection data
  defaultTTL: 60 * 1000, // 1 minute for connection data
  cleanupInterval: 30000 // 30 seconds cleanup
})

// Export the main CacheManager class for custom instances
export default CacheManager


