/**
 * Technical Analysis Service
 * Implements the exact rating system from the user's brief
 * Calculates buy/sell signals for moving averages, oscillators, and other indicators
 */

import NetlifyClient from './NetlifyClient.js'
import { ALPHA_VANTAGE_CONFIG } from './config.js'

export class TechnicalAnalysisService {
  constructor() {
    this.client = new NetlifyClient()
    this.symbol = 'BTCUSD' // Alpha Vantage format for Bitcoin
    this.currentPrice = null
    this.indicators = {}
    this.ratings = {}
    
    // Rating values as defined in the brief
    this.RATING_VALUES = {
      STRONG_SELL: -1.0,
      SELL: -0.5,
      NEUTRAL: 0.0,
      BUY: 0.5,
      STRONG_BUY: 1.0
    }
    
    // Rating thresholds as defined in the brief
    this.RATING_THRESHOLDS = {
      STRONG_SELL: { min: -1.0, max: -0.5 },
      SELL: { min: -0.5, max: -0.1 },
      NEUTRAL: { min: -0.1, max: 0.1 },
      BUY: { min: 0.1, max: 0.5 },
      STRONG_BUY: { min: 0.5, max: 1.0 }
    }
  }

  // Set current price (from Kraken real-time data)
  setCurrentPrice(price) {
    this.currentPrice = price
  }

  // Get current price
  getCurrentPrice() {
    return this.currentPrice
  }

  // Fetch all technical indicators for the specified interval
  async fetchIndicators(interval = 'daily') {
    try {
      console.log('🔧 fetchIndicators called with:', { symbol: this.symbol, interval })
      const indicators = ALPHA_VANTAGE_CONFIG.defaultIndicators
      console.log('🔧 Default indicators:', indicators)
      
      // Store analysis session start
      await this.client.storeAnalysisSession(this.symbol, interval, 'started', { indicators: indicators.map(i => i.type) })
      
      this.indicators = await this.client.getTechnicalIndicators(this.symbol, interval, indicators)
      console.log('🔧 Fetched indicators:', this.indicators)
      
      // Store technical indicators data
      await this.client.storeTechnicalIndicators(this.symbol, interval, this.indicators)
      
      // Store analysis session success
      await this.client.storeAnalysisSession(this.symbol, interval, 'completed', { 
        indicators: indicators.map(i => i.type),
        success: true 
      })
      
      return this.indicators
    } catch (error) {
      console.error('🔧 Failed to fetch technical indicators:', error)
      
      // Store analysis session failure
      await this.client.storeAnalysisSession(this.symbol, interval, 'failed', { 
        error: error.message,
        success: false 
      })
      
      throw error
    }
  }

  // Calculate ratings for Moving Averages group as defined in the brief
  calculateMovingAveragesRating() {
    if (!this.currentPrice) return { rating: 0, signals: [], details: {} }
    
    const signals = []
    let totalRating = 0
    let indicatorCount = 0
    const details = {}
    
    // Moving Averages (SMA and EMA with different lengths)
    const maPeriods = [10, 20, 30, 50, 100, 200]
    
    maPeriods.forEach(period => {
      // Check SMA
      if (this.indicators.SMA && this.indicators.SMA[`Technical Analysis: SMA`]) {
        const smaData = this.indicators.SMA[`Technical Analysis: SMA`]
        const latestSMA = this.getLatestValue(smaData)
        
        if (latestSMA !== null) {
          const signal = this.calculateMASignal(latestSMA, this.currentPrice, `SMA(${period})`)
          signals.push(signal)
          totalRating += signal.rating
          indicatorCount++
          details[`SMA(${period})`] = signal
        }
      }
      
      // Check EMA
      if (this.indicators.EMA && this.indicators.EMA[`Technical Analysis: EMA`]) {
        const emaData = this.indicators.EMA[`Technical Analysis: EMA`]
        const latestEMA = this.getLatestValue(emaData)
        
        if (latestEMA !== null) {
          const signal = this.calculateMASignal(latestEMA, this.currentPrice, `EMA(${period})`)
          signals.push(signal)
          totalRating += signal.rating
          indicatorCount++
          details[`EMA(${period})`] = signal
        }
      }
    })
    
    const averageRating = indicatorCount > 0 ? totalRating / indicatorCount : 0
    
    return {
      rating: averageRating,
      signals,
      details,
      indicatorCount,
      recommendation: this.getRatingRecommendation(averageRating)
    }
  }

  // Calculate ratings for Oscillators group as defined in the brief
  calculateOscillatorsRating() {
    if (!this.currentPrice) return { rating: 0, signals: [], details: {} }
    
    const signals = []
    let totalRating = 0
    let indicatorCount = 0
    const details = {}
    
    // RSI (14) - Buy: < 30 and rising, Sell: > 70 and falling
    if (this.indicators.RSI && this.indicators.RSI[`Technical Analysis: RSI`]) {
      const rsiData = this.indicators.RSI[`Technical Analysis: RSI`]
      const signal = this.calculateRSISignal(rsiData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.RSI = signal
    }
    
    // Stochastic (14,3,3) - Buy: < 20 and K > D, Sell: > 80 and K < D
    if (this.indicators.Stochastic && this.indicators.Stochastic[`Technical Analysis: STOCH`]) {
      const stochData = this.indicators.Stochastic[`Technical Analysis: STOCH`]
      const signal = this.calculateStochasticSignal(stochData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.Stochastic = signal
    }
    
    // CCI (20) - Buy: < -100 and rising, Sell: > 100 and falling
    if (this.indicators.CCI && this.indicators.CCI[`Technical Analysis: CCI`]) {
      const cciData = this.indicators.CCI[`Technical Analysis: CCI`]
      const signal = this.calculateCCISignal(cciData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.CCI = signal
    }
    
    // ADX (14,14) - Buy: +DI > -DI and > 20 and rising, Sell: +DI < -DI and > 20 and rising
    if (this.indicators.ADX && this.indicators.ADX[`Technical Analysis: ADX`]) {
      const adxData = this.indicators.ADX[`Technical Analysis: ADX`]
      const signal = this.calculateADXSignal(adxData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.ADX = signal
    }
    
    // Williams %R (14) - Buy: < lower band and rising, Sell: > upper band and falling
    if (this.indicators.WilliamsR && this.indicators.WilliamsR[`Technical Analysis: WILLR`]) {
      const willrData = this.indicators.WilliamsR[`Technical Analysis: WILLR`]
      const signal = this.calculateWilliamsRSignal(willrData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.WilliamsR = signal
    }
    
    // MACD (12,26,9) - Buy: main > signal, Sell: main < signal
    if (this.indicators.MACD && this.indicators.MACD[`Technical Analysis: MACD`]) {
      const macdData = this.indicators.MACD[`Technical Analysis: MACD`]
      const signal = this.calculateMACDSignal(macdData)
      signals.push(signal)
      totalRating += signal.rating
      indicatorCount++
      details.MACD = signal
    }
    
    const averageRating = indicatorCount > 0 ? totalRating / indicatorCount : 0
    
    return {
      rating: averageRating,
      signals,
      details,
      indicatorCount,
      recommendation: this.getRatingRecommendation(averageRating)
    }
  }

  // Calculate overall rating (average of both groups)
  calculateOverallRating() {
    const maRating = this.calculateMovingAveragesRating()
    const oscillatorRating = this.calculateOscillatorsRating()
    
    const overallRating = (maRating.rating + oscillatorRating.rating) / 2
    
    return {
      rating: overallRating,
      movingAverages: maRating,
      oscillators: oscillatorRating,
      recommendation: this.getRatingRecommendation(overallRating)
    }
  }

  // Helper method to get latest value from Alpha Vantage data
  getLatestValue(data) {
    if (!data || typeof data !== 'object') return null
    
    const dates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length === 0) return null
    
    const latestDate = dates[0]
    const latestData = data[latestDate]
    
    // Extract the actual value (Alpha Vantage returns objects with indicator names as keys)
    const indicatorKey = Object.keys(latestData)[0]
    return parseFloat(latestData[indicatorKey])
  }

  // Calculate MA signal as defined in the brief: Buy — MA value < price, Sell — MA value > price
  calculateMASignal(maValue, currentPrice, indicatorName) {
    if (maValue === null || currentPrice === null) {
      return { indicator: indicatorName, rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    let rating, signal, reason
    
    if (maValue < currentPrice) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `MA(${indicatorName}) < Current Price (${maValue.toFixed(2)} < ${currentPrice.toFixed(2)})`
    } else if (maValue > currentPrice) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `MA(${indicatorName}) > Current Price (${maValue.toFixed(2)} > ${currentPrice.toFixed(2)})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `MA(${indicatorName}) = Current Price (${maValue.toFixed(2)} = ${currentPrice.toFixed(2)})`
    }
    
    return { indicator: indicatorName, rating, signal, reason, maValue, currentPrice }
  }

  // Calculate RSI signal as defined in the brief: Buy — < 30 and rising, Sell — > 70 and falling
  calculateRSISignal(rsiData) {
    const dates = Object.keys(rsiData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length < 2) {
      return { indicator: 'RSI', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const previousDate = dates[1]
    const latestRSI = parseFloat(rsiData[latestDate].RSI)
    const previousRSI = parseFloat(rsiData[previousDate].RSI)
    const isRising = latestRSI > previousRSI
    
    let rating, signal, reason
    
    if (latestRSI < 30 && isRising) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `RSI < 30 and rising (${latestRSI.toFixed(2)} < 30, ${isRising ? 'rising' : 'falling'})`
    } else if (latestRSI > 70 && !isRising) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `RSI > 70 and falling (${latestRSI.toFixed(2)} > 70, ${isRising ? 'rising' : 'falling'})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `RSI neutral (${latestRSI.toFixed(2)}, ${isRising ? 'rising' : 'falling'})`
    }
    
    return { indicator: 'RSI', rating, signal, reason, latestRSI, previousRSI, isRising }
  }

  // Calculate Stochastic signal as defined in the brief: Buy — < 20 and K > D, Sell — > 80 and K < D
  calculateStochasticSignal(stochData) {
    const dates = Object.keys(stochData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length === 0) {
      return { indicator: 'Stochastic', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const latestData = stochData[latestDate]
    const kValue = parseFloat(latestData.SlowK)
    const dValue = parseFloat(latestData.SlowD)
    
    let rating, signal, reason
    
    if (kValue < 20 && dValue < 20 && kValue > dValue) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `K and D < 20 and K > D (K: ${kValue.toFixed(2)}, D: ${dValue.toFixed(2)})`
    } else if (kValue > 80 && dValue > 80 && kValue < dValue) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `K and D > 80 and K < D (K: ${kValue.toFixed(2)}, D: ${dValue.toFixed(2)})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `Neutral (K: ${kValue.toFixed(2)}, D: ${dValue.toFixed(2)})`
    }
    
    return { indicator: 'Stochastic', rating, signal, reason, kValue, dValue }
  }

  // Calculate CCI signal as defined in the brief: Buy — < -100 and rising, Sell — > 100 and falling
  calculateCCISignal(cciData) {
    const dates = Object.keys(cciData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length < 2) {
      return { indicator: 'CCI', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const previousDate = dates[1]
    const latestCCI = parseFloat(cciData[latestDate].CCI)
    const previousCCI = parseFloat(cciData[previousDate].CCI)
    const isRising = latestCCI > previousCCI
    
    let rating, signal, reason
    
    if (latestCCI < -100 && isRising) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `CCI < -100 and rising (${latestCCI.toFixed(2)} < -100, ${isRising ? 'rising' : 'falling'})`
    } else if (latestCCI > 100 && !isRising) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `CCI > 100 and falling (${latestCCI.toFixed(2)} > 100, ${isRising ? 'rising' : 'falling'})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `CCI neutral (${latestCCI.toFixed(2)}, ${isRising ? 'rising' : 'falling'})`
    }
    
    return { indicator: 'CCI', rating, signal, reason, latestCCI, previousCCI, isRising }
  }

  // Calculate ADX signal as defined in the brief: Buy — +DI > -DI and > 20 and rising
  calculateADXSignal(adxData) {
    const dates = Object.keys(adxData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length < 2) {
      return { indicator: 'ADX', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const previousDate = dates[1]
    const latestData = adxData[latestDate]
    const previousData = adxData[previousDate]
    
    const latestADX = parseFloat(latestData.ADX)
    const latestPlusDI = parseFloat(latestData['+DI'])
    const latestMinusDI = parseFloat(latestData['-DI'])
    const previousADX = parseFloat(previousData.ADX)
    const isRising = latestADX > previousADX
    
    let rating, signal, reason
    
    if (latestPlusDI > latestMinusDI && latestADX > 20 && isRising) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `+DI > -DI and ADX > 20 and rising (+DI: ${latestPlusDI.toFixed(2)}, -DI: ${latestMinusDI.toFixed(2)}, ADX: ${latestADX.toFixed(2)})`
    } else if (latestPlusDI < latestMinusDI && latestADX > 20 && isRising) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `+DI < -DI and ADX > 20 and rising (+DI: ${latestPlusDI.toFixed(2)}, -DI: ${latestMinusDI.toFixed(2)}, ADX: ${latestADX.toFixed(2)})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `Neutral (+DI: ${latestPlusDI.toFixed(2)}, -DI: ${latestMinusDI.toFixed(2)}, ADX: ${latestADX.toFixed(2)})`
    }
    
    return { indicator: 'ADX', rating, signal, reason, latestADX, latestPlusDI, latestMinusDI, isRising }
  }

  // Calculate Williams %R signal as defined in the brief: Buy — < lower band and rising
  calculateWilliamsRSignal(willrData) {
    const dates = Object.keys(willrData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length < 2) {
      return { indicator: 'WilliamsR', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const previousDate = dates[1]
    const latestWillR = parseFloat(willrData[latestDate].WILLR)
    const previousWillR = parseFloat(willrData[previousDate].WILLR)
    const isRising = latestWillR > previousWillR
    
    let rating, signal, reason
    
    if (latestWillR < -80 && isRising) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `Williams %R < -80 and rising (${latestWillR.toFixed(2)} < -80, ${isRising ? 'rising' : 'falling'})`
    } else if (latestWillR > -20 && !isRising) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `Williams %R > -20 and falling (${latestWillR.toFixed(2)} > -20, ${isRising ? 'rising' : 'falling'})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `Neutral (${latestWillR.toFixed(2)}, ${isRising ? 'rising' : 'falling'})`
    }
    
    return { indicator: 'WilliamsR', rating, signal, reason, latestWillR, previousWillR, isRising }
  }

  // Calculate MACD signal as defined in the brief: Buy — main > signal, Sell — main < signal
  calculateMACDSignal(macdData) {
    const dates = Object.keys(macdData).sort((a, b) => new Date(b) - new Date(a))
    if (dates.length === 0) {
      return { indicator: 'MACD', rating: 0, signal: 'NEUTRAL', reason: 'Insufficient data' }
    }
    
    const latestDate = dates[0]
    const latestData = macdData[latestDate]
    const mainLine = parseFloat(latestData.MACD_Hist)
    const signalLine = parseFloat(latestData.MACD_Signal)
    
    let rating, signal, reason
    
    if (mainLine > signalLine) {
      rating = 1 // Buy
      signal = 'BUY'
      reason = `MACD main > signal (${mainLine.toFixed(4)} > ${signalLine.toFixed(4)})`
    } else if (mainLine < signalLine) {
      rating = -1 // Sell
      signal = 'SELL'
      reason = `MACD main < signal (${mainLine.toFixed(4)} < ${signalLine.toFixed(4)})`
    } else {
      rating = 0 // Neutral
      signal = 'NEUTRAL'
      reason = `MACD main = signal (${mainLine.toFixed(4)} = ${signalLine.toFixed(4)})`
    }
    
    return { indicator: 'MACD', rating, signal, reason, mainLine, signalLine }
  }

  // Get rating recommendation based on numerical value as defined in the brief
  getRatingRecommendation(rating) {
    if (rating >= this.RATING_THRESHOLDS.STRONG_BUY.min && rating <= this.RATING_THRESHOLDS.STRONG_BUY.max) {
      return 'STRONG BUY'
    } else if (rating >= this.RATING_THRESHOLDS.BUY.min && rating <= this.RATING_THRESHOLDS.BUY.max) {
      return 'BUY'
    } else if (rating >= this.RATING_THRESHOLDS.SELL.min && rating <= this.RATING_THRESHOLDS.SELL.max) {
      return 'SELL'
    } else if (rating >= this.RATING_THRESHOLDS.STRONG_SELL.min && rating <= this.RATING_THRESHOLDS.STRONG_SELL.max) {
      return 'STRONG SELL'
    } else {
      return 'NEUTRAL'
    }
  }

  // Get all ratings and analysis
  async getFullAnalysis(interval = 'daily') {
    try {
      await this.fetchIndicators(interval)
      
      const movingAveragesRating = this.calculateMovingAveragesRating()
      const oscillatorsRating = this.calculateOscillatorsRating()
      const overallRating = this.calculateOverallRating()
      
      const analysis = {
        timestamp: new Date().toISOString(),
        currentPrice: this.currentPrice,
        interval,
        movingAverages: movingAveragesRating,
        oscillators: oscillatorsRating,
        overall: overallRating,
        indicators: this.indicators
      }
      
      // Store the complete analysis in database
      await this.client.storeTechnicalAnalysis(analysis)
      
      return analysis
    } catch (error) {
      console.error('Failed to get full analysis:', error)
      throw error
    }
  }

  // Get service statistics
  getStats() {
    return {
      clientStats: this.client.getStats(),
      indicatorsCount: Object.keys(this.indicators).length,
      currentPrice: this.currentPrice,
      lastAnalysis: this.ratings
    }
  }
}

// Export the service
export default TechnicalAnalysisService
