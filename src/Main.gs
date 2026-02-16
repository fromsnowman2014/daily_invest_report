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
          const lastUpdated = new Date(cache.lastUpdated);
          const diffTime = Math.abs(new Date() - lastUpdated);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          const cacheHasData = cache.fwdPe || cache.peg || cache.ps || cache.pb || cache.evEbitda;

          if (!cacheHasData && apiCallsMade < MAX_DAILY_API_CALLS) {
            shouldFetchApi = true;
            Utils.log(`[${ticker}] Cache has no fundamental data. Forcing API fetch.`);
          } else if (diffDays >= ROTATION_INTERVAL_DAYS) {
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

        // --- Data Retrieval ---
        if (shouldFetchApi) {
          const overview = AlphaVantageService.getCompanyOverview(ticker);
          if (overview && overview.ticker) {
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

            apiCallsMade++;
            Utils.log(`[${ticker}] Overview API Call Successful. (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
            Utilities.sleep(12000);

            // Try to fetch Forward EPS from Earnings API (if we have API calls remaining)
            if (apiCallsMade < MAX_DAILY_API_CALLS) {
              try {
                const forwardEPS = AlphaVantageService.getForwardEPS(ticker);
                if (forwardEPS && forwardEPS > 0) {
                  financialData.forwardEPS = forwardEPS;
                  apiCallsMade++;
                  Utils.log(`[${ticker}] Earnings API Call Successful. Forward EPS: ${forwardEPS.toFixed(2)} (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
                  Utilities.sleep(12000);
                } else {
                  Utils.log(`[${ticker}] No Forward EPS available. Today Fwd P/E will be empty.`);
                }
              } catch (earningsError) {
                Utils.log(`[${ticker}] Earnings API Error: ${earningsError.message}. Skipping Forward EPS.`);
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
 * Migrates Dashboard and all Log sheets to add Today P/E column.
 * Run this ONCE after updating code to add the new column.
 * Inserts Today P/E column after P/E (position L).
 */
function migrateAddTodayPE() {
  Utils.log('=== Starting Today P/E Column Migration ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Migrate Dashboard
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);
  if (dashboard) {
    Utils.log('Migrating Dashboard...');

    // Insert column at position 12 (after K=P/E, before current L=Fwd P/E)
    dashboard.insertColumnAfter(11); // Insert after column K

    // Set header
    dashboard.getRange(1, 12).setValue('Today P/E').setFontWeight('bold');

    // Add GOOGLEFINANCE formula for each stock row
    const lastRow = dashboard.getLastRow();
    if (lastRow >= 2) {
      for (let row = 2; row <= lastRow; row++) {
        const ticker = dashboard.getRange(row, 1).getValue();
        if (ticker && ticker !== 'TOTAL' && ticker !== '') {
          const formula = `=GOOGLEFINANCE("${ticker}","pe")`;
          dashboard.getRange(row, 12).setFormula(formula);
        }
      }
    }

    Utils.log('Dashboard migration complete.');
  } else {
    Utils.log('Dashboard sheet not found. Skipping.');
  }

  // 2. Migrate all Log sheets
  const sheets = ss.getSheets();
  let logCount = 0;

  for (const sheet of sheets) {
    const sheetName = sheet.getName();
    if (sheetName.startsWith(CONFIG.SHEET_NAMES.LOG_PREFIX)) {
      Utils.log(`Migrating ${sheetName}...`);

      // Insert column at position 12 (after K=P/E, before current L=Fwd P/E)
      sheet.insertColumnAfter(11);

      // Set header
      sheet.getRange(1, 12).setValue('Today P/E').setFontWeight('bold');

      logCount++;
    }
  }

  Utils.log(`=== Migration Complete ===`);
  Utils.log(`Dashboard: Updated`);
  Utils.log(`Log sheets: ${logCount} updated`);
  Utils.log('Please run updateDailyReport() to populate Today P/E values in logs.');
}

/**
 * Migrates Dashboard and all Log sheets to add Today Fwd P/E and Fwd EPS columns.
 * Run this ONCE after updating code to add the new columns.
 * Inserts Today Fwd P/E (column N) and Fwd EPS (column O) after Fwd P/E (column M).
 */
function migrateAddTodayFwdPE() {
  Utils.log('=== Starting Today Fwd P/E & Fwd EPS Column Migration ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Migrate Dashboard
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);
  if (dashboard) {
    Utils.log('Migrating Dashboard...');

    // Insert 2 columns after M (Fwd P/E)
    // Column 13 = M (Fwd P/E)
    dashboard.insertColumnAfter(13); // Insert column N (Today Fwd P/E)
    dashboard.insertColumnAfter(14); // Insert column O (Fwd EPS)

    // Set headers
    dashboard.getRange(1, 14).setValue('Today Fwd P/E').setFontWeight('bold');
    dashboard.getRange(1, 15).setValue('Fwd EPS').setFontWeight('bold');

    // Note: Today Fwd P/E formula will be auto-generated on next updateDailyReport()
    // based on Fwd EPS value in column O

    Utils.log('Dashboard migration complete.');
  } else {
    Utils.log('Dashboard sheet not found. Skipping.');
  }

  // 2. Migrate all Log sheets
  const sheets = ss.getSheets();
  let logCount = 0;

  for (const sheet of sheets) {
    const sheetName = sheet.getName();
    if (sheetName.startsWith(CONFIG.SHEET_NAMES.LOG_PREFIX)) {
      Utils.log(`Migrating ${sheetName}...`);

      // Insert 1 column after M (Fwd P/E) for Today Fwd P/E
      // Note: Log sheets don't store Fwd EPS, only the calculated Today Fwd P/E value
      sheet.insertColumnAfter(13);

      // Set header
      sheet.getRange(1, 14).setValue('Today Fwd P/E').setFontWeight('bold');

      logCount++;
    }
  }

  Utils.log(`=== Migration Complete ===`);
  Utils.log(`Dashboard: Updated (added Today Fwd P/E and Fwd EPS columns)`);
  Utils.log(`Log sheets: ${logCount} updated (added Today Fwd P/E column)`);
  Utils.log('Please run updateDailyReport() to populate Forward EPS and Today Fwd P/E values.');
}

/**
 * Migrates Dashboard to add EPS column after Today P/E (position M).
 * Run this ONCE after updating code to improve Today P/E calculation.
 * Inserts EPS column after L (Today P/E).
 */
function migrateAddEPS() {
  Utils.log('=== Starting EPS Column Migration (for Today P/E improvement) ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Migrate Dashboard only (Log sheets don't store EPS)
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);
  if (dashboard) {
    Utils.log('Migrating Dashboard...');

    // Insert 1 column after L (Today P/E)
    // Column 12 = L (Today P/E)
    dashboard.insertColumnAfter(12); // Insert column M (EPS)

    // Set header
    dashboard.getRange(1, 13).setValue('EPS').setFontWeight('bold');

    Utils.log('Dashboard migration complete.');
    Utils.log('EPS column added at position M (after Today P/E).');
  } else {
    Utils.log('Dashboard sheet not found. Skipping.');
  }

  Utils.log(`=== Migration Complete ===`);
  Utils.log('Please run updateDailyReport() to populate EPS values and update Today P/E formulas.');
}
