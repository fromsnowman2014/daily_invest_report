/**
 * AlphaVantage_Service.gs
 * Handles communication with the Alpha Vantage API.
 * API Docs: https://www.alphavantage.co/documentation/
 *
 * DATA SOURCE NOTES (as of 2025-02-18):
 * - EPS: NOT USED - Direct from GOOGLEFINANCE
 * - Forward EPS: NOT USED - Calculated via formula (Price / Forward P/E)
 * - P/E: NOT USED - Direct from GOOGLEFINANCE
 * - Forward P/E: NOT USED - Direct from GOOGLEFINANCE
 * - All other fundamentals: USED (PEG, P/S, P/B, EV/EBITDA, margins, ROE, ROIC, growth metrics)
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
   *
   * NOTE: The following fields are returned but NOT USED by Main.gs:
   * - eps, dilutedEPSTTM (EPS now direct from GOOGLEFINANCE)
   * - peRatio (P/E now direct from GOOGLEFINANCE)
   * - forwardPE (Forward P/E now direct from GOOGLEFINANCE)
   *
   * All other fundamental fields ARE USED:
   * - pegRatio, priceToSalesRatio, priceToBookRatio, evToEbitda
   * - profitMargin, operatingMargin, returnOnEquity, returnOnAssets
   * - revenueGrowth, quarterlyEarningsGrowthYOY, etc.
   *
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
      fiftyTwoWeekHigh: Utils.parseFloat(data['52WeekHigh']),
      fiftyTwoWeekLow: Utils.parseFloat(data['52WeekLow']),
      forwardPE: Utils.parseFloat(data.ForwardPE),
      analystTargetPrice: Utils.parseFloat(data.AnalystTargetPrice),
      sharesOutstanding: Utils.parseFloat(data.SharesOutstanding),
      marketCapitalization: Utils.parseFloat(data.MarketCapitalization)
    };
  },

  /**
   * Fetches earnings data including quarterly estimates.
   * Consumes 1 API call.
   * Returns quarterly earnings with analyst estimates for future quarters.
   *
   * DEPRECATED: This function is no longer called by Main.gs.
   * Forward EPS is now fetched from Yahoo Finance instead.
   *
   * @param {string} ticker The stock ticker symbol.
   * @return {Object} Earnings data with quarterlyEarnings array.
   */
  getEarnings: function(ticker) {
    const data = this.fetchAPI('EARNINGS', { symbol: ticker });
    if (!data) return {};

    return {
      ticker: data.symbol,
      quarterlyEarnings: data.quarterlyEarnings || []
    };
  },

  /**
   * Calculates Forward EPS (next 4 quarters estimated EPS sum).
   * Uses EARNINGS API data to sum up analyst estimates.
   *
   * DEPRECATED: This function is no longer called by Main.gs.
   * Forward EPS is now fetched from Yahoo Finance instead (faster, more reliable).
   *
   * @param {string} ticker The stock ticker symbol.
   * @return {number|null} Forward EPS or null if unavailable.
   */
  getForwardEPS: function(ticker) {
    try {
      const earnings = this.getEarnings(ticker);

      if (!earnings.quarterlyEarnings || earnings.quarterlyEarnings.length === 0) {
        Utils.log(`[${ticker}] No quarterly earnings data available.`);
        return null;
      }

      const today = new Date();
      let forwardEPS = 0;
      let count = 0;

      // Sort by fiscalDateEnding to get most recent first
      const sorted = earnings.quarterlyEarnings.sort((a, b) => {
        return new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding);
      });

      // Sum up next 4 quarters' estimated EPS
      for (const quarter of sorted) {
        if (count >= 4) break;

        const fiscalDate = new Date(quarter.fiscalDateEnding);

        // Only include future or very recent quarters (within last 3 months)
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(today.getMonth() - 3);

        if (fiscalDate >= threeMonthsAgo) {
          // Try to get estimated EPS, fallback to reported EPS
          const estimatedEPS = Utils.parseFloat(quarter.estimatedEPS);
          const reportedEPS = Utils.parseFloat(quarter.reportedEPS);

          const epsValue = estimatedEPS || reportedEPS;

          if (epsValue !== null) {
            forwardEPS += epsValue;
            count++;
          }
        }
      }

      if (count === 0) {
        Utils.log(`[${ticker}] No valid forward earnings estimates found.`);
        return null;
      }

      Utils.log(`[${ticker}] Forward EPS calculated: ${forwardEPS.toFixed(2)} (from ${count} quarters)`);
      return forwardEPS;

    } catch (error) {
      Utils.log(`[${ticker}] Error calculating Forward EPS: ${error.message}`);
      return null;
    }
  }
};
