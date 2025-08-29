import React, { useState, useEffect } from 'react'

export default function ProfitLossTracker({ currentBtcPrice }) {
  const [purchasePrice, setPurchasePrice] = useState('')
  const [profitLoss, setProfitLoss] = useState(0)
  const [status, setStatus] = useState('hold')
  const [sellThreshold, setSellThreshold] = useState(false)

  // Calculate profit/loss whenever purchase price or current price changes
  useEffect(() => {
    if (purchasePrice && currentBtcPrice) {
      const purchase = parseFloat(purchasePrice)
      const current = parseFloat(currentBtcPrice)
      
      if (!isNaN(purchase) && !isNaN(current)) {
        const pl = current - purchase
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
  }, [purchasePrice, currentBtcPrice])

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
        {/* Column 1: Purchase Price Input */}
        <div className="pnl-column">
          <div className="pnl-label">Purchase Price</div>
          <div className="pnl-input-wrapper">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value)}
              className="pnl-input"
            />
          </div>
        </div>

        {/* Column 2: Current Live BTC Price */}
        <div className="pnl-column">
          <div className="pnl-label">Current BTC Price</div>
          <div className="pnl-value current-price">
            {currentBtcPrice ? formatCurrency(currentBtcPrice) : '—'}
          </div>
        </div>

        {/* Column 3: Real-time Profit/Loss */}
        <div className="pnl-column">
          <div className="pnl-label">Profit/Loss</div>
          <div className={`pnl-value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
            {purchasePrice && currentBtcPrice ? formatCurrency(profitLoss) : '—'}
          </div>
          {purchasePrice && currentBtcPrice && (
            <div className={`pnl-percentage ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
              {formatPercentage(profitLoss, parseFloat(purchasePrice))}
            </div>
          )}
        </div>

        {/* Column 4: Status */}
        <div className="pnl-column">
          <div className="pnl-label">Status</div>
          <div className={`pnl-status ${status}`}>
            {status.toUpperCase()}
          </div>
        </div>

        {/* Column 5: Sell Threshold Indicator */}
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
      {purchasePrice && currentBtcPrice && (
        <div className="pnl-summary">
          <div className="summary-item">
            <span className="summary-label">Transaction Summary:</span>
            <span className={`summary-value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
              {profitLoss >= 0 ? 'Profitable' : 'Loss'} • {formatCurrency(Math.abs(profitLoss))} • {formatPercentage(profitLoss, parseFloat(purchasePrice))}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
