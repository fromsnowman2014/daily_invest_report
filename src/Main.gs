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
const ROTATION_INTERVAL_DAYS = 7;
const MAX_DAILY_API_CALLS = 20; // Safe limit below 25

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

    // 2. Read Existing Dashboard Data (Caching) - BEFORE clearing
    const cachedData = SheetManager.getDashboardData();

    // 2.5. Backup Dashboard before clearing (safety net)
    SheetManager.backupDashboard();

    // 3. Initialize Dashboard (Clear previous data + Pre-format rows)
    // Optimization: Only format the rows we need (stocks + total + buffer)
    SheetManager.initDashboard(null, aggregated.length + 5);

    let apiCallsMade = 0;

    // ============ Phase 1: Write Dashboard Stock Rows ============
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
          // Check if cache has ANY fundamental data (including EPS and Forward EPS)
          const cacheHasData = cache.eps || cache.fwdPe || cache.forwardEPS || cache.peg || cache.ps || cache.pb || cache.evEbitda;

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

        // --- Data Retrieval ---
        if (shouldFetchApi) {
          const overview = AlphaVantageService.getCompanyOverview(ticker);
          if (overview && overview.ticker) {
            // DEBUG: Log raw API response for EPS fields
            Utils.log(`[${ticker}] 🔍 DEBUG - Raw API Response:`);
            Utils.log(`  - dilutedEPSTTM: ${overview.dilutedEPSTTM} (${typeof overview.dilutedEPSTTM})`);
            Utils.log(`  - eps: ${overview.eps} (${typeof overview.eps})`);
            Utils.log(`  - peRatio: ${overview.peRatio} (${typeof overview.peRatio})`);
            Utils.log(`  - forwardPE: ${overview.forwardPE} (${typeof overview.forwardPE})`);

            financialData = {
              ticker: ticker,
              buyPrice: buyPrice,
              quantity: quantity,
              pe: overview.peRatio,
              eps: overview.dilutedEPSTTM || overview.eps,  // Use diluted EPS (more accurate), fallback to basic EPS
              fwdPe: overview.forwardPE,
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

            // DEBUG: Log constructed EPS value
            Utils.log(`  - Constructed financialData.eps: ${financialData.eps} (${typeof financialData.eps})`);
            Utils.log(`  - Condition check (eps && eps > 0): ${!!(financialData.eps && financialData.eps > 0)}`);

            apiCallsMade++;
            Utils.log(`[${ticker}] Overview API Call Successful. (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
            Utilities.sleep(12000);

            // Try to fetch Forward EPS from Earnings API (if we have API calls remaining)
            if (apiCallsMade < MAX_DAILY_API_CALLS) {
              try {
                Utils.log(`[${ticker}] 🔍 DEBUG - Calling getForwardEPS()...`);
                const forwardEPS = AlphaVantageService.getForwardEPS(ticker);

                // DEBUG: Log raw Forward EPS response
                Utils.log(`  - Raw forwardEPS: ${forwardEPS} (${typeof forwardEPS})`);
                Utils.log(`  - Condition check (forwardEPS && forwardEPS > 0): ${!!(forwardEPS && forwardEPS > 0)}`);

                if (forwardEPS && forwardEPS > 0) {
                  financialData.forwardEPS = forwardEPS;
                  apiCallsMade++;
                  Utils.log(`[${ticker}] ✅ Earnings API Call Successful. Forward EPS: ${forwardEPS.toFixed(2)} (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
                  Utils.log(`  - Set financialData.forwardEPS: ${financialData.forwardEPS}`);
                  Utilities.sleep(12000);
                } else {
                  Utils.log(`[${ticker}] ⚠️ No Forward EPS available (value: ${forwardEPS}). Today Fwd P/E will be empty.`);
                }
              } catch (earningsError) {
                Utils.log(`[${ticker}] ❌ Earnings API Error: ${earningsError.message}. Skipping Forward EPS.`);
                Utils.log(`  Stack: ${earningsError.stack}`);
              }
            } else {
              Utils.log(`[${ticker}] API limit reached. Skipping Earnings API call.`);
            }

          } else {
            Utils.log(`[${ticker}] API Fetch Failed (may be ETF or invalid ticker). Falling back to cache.`);
            financialData = cache || {};
          }
        } else {
          financialData = cache || {};
        }

        financialData.ticker = ticker;
        financialData.buyPrice = buyPrice;
        financialData.quantity = quantity;

        // DEBUG: Log final financialData before passing to appendDashboardRow
        Utils.log(`[${ticker}] 🔍 DEBUG - Final financialData before appendDashboardRow:`);
        Utils.log(`  - eps: ${financialData.eps} (${typeof financialData.eps})`);
        Utils.log(`  - forwardEPS: ${financialData.forwardEPS} (${typeof financialData.forwardEPS})`);
        Utils.log(`  - pe: ${financialData.pe}`);
        Utils.log(`  - fwdPe: ${financialData.fwdPe}`);

        SheetManager.appendDashboardRow(financialData);

      } catch (stockError) {
        Utils.log(`Error processing ${stock.ticker}: ${stockError.message}`);
      }
    });

    // Add TOTAL summary row + set Weight % formulas
    const totalRowIdx = SheetManager.appendDashboardTotalRow(aggregated.length);
    SheetManager.setDashboardWeightFormulas(aggregated.length, totalRowIdx);
    

    
    Utils.log(`Dashboard complete: ${aggregated.length} stocks + TOTAL row.`);

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

    Object.keys(freshData).forEach(ticker => {
      try {
        SheetManager.appendLogRow(ticker, freshData[ticker]);
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

  // Create trigger for ~3:01 PM Pacific Time
  ScriptApp.newTrigger('updateDailyReport')
      .timeBased()
      .atHour(15)
      .nearMinute(1)
      .inTimezone('America/Los_Angeles')
      .everyDays(1)
      .create();

  Utils.log('Daily Triggers set for ~6:31 AM and ~3:01 PM Pacific Time (America/Los_Angeles).');
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
