/**
 * Main.gs
 * Entry point for the Daily Invest Report script.
 */

// Rotation Configuration
const ROTATION_INTERVAL_DAYS = 7;
const MAX_DAILY_API_CALLS = 20; // Safe limit below 25

function updateDailyReport(forceUpdateTicker = null) {
  Utils.log('Starting Daily Invest Report Update (Hybrid Strategy)...');
  
  try {
    // 1. Get Stock List
    const stockList = SheetManager.getStockList();
    if (stockList.length === 0) {
      Utils.log('No stocks found in list.');
      return;
    }
    
    // 2. Read Existing Dashboard Data (Caching)
    const cachedData = SheetManager.getDashboardData();
    
    // 3. Initialize Dashboard (Clear previous data)
    // Note: We read cache FIRST, then clear, then re-populated with hybrid data.
    SheetManager.initDashboard();
    
    let apiCallsMade = 0;
    
    // 4. Loop through stocks
    stockList.forEach((stock) => {
      try {
        const ticker = stock.ticker;
        const buyPrice = Utils.parseFloat(stock.buyPrice);
        const quantity = Utils.parseFloat(stock.quantity) || 1;
        
        let financialData = {};
        let shouldFetchApi = false;
        
        // --- Rotation Logic ---
        const cache = cachedData[ticker];
        
        if (forceUpdateTicker === ticker) {
          shouldFetchApi = true;
          Utils.log(`[${ticker}] Force update requested.`);
        } else if (!cache) {
          shouldFetchApi = true; // New stock, must fetch
          Utils.log(`[${ticker}] New stock detected.`);
        } else {
          // Check last updated time
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
        
        // --- Data Retrieval ---
        if (shouldFetchApi) {
          // Fetch from Alpha Vantage
          const overview = AlphaVantageService.getCompanyOverview(ticker);
          if (overview && overview.ticker) {
            // Unify data structure
            financialData = {
              ticker: ticker,
              buyPrice: buyPrice,
              quantity: quantity,
              pe: overview.peRatio,
              fwdPe: overview.forwardPE,
              peg: overview.pegRatio,
              ps: overview.priceToSalesRatio,
              pb: overview.priceToBookRatio,
              evEbitda: overview.evToEbitda,
              grossMargin: overview.grossProfit, // Note: AV returns GrossProfit, not Margin? Check API. OVERVIEW has ProfitMargin.
              opMargin: overview.operatingMargin,
              roe: overview.returnOnEquity,
              revGrowth: overview.revenueGrowth,
              epsGrowth: overview.quarterlyEarningsGrowthYOY,
              currentRatio: null, // AV Overview might usually have this, checking mapped fields
              debtEquity: null,
              rsi: null, 
              targetUpside: null,
              // Map other fields from AlphaVantage_Service.getCompanyOverview
              ...overview
            };
            
            apiCallsMade++;
            Utils.log(`[${ticker}] API Call Successful. (Calls: ${apiCallsMade}/${MAX_DAILY_API_CALLS})`);
            
            // Add a sleep to respect 5 calls/min limit (12 seconds delay)
             Utilities.sleep(12000); 
          } else {
             Utils.log(`[${ticker}] API Fetch Failed. Falling back to cache.`);
             financialData = cache || {}; // Fallback
          }
        } else {
          // Use Cached Data
          financialData = cache || {};
        }

        // Ensure basic fields for appendDashboardRow
        financialData.ticker = ticker;
        financialData.buyPrice = buyPrice;
        financialData.quantity = quantity;
        
        // Update Dashboard
        SheetManager.appendDashboardRow(financialData);
        
        // Append to History Log Logic - ONLY if we have fresh data or just want to log price?
        // With Hybrid, Price is GOOGLEFINANCE (Formula). 
        // We can't log "Formula" result easily in script without getting display value.
        // For now, logging might be limited or require reading back the sheet.
        // Let's Skip Log Update for now in this iteration or log what we have.
        // SheetManager.appendLogRow(ticker, ...); 
        
      } catch (stockError) {
        Utils.log(`Error processing ${stock.ticker}: ${stockError.message}`);
      }
    });
    
    Utils.log(`Daily Update Completed. Total API Calls: ${apiCallsMade}`);
    
  } catch (error) {
    Utils.log(`Error: ${error.message}`);
  }
}

/**
 * Run this function once to set up sheet structure.
 */
function setupSheets() {
  SheetManager.initDashboard();
  SheetManager.initLogSheets(); // If we have this
  Utils.log('Sheets Initialized.');
}
