/**
 * Main.gs
 * Entry point for the Daily Invest Report script.
 */

function updateDailyReport() {
  Utils.log('Starting Daily Invest Report Update...');
  
  try {
    // 1. Get Stock List
    const stockList = SheetManager.getStockList();
    if (stockList.length === 0) {
      Utils.log('No stocks found in list.');
      return;
    }
    
    Utils.log(`Found ${stockList.length} stocks: ${stockList.map(s => s.ticker).join(', ')}`);
    
    // 2. Initialize Dashboard (Clear previous data or headers)
    SheetManager.initDashboard();
    Utils.log('Dashboard initialized.');
    
    // 3. Loop through stocks (Placeholder for future API calls)
    stockList.forEach((stock) => {
      // Placeholder data for testing
      const testData = {
        ticker: stock.ticker,
        price: 150.00,
        changePct: 0.015,
        systemMemo: 'Test Data - Waiting for API'
      };
      
      SheetManager.appendDashboardRow(testData);
      Utils.log(`Processed ${stock.ticker}`);
    });
    
    Utils.log('Daily Update Completed.');
    
  } catch (error) {
    Utils.log(`Error: ${error.message}`);
  }
}

/**
 * Run this function once to set up sheet structure.
 */
function setupSheets() {
  SheetManager.initDashboard();
  Utils.log('Dashboard Sheet Initialized.');
}
