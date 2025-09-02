/**
 * Netlify Client Service
 * Handles all API calls through secure Netlify Functions
 * Keeps API keys secure on the server side
 */

class NetlifyClient {
  constructor() {
    this.baseUrl = '/.netlify/functions';
  }

  // Generic function to call Netlify Functions
  async callFunction(functionName, data = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      throw error;
    }
  }

  // Alpha Vantage API calls
  async getTechnicalIndicators(symbol, interval, indicators) {
    const results = {};
    
    for (const indicator of indicators) {
      try {
        const data = await this.callFunction('alpha-vantage', {
          symbol,
          interval,
          indicator: indicator.type
        });
        results[indicator.type] = data;
      } catch (error) {
        console.error(`Failed to fetch ${indicator.type}:`, error);
        results[indicator.type] = { error: error.message };
      }
    }
    
    return results;
  }

  // Gemini API calls
  async generateContent(prompt, model = 'gemini-1.5-flash') {
    return await this.callFunction('gemini', { prompt, model });
  }

  // Database operations
  async storePriceData(pairName, price) {
    return await this.callFunction('database', {
      action: 'storePriceData',
      data: { pairName, price }
    });
  }

  async storeConnectionLog(eventType, message, status = null) {
    return await this.callFunction('database', {
      action: 'storeConnectionLog',
      data: { eventType, message, status }
    });
  }

  async storeTechnicalIndicators(symbol, interval, indicators) {
    return await this.callFunction('database', {
      action: 'storeTechnicalIndicators',
      data: { symbol, interval, indicators }
    });
  }

  async storeTechnicalAnalysis(analysis) {
    return await this.callFunction('database', {
      action: 'storeTechnicalAnalysis',
      data: { analysis }
    });
  }

  async storeAnalysisSession(symbol, interval, status, metadata = {}) {
    return await this.callFunction('database', {
      action: 'storeAnalysisSession',
      data: { symbol, interval, status, metadata }
    });
  }

  async getPriceHistory(pairName, limit = 100) {
    return await this.callFunction('database', {
      action: 'getPriceHistory',
      data: { pairName, limit }
    });
  }

  async getConnectionLogs(limit = 50) {
    return await this.callFunction('database', {
      action: 'getConnectionLogs',
      data: { limit }
    });
  }

  async getTechnicalIndicators(symbol, interval, limit = 10) {
    return await this.callFunction('database', {
      action: 'getTechnicalIndicators',
      data: { symbol, interval, limit }
    });
  }

  async getTechnicalAnalysis(limit = 10) {
    return await this.callFunction('database', {
      action: 'getTechnicalAnalysis',
      data: { limit }
    });
  }

  // Health check
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/alpha-vantage`, {
        method: 'OPTIONS'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  // Get client statistics
  getStats() {
    return {
      type: 'NetlifyClient',
      baseUrl: this.baseUrl,
      timestamp: new Date().toISOString()
    };
  }
}

export default NetlifyClient;
