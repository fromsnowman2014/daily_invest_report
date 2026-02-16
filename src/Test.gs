
/**
 * Test.gs
 * Standalone script for testing SheetManager logic (TDD).
 */

function runTests() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const testSheetName = 'Test_Dashboard_' + new Date().getTime();
  let testSheet = ss.insertSheet(testSheetName);
  
  try {
    Utils.log('Running Tests on: ' + testSheetName);
    
    // Setup Dummy Data
    const headers = ['Ticker', 'Price $', 'Change %', 'Day Change $', 'Cost Basis $', 'Market Value $', 'Gain/Loss %', 'Gain/Loss $', 'Weight %', 'Market Cap $'];
    const data = [
      ['AAPL', 150, 0.05, 10, 1000, 1100, 0.10, 100, 0.5, 2000000000],   // Positives
      ['GOOG', 2800, -0.02, -50, 2000, 1950, -0.025, -50, 0.3, 1500000000] // Negatives
    ];
    
    testSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    testSheet.getRange(2, 1, data.length, data[0].length).setValues(data);
    
    // --- TEST 1: Conditional Formatting ---
    // Change %, Day Change $, Gain/Loss %, Gain/Loss $ are cols C(3), D(4), G(7), H(8).
    
    // Mock the SheetManager.applyColumnFormats call by passing the sheet directly
    SheetManager.applyColumnFormats(testSheet);
    
    const rules = testSheet.getConditionalFormatRules();
    Utils.log(`Found ${rules.length} conditional format rules.`);
    
    if (rules.length >= 8) { // 4 columns * 2 rules (pos/neg)
      Utils.log('PASS: Conditional rules applied.');
    } else {
      Utils.log('FAIL: Not enough conditional rules found.');
    }

    // --- TEST 2: Freeze Panes ---
    SheetManager.initDashboard(testSheet); // calling overloaded init
    if (testSheet.getFrozenRows() === 1 && testSheet.getFrozenColumns() === 1) {
       Utils.log('PASS: Freeze panes correct.');
    } else {
       Utils.log(`FAIL: Freeze panes incorrect. Rows: ${testSheet.getFrozenRows()}, Cols: ${testSheet.getFrozenColumns()}`);
    }

    // --- TEST 3: Charting ---
    // Simulate user selecting a column (e.g., Price - Col 2)
    testSheet.getRange(2, 2).activate();
    
    // Call Chart Manager
    ChartManager.createHistoryChart();
    
    const charts = testSheet.getCharts();
    if (charts.length > 0) {
      Utils.log('PASS: Chart created successfully.');
    } else {
      Utils.log('FAIL: No chart created.');
    }

  } catch (e) {
    Utils.log('TEST ERROR: ' + e.message + '\n' + e.stack);
  } finally {
    // Cleanup
    // ss.deleteSheet(testSheet); // Comment out to inspect manually
    Utils.log('Test Complete. Sheet left for inspection: ' + testSheetName);
  }
}

/**
 * Debug function to test interactions between Formatting and GOOGLEFINANCE.
 */
function debugGoogleFinance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'Debug_GF_' + new Date().getTime();
  let sheet = ss.insertSheet(sheetName);

  try {
    Utils.log('Starting Debug on ' + sheetName);
    const ticker = "AGNC";

    // Test 1: Write Formula THEN Format (Known to cause issues?)
    sheet.getRange(1, 1).setValue("Test 1: Formula -> Format");
    sheet.getRange(2, 1).setFormula(`=GOOGLEFINANCE("${ticker}", "price")`);
    SpreadsheetApp.flush(); // Force calc?
    sheet.getRange(2, 1).setNumberFormat('0,##0.00');
    Utils.log('Test 1 complete.');

    // Test 2: Format THEN Write Formula (Current Approach)
    sheet.getRange(4, 1).setValue("Test 2: Format -> Formula");
    // Format a large range to simulate load
    sheet.getRange(5, 1, 100, 1).setNumberFormat('0,##0.00');
    sheet.getRange(5, 1).setFormula(`=GOOGLEFINANCE("${ticker}", "price")`);
    Utils.log('Test 2 complete.');

    // Test 3: Mixed Format (Date + Currency) to see logic
    sheet.getRange(7, 1).setValue("Test 3: Mixed");
    sheet.getRange(8, 1).setNumberFormat('@'); // Text
    sheet.getRange(8, 1).setFormula(`=GOOGLEFINANCE("${ticker}", "price")`);
    // Does it stay as text or number?

    // Test 4: Full Dashboard Simulation (Mini)
    const cols = CONFIG.DASHBOARD_COLS;
    // Apply formats to 1000 rows
    const maxRows = 1000;
    const marketCapRange = sheet.getRange(11, 2, maxRows, 1);
    marketCapRange.setNumberFormat('[<999950]/bin/zsh.0,"K";[<999950000]/bin/zsh.0,,"M";/bin/zsh.0,,,"B"');

    // Write formula
    sheet.getRange(11, 2).setFormula(`=GOOGLEFINANCE("${ticker}", "marketcap")`);
    Utils.log('Test 4 (Load Sim) complete.');

    // Cleanup
    // ss.deleteSheet(sheet);
  } catch (e) {
    Utils.log('DEBUG ERROR: ' + e.message);
  }
}

/**
 * Test function to verify market detection logic with various scenarios.
 * Simulates different dashboard data patterns to test Utils.isMarketOpenToday().
 */
function testMarketDetection() {
  Utils.log('=== Testing Market Detection Logic ===');

  // Test 1: Market OPEN - Multiple tickers with non-zero changes
  Utils.log('\n--- Test 1: Market Open (Normal trading day) ---');
  const openMarketData = {
    'AAPL': { changePct: 0.0123, price: 150.50 },
    'GOOGL': { changePct: -0.0089, price: 2800.25 },
    'MSFT': { changePct: 0.0201, price: 380.75 }
  };
  const result1 = Utils.isMarketOpenToday(openMarketData);
  Utils.log(`Expected: true, Got: ${result1}, ${result1 === true ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 2: Market CLOSED - All changes are 0 (Weekend/Holiday)
  Utils.log('\n--- Test 2: Market Closed (All zero changes) ---');
  const closedMarketData = {
    'AAPL': { changePct: 0, price: 150.50 },
    'GOOGL': { changePct: 0, price: 2800.25 },
    'MSFT': { changePct: 0, price: 380.75 }
  };
  // Note: Result depends on whether today is actually a weekend
  const today = new Date();
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;
  const result2 = Utils.isMarketOpenToday(closedMarketData);
  const expected2 = !isWeekend; // On weekday with 0 changes, we assume market is open (just no movement)
  Utils.log(`Expected: ${expected2}, Got: ${result2}, ${result2 === expected2 ? 'PASS ✓' : 'FAIL ✗'}`);
  Utils.log(`(Note: Today is ${isWeekend ? 'Weekend' : 'Weekday'})`);

  // Test 3: Market CLOSED - Invalid/null data (GOOGLEFINANCE error)
  Utils.log('\n--- Test 3: Market Closed (No valid data) ---');
  const invalidData = {
    'AAPL': { changePct: null, price: 150.50 },
    'GOOGL': { changePct: undefined, price: 2800.25 },
    'MSFT': { changePct: NaN, price: 380.75 }
  };
  const result3 = Utils.isMarketOpenToday(invalidData);
  Utils.log(`Expected: false, Got: ${result3}, ${result3 === false ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 4: Empty dashboard data
  Utils.log('\n--- Test 4: Empty dashboard ---');
  const emptyData = {};
  const result4 = Utils.isMarketOpenToday(emptyData);
  Utils.log(`Expected: false, Got: ${result4}, ${result4 === false ? 'PASS ✓' : 'FAIL ✗'}`);

  // Test 5: Mixed data (some valid, some invalid)
  Utils.log('\n--- Test 5: Market Open (At least one valid change) ---');
  const mixedData = {
    'AAPL': { changePct: 0.0123, price: 150.50 },
    'GOOGL': { changePct: null, price: 2800.25 },
    'MSFT': { changePct: 0, price: 380.75 }
  };
  const result5 = Utils.isMarketOpenToday(mixedData);
  Utils.log(`Expected: true, Got: ${result5}, ${result5 === true ? 'PASS ✓' : 'FAIL ✗'}`);

  Utils.log('\n=== Market Detection Tests Complete ===');
}

/**
 * Quick manual test to check current market status.
 * Run this function to see if today is detected as a trading day.
 */
function checkTodayMarketStatus() {
  Utils.log('=== Checking Today\'s Market Status ===');

  try {
    // Read actual Dashboard data
    const freshData = SheetManager.readDashboardValues();

    if (Object.keys(freshData).length === 0) {
      Utils.log('No dashboard data available. Run updateDailyReport() first.');
      return;
    }

    const isOpen = Utils.isMarketOpenToday(freshData);

    const today = new Date();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];

    Utils.log(`Today: ${Utils.formatDate(today)} (${dayName})`);
    Utils.log(`Market Status: ${isOpen ? '🟢 OPEN' : '🔴 CLOSED'}`);
    Utils.log(`Tickers analyzed: ${Object.keys(freshData).length}`);

    // Show sample data
    const sampleTicker = Object.keys(freshData)[0];
    const sampleData = freshData[sampleTicker];
    Utils.log(`Sample (${sampleTicker}): Price=${sampleData.price}, Change%=${(sampleData.changePct * 100).toFixed(4)}%`);

  } catch (error) {
    Utils.log(`Error: ${error.message}`);
  }
}
