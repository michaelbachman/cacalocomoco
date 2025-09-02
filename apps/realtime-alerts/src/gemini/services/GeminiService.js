/**
 * Gemini Service
 * Handles Google Gemini AI interactions through secure Netlify Functions
 */

import NetlifyClient from '../../api/NetlifyClient.js'

export class GeminiService {
  constructor() {
    this.client = new NetlifyClient()
    this.defaultModel = 'gemini-1.5-flash'
  }

  /**
   * Generate content using Gemini AI
   * @param {string} prompt - The prompt to send to Gemini
   * @param {string} model - The model to use (default: gemini-1.5-flash)
   * @returns {Promise<Object>} - The generated content response
   */
  async generateContent(prompt, model = this.defaultModel) {
    try {
      if (!prompt || typeof prompt !== 'string') {
        throw new Error('Prompt must be a non-empty string')
      }

      const response = await this.client.generateContent(prompt, model)
      
      if (response.error) {
        throw new Error(response.error)
      }

      return response
    } catch (error) {
      console.error('Gemini content generation failed:', error)
      throw error
    }
  }

  /**
   * Generate trading analysis using Gemini AI
   * @param {Object} marketData - Market data to analyze
   * @param {string} analysisType - Type of analysis to perform
   * @returns {Promise<Object>} - The analysis response
   */
  async generateTradingAnalysis(marketData, analysisType = 'general') {
    try {
      const prompt = this.buildTradingAnalysisPrompt(marketData, analysisType)
      const response = await this.generateContent(prompt)
      
      return {
        type: analysisType,
        marketData,
        analysis: response,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Trading analysis generation failed:', error)
      throw error
    }
  }

  /**
   * Generate market sentiment analysis
   * @param {Array} newsArticles - Array of news articles to analyze
   * @returns {Promise<Object>} - The sentiment analysis response
   */
  async generateMarketSentiment(newsArticles) {
    try {
      const prompt = this.buildSentimentAnalysisPrompt(newsArticles)
      const response = await this.generateContent(prompt)
      
      return {
        type: 'sentiment',
        articles: newsArticles,
        sentiment: response,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Market sentiment analysis failed:', error)
      throw error
    }
  }

  /**
   * Build prompt for trading analysis
   * @param {Object} marketData - Market data
   * @param {string} analysisType - Analysis type
   * @returns {string} - Formatted prompt
   */
  buildTradingAnalysisPrompt(marketData, analysisType) {
    const basePrompt = `Analyze the following market data and provide ${analysisType} trading insights:`
    
    const dataSection = `
Market Data:
- Symbol: ${marketData.symbol || 'N/A'}
- Current Price: ${marketData.currentPrice || 'N/A'}
- 24h Change: ${marketData.change24h || 'N/A'}
- Volume: ${marketData.volume || 'N/A'}
- Market Cap: ${marketData.marketCap || 'N/A'}
- Technical Indicators: ${JSON.stringify(marketData.indicators || {}, null, 2)}
`

    const instructionSection = `
Please provide:
1. Overall market sentiment
2. Key technical levels to watch
3. Risk assessment
4. Trading recommendations (if applicable)
5. Market outlook for the next 24-48 hours

Keep the analysis concise and actionable.`
    
    return `${basePrompt}\n${dataSection}\n${instructionSection}`
  }

  /**
   * Build prompt for sentiment analysis
   * @param {Array} newsArticles - News articles
   * @returns {string} - Formatted prompt
   */
  buildSentimentAnalysisPrompt(newsArticles) {
    const basePrompt = `Analyze the sentiment of the following news articles related to cryptocurrency markets:`
    
    const articlesSection = newsArticles.map((article, index) => `
Article ${index + 1}:
- Title: ${article.title || 'N/A'}
- Summary: ${article.summary || 'N/A'}
- Source: ${article.source || 'N/A'}
- Published: ${article.publishedAt || 'N/A'}
`).join('\n')

    const instructionSection = `
Please provide:
1. Overall market sentiment score (-100 to +100)
2. Key themes and narratives
3. Potential market impact
4. Risk factors to consider
5. Summary of sentiment trends

Focus on how these articles might influence cryptocurrency prices and market behavior.`
    
    return `${basePrompt}\n${articlesSection}\n${instructionSection}`
  }

  /**
   * Get service statistics
   * @returns {Object} - Service stats
   */
  getStats() {
    return {
      type: 'GeminiService',
      clientStats: this.client.getStats(),
      defaultModel: this.defaultModel,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Test service connectivity
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const response = await this.generateContent('Hello, this is a test message.')
      return !!response
    } catch (error) {
      console.error('Gemini service connection test failed:', error)
      return false
    }
  }
}

export default GeminiService;
