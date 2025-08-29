import React, { useState, useEffect } from 'react'

export default function ProfitLossTracker({ currentBtcPrice }) {
  const [dollarAmount, setDollarAmount] = useState('')
  const [strikePrice, setStrikePrice] = useState('')
  const [btcAmount, setBtcAmount] = useState(0)
  const [totalCost, setTotalCost] = useState(0)
  const [currentValue, setCurrentValue] = useState(0)
  const [valueAfterSell, setValueAfterSell] = useState(0)
  const [profitLoss, setProfitLoss] = useState(0)
  const [status, setStatus] = useState('hold')
  const [sellThreshold, setSellThreshold] = useState(false)

  // Seller fees: 0.40%
  const SELLER_FEE_RATE = 0.004

  // Calculate BTC amount and total cost when dollar amount or strike price changes
  useEffect(() => {
    if (dollarAmount && strikePrice) {
      const dollars = parseFloat(dollarAmount)
      const strike = parseFloat(strikePrice)
      
      if (!isNaN(dollars) && !isNaN(strike) && strike > 0) {
        // Calculate BTC amount: dollars / strike price
        const btc = dollars / strike
        setBtcAmount(btc)
        setTotalCost(dollars) // Total cost is the dollar amount entered
      }
    }
  }, [dollarAmount, strikePrice])

  // Calculate current value when BTC amount or current price changes
  useEffect(() => {
    if (btcAmount > 0 && currentBtcPrice) {
      const amount = btcAmount
      const current = parseFloat(currentBtcPrice)
      
      if (!isNaN(amount) && !isNaN(current)) {
        const value = amount * current
        setCurrentValue(value)
        
        // Calculate value after seller fees
        const fees = value * SELLER_FEE_RATE
        const afterFees = value - fees
        setValueAfterSell(afterFees)
      }
    }
  }, [btcAmount, currentBtcPrice])

  // Calculate profit/loss whenever total cost or current value changes
  useEffect(() => {
    if (totalCost > 0 && currentValue > 0) {
      const pl = currentValue - totalCost
      setProfitLoss(pl)
      
      // Calculate net P&L after fees
      const netPL = valueAfterSell - totalCost
      
      // Update status based on net profit/loss after fees
      if (netPL > 0) {
        setStatus('sell')
        // Green if net profit after fees is $100 or more
        setSellThreshold(netPL >= 100)
      } else {
        setStatus('hold')
        setSellThreshold(false)
      }
    }
  }, [totalCost, currentValue, valueAfterSell])

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
  const formatPercentage = (pl, cost) => {
    if (!cost || cost === 0) return '0.00%'
    const percentage = (pl / cost) * 100
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
  }

  return (
    <div className="pnl-tracker">
      <div className="pnl-header">
        <h3>Profit/Loss Tracker (DRIFT)</h3>
        <div className="pnl-subtitle">BTC Transaction Monitor</div>
      </div>
      
      <div className="pnl-grid">
        {/* Column 1: Dollar Amount Input */}
        <div className="pnl-column">
          <div className="pnl-label">Purchase Amount</div>
          <div className="pnl-input-wrapper">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="1000.00"
              value={dollarAmount}
              onChange={(e) => setDollarAmount(e.target.value)}
              className="pnl-input"
            />
          </div>
          <div className="pnl-subtext">Dollars spent</div>
          {btcAmount > 0 && (
            <div className="pnl-btc-amount">
              = {btcAmount.toFixed(8)} BTC
            </div>
          )}
        </div>

        {/* Column 2: Strike Price Input */}
        <div className="pnl-column">
          <div className="pnl-label">Strike Price</div>
          <div className="pnl-input-wrapper">
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="40000.00"
              value={strikePrice}
              onChange={(e) => setStrikePrice(e.target.value)}
              className="pnl-input"
            />
          </div>
          <div className="pnl-subtext">Price per BTC</div>
        </div>

        {/* Column 3: Total Cost (Calculated) */}
        <div className="pnl-column">
          <div className="pnl-label">Total Cost</div>
          <div className="pnl-value total-cost">
            {totalCost > 0 ? formatCurrency(totalCost) : '—'}
          </div>
          <div className="pnl-subtext">Dollar amount entered</div>
        </div>

        {/* Column 4: Current Value (Calculated) */}
        <div className="pnl-column">
          <div className="pnl-label">Current Value</div>
          <div className="pnl-value current-value">
            {currentValue > 0 ? formatCurrency(currentValue) : '—'}
          </div>
          <div className="pnl-subtext">BTC × Current Price</div>
        </div>

        {/* Column 5: Value After Sell (Calculated) */}
        <div className="pnl-column">
          <div className="pnl-label">Value After Sell</div>
          <div className="pnl-value after-sell">
            {valueAfterSell > 0 ? formatCurrency(valueAfterSell) : '—'}
          </div>
          <div className="pnl-subtext">After 0.40% fees</div>
          {currentValue > 0 && (
            <div className="pnl-fees">
              Fees: {formatCurrency(currentValue * SELLER_FEE_RATE)}
            </div>
          )}
        </div>

        {/* Column 6: Real-time Profit/Loss */}
        <div className="pnl-column">
          <div className="pnl-label">Profit/Loss</div>
          <div className={`pnl-value ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
            {profitLoss !== 0 ? formatCurrency(profitLoss) : '—'}
          </div>
          {profitLoss !== 0 && (
            <div className={`pnl-percentage ${profitLoss >= 0 ? 'profit' : 'loss'}`}>
              {formatPercentage(profitLoss, totalCost)}
            </div>
          )}
          
          {/* Net P&L After Fees */}
          <div className="pnl-label-small">Net After Fees</div>
          <div className={`pnl-value-small ${valueAfterSell - totalCost >= 0 ? 'profit' : 'loss'}`}>
            {valueAfterSell > 0 && totalCost > 0 ? formatCurrency(valueAfterSell - totalCost) : '—'}
          </div>
          {valueAfterSell > 0 && totalCost > 0 && (
            <div className={`pnl-percentage-small ${valueAfterSell - totalCost >= 0 ? 'profit' : 'loss'}`}>
              {formatPercentage(valueAfterSell - totalCost, totalCost)}
            </div>
          )}
        </div>

        {/* Column 7: Status & Threshold */}
        <div className="pnl-column">
          <div className="pnl-label">Action</div>
          <div className={`pnl-status ${status}`}>
            {status.toUpperCase()}
          </div>
          <div className={`pnl-threshold ${sellThreshold ? 'met' : 'not-met'}`}>
            {sellThreshold ? '✅ SELL' : '🔴 HOLD'}
          </div>
          <div className="pnl-threshold-desc">
            {sellThreshold ? '+$100+ Net Profit' : 'Below $100 Net'}
          </div>
        </div>
      </div>

      {/* Summary Row */}
      {dollarAmount && strikePrice && currentBtcPrice && (
        <div className="pnl-summary">
          <div className="summary-item">
            <span className="summary-label">Transaction Summary:</span>
            <span className={`summary-value ${valueAfterSell - totalCost >= 0 ? 'profit' : 'loss'}`}>
              {valueAfterSell - totalCost >= 0 ? 'Net Profitable' : 'Net Loss'} • {formatCurrency(Math.abs(valueAfterSell - totalCost))} • {formatPercentage(valueAfterSell - totalCost, totalCost)}
            </span>
          </div>
          <div className="summary-details">
            <span className="detail-item">Dollars: {formatCurrency(parseFloat(dollarAmount))}</span>
            <span className="detail-item">BTC: {btcAmount.toFixed(8)}</span>
            <span className="detail-item">Strike: {formatCurrency(parseFloat(strikePrice))}</span>
            <span className="detail-item">Total Cost: {formatCurrency(totalCost)}</span>
            <span className="detail-item">Current Value: {formatCurrency(currentValue)}</span>
            <span className="detail-item">After Fees: {formatCurrency(valueAfterSell)}</span>
            <span className="detail-item">Net P&L: {formatCurrency(valueAfterSell - totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
