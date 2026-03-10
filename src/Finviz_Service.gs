/**
 * Finviz_Service.gs
 * Handles communication with Finviz.com for Forward P/E and Forward EPS data.
 *
 * DATA SOURCE:
 * - Forward P/E: Finviz "Forward P/E" metric
 * - Forward EPS: Finviz "EPS next Y" metric
 *
 * CACHING STRATEGY:
 * - Uses CacheService with 20-minute TTL (1200 seconds)
 * - Reduces HTML fetch overhead for repeated calls
 *
 * NOTE: Finviz data is free but relies on HTML parsing.
 * If Finviz changes their HTML structure, this may break.
 */

const FinvizService = {
  /**
   * Base URL for Finviz quote pages.
   */
  BASE_URL: 'https://finviz.com/quote.ashx',

  /**
   * Cache duration in seconds (20 minutes).
   */
  CACHE_DURATION: 1200,

  /**
   * Fetches a specific metric from Finviz for a given ticker.
   * Uses HTML parsing with regex to extract table data.
   *
   * @param {string} ticker Stock ticker symbol.
   * @param {string} metricName Exact metric name as shown on Finviz (e.g., "Forward P/E", "EPS next Y").
   * @return {number|null} The metric value, or null if unavailable.
   */
  fetchMetric: function(ticker, metricName) {
    if (!ticker || !metricName) {
      Utils.log(`[Finviz] Error: Missing ticker or metric name`);
      return null;
    }

    const cacheKey = `FINVIZ_${ticker}_${metricName}`;
    const cache = CacheService.getScriptCache();

    // 1. Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      Utils.log(`[${ticker}] ${metricName} from cache: ${cached}`);
      return parseFloat(cached);
    }

    // 2. Fetch from Finviz
    const url = `${this.BASE_URL}?t=${ticker}`;

    try {
      Utils.log(`[${ticker}] Fetching ${metricName} from Finviz...`);

      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const code = response.getResponseCode();

      if (code !== 200) {
        Utils.log(`[Finviz] HTTP Error ${code} for ${ticker}`);
        return null;
      }

      const html = response.getContentText();

      // 3. Parse HTML using regex
      // Finviz structure: <td>Metric Name</td><td class="snapshot-td2"><b>Value</b></td>
      // Example: Forward P/E</td><td class="snapshot-td2"><b>15.42</b></td>
      const regex = new RegExp(`${this.escapeRegex(metricName)}<\\/td>.*?<b>\\s*(-?[\\d\\.]+)\\s*<\\/b>`, 'i');
      const match = html.match(regex);

      if (match && match[1]) {
        const value = match[1];
        Utils.log(`[${ticker}] ${metricName} = ${value}`);

        // 4. Cache the result
        cache.put(cacheKey, value, this.CACHE_DURATION);

        return parseFloat(value);
      }

      Utils.log(`[${ticker}] ${metricName} not found in Finviz HTML`);
      return null;

    } catch (error) {
      Utils.log(`[Finviz] Fetch error for ${ticker}: ${error.message}`);
      return null;
    }
  },

  /**
   * Escapes special regex characters in metric names.
   * @param {string} str String to escape.
   * @return {string} Escaped string.
   */
  escapeRegex: function(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  },

  /**
   * Gets Forward P/E for a ticker from Finviz.
   * @param {string} ticker Stock ticker symbol.
   * @return {number|null} Forward P/E value.
   */
  getForwardPE: function(ticker) {
    return this.fetchMetric(ticker, 'Forward P/E');
  },

  /**
   * Gets Forward EPS (EPS next Y) for a ticker from Finviz.
   * NOTE: Finviz uses "EPS next Y" label for Forward EPS.
   * @param {string} ticker Stock ticker symbol.
   * @return {number|null} Forward EPS value.
   */
  getForwardEPS: function(ticker) {
    return this.fetchMetric(ticker, 'EPS next Y');
  },

  /**
   * Gets all P/E and EPS metrics in one call (optimization).
   * Fetches HTML once and extracts: P/E (trailing), EPS (ttm), Forward P/E, Forward EPS.
   * @param {string} ticker Stock ticker symbol.
   * @return {Object} Object with pe, eps, fwdPe, fwdEPS, and fromCache properties.
   */
  getForwardMetrics: function(ticker) {
    if (!ticker) {
      Utils.log(`[Finviz] Error: Missing ticker`);
      return { pe: null, eps: null, fwdPe: null, fwdEPS: null, fromCache: false };
    }

    const cacheKeyPE = `FINVIZ_${ticker}_P/E`;
    const cacheKeyEPS = `FINVIZ_${ticker}_EPS (ttm)`;
    const cacheKeyFwdPE = `FINVIZ_${ticker}_Forward P/E`;
    const cacheKeyFwdEPS = `FINVIZ_${ticker}_EPS next Y`;
    const cache = CacheService.getScriptCache();

    // Check if all metrics are cached
    const cachedPE = cache.get(cacheKeyPE);
    const cachedEPS = cache.get(cacheKeyEPS);
    const cachedFwdPE = cache.get(cacheKeyFwdPE);
    const cachedFwdEPS = cache.get(cacheKeyFwdEPS);

    if (cachedPE && cachedEPS && cachedFwdPE && cachedFwdEPS) {
      Utils.log(`[${ticker}] All P/E/EPS metrics from cache: PE=${cachedPE}, EPS=${cachedEPS}, FwdPE=${cachedFwdPE}, FwdEPS=${cachedFwdEPS}`);
      return {
        pe: parseFloat(cachedPE),
        eps: parseFloat(cachedEPS),
        fwdPe: parseFloat(cachedFwdPE),
        fwdEPS: parseFloat(cachedFwdEPS),
        fromCache: true
      };
    }

    // Fetch HTML once
    const url = `${this.BASE_URL}?t=${ticker}`;

    try {
      Utils.log(`[${ticker}] Fetching P/E and EPS metrics from Finviz...`);

      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const code = response.getResponseCode();

      if (code !== 200) {
        Utils.log(`[Finviz] HTTP Error ${code} for ${ticker}`);
        return { pe: null, eps: null, fwdPe: null, fwdEPS: null, fromCache: false };
      }

      const html = response.getContentText();

      // Extract P/E (trailing)
      const regexPE = /P\/E<\/td>.*?<b>\s*(-?[\d\.]+)\s*<\/b>/i;
      const matchPE = html.match(regexPE);
      const pe = matchPE && matchPE[1] ? parseFloat(matchPE[1]) : null;

      // Extract EPS (ttm)
      const regexEPS = /EPS \(ttm\)<\/td>.*?<b>\s*(-?[\d\.]+)\s*<\/b>/i;
      const matchEPS = html.match(regexEPS);
      const eps = matchEPS && matchEPS[1] ? parseFloat(matchEPS[1]) : null;

      // Extract Forward P/E
      const regexFwdPE = /Forward P\/E<\/td>.*?<b>\s*(-?[\d\.]+)\s*<\/b>/i;
      const matchFwdPE = html.match(regexFwdPE);
      const fwdPe = matchFwdPE && matchFwdPE[1] ? parseFloat(matchFwdPE[1]) : null;

      // Extract EPS next Y (Forward EPS)
      const regexFwdEPS = /EPS next Y<\/td>.*?<b>\s*(-?[\d\.]+)\s*<\/b>/i;
      const matchFwdEPS = html.match(regexFwdEPS);
      const fwdEPS = matchFwdEPS && matchFwdEPS[1] ? parseFloat(matchFwdEPS[1]) : null;

      // Cache all metrics
      if (pe) cache.put(cacheKeyPE, pe.toString(), this.CACHE_DURATION);
      if (eps) cache.put(cacheKeyEPS, eps.toString(), this.CACHE_DURATION);
      if (fwdPe) cache.put(cacheKeyFwdPE, fwdPe.toString(), this.CACHE_DURATION);
      if (fwdEPS) cache.put(cacheKeyFwdEPS, fwdEPS.toString(), this.CACHE_DURATION);

      Utils.log(`[${ticker}] P/E = ${pe}, EPS = ${eps}, Forward P/E = ${fwdPe}, Forward EPS = ${fwdEPS}`);

      return { pe, eps, fwdPe, fwdEPS, fromCache: false };

    } catch (error) {
      Utils.log(`[Finviz] Fetch error for ${ticker}: ${error.message}`);
      return { pe: null, eps: null, fwdPe: null, fwdEPS: null, fromCache: false };
    }
  }
};
