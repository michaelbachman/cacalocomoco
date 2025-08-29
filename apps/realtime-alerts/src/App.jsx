import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'

// ---- Config ----
const KRAKEN_WS = 'wss://ws.kraken.com'
const PAIR = 'XBT/USD'              // Kraken WS pair format
const SUB = { event: 'subscribe', pair: [PAIR], subscription: { name: 'ticker' } }

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
  // UI state
  const [price, setPrice] = useState(null)
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
  const channelIdRef = useRef(null)
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
    else if (pingLatency < 300) quality = 'good'
    else if (pingLatency < 1000) quality = 'fair'
    else if (pingLatency > 0) quality = 'poor'
    
    setConnectionQuality(quality)
    
    // Log quality changes
    if (pingLatency > 0) {
      log(`Connection quality: ${quality} (ping: ${pingLatency}ms)`, 'info')
    }
  }, [])

  // Update lastActivityAgo periodically for UI display
  const updateActivityDisplay = useCallback(() => {
    const last = lastActivityRef.current || 0
    if (last > 0) {
      setLastActivityAgo(Date.now() - last)
    }
  }, [])

  function scheduleReconnect(){
    clearTimers()
    
    // Check if we've exceeded max attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      log(`Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Manual intervention required.`, 'error')
      setStatus('failed')
      return
    }
    
    const jitter = Math.random() * 250
    const delay = Math.min(BACKOFF_MAX, Math.max(BACKOFF_MIN, backoffRef.current)) + jitter
    log(`Scheduling reconnection in ${(delay/1000).toFixed(1)}s (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`, 'warn')
    
    reconnectToRef.current = setTimeout(() => {
      log(`Executing reconnection attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`, 'info')
      setReconnectAttempts(prev => prev + 1)
      connect()
    }, delay)
    
    backoffRef.current = Math.min(BACKOFF_MAX, backoffRef.current * 1.7 + 200)
  }

  function connect(){
    if (wsRef.current || connecting) return
    setConnecting(true)
    setStatus('connecting')
    unsubscribedRef.current = false
    
    log(`Initiating connection to ${KRAKEN_WS}`, 'info')
    
    // Set connection timeout
    connectionTimeoutRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING) {
        log('Connection timeout - closing and retrying', 'warn')
        safeClose(4000, 'timeout')
        scheduleReconnect()
      }
    }, CONNECTION_TIMEOUT)
    
    try {
      const ws = new WebSocket(KRAKEN_WS)
      wsRef.current = ws

      ws.onopen = () => {
        clearTimeout(connectionTimeoutRef.current)
        setConnecting(false)
        setStatus('open')
        setReconnectAttempts(0) // Reset on successful connection
        bump()
        log(`WebSocket connection established successfully`, 'success')
        log(`Subscribing to ${PAIR} ticker feed`, 'info')
        
        // subscribe
        ws.send(JSON.stringify(SUB))
        log(`WS → subscribe ${PAIR}`, 'info')

        // ping loop with latency tracking
        pingIvRef.current = setInterval(() => {
          if (!wsRef.current) return
          try {
            lastPingTimeRef.current = Date.now()
            wsRef.current.send(JSON.stringify({ event: 'ping' }))
            log(`WS → ping sent`, 'info')
          } catch {}
        }, PING_MS)

        // Update activity display every second for UI
        staleIvRef.current = setInterval(() => {
          updateActivityDisplay()
          
          // Check for stale connection
          const last = lastActivityRef.current || 0
          if (Date.now() - last > STALE_MS) {
            log('No WebSocket activity in 40s — closing to recover', 'warn')
            backoffRef.current = Math.max(BACKOFF_MIN, backoffRef.current) // keep backoff
            safeClose(4000, 'stale')
          }
        }, 1000)
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
            channelIdRef.current = msg.channelID
            log(`WS ← subscriptionStatus: subscribed (channel: ${msg.channelID})`, 'success')
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
          if (channelName === 'ticker' && (channelIdRef.current == null || chanId === channelIdRef.current)) {
            const lastStr = payload?.c?.[0]
            if (lastStr != null) {
              const p = Number(lastStr)
              if (!Number.isNaN(p)) {
                setPrice(p)
                // Log price updates less frequently to avoid spam
                if (messageCountRef.current % 100 === 0) {
                  log(`Price update: $${formatPrice(p)}`, 'info')
                }
                return
              }
            }
          }
          return
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
        } else if (code === 1006) {
          log('WebSocket closed: abnormal closure (network issue)', 'warn')
        } else if (code === 1011) {
          log('WebSocket closed: server error', 'error')
        } else if (code === 1012) {
          log('WebSocket closed: service restart', 'warn')
        } else if (code === 1013) {
          log('WebSocket closed: try again later', 'warn')
        } else if (code === 1015) {
          log('WebSocket closed: TLS handshake failure', 'error')
        } else {
          log(closeMessage, 'warn')
        }
        
        if (!unsubscribedRef.current) {
          scheduleReconnect()
        }
      }

      ws.onerror = (error) => {
        errorCountRef.current++
        setErrorCount(errorCountRef.current)
        log(`WebSocket error: ${error?.message || 'unknown error'}`, 'error')
        // errors also cause close with some agents; rely on onclose to reconnect
      }

    } catch (err) {
      clearTimeout(connectionTimeoutRef.current)
      setConnecting(false)
      setStatus('error')
      log(`WebSocket initialization error: ${err?.message || err}`, 'error')
      scheduleReconnect()
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
          <div className="val">{price != null ? `$${formatPrice(price)}` : '—'}</div>
          <div className="label">BTC/USD (Kraken)</div>
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
            Pair: {PAIR} • Quality: {connectionQuality} • Last activity: {lastActivitySec}s ago
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
            Enhanced connection monitoring with quality metrics. Exponential backoff with max attempts limit. 
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