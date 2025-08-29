import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'

// ---- Config ----
const KRAKEN_WS = 'wss://ws.kraken.com'

// Define trading pairs with their Kraken WS format
const TRADING_PAIRS = [
  { id: 'BTC/USD', krakenPair: 'XBT/USD', displayName: 'BTC/USD' },
  { id: 'SOL/USD', krakenPair: 'SOL/USD', displayName: 'SOL/USD' }
]

const STALE_MS = 40000              // consider stale if no WS activity for 40s
const PING_MS  = 15000              // send ping every 15s to keep intermediaries awake
const BACKOFF_MIN = 2000            // 2s
const BACKOFF_MAX = 60000           // 60s
const MAX_RECONNECT_ATTEMPTS = 10   // max consecutive reconnection attempts
const CONNECTION_TIMEOUT = 10000    // connection timeout in ms

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

// Utility function for consistent price formatting (always 2 decimal places)
function formatPrice(price) {
  return price.toFixed(2)
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

  function log(s, level = 'info'){
    const timestamp = formatTimestamp()
    const levelPrefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️'
    setLogs(l => [ `${timestamp} ${levelPrefix} ${s}`, ...(l||[]) ].slice(0, LOG_MAX))
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
  }

  // Memoized connection quality calculation to prevent unnecessary recalculations
  const updateConnectionQuality = useCallback(() => {
    const pingLatency = lastPongTimeRef.current - lastPingTimeRef.current
    
    let quality = 'unknown'
    if (pingLatency > 0 && pingLatency < 100) quality = 'excellent'
    else if (pingLatency >= 100 && pingLatency < 300) quality = 'good'
    else if (pingLatency >= 300 && pingLatency < 1000) quality = 'fair'
    else if (pingLatency >= 1000) quality = 'poor'
    
    setConnectionQuality(quality)
    log(`Connection quality updated: ${quality} (${pingLatency}ms)`, 'info')
  }, [])

  // Update activity display for UI
  const updateActivityDisplay = useCallback(() => {
    const now = Date.now()
    const ago = now - lastActivityRef.current
    setLastActivityAgo(ago)
    
    // Check for stale connection
    if (ago > STALE_MS) {
      log(`Connection stale (${Math.round(ago/1000)}s), scheduling reconnect`, 'warn')
      scheduleReconnect()
    }
  }, [])

  function scheduleReconnect(){
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      log(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached, stopping`, 'error')
      setStatus('failed')
      return
    }
    
    log(`Scheduling reconnect attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} in ${(backoffRef.current/1000).toFixed(1)}s`, 'info')
    reconnectToRef.current = setTimeout(() => {
      connect()
    }, backoffRef.current)
    
    // Exponential backoff with jitter
    backoffRef.current = Math.min(backoffRef.current * 1.5 + Math.random() * 1000, BACKOFF_MAX)
  }

  function connect(){
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('WebSocket already open', 'info')
      return
    }
    
    if (connecting) {
      log('Connection already in progress', 'info')
      return
    }
    
    setConnecting(true)
    setStatus('connecting')
    
    // Connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      log('Connection timeout, closing and retrying', 'warn')
      safeClose(1001, 'timeout')
      setConnecting(false)
      scheduleReconnect()
    }, CONNECTION_TIMEOUT)
    
    log(`Connecting to ${KRAKEN_WS}...`, 'info')
    
    const ws = new WebSocket(KRAKEN_WS)
    wsRef.current = ws
    
    ws.onopen = () => {
      log('WebSocket connected, subscribing to pairs...', 'success')
      clearTimeout(connectionTimeoutRef.current)
      setStatus('open')
      setConnecting(false)
      setReconnectAttempts(0)
      backoffRef.current = BACKOFF_MIN
      
      // Subscribe to all trading pairs
      TRADING_PAIRS.forEach(pair => {
        const sub = { 
          event: 'subscribe', 
          pair: [pair.krakenPair], 
          subscription: { name: 'ticker' } 
        }
        ws.send(JSON.stringify(sub))
        log(`Subscribing to ${pair.displayName} (${pair.krakenPair})`, 'info')
      })
      
      // Start ping interval
      pingIvRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          lastPingTimeRef.current = Date.now()
          ws.send(JSON.stringify({ event: 'ping' }))
          log('WS → ping sent', 'info')
        }
      }, PING_MS)
      
      // Start activity monitoring
      staleIvRef.current = setInterval(updateActivityDisplay, 1000)
    }
    
    ws.onmessage = (ev) => {
      let msg
      try { msg = JSON.parse(ev.data) } catch { 
        errorCountRef.current++
        setErrorCount(errorCountRef.current)
        log(`Failed to parse WebSocket message: ${ev.data}`, 'error')
        return 
      }
      
      // Any parsed message counts as activity
      bump()
      messageCountRef.current++
      
      // Update connection quality less frequently (every 20 messages)
      if (messageCountRef.current % 20 === 0) {
        updateConnectionQuality()
      }

      // Heartbeat keeps us alive
      if (msg?.event === 'heartbeat') {
        log(`WS ← heartbeat received`, 'info')
        return
      }

      // Pong response to ping
      if (msg?.event === 'pong') {
        lastPongTimeRef.current = Date.now()
        const latency = lastPongTimeRef.current - lastPingTimeRef.current
        log(`WS ← pong received (latency: ${latency}ms)`, 'info')
        // Update quality immediately after pong
        updateConnectionQuality()
        return
      }

      // System / subscription status
      if (msg?.event === 'systemStatus') {
        log(`WS ← systemStatus: ${msg.status || 'unknown'}`, 'info')
        if (msg.status === 'maintenance') {
          log('Kraken system in maintenance mode - will retry later', 'warn')
          backoffRef.current = Math.max(backoffRef.current * 2, 30000) // longer backoff for maintenance
        }
        return
      }
      
      if (msg?.event === 'subscriptionStatus') {
        const st = msg.status
        if (st === 'subscribed') {
          // Find which pair this subscription belongs to
          const pair = TRADING_PAIRS.find(p => p.krakenPair === msg.pair)
          if (pair) {
            channelIdsRef.current[pair.id] = msg.channelID
            log(`WS ← ${pair.displayName} subscribed (channel: ${msg.channelID})`, 'success')
          }
          backoffRef.current = BACKOFF_MIN // reset backoff on success
        } else if (st === 'error') {
          log(`WS ← subscriptionStatus: error: ${msg.errorMessage || 'unknown error'}`, 'error')
          errorCountRef.current++
          setErrorCount(errorCountRef.current)
          backoffRef.current = Math.max(backoffRef.current * 1.5, BACKOFF_MIN + 1000)
          scheduleReconnect()
        }
        return
      }

      // Ticker array form: [channelID, data, channelName, pair]
      if (Array.isArray(msg) && msg.length >= 4) {
        const [chanId, payload, channelName, pair] = msg
        if (channelName === 'ticker') {
          // Find which pair this message belongs to
          const tradingPair = TRADING_PAIRS.find(p => p.krakenPair === pair)
          if (tradingPair && (channelIdsRef.current[tradingPair.id] == null || chanId === channelIdsRef.current[tradingPair.id])) {
            const lastStr = payload?.c?.[0]
            if (lastStr != null) {
              const p = Number(lastStr)
              if (!Number.isNaN(p)) {
                setPrices(prev => ({ ...prev, [tradingPair.id]: p }))
                // Log price updates less frequently to avoid spam
                if (messageCountRef.current % 100 === 0) {
                  log(`${tradingPair.displayName} price update: $${formatPrice(p)}`, 'info')
                }
                return
              }
            }
          }
          return
        }
      }
    }

    ws.onclose = (ev) => {
      clearTimers()
      const code = ev?.code || 1005
      const reason = ev?.reason || ''
      setStatus('closed')
      
      // Log specific close codes with helpful messages
      let closeMessage = `WebSocket closed (code=${code}`
      if (reason) closeMessage += `, reason="${reason}"`
      closeMessage += ')'
      
      if (code === 1000) {
        log('WebSocket closed cleanly', 'info')
      } else if (code === 1001) {
        log('WebSocket closed: endpoint going away', 'warn')
      } else if (code === 1002) {
        log('WebSocket closed: protocol error', 'error')
      } else if (code === 1003) {
        log('WebSocket closed: unsupported data type', 'error')
      } else if (code === 1005) {
        log('WebSocket closed: no status code', 'warn')
      } else if (code === 1006) {
        log('WebSocket closed: abnormal closure', 'warn')
      } else if (code === 1011) {
        log('WebSocket closed: server error', 'error')
      } else if (code === 1012) {
        log('WebSocket closed: service restart', 'warn')
      } else if (code === 1013) {
        log('WebSocket closed: try again later', 'warn')
      } else if (code === 1014) {
        log('WebSocket closed: bad gateway', 'error')
      } else if (code === 1015) {
        log('WebSocket closed: TLS handshake failed', 'error')
      } else {
        log(closeMessage, 'warn')
      }
      
      if (!unsubscribedRef.current) {
        scheduleReconnect()
      }
    }

    ws.onerror = (ev) => {
      errorCountRef.current++
      setErrorCount(errorCountRef.current)
      log(`WebSocket error: ${ev.type || 'unknown error'}`, 'error')
    }
  }

  function disconnect(){
    log('Manual disconnect requested', 'info')
    unsubscribedRef.current = true
    safeClose(1000, 'manual')
    clearTimers()
    setStatus('disconnected')
    setReconnectAttempts(0)
    setLastActivityAgo(0)
    setConnectionQuality('unknown')
    // Clear channel IDs and prices on disconnect
    channelIdsRef.current = {}
    setPrices({})
  }

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
                <div className="val">{prices[pair.id] != null ? `$${formatPrice(prices[pair.id])}` : '—'}</div>
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
    </div>
  )
}