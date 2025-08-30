import React, { useState, useEffect, useRef, useCallback } from 'react'

// Kraken REST API endpoints
const KRAKEN_REST_API = 'https://api.kraken.com/0/public'

// Kraken API Limits & Best Practices:
// - Rate limit: 20 requests per 10 seconds (2 requests per second)
// - Historical data: Cache results to minimize API calls
// - Respectful intervals: Don't hammer the API with rapid requests
// - User experience: Show cached data while fetching fresh data

// Available time intervals for OHLC data - these are TIME PERIODS with correct Kraken API limits
const TIME_INTERVALS = [
  { value: '1h', label: '1 hour', interval: 1, maxPoints: 60, description: 'Last 1 hour (60 1-min candles)' },
  { value: '6h', label: '6 hours', interval: 1, maxPoints: 360, description: 'Last 6 hours (360 1-min candles)' },
  { value: '12h', label: '12 hours', interval: 1, maxPoints: 720, description: 'Last 12 hours (720 1-min candles)' },
  { value: '24h', label: '24 hours', interval: 5, maxPoints: 288, description: 'Last 24 hours (288 5-min candles)' },
  { value: '3d', label: '3 days', interval: 15, maxPoints: 288, description: 'Last 3 days (288 15-min candles)' },
  { value: '7d', label: '7 days', interval: 60, maxPoints: 168, description: 'Last 7 days (168 1-hour candles)' },
  { value: '30d', label: '30 days', interval: 60, maxPoints: 720, description: 'Last 30 days (720 1-hour candles)' }
]

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache
const RATE_LIMIT_DELAY = 500 // 500ms between requests (2 req/sec max)

export default function HistoricalData({ onDataUpdate }) {
  const [historicalData, setHistoricalData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedInterval, setSelectedInterval] = useState('24h') // 24 hours default
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const [cacheStatus, setCacheStatus] = useState('')
  const [currentRealTimePrice, setCurrentRealTimePrice] = useState(null) // Add real-time price state

  // Refs for caching and rate limiting
  const dataCache = useRef(new Map())
  const lastRequestTime = useRef(0)

  // Generate cache key
  const getCacheKey = useCallback((interval, count) => `${interval}-${count}`, [])

  // Check if data is fresh in cache
  const isDataFresh = useCallback((cacheKey) => {
    const cached = dataCache.current.get(cacheKey)
    if (!cached) return false
    
    const now = Date.now()
    return (now - cached.timestamp) < CACHE_DURATION
  }, [])

  // Get cached data if available
  const getCachedData = useCallback((cacheKey) => {
    const cached = dataCache.current.get(cacheKey)
    return cached ? cached.data : null
  }, [])

  // Store data in cache
  const storeInCache = useCallback((cacheKey, data) => {
    dataCache.current.set(cacheKey, {
      data,
      timestamp: Date.now()
    })
    
    // Limit cache size to prevent memory issues
    if (dataCache.current.size > 20) {
      const firstKey = dataCache.current.keys().next().value
      dataCache.current.delete(firstKey)
    }
  }, [])

  // Rate limiting function
  const rateLimitedFetch = useCallback(async (url) => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTime.current
    
    // If we're making requests too quickly, queue them
    if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
      const delay = RATE_LIMIT_DELAY - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    lastRequestTime.current = Date.now()
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }, [])

  // Fetch real-time current price from ticker API
  const fetchRealTimePrice = useCallback(async () => {
    try {
      const data = await rateLimitedFetch(`${KRAKEN_REST_API}/Ticker?pair=XBTUSD`)
      if (data.error && data.error.length > 0) {
        console.warn('Failed to fetch real-time price:', data.error)
        return
      }
      
      const currentPrice = parseFloat(data.result?.XXBTZUSD?.c?.[0] || 0)
      if (currentPrice > 0) {
        setCurrentRealTimePrice(currentPrice)
        console.log('Real-time BTC price:', currentPrice)
      }
    } catch (err) {
      console.warn('Failed to fetch real-time price:', err.message)
    }
  }, [rateLimitedFetch])

  // Get the selected interval configuration
  const getSelectedIntervalConfig = useCallback(() => {
    return TIME_INTERVALS.find(i => i.value === selectedInterval) || TIME_INTERVALS[3] // Default to 24h
  }, [selectedInterval])

  // Get the maximum data points for the selected interval
  const getMaxDataPoints = useCallback(() => {
    const interval = getSelectedIntervalConfig()
    return interval ? interval.maxPoints : 288
  }, [getSelectedIntervalConfig])



  // Fetch historical OHLC data from Kraken with proper rate limiting
  const fetchHistoricalData = useCallback(async (forceRefresh = false) => {
    const intervalConfig = getSelectedIntervalConfig()
    const maxPoints = getMaxDataPoints()
    const cacheKey = getCacheKey(selectedInterval, maxPoints)
    
    // Debug cache key and maxPoints
    console.log('🔍 Cache and Data Points Debug:')
    console.log('  - Selected interval:', selectedInterval)
    console.log('  - Interval config:', intervalConfig)
    console.log('  - Max points calculated:', maxPoints)
    console.log('  - Cache key generated:', cacheKey)
    console.log('  - Force refresh:', forceRefresh)
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && isDataFresh(cacheKey)) {
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        console.log('🔍 Using cached data, skipping API request')
        console.log('  - Cached data length:', cachedData.length)
        setHistoricalData(cachedData)
        setCacheStatus('Using cached data')
        setError(null)
        return
      }
    }
    
    console.log('🔍 Cache miss or force refresh, making new API request')
    
    setLoading(true)
    setError(null)
    setCacheStatus('Fetching fresh data...')
    
    try {
      // FIXED: Calculate the timestamp based on the SELECTED time period, not hardcoded 24 hours
      let sinceTimestamp
      let sinceDescription
      
      switch (selectedInterval) {
        case '1h':
          sinceTimestamp = Math.floor((Date.now() - (1 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '1 hour ago'
          break
        case '6h':
          sinceTimestamp = Math.floor((Date.now() - (6 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '6 hours ago'
          break
        case '12h':
          sinceTimestamp = Math.floor((Date.now() - (12 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '12 hours ago'
          break
        case '24h':
          sinceTimestamp = Math.floor((Date.now() - (24 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '24 hours ago'
          break
        case '3d':
          sinceTimestamp = Math.floor((Date.now() - (3 * 24 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '3 days ago'
          break
        case '7d':
          sinceTimestamp = Math.floor((Date.now() - (7 * 24 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '7 days ago'
          break
        case '30d':
          sinceTimestamp = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '30 days ago'
          break
        default:
          sinceTimestamp = Math.floor((Date.now() - (24 * 60 * 60 * 1000)) / 1000)
          sinceDescription = '24 hours ago (default)'
      }
      
      console.log('🔍 Kraken API Request:')
      console.log('  - Selected Period:', selectedInterval)
      console.log('  - Interval:', intervalConfig.interval)
      console.log('  - Count:', maxPoints)
      console.log('  - Since timestamp:', sinceTimestamp)
      console.log('  - Since (human):', new Date(sinceTimestamp * 1000).toLocaleString())
      console.log('  - Since description:', sinceDescription)
      console.log('  - Current time:', Math.floor(Date.now() / 1000))
      console.log('  - Current time (human):', new Date().toLocaleString())
      
      const data = await rateLimitedFetch(
        `${KRAKEN_REST_API}/OHLC?pair=XBTUSD&interval=${intervalConfig.interval}&count=${maxPoints}&since=${sinceTimestamp}`
      )
      
      if (data.error && data.error.length > 0) {
        throw new Error(`Kraken API error: ${data.error.join(', ')}`)
      }
      
      // Debug: Log the raw API response
      console.log('🔍 Raw Kraken API Response:')
      console.log('  - Result keys:', Object.keys(data.result || {}))
      console.log('  - XXBTZUSD data length:', data.result?.XXBTZUSD?.length || 0)
      console.log('  - First few raw entries:', data.result?.XXBTZUSD?.slice(0, 3) || [])
      console.log('  - Last few raw entries:', data.result?.XXBTZUSD?.slice(-3) || [])
      
      // Parse the OHLC data
      const ohlcData = data.result?.XXBTZUSD || []
      const parsedData = ohlcData.map(([time, open, high, low, close, vwap, volume, count]) => ({
        time: new Date(time * 1000),
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        vwap: parseFloat(vwap),
        volume: parseFloat(volume),
        count: parseInt(count)
      }))
      
      // Debug: Log the parsed data
      console.log('🔍 Parsed Data Debug:')
      console.log('  - Parsed data length:', parsedData.length)
      console.log('  - First parsed entry:', parsedData[0])
      console.log('  - Last parsed entry:', parsedData[parsedData.length - 1])
      
      // FIX: Kraken returns data in REVERSE chronological order (oldest first, newest last)
      // We need to reverse it to get chronological order (newest first, oldest last)
      const chronologicalData = parsedData.reverse()
      
      console.log('🔍 After Reversing Data Order:')
      console.log('  - First entry (newest):', chronologicalData[0])
      console.log('  - Last entry (oldest):', chronologicalData[chronologicalData.length - 1])
      
      // Store in cache
      storeInCache(cacheKey, chronologicalData)
      
      setHistoricalData(chronologicalData)
      setLastFetchTime(Date.now())
      setCacheStatus(`Fresh data fetched at ${new Date().toLocaleTimeString()}`)
      
      console.log(`Fetched ${chronologicalData.length} recent data points for BTC/USD (${selectedInterval} period)`)
      
      // Debug: Log first and last data points to verify ordering and time coverage
      if (chronologicalData.length > 0) {
        console.log('First (newest):', chronologicalData[0].time, 'Close:', chronologicalData[0].close)
        console.log('Last (oldest):', chronologicalData[chronologicalData.length - 1].time, 'Open:', chronologicalData[chronologicalData.length - 1].open)
        
        // Calculate actual time coverage
        const timeDiff = chronologicalData[0].time - chronologicalData[chronologicalData.length - 1].time
        const hoursCovered = timeDiff / (1000 * 60 * 60)
        console.log(`Actual time coverage: ${hoursCovered.toFixed(2)} hours`)
      }
      
    } catch (err) {
      console.error('Failed to fetch historical data:', err)
      setError(err.message)
      setCacheStatus('Error fetching data')
      
      // Try to use cached data as fallback
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setHistoricalData(cachedData)
        setCacheStatus('Using cached data due to error')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedInterval, getCacheKey, isDataFresh, getCachedData, storeInCache, rateLimitedFetch, getSelectedIntervalConfig])

  // Fetch data when component mounts or parameters change
  useEffect(() => {
    fetchHistoricalData()
    fetchRealTimePrice() // Also fetch real-time price
  }, [selectedInterval, fetchHistoricalData, fetchRealTimePrice])

  // Notify parent component when historical data changes
  useEffect(() => {
    if (onDataUpdate && historicalData.length > 0) {
      onDataUpdate(historicalData)
    }
  }, [historicalData, onDataUpdate])

  // Auto-refresh data every 5 minutes (respecting rate limits)
  useEffect(() => {
    const autoRefreshInterval = setInterval(() => {
      if (!loading) {
        fetchHistoricalData(true) // Force refresh
        fetchRealTimePrice() // Refresh real-time price
      }
    }, CACHE_DURATION)
    
    return () => clearInterval(autoRefreshInterval)
  }, [fetchHistoricalData, fetchRealTimePrice, loading])

  // Calculate some basic statistics with CORRECTED logic
  const calculateStats = useCallback(() => {
    if (historicalData.length === 0) return null
    
    // Get the selected interval configuration to understand what period we're analyzing
    const selectedIntervalConfig = getSelectedIntervalConfig()
    const expectedPeriod = selectedIntervalConfig?.value || '24h'
    
    // Sanity check: if we have extreme price differences, the data might be corrupted
    const allPrices = historicalData.flatMap(d => [d.open, d.high, d.low, d.close])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const priceRange = maxPrice - minPrice
    const avgPrice = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length
    
    // If price range is more than 50% of average price, something is wrong
    if (priceRange > avgPrice * 0.5) {
      console.warn('⚠️ Extreme price range detected, data may be corrupted or from wrong time period')
      console.log('  - Min price:', minPrice)
      console.log('  - Max price:', maxPrice)
      console.log('  - Price range:', priceRange)
      console.log('  - Average price:', avgPrice)
      console.log('  - Range/Average ratio:', (priceRange / avgPrice * 100).toFixed(2) + '%')
    }
    
    // CRITICAL FIX: Kraken returns data in REVERSE chronological order
    // So index 0 = NEWEST (most recent), last index = OLDEST
    const newestData = historicalData[0]        // First element = most recent
    const oldestData = historicalData[historicalData.length - 1]  // Last element = oldest
    
    // Debug logging to understand the data
    console.log('🔍 Historical Data Debug:')
    console.log('  - Newest (index 0):', newestData)
    console.log('  - Oldest (last index):', oldestData)
    console.log('  - Total candles:', historicalData.length)
    
    // Get all high and low values from OHLC data (not just close prices)
    const allHighs = historicalData.map(d => d.high)
    const allLows = historicalData.map(d => d.low)
    const volumes = historicalData.map(d => d.volume)
    
    // Calculate actual time coverage first
    const timeDiff = newestData.time - oldestData.time
    const hoursCovered = timeDiff / (1000 * 60 * 60)
    const daysCovered = hoursCovered / 24
    
    // FIXED: Calculate price change for the ACTUAL selected period, not just 24 hours
    const priceChange = newestData.close - oldestData.open
    const priceChangePercent = (priceChange / oldestData.open) * 100
    
    // Debug the calculation
    console.log('🔍 Price Change Calculation:')
    console.log('  - Period:', expectedPeriod)
    console.log('  - Oldest Open:', oldestData.open, 'at', oldestData.time)
    console.log('  - Newest Close:', newestData.close, 'at', newestData.time)
    console.log('  - Period Change:', priceChange)
    console.log('  - Period Change %:', priceChangePercent.toFixed(2) + '%')
    console.log('  - Time span:', `${daysCovered.toFixed(1)} days (${hoursCovered.toFixed(1)} hours)`)
    
    // Validate the calculation - if it's unreasonably high, use a different approach
    let validatedPriceChange = priceChange
    let validatedPriceChangePercent = priceChangePercent
    
    // FIXED: Period-aware validation - different thresholds for different time periods
    const maxReasonableChange = daysCovered <= 1 ? 25 : daysCovered <= 7 ? 50 : 100 // More permissive for longer periods
    
    if (Math.abs(priceChangePercent) > maxReasonableChange) {
      console.warn(`⚠️ Price change % (${priceChangePercent.toFixed(2)}%) exceeds reasonable threshold for ${expectedPeriod} period`)
      console.log(`  - Threshold for ${expectedPeriod}: ±${maxReasonableChange}%`)
      console.log(`  - Time span: ${daysCovered.toFixed(1)} days`)
      
      // For longer periods, the change might actually be legitimate
      if (daysCovered > 1) {
        console.log('  - Multi-day period detected - large changes may be legitimate')
        console.log('  - Keeping original calculation for longer periods')
        validatedPriceChange = priceChange
        validatedPriceChangePercent = priceChangePercent
      } else {
        // For short periods, use more robust calculation
        console.log('  - Short period - using robust alternative calculation')
        
        // Use a more conservative approach: calculate from the middle of the dataset
        const midPoint = Math.floor(historicalData.length / 2)
        const midCandle = historicalData[midPoint]
        
        // Calculate change from middle to end (more recent period)
        const recentChange = newestData.close - midCandle.close
        const recentChangePercent = (recentChange / midCandle.close) * 100
        
        // Calculate change from start to middle (earlier period)
        const earlierChange = midCandle.close - oldestData.open
        const earlierChangePercent = (earlierChange / oldestData.open) * 100
        
        // Use the average of the two periods for a more stable calculation
        validatedPriceChange = (recentChange + earlierChange) / 2
        validatedPriceChangePercent = (recentChangePercent + earlierChangePercent) / 2
        
        console.log('🔍 Robust Alternative Calculation:')
        console.log('  - Mid-point candle:', midCandle)
        console.log('  - Recent period change:', recentChangePercent.toFixed(2) + '%')
        console.log('  - Earlier period change:', earlierChangePercent.toFixed(2) + '%')
        console.log('  - Average change:', validatedPriceChangePercent.toFixed(2) + '%')
      }
    } else {
      // Change is within reasonable bounds
      validatedPriceChange = priceChange
      validatedPriceChangePercent = priceChangePercent
      console.log(`✅ Price change ${priceChangePercent.toFixed(2)}% is within reasonable bounds for ${expectedPeriod} period`)
    }
    
    console.log('🔍 Time Coverage Validation:')
    console.log('  - Time difference (ms):', timeDiff)
    console.log('  - Hours covered:', hoursCovered.toFixed(2))
    console.log('  - Days covered:', daysCovered.toFixed(2))
    console.log('  - Selected period:', expectedPeriod)
    console.log('  - Expected coverage:', selectedIntervalConfig?.description)
    
    // FIXED: Use the FULL dataset for high/low calculations based on the selected period
    // Don't artificially limit to 24 hours - use the actual period selected
    let validHigh = Math.max(...allHighs)
    let validLow = Math.min(...allLows)
    let highCandle = historicalData.find(d => d.high === validHigh)
    let lowCandle = historicalData.find(d => d.low === validLow)
    
    console.log('🔍 Full Period Analysis:')
    console.log('  - Total candles analyzed:', historicalData.length)
    console.log('  - Period High:', validHigh)
    console.log('  - Period Low:', validLow)
    console.log('  - High time:', highCandle?.time)
    console.log('  - Low time:', lowCandle?.time)
    
    // Enhanced debugging for low price calculation
    console.log('🔍 Low Price Debug:')
    console.log('  - All lows array length:', allLows.length)
    console.log('  - First 5 lows:', allLows.slice(0, 5))
    console.log('  - Last 5 lows:', allLows.slice(-5))
    console.log('  - Min low found:', validLow)
    console.log('  - Low candle details:', lowCandle)
    
    // Verify we found the correct low candle
    if (lowCandle) {
      console.log('  - Low candle time:', lowCandle.time)
      console.log('  - Low candle low value:', lowCandle.low)
      console.log('  - Low candle open:', lowCandle.open)
      console.log('  - Low candle close:', lowCandle.close)
    } else {
      console.warn('⚠️ No low candle found - this indicates a problem')
    }
    
    // For multi-day periods, also show the recent 24h high/low as additional context
    if (daysCovered > 1) {
      const twentyFourHoursAgo = newestData.time - (24 * 60 * 60 * 1000)
      const recentData = historicalData.filter(d => d.time >= twentyFourHoursAgo)
      
      if (recentData.length > 0) {
        const recentHighs = recentData.map(d => d.high)
        const recentLows = recentData.map(d => d.low)
        const recentHigh = Math.max(...recentHighs)
        const recentLow = Math.min(...recentLows)
        
        console.log('🔍 Recent 24h Context (for multi-day periods):')
        console.log('  - Recent 24h High:', recentHigh)
        console.log('  - Recent 24h Low:', recentLow)
        console.log('  - Recent candles used:', recentData.length)
      }
    }
    
    return {
      currentPrice: currentRealTimePrice || newestData.close, // Use real-time price if available, fallback to OHLC close
      oldestPrice: oldestData.open,
      priceChange: validatedPriceChange,
      priceChangePercent: validatedPriceChangePercent,
      high: validHigh,
      highTime: highCandle?.time,
      low: validLow,
      lowTime: lowCandle?.time,
      avgVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
      totalVolume: volumes.reduce((a, b) => a + b, 0),
      periodStart: oldestData.time,
      periodEnd: newestData.time,
      candleCount: historicalData.length,
      actualHoursCovered: hoursCovered
    }
  }, [historicalData, currentRealTimePrice])

  const stats = calculateStats()
  const intervalConfig = getSelectedIntervalConfig()



  return (
    <div className="historical-data">
      <div className="historical-header">
        <h3>BTC/USD Recent Data</h3>
        <div className="historical-controls">
          <div className="control-group">
            <label>Time Period:</label>
            <select 
              value={selectedInterval} 
              onChange={(e) => setSelectedInterval(e.target.value)}
              disabled={loading}
            >
              {TIME_INTERVALS.map(interval => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
          </div>
          

          
          <button 
            onClick={() => {
              fetchHistoricalData(true)
              fetchRealTimePrice()
            }} 
            disabled={loading}
            className="refresh-btn"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          
          <button 
            onClick={() => {
              // Clear cache and force fresh data
              dataCache.current.clear()
              console.log('🔍 Cache cleared, forcing fresh API request')
              fetchHistoricalData(true)
              fetchRealTimePrice()
            }} 
            disabled={loading}
            className="clear-cache-btn"
            style={{ marginLeft: '8px' }}
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Cache status and rate limit info */}
      <div className="api-info">
        <div className="cache-status">{cacheStatus}</div>
        <div className="rate-limit-info">
          Rate limited: 2 requests/sec max • Cache: 5 minutes • Auto-refresh: Every 5 minutes
        </div>
        <div className="data-info">
          {intervalConfig?.description} • Showing {getMaxDataPoints()} candles (auto-calculated)
        </div>
        {stats && (
          <div className="period-info">
            <strong>Period Analysis:</strong> {stats.actualHoursCovered?.toFixed(1)} hours ({stats.actualHoursCovered / 24 < 1 ? `${(stats.actualHoursCovered).toFixed(1)} hours` : `${(stats.actualHoursCovered / 24).toFixed(1)} days`})
          </div>
        )}
        {stats && (
          <div className="time-coverage-info">
            Actual time coverage: {stats.actualHoursCovered?.toFixed(2)} hours
          </div>
        )}
        {currentRealTimePrice && (
          <div className="real-time-info">
            Real-time price: ${currentRealTimePrice.toLocaleString()} (updated every 5 minutes)
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Current Price</div>
            <div className="stat-value">${stats.currentPrice?.toLocaleString()}</div>
            {currentRealTimePrice && (
              <div className="stat-time">Real-time: ${currentRealTimePrice.toLocaleString()}</div>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-label">Price Change</div>
            <div className={`stat-value ${stats.priceChange >= 0 ? 'positive' : 'negative'}`}>
              {stats.priceChange >= 0 ? '+' : ''}${stats.priceChange?.toFixed(2)} ({stats.priceChangePercent?.toFixed(2)}%)
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High</div>
            <div className="stat-value">${stats.high?.toLocaleString()}</div>
            <div className="stat-time">{stats.highTime?.toLocaleTimeString()}</div>
            <div className="stat-time">{stats.highTime?.toLocaleDateString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low</div>
            <div className="stat-value">${stats.low?.toLocaleString()}</div>
            <div className="stat-time">{stats.lowTime?.toLocaleTimeString()}</div>
            <div className="stat-time">{stats.lowTime?.toLocaleDateString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Period</div>
            <div className="stat-value">{stats.candleCount} candles</div>
            <div className="stat-time">
              {stats.periodStart?.toLocaleDateString()} - {stats.periodEnd?.toLocaleDateString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Volume</div>
            <div className="stat-value">{stats.totalVolume?.toFixed(2)} BTC</div>
            <div className="stat-time">Avg: {stats.avgVolume?.toFixed(2)} BTC</div>
          </div>
        </div>
      )}

      {historicalData.length > 0 && (
        <div className="data-table-container">
          <h4>Recent OHLC Data ({historicalData.length} points)</h4>
          <div className="data-table">
            <div className="table-header">
              <div>Time</div>
              <div>Open</div>
              <div>High</div>
              <div>Low</div>
              <div>Close</div>
              <div>Volume</div>
            </div>
            {historicalData.slice(0, 10).map((data, index) => (
              <div key={index} className="table-row">
                <div>{data.time.toLocaleString()}</div>
                <div>${data.open.toFixed(2)}</div>
                <div>${data.high.toFixed(2)}</div>
                <div>${data.low.toFixed(2)}</div>
                <div>${data.close.toFixed(2)}</div>
                <div>{data.volume.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
