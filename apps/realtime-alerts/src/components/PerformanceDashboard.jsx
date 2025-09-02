import React, { useState, useEffect } from 'react'
import { performanceMonitor } from '../performance/PerformanceMonitor'

/**
 * Performance Dashboard Component for v1.2
 * Displays: Cache performance, connection health, memory usage, system metrics
 */

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [summary, setSummary] = useState(null)
  const [trends, setTrends] = useState(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(5000)

  useEffect(() => {
    // Initial load
    updateMetrics()

    // Set up refresh interval
    const interval = setInterval(updateMetrics, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval])

  const updateMetrics = () => {
    try {
      console.log('🔄 Refreshing performance metrics...')
      const currentMetrics = performanceMonitor.getMetrics()
      const currentSummary = performanceMonitor.getSummary()
      const currentTrends = performanceMonitor.getTrends()

      console.log('📊 New metrics:', currentMetrics)
      console.log('📈 New summary:', currentSummary)
      console.log('📉 New trends:', currentTrends)

      console.log('🔄 Setting new state...')
      setMetrics(currentMetrics)
      setSummary(currentSummary)
      setTrends(currentTrends)
      
      console.log('✅ Metrics updated successfully')
    } catch (error) {
      console.error('❌ Failed to update performance metrics:', error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'disconnected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈'
      case 'degrading': return '📉'
      case 'stable': return '➡️'
      default: return '❓'
    }
  }

  const formatUptime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatMemory = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!metrics || !summary) {
    return (
      <div className="card">
        <div className="label">Performance Dashboard</div>
        <div className="small">Loading metrics...</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Performance Dashboard v1.2</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button 
            onClick={updateMetrics}
            style={{ fontSize: '12px', padding: '4px 8px' }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid" style={{ marginTop: '12px' }}>
        <div className="small">
          <strong>Uptime:</strong> {formatUptime(summary.uptime)}
        </div>
        <div className="small">
          <strong>Memory:</strong> {summary.memory.used} MB / {summary.memory.peak} MB peak
        </div>
        <div className="small">
          <strong>Cache Usage:</strong> {summary.memory.cacheUsage} MB
        </div>
      </div>

      {/* Cache Performance */}
      <div style={{ marginTop: '12px' }}>
        <div className="label" style={{ fontSize: '14px', marginBottom: '8px' }}>Cache Performance</div>
        <div className="grid">
          <div className="small">
            <strong>Price Cache:</strong> {summary.cacheHitRate.price}% hit rate
            {trends && <span style={{ marginLeft: '8px' }}>{getTrendIcon(trends.cacheHitRate.price)}</span>}
          </div>
          <div className="small">
            <strong>Historical Cache:</strong> {summary.cacheHitRate.historical}% hit rate
            {trends && <span style={{ marginLeft: '8px' }}>{getTrendIcon(trends.cacheHitRate.historical)}</span>}
          </div>
          <div className="small">
            <strong>Technical Cache:</strong> {summary.cacheHitRate.technical}% hit rate
            {trends && <span style={{ marginLeft: '8px' }}>{getTrendIcon(trends.cacheHitRate.technical)}</span>}
          </div>
        </div>
      </div>

      {/* Connection Health */}
      <div style={{ marginTop: '12px' }}>
        <div className="label" style={{ fontSize: '14px', marginBottom: '8px' }}>Connection Health</div>
        <div className="grid">
          <div className="small">
            <strong>WebSocket:</strong> 
            <span className={getStatusColor(summary.connections.websocket)}>
              {summary.connections.websocket}
            </span>
          </div>
          <div className="small">
            <strong>API Requests:</strong> {summary.connections.api.requests} 
            <span style={{ color: summary.connections.api.errors > 0 ? '#ef4444' : '#10b981' }}>
              ({summary.connections.api.errors} errors)
            </span>
          </div>
          <div className="small">
            <strong>Avg Response:</strong> {summary.connections.api.avgResponseTime}ms
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <div className="label" style={{ fontSize: '14px', marginBottom: '8px' }}>Detailed Metrics</div>
          
          {/* Cache Details */}
          <div style={{ marginBottom: '12px' }}>
            <div className="small" style={{ fontWeight: 'bold', marginBottom: '4px' }}>Cache Statistics:</div>
            <div className="grid">
              <div className="small">
                Price: {metrics.cache.price.hits} hits, {metrics.cache.price.misses} misses
              </div>
              <div className="small">
                Historical: {metrics.cache.historical.hits} hits, {metrics.cache.historical.misses} misses
              </div>
              <div className="small">
                Technical: {metrics.cache.technical.hits} hits, {metrics.cache.technical.misses} misses
              </div>
            </div>
          </div>

          {/* Memory Details */}
          <div style={{ marginBottom: '12px' }}>
            <div className="small" style={{ fontWeight: 'bold', marginBottom: '4px' }}>Memory Details:</div>
            <div className="grid">
              <div className="small">
                Current: {formatMemory(metrics.memory.used)}
              </div>
              <div className="small">
                Peak: {formatMemory(metrics.memory.peak)}
              </div>
              <div className="small">
                Cache: {formatMemory(metrics.memory.cacheUsage)}
              </div>
            </div>
          </div>

          {/* Performance Details */}
          <div style={{ marginBottom: '12px' }}>
            <div className="small" style={{ fontWeight: 'bold', marginBottom: '4px' }}>Performance:</div>
            <div className="grid">
              <div className="small">
                FPS: {metrics.performance.fps}
              </div>
              <div className="small">
                History Size: {metrics.historySize} entries
              </div>
              <div className="small">
                Last Update: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button 
              onClick={() => performanceMonitor.reset()}
              style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Reset Metrics
            </button>
            <button 
              onClick={() => {
                const data = performanceMonitor.exportData()
                console.log('Performance Data:', data)
              }}
              style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Export Data
            </button>
          </div>
        </div>
      )}

      {/* Refresh Rate Control */}
      <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
        <label>
          Refresh Rate: 
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{ marginLeft: '8px', fontSize: '12px' }}
          >
            <option value={1000}>1 second</option>
            <option value={5000}>5 seconds</option>
            <option value={10000}>10 seconds</option>
            <option value={30000}>30 seconds</option>
          </select>
        </label>
      </div>
    </div>
  )
}
