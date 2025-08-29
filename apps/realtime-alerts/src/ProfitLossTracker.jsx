import React, { useState, useEffect } from 'react'

export default function ProfitLossTracker({ currentBtcPrice }) {
  const [purchasePrice, setPurchasePrice] = useState('')
  const [actualPurchasePrice, setActualPurchasePrice] = useState('')
  const [profitLoss, setProfitLoss] = useState(0)
  const [status, setStatus] = useState('hold')
  const [sellThreshold, setSellThreshold] = useState(false)

  // Calculate profit/loss whenever actual purchase price or current price changes
  useEffect(() => {
    if (actualPurchasePrice && currentBtcPrice) {
      const actualPurchase = parseFloat(actualPurchasePrice)
      const current = parseFloat(currentBtcPrice)
      
      if (!isNaN(actualPurchase) && !isNaN(current)) {
        const pl = current - actualPurchase
        setProfitLoss(pl)
        
        // Update status based on profit/loss
        if (pl > 0) {
          setStatus('sell')
          // Green if profit is $100 or more
          setSellThreshold(pl >= 100)
        } else {
          setStatus('hold')
          setSellThreshold(false)
        }
      }
    }
  }, [actualPurchasePrice, currentBtcPrice])

  // Update purchase price to match current BTC price when it changes
  useEffect(() => {
    if (currentBtcPrice) {
      setPurchasePrice(currentBtcPrice.toString())
    }
  }, [currentBtcPrice])

  // Format currency with thousands separators
  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Format percentage change
  const formatPercentage = (pl, purchase) => {
    if (!purchase || purchase === 0) return '0.00%'
    const percentage = (pl / purchase) * 100
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  return (
    <div className="pnl-tracker">
      <div className="pnl-header">
        <h3>Profit/Loss Tracker</h3>
        <div className="pnl-subtitle">Single Transaction Monitor</div>
      </div>
      
      <div className="pnl-grid">
        {/* Column 1: 1 BTC Spot Price (from Kraken) */}
        <div className="pnl-column">
          <div className="pnl-label">1 BTC Spot Price</div>
          <div className="pnl-value spot-price">
            {currentBtcPrice ? formatCurrency(currentBtcPrice) : '—'}
          </div>
          <div className="pnl-subtext">Live from Kraken</div>
        </div>

        {/* Column 2: Actual Purchase Price Input */}
        <div className="pnl-column">
          <div className="pnl-label">Actual Purchase Price</div>
          <div className="pnl-input-wrapper">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={actualPurchasePrice}
              onChange={(e) => setActualPurchasePrice(e.target.value)}
              className="pnl-input"
            />
          </div>
          <div className="pnl-subtext">What you paid</div>
        </div>

        {/* Column 3: Current Live BTC Price */}
        <div className="pnl-column">
          <div className="pnl-label">Current BTC Price</div>
          <div className="pnl-value current-price">
            {currentBtcPrice ? formatCurrency(currentBtcPrice) : '—'}
          </div>
        </div>

        {/* Column 4: Real-time Profit/Loss */}
        <div className="pnl-column">
          <div className="pnl-label">Profit/Loss</div>
          <div className={`pnl-value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
            {actualPurchasePrice && currentBtcPrice ? formatCurrency(profitLoss) : '—'}
          </div>
          {actualPurchasePrice && currentBtcPrice && (
            <div className={`pnl-percentage ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
              {formatPercentage(profitLoss, parseFloat(actualPurchasePrice))}
            </div>
          )}
        </div>

        {/* Column 5: Status */}
        <div className="pnl-column">
          <div className="pnl-label">Status</div>
          <div className={`pnl-status ${status}`}>
            {status.toUpperCase()}
          </div>
        </div>

        {/* Column 6: Sell Threshold Indicator */}
        <div className="pnl-column">
          <div className="pnl-label">Sell Threshold</div>
          <div className={`pnl-threshold ${sellThreshold ? 'met' : 'not-met'}`}>
            {sellThreshold ? '✅ SELL' : '🔴 HOLD'}
          </div>
          <div className="pnl-threshold-desc">
            {sellThreshold ? '+$100+ Profit' : 'Below $100'}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      {actualPurchasePrice && currentBtcPrice && (
        <div className="pnl-summary">
          <div className="summary-item">
            <span className="summary-label">Transaction Summary:</span>
            <span className={`summary-value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
              {profitLoss >= 0 ? 'Profitable' : 'Loss'} • {formatCurrency(Math.abs(profitLoss))} • {formatPercentage(profitLoss, parseFloat(actualPurchasePrice))}
            </span>
          </div>
          <div className="summary-details">
            <span className="detail-item">Spot Price: {formatCurrency(currentBtcPrice)}</span>
            <span className="detail-item">You Paid: {formatCurrency(parseFloat(actualPurchasePrice))}</span>
            <span className="detail-item">Difference: {formatCurrency(currentBtcPrice - parseFloat(actualPurchasePrice))}</span>
          </div>
        </div>
      )}
    </div>
  )
}
