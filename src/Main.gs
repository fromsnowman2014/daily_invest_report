/**
 * Main.gs
 * Entry point for the Daily Invest Report script.
 *
 * Architecture: 2-Phase Update
 *   Phase 1: Write Dashboard rows (GOOGLEFINANCE formulas + API/cached fundamental data)
 *            → Add TOTAL row → Set Weight % formulas
 *   Phase 2: Flush → read back actual values (price, market value, etc.) → write Log entries
 */

// Rotation Configuration
const ROTATION_INTERVAL_DAYS = 7;  // Alpha Vantage: Rotate fundamental data every 7 days
const MAX_DAILY_API_CALLS = 25;    // Alpha Vantage: Safe limit below 25 calls/day

/**
 * Creates the Daily Invest Report menu on open.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Daily Invest Report')
      .addItem('📈 Graph Active Column', 'createHistoryChart')
      .addSeparator()
      .addItem('Restore Dashboard Manually', 'restoreDashboardManual')
      .addToUi();
}

/**
 * Wrapper for ChartManager.createHistoryChart to be called from menu.
 */
function createHistoryChart() {
  ChartManager.createHistoryChart();
}

function updateDailyReport(forceUpdateTicker = null) {
  Utils.log('Starting Daily Invest Report Update (Hybrid Strategy)...');

  try {
    // 1. Get Stock List
    const stockList = SheetManager.getStockList();
    if (stockList.length === 0) {
      Utils.log('No stocks found in list.');
      return;
    }

    // 1.5. Aggregate by ticker (sum quantities, weighted avg buy price)
    const aggregated = aggregateStockList(stockList);
    Utils.log(`Found ${aggregated.length} unique tickers from ${stockList.length} entries.`);

    // 1.6. Sort by ticker name (ascending order) for consistent Dashboard display
    aggregated.sort((a, b) => a.ticker.localeCompare(b.ticker));
    Utils.log('Tickers sorted alphabetically.');

    // 2. Read Existing Dashboard Data (Caching) - BEFORE clearing
    const cachedData = SheetManager.getDashboardData();

    // 2.5. Backup Dashboard before clearing (safety net)
    SheetManager.backupDashboard();

    // 3. Initialize Dashboard (Clear previous data + Pre-format rows)
    // Filter stocks with quantity > 0 for Dashboard display
    const dashboardStocks = aggregated.filter(stock => stock.totalQuantity > 0);
    Utils.log(`Dashboard will show ${dashboardStocks.length} stocks (quantity > 0). ${aggregated.length - dashboardStocks.length} zero-quantity stocks will only be logged.`);

    // Optimization: Only format the rows we need (stocks + total + buffer)
    SheetManager.initDashboard(null, dashboardStocks.length + 5);

    let apiCallsMade = 0;
    let actualDashboardRowCount = 0; // Track actual appended rows (handles errors gracefully)
    const allStocksFinancialData = {}; // Store ALL stocks data for logging (including zero-quantity)

    // ============ Phase 1: Write Dashboard Stock Rows ============
    // Process ALL stocks for data collection, but only add non-zero quantity to Dashboard
    aggregated.forEach((stock) => {
      try {
        const ticker = stock.ticker;
        const buyPrice = stock.avgBuyPrice;
        const quantity = stock.totalQuantity;

        let financialData = {};
        let shouldFetchApi = false;

        // --- Rotation Logic ---
        const cache = cachedData[ticker];

        if (forceUpdateTicker === ticker) {
          shouldFetchApi = true;
          Utils.log(`[${ticker}] Force update requested.`);
        } else if (!cache) {
          shouldFetchApi = true;
          Utils.log(`[${ticker}] New stock detected.`);
        } else {
          // Check if cache has fundamental data
          // Note: EPS and P/E are from GOOGLEFINANCE (not cached)
          // Forward P/E and Forward EPS are from Finviz (cached)
          const cacheHasData = cache.peg || cache.ps || cache.pb || cache.evEbitda || cache.fwdPe || cache.fwdEPS;

          // Priority 1: If cache has NO fundamental data, fetch immediately (regardless of age)
          if (!cacheHasData && apiCallsMade < MAX_DAILY_API_CALLS) {
            shouldFetchApi = true;
            Utils.log(`[${ticker}] Cache has no fundamental data. Forcing API fetch.`);
          } else {
            // Priority 2: Check data age only if cache has data
            const lastUpdated = new Date(cache.lastUpdated);
            const diffTime = Math.abs(new Date() - lastUpdated);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= ROTATION_INTERVAL_DAYS) {
              if (apiCallsMade < MAX_DAILY_API_CALLS) {
                shouldFetchApi = true;
                Utils.log(`[${ticker}] Data expired (${diffDays} days). Scheduled for update.`);
              } else {
                Utils.log(`[${ticker}] Update needed but daily limit reached. Using cache.`);
              }
            } else {
              Utils.log(`[${ticker}] Data fresh enough (${diffDays} days). Using cache.`);
            }
          }
        }

        // --- Data Retrieval Strategy ---
        // 1. Alpha Vantage: PEG, P/S, P/B, EV/EBITDA, margins, ROE, ROIC, growth metrics
        // 2. Finviz: Forward P/E, Forward EPS (ALWAYS fetched, has internal 20-min cache)
        // 3. GOOGLEFINANCE: EPS, P/E (via formulas in Sheet_Manager)

        if (shouldFetchApi) {
          // Alpha Vantage Overview (fundamentals)
          const overview = AlphaVantageService.getCompanyOverview(ticker);

          if (overview && overview.ticker) {
            financialData = {
              ticker: ticker,
              buyPrice: buyPrice,
              quantity: quantity,
              peg: overview.pegRatio,
              ps: overview.priceToSalesRatio,
              pb: overview.priceToBookRatio,
              evEbitda: overview.evToEbitda,
              grossMargin: overview.profitMargin,
              opMargin: overview.operatingMargin,
              roe: overview.returnOnEquity,
              revGrowth: overview.revenueGrowth,
              epsGrowth: overview.quarterlyEarningsGrowthYOY,
              currentRatio: null,
              debtEquity: null,
              rsi: null,
              targetUpside: null,
              ...overview
            };

            apiCallsMade++;
            Utils.log(`[${ticker}] Alpha Vantage Overview API Call Successful. (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
            Utilities.sleep(12000);  // Alpha Vantage rate limiting

          } else {
            Utils.log(`[${ticker}] Alpha Vantage API Fetch Failed (may be ETF or invalid ticker). Falling back to cache.`);
            financialData = cache || {};
          }

        } else {
          financialData = cache || {};
        }

        // Finviz Forward Metrics (ALWAYS fetch - has internal 20-min cache)
        // This runs regardless of shouldFetchApi to ensure Forward P/E and EPS are always available
        try {
          const forwardMetrics = FinvizService.getForwardMetrics(ticker);
          if (forwardMetrics) {
            if (forwardMetrics.fwdPe) {
              financialData.fwdPe = forwardMetrics.fwdPe;
              Utils.log(`[${ticker}] Finviz Forward P/E = ${forwardMetrics.fwdPe}`);
            }
            if (forwardMetrics.fwdEPS) {
              financialData.fwdEPS = forwardMetrics.fwdEPS;
              Utils.log(`[${ticker}] Finviz Forward EPS = ${forwardMetrics.fwdEPS}`);
            }

            // Finviz rate limiting: Only delay if we actually fetched from web (not from cache)
            // Reduced from 11s to 3s based on web scraping best practices (conservative for unofficial API)
            if (!forwardMetrics.fromCache) {
              Utils.log(`[${ticker}] Finviz web fetch detected. Applying 3s rate limit delay...`);
              Utilities.sleep(3000);
            } else {
              Utils.log(`[${ticker}] Finviz cache hit. No delay needed.`);
            }
          }
        } catch (finvizError) {
          Utils.log(`[${ticker}] Finviz fetch error: ${finvizError.message}`);
          // Fall back to cache for Forward metrics
          if (cache && cache.fwdPe) {
            financialData.fwdPe = cache.fwdPe;
            Utils.log(`[${ticker}] Using cached Forward P/E = ${cache.fwdPe}`);
          }
          if (cache && cache.fwdEPS) {
            financialData.fwdEPS = cache.fwdEPS;
            Utils.log(`[${ticker}] Using cached Forward EPS = ${cache.fwdEPS}`);
          }
        }

        // Ensure required fields are set
        financialData.ticker = ticker;
        financialData.buyPrice = buyPrice;
        financialData.quantity = quantity;

        // Store data for ALL stocks (for logging in Phase 2)
        allStocksFinancialData[ticker] = financialData;

        // Only append to Dashboard if quantity > 0
        if (quantity > 0) {
          SheetManager.appendDashboardRow(financialData);
          actualDashboardRowCount++; // Increment only after successful append
        } else {
          Utils.log(`[${ticker}] Quantity is 0. Skipping Dashboard entry (will still be logged).`);
        }

      } catch (stockError) {
        Utils.log(`Error processing ${stock.ticker}: ${stockError.message}`);
      }
    });

    // Add TOTAL summary row + set Weight % formulas (only for displayed stocks)
    // Use actualDashboardRowCount instead of dashboardStocks.length for accuracy
    const totalRowIdx = SheetManager.appendDashboardTotalRow(actualDashboardRowCount);
    SheetManager.setDashboardWeightFormulas(actualDashboardRowCount, totalRowIdx);



    Utils.log(`Dashboard complete: ${actualDashboardRowCount} stocks + TOTAL row.`);

    // ============ Phase 2: Flush & Write Log Entries ============
    SpreadsheetApp.flush();
    Utilities.sleep(10000); // Wait 10s for GOOGLEFINANCE to resolve (rate limit safe)

    const freshData = SheetManager.readDashboardValues();

    // Check if market is open before updating logs
    const isMarketOpen = Utils.isMarketOpenToday(freshData);

    if (!isMarketOpen) {
      Utils.log('Market is CLOSED today. Skipping Log_ticker updates.');
      Utils.log(`Dashboard Update Completed (Log updates skipped). Total API Calls: ${apiCallsMade}`);
      return;
    }

    // Market is open - proceed with Log updates
    Utils.log('Market is OPEN. Proceeding with Log_ticker updates...');

    // Log ALL stocks (including zero-quantity stocks not in Dashboard)
    Object.keys(allStocksFinancialData).forEach(ticker => {
      try {
        let dataToLog;

        if (freshData[ticker]) {
          // Stock is in Dashboard (quantity > 0): use Dashboard values
          dataToLog = { ...allStocksFinancialData[ticker], ...freshData[ticker] };
        } else {
          // Stock NOT in Dashboard (quantity = 0): fetch real-time data separately
          Utils.log(`[${ticker}] Quantity is 0. Fetching real-time data for Log entry...`);
          const realtimeData = SheetManager.fetchRealtimeData(ticker);

          if (realtimeData) {
            // Merge fundamental data with real-time GOOGLEFINANCE data
            dataToLog = { ...allStocksFinancialData[ticker], ...realtimeData };
          } else {
            // If GOOGLEFINANCE fetch fails, log with fundamental data only
            Utils.log(`[${ticker}] Real-time fetch failed. Logging with fundamental data only.`);
            dataToLog = allStocksFinancialData[ticker];
          }
        }

        SheetManager.appendLogRow(ticker, dataToLog);
      } catch (logError) {
        Utils.log(`Error writing log for ${ticker}: ${logError.message}`);
      }
    });

    Utils.log(`Daily Update Completed. Total API Calls: ${apiCallsMade}`);

  } catch (error) {
    Utils.log(`CRITICAL Error: ${error.message}. Attempting to restore Dashboard from backup...`);
    try {
      const restored = SheetManager.restoreDashboard();
      if (restored) {
        Utils.log('Dashboard successfully restored from backup after error.');
      } else {
        Utils.log('WARNING: Could not restore Dashboard. Check Dashboard_Backup sheet manually.');
      }
    } catch (restoreError) {
      Utils.log(`Restore also failed: ${restoreError.message}. Check Dashboard_Backup sheet manually.`);
    }
  }
}

/**
 * Aggregates stock list by ticker: sums quantities, calculates weighted average buy price.
 * Supports multiple entries for the same ticker (different lots/dates).
 * @param {Array<Object>} stockList Raw stock list from Sheet.
 * @return {Array<Object>} Aggregated list: [{ticker, totalQuantity, avgBuyPrice}]
 */
function aggregateStockList(stockList) {
  const tickerMap = {};

  stockList.forEach(stock => {
    const ticker = stock.ticker;
    const price = Utils.parseFloat(stock.buyPrice) || 0;
    const qty = Utils.parseFloat(stock.quantity) || 0;

    if (!tickerMap[ticker]) {
      tickerMap[ticker] = { ticker: ticker, totalCost: 0, totalQuantity: 0 };
    }

    tickerMap[ticker].totalCost += price * qty;
    tickerMap[ticker].totalQuantity += qty;
  });

  return Object.values(tickerMap).map(item => ({
    ticker: item.ticker,
    totalQuantity: item.totalQuantity,
    avgBuyPrice: item.totalQuantity > 0 ? item.totalCost / item.totalQuantity : 0
  }));
}

/**
 * Run this function once to set up sheet structure.
 */
function setupSheets() {
  SheetManager.initDashboard();
  Utils.log('Sheets Initialized.');
}

/**
 * Creates a daily trigger to run updateDailyReport at ~3:01 PM Pacific Time.
 * Run this function ONCE manually to set up the schedule.
 * Note: nearMinute() has ~15 min variance, so actual execution may be 2:46~3:16 PM PT.
 */
function createTimeDrivenTrigger() {
  // Delete existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'updateDailyReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // Create trigger for ~6:31 AM Pacific Time
  ScriptApp.newTrigger('updateDailyReport')
      .timeBased()
      .atHour(6)
      .nearMinute(31)
      .inTimezone('America/Los_Angeles')
      .everyDays(1)
      .create();
/** disable to reduce API calls 2/24
  // Create trigger for ~3:01 PM Pacific Time
  ScriptApp.newTrigger('updateDailyReport')
      .timeBased()
      .atHour(15)
      .nearMinute(1)
      .inTimezone('America/Los_Angeles')
      .everyDays(1)
      .create();
*/
  Utils.log('Daily Triggers set for ~6:31 AM Pacific Time (America/Los_Angeles).');
}

/**
 * Manually restores Dashboard from Dashboard_Backup sheet.
 * Run this function if data was lost and Dashboard_Backup still exists.
 */
function restoreDashboardManual() {
  Utils.log('Manual Dashboard restore requested...');
  const restored = SheetManager.restoreDashboard();
  if (restored) {
    Utils.log('Dashboard successfully restored from Dashboard_Backup.');
  } else {
    Utils.log('No valid backup found. Cannot restore.');
  }
}

/**
 * DEPRECATED: Old migration functions - no longer needed.
 * Column structure is now managed via getDashboardHeaders() and getLogHeaders().
 * These functions are kept for reference only - DO NOT USE.
 */
