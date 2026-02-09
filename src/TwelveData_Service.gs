/**
 * TwelveData_Service.gs
 * Handles all communication with the Twelve Data API.
 * API Docs: https://twelvedata.com/docs
 */

const TwelveDataService = {
  /**
   * Makes a GET request to the Twelve Data API.
   * @param {string} endpoint The API endpoint (e.g., '/quote').
   * @param {Object} params Additional parameters.
   * @return {Object|null} Parsed JSON response or null on error.
   */
  fetchAPI: function(endpoint, params = {}) {
    const baseUrl = CONFIG.TWELVE_DATA_BASE_URL;
    const apiKey = CONFIG.TWELVE_DATA_API_KEY;
    
    if (!apiKey) {
      Utils.log('Error: TWELVE_DATA_API_KEY not set in Script Properties');
      return null;
    }
    
    // Build query string
    params.apikey = apiKey;
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = `${baseUrl}${endpoint}?${queryString}`;

    try {
      const response = UrlFetchApp.fetch(fullUrl, { muteHttpExceptions: true });
      const code = response.getResponseCode();

      if (code !== 200) {
        Utils.log(`Twelve Data API Error (${code}): ${endpoint}`);
        return null;
      }

      const data = JSON.parse(response.getContentText());
      
      // Check for API error response
      if (data.status === 'error') {
        Utils.log(`Twelve Data Error: ${data.message}`);
        return null;
      }
      
      return data;
    } catch (error) {
      Utils.log(`Twelve Data Fetch Error: ${error.message}`);
      return null;
    }
  },

  /**
   * Fetches real-time quote data for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Quote data { price, change, percent_change, volume }.
   */
  getQuote: function(ticker) {
    const data = this.fetchAPI('/quote', { symbol: ticker });
    if (!data) return {};

    return {
      price: Utils.parseFloat(data.close),
      open: Utils.parseFloat(data.open),
      high: Utils.parseFloat(data.high),
      low: Utils.parseFloat(data.low),
      volume: Utils.parseFloat(data.volume),
      change: Utils.parseFloat(data.change),
      percentChange: Utils.parseFloat(data.percent_change),
      previousClose: Utils.parseFloat(data.previous_close)
    };
  },

  /**
   * Fetches company statistics/fundamentals for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Statistics data.
   */
  getStatistics: function(ticker) {
    const data = this.fetchAPI('/statistics', { symbol: ticker });
    if (!data || !data.statistics) return {};

    const stats = data.statistics;
    return {
      marketCap: stats.valuations_metrics?.market_capitalization,
      peRatio: stats.valuations_metrics?.trailing_pe,
      forwardPe: stats.valuations_metrics?.forward_pe,
      pegRatio: stats.valuations_metrics?.peg_ratio,
      priceToSales: stats.valuations_metrics?.price_to_sales_ttm,
      priceToBook: stats.valuations_metrics?.price_to_book_mrq,
      evToEbitda: stats.valuations_metrics?.enterprise_to_ebitda,
      profitMargin: stats.financials?.profit_margin,
      operatingMargin: stats.financials?.operating_margin_ttm,
      returnOnEquity: stats.financials?.return_on_equity_ttm,
      revenueGrowth: stats.financials?.quarterly_revenue_growth_yoy,
      epsGrowth: stats.financials?.quarterly_earnings_growth_yoy,
      currentRatio: stats.financials?.current_ratio_mrq,
      debtToEquity: stats.financials?.total_debt_to_equity_mrq,
      beta: stats.stock_statistics?.beta,
      fiftyTwoWeekHigh: stats.stock_statistics?.fifty_two_week_high,
      fiftyTwoWeekLow: stats.stock_statistics?.fifty_two_week_low
    };
  },

  /**
   * Fetches company profile information.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Profile data.
   */
  getProfile: function(ticker) {
    const data = this.fetchAPI('/profile', { symbol: ticker });
    if (!data) return {};

    return {
      name: data.name,
      sector: data.sector,
      industry: data.industry,
      country: data.country,
      exchange: data.exchange,
      employees: data.employees
    };
  },

  /**
   * Aggregates all financial data for a single ticker.
   * @param {string} ticker The stock ticker symbol.
   * @param {number} buyPrice The user's buy price (for gain/loss calculation).
   * @param {number} quantity The number of shares owned.
   * @return {Object} Aggregated data object for Dashboard.
   */
  getFullFinancialData: function(ticker, buyPrice, quantity) {
    Utils.log(`Fetching Twelve Data for ${ticker}...`);

    const quote = this.getQuote(ticker);
    const stats = this.getStatistics(ticker);

    // Calculate Gain/Loss
    const currentPrice = quote.price || 0;
    const qty = Utils.parseFloat(quantity) || 1;
    const buy = Utils.parseFloat(buyPrice);
    
    // Gain/Loss % = (Current - Buy) / Buy
    const gainLossPct = buy > 0 ? Utils.calculateChange(currentPrice, buy) : null;
    
    // Gain/Loss $ = (Current - Buy) × Quantity
    const gainLossAbs = buy > 0 ? (currentPrice - buy) * qty : null;

    return {
      ticker: ticker,
      price: currentPrice,
      changePct: quote.percentChange ? quote.percentChange / 100 : null,
      gainLossPct: gainLossPct,
      gainLossAbs: gainLossAbs,
      marketCap: stats.marketCap,
      pe: stats.peRatio,
      fwdPe: stats.forwardPe,
      peg: stats.pegRatio,
      ps: stats.priceToSales,
      pb: stats.priceToBook,
      evEbitda: stats.evToEbitda,
      fcfYield: null, // Not directly available
      grossMargin: null, // Requires income statement
      opMargin: stats.operatingMargin,
      roe: stats.returnOnEquity,
      roic: null, // Not directly available
      revGrowth: stats.revenueGrowth,
      epsGrowth: stats.epsGrowth,
      currentRatio: stats.currentRatio,
      debtEquity: stats.debtToEquity,
      rsi: null, // Requires technical indicator endpoint
      targetUpside: null, // Not available in free tier
      systemMemo: ''
    };
  }
};
