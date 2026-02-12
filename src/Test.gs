
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
