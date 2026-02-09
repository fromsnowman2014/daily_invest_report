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
    
    // 3. Loop through stocks and fetch real data from FMP API
    stockList.forEach((stock) => {
      try {
        // Fetch real financial data from FMP API
        const buyPrice = Utils.parseFloat(stock.buyPrice);
        const quantity = Utils.parseFloat(stock.quantity) || 1;
        const financialData = FMPService.getFullFinancialData(stock.ticker, buyPrice, quantity);
        
        // Update Dashboard
        SheetManager.appendDashboardRow(financialData);
        
        // Append to History Log (Log_{Ticker} sheet)
        SheetManager.appendLogRow(stock.ticker, financialData);
        
        Utils.log(`Processed ${stock.ticker} (Price: ${financialData.price})`);
        
        // Add small delay to avoid API rate limiting
        Utilities.sleep(500);
      } catch (stockError) {
        Utils.log(`Error processing ${stock.ticker}: ${stockError.message}`);
      }
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
