/**
 * AlphaVantage_Service.gs
 * Handles communication with the Alpha Vantage API.
 * API Docs: https://www.alphavantage.co/documentation/
 */

const AlphaVantageService = {
  /**
   * Makes a GET request to the Alpha Vantage API.
   * @param {string} functionName The API function (e.g., 'OVERVIEW').
   * @param {Object} params Additional parameters.
   * @return {Object|null} Parsed JSON response or null on error.
   */
  fetchAPI: function(functionName, params = {}) {
    const baseUrl = CONFIG.ALPHA_VANTAGE_BASE_URL;
    const apiKey = CONFIG.ALPHA_VANTAGE_API_KEY;
    
    if (!apiKey) {
      Utils.log('Error: ALPHA_VANTAGE_API_KEY not set in Script Properties');
      return null;
    }
    
    // Build query string
    params.function = functionName;
    params.apikey = apiKey;
    
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const fullUrl = `${baseUrl}?${queryString}`;

    try {
      const response = UrlFetchApp.fetch(fullUrl, { muteHttpExceptions: true });
      const code = response.getResponseCode();

      if (code !== 200) {
        Utils.log(`Alpha Vantage API Error (${code}): ${functionName}`);
        return null;
      }

      const content = response.getContentText();
      const data = JSON.parse(content);
      
      // Check for API specific error messages or rate limits
      if (data['Error Message']) {
        Utils.log(`Alpha Vantage Error: ${data['Error Message']}`);
        return null;
      }
      if (data['Note']) {
         // Often indicates rate limit reached
        Utils.log(`Alpha Vantage Note (Rate Limit?): ${data['Note']}`);
        return null;
      }
      
      return data;
    } catch (error) {
      Utils.log(`Alpha Vantage Fetch Error: ${error.message}`);
      return null;
    }
  },

  /**
   * Fetches company overview (fundamentals) for a ticker.
   * Consumes 1 API call.
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Parsed overview data.
   */
  getCompanyOverview: function(ticker) {
    const data = this.fetchAPI('OVERVIEW', { symbol: ticker });
    if (!data) return {};

    return {
      ticker: data.Symbol,
      peRatio: Utils.parseFloat(data.PERatio),
      pegRatio: Utils.parseFloat(data.PEGRatio),
      bookValue: Utils.parseFloat(data.BookValue),
      dividendYield: Utils.parseFloat(data.DividendYield),
      eps: Utils.parseFloat(data.EPS),
      revenuePerShare: Utils.parseFloat(data.RevenuePerShare),
      profitMargin: Utils.parseFloat(data.ProfitMargin),
      operatingMargin: Utils.parseFloat(data.OperatingMarginTTM),
      returnOnAssets: Utils.parseFloat(data.ReturnOnAssetsTTM),
      returnOnEquity: Utils.parseFloat(data.ReturnOnEquityTTM),
      revenueGrowth: Utils.parseFloat(data.QuarterlyRevenueGrowthYOY),
      grossProfit: Utils.parseFloat(data.GrossProfitTTM),
      dilutedEPSTTM: Utils.parseFloat(data.DilutedEPSTTM),
      quarterlyEarningsGrowthYOY: Utils.parseFloat(data.QuarterlyEarningsGrowthYOY),
      priceToSalesRatio: Utils.parseFloat(data.PriceToSalesRatioTTM),
      priceToBookRatio: Utils.parseFloat(data.PriceToBookRatio),
      evToEbitda: Utils.parseFloat(data.EVToEBITDA),
      beta: Utils.parseFloat(data.Beta),
      52WeekHigh: Utils.parseFloat(data['52WeekHigh']),
      52WeekLow: Utils.parseFloat(data['52WeekLow']),
      forwardPE: Utils.parseFloat(data.ForwardPE),
      analystTargetPrice: Utils.parseFloat(data.AnalystTargetPrice),
      sharesOutstanding: Utils.parseFloat(data.SharesOutstanding),
      marketCapitalization: Utils.parseFloat(data.MarketCapitalization)
    };
  }
};
