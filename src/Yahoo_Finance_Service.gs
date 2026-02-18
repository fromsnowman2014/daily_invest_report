/**
 * Yahoo_Finance_Service.gs
 * Fetches Forward EPS data from Yahoo Finance API.
 *
 * Note: This is an unofficial API and may change without notice.
 * However, it's widely used and generally stable.
 */

const YahooFinanceService = {
  /**
   * Fetches Forward EPS from Yahoo Finance.
   * Forward EPS = Sum of next 4 quarters estimated EPS.
   *
   * @param {string} ticker Stock ticker symbol (e.g., 'AAPL', 'AGNC')
   * @return {number|null} Forward EPS value or null if unavailable
   */
  getForwardEPS: function(ticker) {
    try {
      const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics`;
      const options = {
        muteHttpExceptions: true,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };

      const response = UrlFetchApp.fetch(url, options);

      if (response.getResponseCode() !== 200) {
        Utils.log(`[${ticker}] Yahoo Finance API error: HTTP ${response.getResponseCode()}`);
        return null;
      }

      const data = JSON.parse(response.getContentText());

      // Navigate to forwardEps field
      const result = data?.quoteSummary?.result;
      if (!result || result.length === 0) {
        Utils.log(`[${ticker}] Yahoo Finance: No data available`);
        return null;
      }

      const forwardEps = result[0]?.defaultKeyStatistics?.forwardEps?.raw;

      if (forwardEps && typeof forwardEps === 'number' && forwardEps > 0) {
        return forwardEps;
      }

      Utils.log(`[${ticker}] Yahoo Finance: Forward EPS not available or invalid`);
      return null;

    } catch (error) {
      Utils.log(`[${ticker}] Yahoo Finance fetch error: ${error.message}`);
      return null;
    }
  },

  /**
   * Batch fetch Forward EPS for multiple tickers.
   * Useful for initial setup or bulk updates.
   *
   * @param {Array<string>} tickers Array of ticker symbols
   * @return {Object} Map of ticker -> Forward EPS value
   */
  batchGetForwardEPS: function(tickers) {
    const results = {};

    Utils.log(`Fetching Forward EPS for ${tickers.length} tickers from Yahoo Finance...`);

    tickers.forEach((ticker, index) => {
      const forwardEPS = this.getForwardEPS(ticker);
      results[ticker] = forwardEPS;

      // Progress log every 5 tickers
      if ((index + 1) % 5 === 0) {
        Utils.log(`  Progress: ${index + 1}/${tickers.length} tickers processed`);
      }

      // Rate limiting: Yahoo Finance allows ~10 requests/second
      // Sleep 100ms between requests to be safe
      Utilities.sleep(100);
    });

    Utils.log(`Batch fetch complete. Success rate: ${Object.values(results).filter(v => v !== null).length}/${tickers.length}`);

    return results;
  }
};
