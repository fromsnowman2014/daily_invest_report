/**
 * FMP_Service.gs
 * Handles all communication with the Financial Modeling Prep (FMP) API.
 */

const FMPService = {
  /**
   * Makes a GET request to the FMP API.
   * @param {string} endpoint The API endpoint (e.g., '/quote/AAPL').
   * @return {Object|null} Parsed JSON response or null on error.
   */
  fetchAPI: function(endpoint) {
    const url = `${CONFIG.FMP_BASE_URL}${endpoint}`;
    const separator = endpoint.includes('?') ? '&' : '?';
    const fullUrl = `${url}${separator}apikey=${CONFIG.FMP_API_KEY}`;

    try {
      const response = UrlFetchApp.fetch(fullUrl, { muteHttpExceptions: true });
      const code = response.getResponseCode();

      if (code !== 200) {
        Utils.log(`FMP API Error (${code}): ${endpoint}`);
        return null;
      }

      return JSON.parse(response.getContentText());
    } catch (error) {
      Utils.log(`FMP Fetch Error: ${error.message}`);
      return null;
    }
  },

  /**
   * Fetches real-time quote data for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Quote data { price, change, changesPercentage, marketCap, pe }.
   */
  getQuote: function(ticker) {
    const data = this.fetchAPI(`/quote/${ticker}`);
    if (!data || data.length === 0) return {};

    const quote = data[0];
    return {
      price: quote.price,
      change: quote.change,
      changesPercentage: quote.changesPercentage,
      marketCap: quote.marketCap,
      pe: quote.pe,
      eps: quote.eps
    };
  },

  /**
   * Fetches TTM Key Metrics for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Key metrics data.
   */
  getKeyMetrics: function(ticker) {
    const data = this.fetchAPI(`/key-metrics-ttm/${ticker}`);
    if (!data || data.length === 0) return {};

    const m = data[0];
    return {
      peRatioTTM: m.peRatioTTM,
      pbRatioTTM: m.pbRatioTTM,
      debtToEquityTTM: m.debtToEquityTTM,
      currentRatioTTM: m.currentRatioTTM,
      interestCoverageTTM: m.interestCoverageTTM,
      freeCashFlowYieldTTM: m.freeCashFlowYieldTTM,
      enterpriseValueOverEBITDATTM: m.enterpriseValueOverEBITDATTM
    };
  },

  /**
   * Fetches TTM Ratios for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Ratio data.
   */
  getRatios: function(ticker) {
    const data = this.fetchAPI(`/ratios-ttm/${ticker}`);
    if (!data || data.length === 0) return {};

    const r = data[0];
    return {
      grossProfitMarginTTM: r.grossProfitMarginTTM,
      operatingProfitMarginTTM: r.operatingProfitMarginTTM,
      netProfitMarginTTM: r.netProfitMarginTTM,
      returnOnEquityTTM: r.returnOnEquityTTM,
      returnOnCapitalEmployedTTM: r.returnOnCapitalEmployedTTM,
      priceToSalesRatioTTM: r.priceToSalesRatioTTM,
      priceEarningsToGrowthRatioTTM: r.priceEarningsToGrowthRatioTTM
    };
  },

  /**
   * Fetches income statement growth for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Growth data.
   */
  getGrowth: function(ticker) {
    const data = this.fetchAPI(`/income-statement-growth/${ticker}?limit=1`);
    if (!data || data.length === 0) return {};

    const g = data[0];
    return {
      revenueGrowth: g.growthRevenue,
      epsGrowth: g.growthEPS
    };
  },

  /**
   * Fetches analyst price target for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Target price data.
   */
  getPriceTarget: function(ticker) {
    const data = this.fetchAPI(`/price-target-consensus/${ticker}`);
    if (!data || data.length === 0) return {};

    return {
      targetHigh: data[0].targetHigh,
      targetLow: data[0].targetLow,
      targetConsensus: data[0].targetConsensus,
      targetMedian: data[0].targetMedian
    };
  },

  /**
   * Fetches recent news for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @param {number} limit Number of news items to fetch.
   * @return {Array<Object>} Array of news objects { title, text, publishedDate }.
   */
  getNews: function(ticker, limit = 5) {
    const data = this.fetchAPI(`/stock_news?tickers=${ticker}&limit=${limit}`);
    if (!data || data.length === 0) return [];

    return data.map(n => ({
      title: n.title,
      text: n.text,
      publishedDate: n.publishedDate,
      site: n.site
    }));
  },

  /**
   * Aggregates all financial data for a single ticker.
   * @param {string} ticker The stock ticker symbol.
   * @param {number} buyPrice The user's buy price (for gain/loss calculation).
   * @param {number} quantity The number of shares owned.
   * @return {Object} Aggregated data object for Dashboard.
   */
  getFullFinancialData: function(ticker, buyPrice, quantity) {
    Utils.log(`Fetching FMP data for ${ticker}...`);

    const quote = this.getQuote(ticker);
    const metrics = this.getKeyMetrics(ticker);
    const ratios = this.getRatios(ticker);
    const growth = this.getGrowth(ticker);
    const target = this.getPriceTarget(ticker);

    // Calculate Gain/Loss
    const currentPrice = quote.price || 0;
    const qty = Utils.parseFloat(quantity) || 1; // Default to 1 if not specified
    const buy = Utils.parseFloat(buyPrice);
    
    // Gain/Loss % = (Current - Buy) / Buy
    const gainLossPct = buy > 0 ? Utils.calculateChange(currentPrice, buy) : null;
    
    // Gain/Loss $ = (Current - Buy) × Quantity
    const gainLossAbs = buy > 0 ? (currentPrice - buy) * qty : null;
    
    // Total Investment = Buy Price × Quantity
    const totalInvestment = buy > 0 ? buy * qty : null;
    
    // Current Value = Current Price × Quantity
    const currentValue = currentPrice * qty;

    // Calculate Target Upside
    const targetUpside = target.targetConsensus && currentPrice > 0
      ? Utils.calculateChange(target.targetConsensus, currentPrice)
      : null;

    return {
      ticker: ticker,
      price: currentPrice,
      changePct: quote.changesPercentage ? quote.changesPercentage / 100 : null,
      gainLossPct: gainLossPct,
      gainLossAbs: gainLossAbs,
      totalInvestment: totalInvestment,
      currentValue: currentValue,
      quantity: qty,
      marketCap: quote.marketCap,
      pe: metrics.peRatioTTM,
      fwdPe: quote.pe, // FMP quote PE is often forward
      peg: ratios.priceEarningsToGrowthRatioTTM,
      ps: ratios.priceToSalesRatioTTM,
      pb: metrics.pbRatioTTM,
      evEbitda: metrics.enterpriseValueOverEBITDATTM,
      fcfYield: metrics.freeCashFlowYieldTTM,
      grossMargin: ratios.grossProfitMarginTTM,
      opMargin: ratios.operatingProfitMarginTTM,
      roe: ratios.returnOnEquityTTM,
      roic: ratios.returnOnCapitalEmployedTTM,
      revGrowth: growth.revenueGrowth,
      epsGrowth: growth.epsGrowth,
      currentRatio: metrics.currentRatioTTM,
      debtEquity: metrics.debtToEquityTTM,
      rsi: null, // RSI requires different endpoint or calculation
      targetUpside: targetUpside,
      systemMemo: '' // Placeholder for Gemini
    };
  }
};
