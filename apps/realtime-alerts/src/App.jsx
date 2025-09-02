import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import ProfitLossTracker from './ProfitLossTracker'
import DatabaseTest from './DatabaseTest'
import HistoricalData from './HistoricalData'
import ApiTest from './ApiTest'
import GeminiTest from './gemini/components/GeminiTest.jsx'
import PerformanceDashboard from './components/PerformanceDashboard'
import { storePriceData, storeConnectionLog } from './db.js'
import { performanceMonitor } from './performance/PerformanceMonitor'

// ---- Config ----
const KRAKEN_WS = 'wss://ws.kraken.com'

// Define trading pairs with their Kraken WS format
const TRADING_PAIRS = [
  { id: 'BTC/USD', krakenPair: 'XBT/USD', displayName: 'BTC/USD' },
  { id: 'BTC/USDC', krakenPair: 'XBT/USDC', displayName: 'BTC/USDC' },
  { id: 'SOL/USD', krakenPair: 'SOL/USD', displayName: 'SOL/USD' },
  { id: 'ETH/USD', krakenPair: 'ETH/USD', displayName: 'ETH/USD' },
  { id: 'DOGE/USD', krakenPair: 'XDG/USD', displayName: 'DOGE/USD' },
  { id: 'SHIB/USD', krakenPair: 'SHIB/USD', displayName: 'SHIB/USD' }
]

// Kraken WebSocket API Limits & Best Practices
// - Rate limit: 20 requests per 10 seconds (2 req/sec)
// - Connection limit: 1 connection per IP
// - Heartbeat: Server sends heartbeat every 30 seconds
// - Reconnection: Use exponential backoff, respect rate limits
// - Historical data: REST API rate limited to 2 req/sec with 5min caching
const STALE_MS = 60000              // consider stale if no WS activity for 60s (respectful of server heartbeat)
const PING_MS  = 30000              // send ping every 30s (matches server heartbeat, reduces load)
const BACKOFF_MIN = 5000            // 5s minimum backoff (respectful of rate limits)
const BACKOFF_MAX = 60000           // 60s maximum backoff (prevents aggressive reconnection)
const MAX_RECONNECT_ATTEMPTS = 8    // max consecutive reconnection attempts (reduced to be respectful)
const CONNECTION_TIMEOUT = 15000    // connection timeout in ms (increased to be more patient)
const HEALTH_CHECK_MS = 30000       // health check every 30s (less frequent monitoring)

// Visible logs cap to keep things light
const LOG_MAX = 200

// Utility function for consistent timestamp formatting
function formatTimestamp() {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  })
  return `[${timeStr}]`
}

// Enhanced price formatting function that handles different decimal requirements
function formatPrice(price, pairId = null) {
  if (price == null || isNaN(price)) return '0.00'
  
  // Determine decimal places based on pair type
  let decimalPlaces = 2 // Default for most pairs
  
  if (pairId) {
    // SHIB and other micro-priced tokens need more decimal places
    if (pairId === 'SHIB/USD') {
      decimalPlaces = 8 // SHIB has 8 pair decimals
    } else if (pairId === 'DOGE/USD') {
      decimalPlaces = 7 // DOGE has 7 pair decimals  
    } else if (pairId === 'BTC/USD' || pairId === 'BTC/USDC') {
      decimalPlaces = 2 // Bitcoin typically 2 decimals
    } else if (pairId === 'ETH/USD') {
      decimalPlaces = 2 // Ethereum typically 2 decimals
    } else if (pairId === 'SOL/USD') {
      decimalPlaces = 2 // Solana typically 2 decimals
    }
  }
  
  return price.toLocaleString('en-US', {
    minimumFractionDigits: Math.min(decimalPlaces, 8), // Cap at 8 decimals
    maximumFractionDigits: Math.min(decimalPlaces, 8)
  })
}

// Lightweight Kraken pairs cache for faster loading
const krakenPairsCache = {
  data: null,
  lastUpdate: 0,
  cacheDuration: 24 * 60 * 60 * 1000, // 24 hours
  
  async getPairs() {
    // Return cached data if fresh
    if (this.data && (Date.now() - this.lastUpdate) < this.cacheDuration) {
      return this.data
    }
    
    // Check localStorage for cached data
    const cached = this.getFromStorage()
    if (cached && this.isStorageValid()) {
      this.data = cached
      this.lastUpdate = Date.now()
      return cached
    }
    
    // Fetch fresh data from API
    try {
      const response = await fetch('https://api.kraken.com/0/public/AssetPairs')
      const result = await response.json()
      
      // Extract only essential data
      this.data = this.extractEssential(result.result)
      this.lastUpdate = Date.now()
      
      // Cache in localStorage (lightweight)
      this.saveToStorage(this.data)
      
      return this.data
    } catch (error) {
      console.warn('Failed to fetch pairs from API, using cached/default data:', error)
      // Return cached data if fetch fails
      return this.data || this.getDefaultPairs()
    }
  },
  
  extractEssential(pairs) {
    // Only extract pairs we actually need + a few popular ones
    const essential = {}
    const neededPairs = ['XBTUSD', 'XBTUSDC', 'SOLUSD', 'ETHUSD', 'XDGUSD', 'SHIBUSD']
    
    neededPairs.forEach(pair => {
      if (pairs[pair]) {
        essential[pair] = {
          wsname: pairs[pair].wsname,
          pair_decimals: pairs[pair].pair_decimals,
          status: pairs[pair].status
        }
      }
    })
    
    return essential
  },
  
  saveToStorage(pairs) {
    try {
      localStorage.setItem('kraken_pairs', JSON.stringify(pairs))
      localStorage.setItem('kraken_pairs_time', this.lastUpdate.toString())
    } catch (error) {
      // Ignore storage errors, use memory only
      console.warn('localStorage failed, using memory cache only:', error)
    }
  },
  
  getFromStorage() {
    try {
      return JSON.parse(localStorage.getItem('kraken_pairs'))
    } catch {
      return null
    }
  },
  
  isStorageValid() {
    try {
      const storedTime = localStorage.getItem('kraken_pairs_time')
      return storedTime && (Date.now() - parseInt(storedTime)) < this.cacheDuration
    } catch {
      return false
    }
  },
  
  getDefaultPairs() {
    // Fallback to hardcoded essential pairs
    return {
      'XBTUSD': { wsname: 'XBT/USD', pair_decimals: 1, status: 'online' },
      'XBTUSDC': { wsname: 'XBT/USDC', pair_decimals: 2, status: 'online' },
      'SOLUSD': { wsname: 'SOL/USD', pair_decimals: 5, status: 'online' },
      'ETHUSD': { wsname: 'ETH/USD', pair_decimals: 2, status: 'online' },
      'XDGUSD': { wsname: 'XDG/USD', pair_decimals: 7, status: 'online' },
      'SHIBUSD': { wsname: 'SHIB/USD', pair_decimals: 8, status: 'online' }
    }
  }
}

function nowPT(){
  const d = new Date()
  try {
    return d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour12: false })
  } catch {
    return d.toISOString().replace('T',' ').slice(0,19) + 'Z'
  }
}

export default function App(){
  // UI state - now supporting multiple pairs
  const [prices, setPrices] = useState({})
  const [status, setStatus] = useState('disconnected')
  const [logs, setLogs] = useState([])
  const [lastActivityAgo, setLastActivityAgo] = useState(0)
  const [connecting, setConnecting] = useState(false)
  const [connectionQuality, setConnectionQuality] = useState('unknown')
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [showGemini, setShowGemini] = useState(false)
  const [historicalData, setHistoricalData] = useState(null)

  // refs (never trigger re-render)
  const wsRef = useRef(null)
  const lastActivityRef = useRef(0)
  const channelIdsRef = useRef({})  // Track channel IDs for each pair
  const backoffRef = useRef(BACKOFF_MIN)
  const staleIvRef = useRef(null)
  const pingIvRef = useRef(null)
  const reconnectToRef = useRef(null)
  const unsubscribedRef = useRef(false)
  const connectionTimeoutRef = useRef(null)
  const lastPingTimeRef = useRef(0)
  const lastPongTimeRef = useRef(0)
  const messageCountRef = useRef(0)
  const errorCountRef = useRef(0)
  const hasValidPongRef = useRef(false)  // Track if we've received at least one valid pong
  const healthCheckIvRef = useRef(null)  // Store health check timer reference

  function log(s, level = 'info'){
    const timestamp = formatTimestamp()
    const levelPrefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️'
    setLogs(l => [ `${timestamp} ${levelPrefix} ${s}`, ...(l||[]) ].slice(0, LOG_MAX))
    
    // Update PerformanceMonitor with connection status
    try {
      if (level === 'error') {
        performanceMonitor.recordApiRequest(0, false)
      }
    } catch (err) {
      // Silently fail if PerformanceMonitor not available
    }
  }

  function bump(){
    lastActivityRef.current = Date.now()
    // Update the state immediately for accurate display
    setLastActivityAgo(0)
  }

  function safeClose(code=1000, reason=''){
    try { wsRef.current?.close(code, reason) } catch {}
    wsRef.current = null
  }

  function clearTimers(){
    if (staleIvRef.current) { clearInterval(staleIvRef.current); staleIvRef.current = null }
    if (pingIvRef.current)  { clearInterval(pingIvRef.current);  pingIvRef.current  = null }
    if (reconnectToRef.current) { clearTimeout(reconnectToRef.current); reconnectToRef.current = null }
    if (connectionTimeoutRef.current) { clearTimeout(connectionTimeoutRef.current); connectionTimeoutRef.current = null }
    if (healthCheckIvRef.current) { clearInterval(healthCheckIvRef.current); healthCheckIvRef.current = null }
  }

  // Memoized connection quality calculation to prevent unnecessary recalculations
  const updateConnectionQuality = useCallback(() => {
    // Only calculate quality if we have valid ping/pong timestamps AND have received at least one pong
    if (lastPingTimeRef.current > 0 && lastPongTimeRef.current > 0 && hasValidPongRef.current) {
      const pingLatency = lastPongTimeRef.current - lastPingTimeRef.current
      
      let quality = 'unknown'
      if (pingLatency > 0 && pingLatency < 100) quality = 'excellent'
      else if (pingLatency >= 100 && pingLatency < 300) quality = 'good'
      else if (pingLatency >= 300 && pingLatency < 1000) quality = 'fair'
      else if (pingLatency >= 1000) quality = 'poor'
      
      setConnectionQuality(quality)
      log(`Connection quality updated: ${quality} (${pingLatency}ms)`, 'info')
    } else {
      // If we don't have valid timestamps yet, just log that we're waiting
      if (!hasValidPongRef.current) {
        log(`Connection quality: waiting for first pong response...`, 'info')
      } else {
        log(`Connection quality: waiting for valid ping/pong data...`, 'info')
      }
    }
  }, [status])
  
  // Update PerformanceMonitor with connection status
  useEffect(() => {
    try {
      performanceMonitor.updateConnectionStatus('websocket', status, 0)
      console.log('🔄 PerformanceMonitor updated with status:', status)
    } catch (err) {
      console.warn('PerformanceMonitor update failed:', err)
    }
  }, [status])

  // Update activity display for UI
  const updateActivityDisplay = useCallback(() => {
    const now = Date.now()
    const ago = now - lastActivityRef.current
    setLastActivityAgo(ago)
    
    // Check for stale connection - only if not already reconnecting and WebSocket is open
    if (ago > STALE_MS && !connecting && wsRef.current?.readyState === WebSocket.OPEN) {
      log(`Connection stale (${Math.round(ago/1000)}s), scheduling reconnect`, 'warn')
      scheduleReconnect()
    }
  }, [connecting])

  function scheduleReconnect(){
    // Prevent multiple reconnection attempts
    if (reconnectToRef.current) {
      log('Reconnection already scheduled, skipping duplicate', 'info')
      return
    }
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      log(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached, stopping`, 'error')
      setStatus('failed')
      return
    }
    
    // Only calculate backoff if we're actually going to reconnect
    if (reconnectAttempts > 0) {
      // Exponential backoff with jitter - only increase after failed attempts
      backoffRef.current = Math.min(backoffRef.current * 1.5 + Math.random() * 1000, BACKOFF_MAX)
    }
    
    log(`Scheduling reconnect attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} in ${(backoffRef.current/1000).toFixed(1)}s`, 'info')
    reconnectToRef.current = setTimeout(() => {
      reconnectToRef.current = null // Clear the ref before attempting connection
      connect()
    }, backoffRef.current)
  }

  async function connect(){
    // Check if WebSocket is already open and healthy
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already open and healthy, skipping connection', 'info')
      return
    }
    
    // Prevent multiple simultaneous connection attempts
    if (connecting) {
      log('Connection already in progress, skipping duplicate', 'info')
      return
    }
    
    setConnecting(true)
    setStatus('connecting')
    log(`Connecting to ${KRAKEN_WS}...`, 'info')
    
    try {
      // Get cached pairs data for faster loading
      log('Fetching cached pairs data...', 'info')
      const cachedPairs = await krakenPairsCache.getPairs()
      log(`Loaded ${Object.keys(cachedPairs).length} pairs from cache`, 'info')
      
      // Create new WebSocket connection
      const ws = new WebSocket(KRAKEN_WS)
      wsRef.current = ws
      
      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          log('Connection timeout, closing stale connection', 'warn')
          safeClose(1000, 'timeout')
          setConnecting(false)
          scheduleReconnect()
        }
      }, CONNECTION_TIMEOUT)
      
      ws.onopen = () => {
        log('WebSocket connected successfully', 'success')
        setStatus('open')
        setConnecting(false)
        setReconnectAttempts(0)
        backoffRef.current = BACKOFF_MIN  // Reset backoff to minimum on successful connection
        
        // Reset pong flag on new connection
        hasValidPongRef.current = false
        
        // Store connection log in database (non-blocking)
        setTimeout(() => {
          storeConnectionLog('kraken_ws', 'connected', 'WebSocket connection established').catch(err => {
            console.warn('Connection log storage failed (non-critical):', err)
          })
        }, 0)
        
        // Subscribe to all trading pairs
        const subscribeMsg = {
          event: 'subscribe',
          pair: TRADING_PAIRS.map(p => p.krakenPair),
          subscription: {
            name: 'ticker'
          }
        }
        
        ws.send(JSON.stringify(subscribeMsg))
        log(`Subscribed to ${TRADING_PAIRS.length} trading pairs`, 'info')
        
        // Start monitoring timers
        staleIvRef.current = setInterval(updateActivityDisplay, 1000)
        pingIvRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingTimeRef.current = Date.now()
            ws.send(JSON.stringify({ event: 'ping' }))
            log('Ping sent', 'info')
          }
        }, PING_MS)
        
        // Start health check timer - only update quality if we have valid data
        healthCheckIvRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN && hasValidPongRef.current) {
            // Add additional check: only run health check if we haven't sent a ping in the last 5 seconds
            const timeSinceLastPing = Date.now() - lastPingTimeRef.current
            if (timeSinceLastPing > 5000) { // 5 second buffer after ping
              updateConnectionQuality()
            }
          }
        }, 45000)  // Run health check every 45 seconds (different from ping interval)
      }
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          bump() // Update activity timestamp
          
          // Debug: Log all incoming messages to see what we're receiving
          log(`Message received: ${JSON.stringify(data).substring(0, 100)}...`, 'info')
          
          // Handle different message types
          if (data.event === 'subscriptionStatus') {
            if (data.status === 'subscribed') {
              channelIdsRef.current[data.pair] = data.channelID
              log(`Subscribed to ${data.pair} (Channel ${data.channelID})`, 'success')
            }
          } else if (data.event === 'pong') {
            lastPongTimeRef.current = Date.now()
            const latency = lastPongTimeRef.current - lastPingTimeRef.current
            if (latency > 0 && lastPingTimeRef.current > 0) {
              hasValidPongRef.current = true  // Mark that we've received a valid pong
              log(`Pong received, latency: ${latency}ms`, 'info')
              // Update connection quality immediately after valid pong
              updateConnectionQuality()
            } else {
              log(`Pong received, but no valid ping timestamp available`, 'warn')
            }
          } else if (data.event === 'heartbeat') {
            // Handle Kraken heartbeat messages - these keep the connection alive
            log(`Heartbeat received from Kraken`, 'info')
          } else if (Array.isArray(data) && data.length >= 4) {
            // Handle ticker data - Kraken format: [channelID, data, channelName, pair]
            const [channelID, tickerData, channelName, pair] = data
            
            log(`Ticker data received: channel=${channelID}, name=${channelName}, pair=${pair}`, 'info')
            
            // Find the trading pair for this channel - try multiple matching strategies
            let tradingPair = null
            
            // Strategy 1: Match by channel ID
            for (const [pairId, chanId] of Object.entries(channelIdsRef.current)) {
              if (chanId === channelID) {
                tradingPair = TRADING_PAIRS.find(p => p.id === pairId)
                break
              }
            }
            
            // Strategy 2: Match by pair name if channel ID didn't work
            if (!tradingPair) {
              tradingPair = TRADING_PAIRS.find(p => p.krakenPair === pair)
            }
            
            if (tradingPair && tickerData && tickerData.c && tickerData.c.length > 0) {
              const p = parseFloat(tickerData.c[0])
              messageCountRef.current++
              
              if (!Number.isNaN(p)) {
                setPrices(prev => ({ ...prev, [tradingPair.id]: p }))
                log(`Price update: ${tradingPair.displayName} = $${formatPrice(p, tradingPair.id)}`, 'info')
                
                // Store price data in database (every 10th update to avoid spam) - NON-BLOCKING
                if (messageCountRef.current % 10 === 0) {
                  // Use setTimeout to make database calls non-blocking
                  setTimeout(() => {
                    storePriceData(tradingPair.id, p).catch(err => {
                      // Log error but don't break the connection
                      console.warn('Database storage failed (non-critical):', err)
                    })
                  }, 0)
                }
              } else {
                log(`Invalid price data for ${tradingPair.displayName}: ${tickerData.c[0]}`, 'warn')
              }
            } else {
              log(`Ticker data format issue: pair=${pair}, tickerData=${JSON.stringify(tickerData).substring(0, 100)}`, 'warn')
            }
          } else {
            // Log any other message types we receive with more detail
            log(`Unhandled message type: ${typeof data}, content: ${JSON.stringify(data).substring(0, 150)}`, 'info')
          }
        } catch (error) {
          errorCountRef.current++
          setErrorCount(errorCountRef.current)
          log(`Message parsing error: ${error.message}`, 'error')
        }
      }
      
      ws.onclose = (event) => {
        log(`WebSocket closed: ${event.code} ${event.reason}`, 'warn')
        setStatus('disconnected')
        setConnecting(false)
        clearTimers()
        
        // Store connection log in database (non-blocking)
        setTimeout(() => {
          storeConnectionLog('kraken_ws', 'disconnected', `WebSocket closed: ${event.code} ${event.reason}`).catch(err => {
            console.warn('Connection log storage failed (non-critical):', err)
          })
        }, 0)
        
        // Schedule reconnection if not a clean close
        if (event.code !== 1000) {
          scheduleReconnect()
        }
      }
      
      ws.onerror = (error) => {
        errorCountRef.current++
        setErrorCount(errorCountRef.current)
        log(`WebSocket error: ${error.message || 'Unknown error'}`, 'error')
        setConnecting(false)
      }
      
    } catch (error) {
      log(`Connection setup error: ${error.message}`, 'error')
      setConnecting(false)
      scheduleReconnect()
    }
  }

  function disconnect(){
    log('Disconnecting...', 'info')
    unsubscribedRef.current = true
    clearTimers()
    safeClose(1000, 'user disconnect')
    setStatus('disconnected')
    setConnecting(false)
    
    // Store connection log in database (non-blocking)
    setTimeout(() => {
      storeConnectionLog('kraken_ws', 'disconnected', 'User initiated disconnect').catch(err => {
        console.warn('Connection log storage failed (non-critical):', err)
      })
    }, 0)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log('Component unmounting, cleaning up...', 'info')
      clearTimers()
      safeClose(1000, 'unmount')
    }
  }, [])

  // Visibility handling: on resume, if closed, reconnect
  useEffect(() => {
    function onVis(){
      if (document.visibilityState === 'visible') {
        // if no WS, try reconnect quickly with a small backoff reset
        if (!wsRef.current) {
          log('Page became visible, attempting reconnection', 'info')
          backoffRef.current = BACKOFF_MIN
          setReconnectAttempts(0)
          scheduleReconnect()
        }
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Boot once
  useEffect(() => {
    log('Booting Kraken realtime alerts application...', 'info')
    
    // Initialize cache in background (non-blocking)
    krakenPairsCache.getPairs().then(pairs => {
      log(`Cache initialized with ${Object.keys(pairs).length} pairs`, 'info')
    }).catch(error => {
      log(`Cache initialization failed: ${error.message}`, 'warn')
    })
    
    connect()
    return () => {
      log('Application shutting down, cleaning up...', 'info')
      clearTimers()
      safeClose(1000, 'unmount')
    }
  }, [])

  // Derived UI bits
  const statusBadge = useMemo(() => {
    let cls = 'badge'
    if (status === 'open') cls = 'badge ok'
    else if (status === 'connecting') cls = 'badge warn'
    else if (status === 'failed') cls = 'badge error'
    return <span className={cls}>{status}</span>
  }, [status])

  const lastActivitySec = Math.max(0, Math.round(lastActivityAgo / 1000))

  return (
    <div className="wrap">
      <div className="hero">
        <div className="center">
          <div className="pairs-grid">
            {TRADING_PAIRS.map(pair => (
              <div key={pair.id} className="pair-display">
                <div className="val">{prices[pair.id] != null ? `$${formatPrice(prices[pair.id], pair.id)}` : '—'}</div>
                <div className="label hero-label">{pair.displayName} (Kraken)</div>
              </div>
            ))}
          </div>
        </div>
        <div className="row">
          {statusBadge}
          <button onClick={() => { 
            backoffRef.current = BACKOFF_MIN; 
            setReconnectAttempts(0);
            connect(); 
          }} disabled={connecting || status === 'open'}>
            Reconnect
          </button>
          <button onClick={() => setShowGemini(!showGemini)}>
            🔮 Gemini AI {showGemini ? '(Hide)' : '(Show)'}
          </button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="label">Connection</div>
          <div className="small">
            Pairs: {TRADING_PAIRS.map(p => p.displayName).join(', ')} • Quality: {connectionQuality} • Last activity: {lastActivitySec}s ago
          </div>
          <div className="small">
            Backoff: {(backoffRef.current/1000).toFixed(1)}s • Attempts: {reconnectAttempts}/{MAX_RECONNECT_ATTEMPTS}
          </div>
          <div className="small">
            Errors: {errorCount} • Messages: {messageCountRef.current}
          </div>
          <div className="small">
            Cache: {krakenPairsCache.data ? `${Object.keys(krakenPairsCache.data).length} pairs` : 'Initializing...'} • 
            Last Update: {krakenPairsCache.lastUpdate ? `${Math.round((Date.now() - krakenPairsCache.lastUpdate) / 60000)}m ago` : 'Never'}
          </div>
        </div>
        <div className="card">
          <div className="label">Notes</div>
          <div className="small">
            Multi-pair support with enhanced connection monitoring. Exponential backoff with max attempts limit. 
            Automatic recovery from network issues and Kraken maintenance.
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="label" style={{marginBottom:6}}>Connection Logs</div>
        <div className="logs">
          {(logs||[]).map((line,i) => <div key={i}>{line}</div>)}
        </div>
      </div>

      {/* Profit/Loss Tracker Component - Can be easily removed */}
      <ProfitLossTracker 
        currentBtcPrice={prices['BTC/USD']} 
        currentBtcUsdcPrice={prices['BTC/USDC']} 
      />

      {/* Database Test Component */}
      <DatabaseTest />

      {/* Historical Data Component */}
      <HistoricalData onDataUpdate={setHistoricalData} />

      {/* Alpha Vantage API Test Component */}
      <ApiTest />

      {/* Gemini AI Integration Component */}
      {showGemini && <GeminiTest realTimePrices={prices} historicalData={historicalData} />}

      {/* Performance Dashboard Component - v1.2 */}
      <PerformanceDashboard />
    </div>
  )
}