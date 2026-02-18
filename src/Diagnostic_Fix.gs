/**
 * Diagnostic_Fix.gs
 * Diagnostic and verification tools for Dashboard structure.
 *
 * NOTE: After refactoring, headers are now properly defined in Sheet_Manager.gs.
 * These functions are mainly for verification and emergency fixes.
 */

/**
 * Diagnoses Dashboard column structure and reports mismatches.
 * Run this to understand the current state before applying fixes.
 */
function diagnoseDashboardStructure() {
  Utils.log('=== Dashboard Structure Diagnosis ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

  if (!dashboard) {
    Utils.log('ERROR: Dashboard sheet not found!');
    return;
  }

  const lastRow = dashboard.getLastRow();
  const lastCol = dashboard.getLastColumn();
  const maxCols = dashboard.getMaxColumns();

  Utils.log(`Dashboard sheet found:`);
  Utils.log(`  - Last Row: ${lastRow}`);
  Utils.log(`  - Last Column: ${lastCol}`);
  Utils.log(`  - Max Columns: ${maxCols}`);
  Utils.log(`  - Expected Columns (CONFIG): ${CONFIG.DASHBOARD_COL_COUNT}`);

  // Read actual headers
  if (lastRow >= 1) {
    const headerRow = dashboard.getRange(1, 1, 1, lastCol).getValues()[0];
    Utils.log(`\nActual Headers (${headerRow.length} columns):`);
    headerRow.forEach((header, idx) => {
      Utils.log(`  [${idx + 1}] ${header}`);
    });
  }

  // Expected headers
  const expectedHeaders = SheetManager.getDashboardHeaders();
  Utils.log(`\nExpected Headers (${expectedHeaders.length} columns):`);
  expectedHeaders.forEach((header, idx) => {
    Utils.log(`  [${idx + 1}] ${header}`);
  });

  // Compare
  if (lastCol !== CONFIG.DASHBOARD_COL_COUNT) {
    Utils.log(`\n❌ MISMATCH DETECTED!`);
    Utils.log(`   Dashboard has ${lastCol} columns but code expects ${CONFIG.DASHBOARD_COL_COUNT}`);
    Utils.log(`   Missing columns: ${CONFIG.DASHBOARD_COL_COUNT - lastCol}`);
    Utils.log(`\n💡 SOLUTION: Run fixDashboardStructure() to add missing columns.`);
  } else {
    Utils.log(`\n✅ Column count matches! Checking header content...`);

    const actualHeaders = lastRow >= 1 ? dashboard.getRange(1, 1, 1, lastCol).getValues()[0] : [];
    let headerMismatch = false;

    for (let i = 0; i < expectedHeaders.length; i++) {
      if (actualHeaders[i] !== expectedHeaders[i]) {
        Utils.log(`   ❌ Column ${i + 1}: Expected "${expectedHeaders[i]}", Got "${actualHeaders[i]}"`);
        headerMismatch = true;
      }
    }

    if (headerMismatch) {
      Utils.log(`\n💡 SOLUTION: Run fixDashboardHeaders() to update header labels.`);
    } else {
      Utils.log(`   ✅ All headers match!`);
    }
  }

  // Check for NaN issue in cached data
  Utils.log(`\n=== Checking Cached Data ===`);
  if (lastRow >= 2) {
    const lastUpdatedCol = CONFIG.DASHBOARD_COLS.LAST_UPDATED;
    const lastUpdatedValues = dashboard.getRange(2, lastUpdatedCol, lastRow - 1, 1).getValues();

    let invalidDates = 0;
    lastUpdatedValues.forEach((row, idx) => {
      const dateValue = row[0];
      if (dateValue) {
        const testDate = new Date(dateValue);
        if (isNaN(testDate.getTime())) {
          invalidDates++;
          Utils.log(`  ❌ Row ${idx + 2}: Invalid date "${dateValue}"`);
        }
      }
    });

    if (invalidDates > 0) {
      Utils.log(`\n❌ Found ${invalidDates} rows with invalid "Last Updated" dates.`);
      Utils.log(`   This causes the "NaN days" error in cache calculation.`);
      Utils.log(`   These will be fixed on next updateDailyReport().`);
    } else {
      Utils.log(`   ✅ All "Last Updated" dates are valid.`);
    }
  }

  Utils.log(`\n=== Diagnosis Complete ===`);
}

/**
 * Fixes Dashboard column structure by adding missing columns.
 * This is a comprehensive fix that handles all missing columns:
 * - Today P/E (L)
 * - EPS (M)
 * - Today Fwd P/E (O)
 * - Fwd EPS (P)
 */
function fixDashboardStructure() {
  Utils.log('=== Starting Dashboard Structure Fix ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

  if (!dashboard) {
    Utils.log('ERROR: Dashboard sheet not found!');
    return;
  }

  const currentCols = dashboard.getLastColumn();
  const expectedCols = CONFIG.DASHBOARD_COL_COUNT;

  if (currentCols === expectedCols) {
    Utils.log(`Dashboard already has ${expectedCols} columns. No structural changes needed.`);
    Utils.log(`Checking headers...`);
    fixDashboardHeaders();
    return;
  }

  Utils.log(`Dashboard has ${currentCols} columns, expected ${expectedCols}.`);
  Utils.log(`Need to add ${expectedCols - currentCols} columns.`);

  // Determine which migration path based on current column count
  if (currentCols === 30) {
    Utils.log(`\nDetected 30-column structure (missing: Today P/E, EPS, Today Fwd P/E, Fwd EPS)`);
    Utils.log(`Applying comprehensive migration...`);

    // Step 1: Add Today P/E after P/E (column K) -> becomes L
    dashboard.insertColumnAfter(11);
    dashboard.getRange(1, 12).setValue('Today P/E').setFontWeight('bold');
    Utils.log(`  ✓ Added Today P/E at column L`);

    // Step 2: Add EPS after Today P/E (column L) -> becomes M
    dashboard.insertColumnAfter(12);
    dashboard.getRange(1, 13).setValue('EPS').setFontWeight('bold');
    Utils.log(`  ✓ Added EPS at column M`);

    // Step 3: Add Today Fwd P/E after Fwd P/E (now column N) -> becomes O
    dashboard.insertColumnAfter(14);
    dashboard.getRange(1, 15).setValue('Today Fwd P/E').setFontWeight('bold');
    Utils.log(`  ✓ Added Today Fwd P/E at column O`);

    // Step 4: Add Fwd EPS after Today Fwd P/E (column O) -> becomes P
    dashboard.insertColumnAfter(15);
    dashboard.getRange(1, 16).setValue('Fwd EPS').setFontWeight('bold');
    Utils.log(`  ✓ Added Fwd EPS at column P`);

  } else if (currentCols === 31) {
    Utils.log(`\nDetected 31-column structure (missing: EPS, Today Fwd P/E, Fwd EPS)`);

    // Add EPS after Today P/E
    dashboard.insertColumnAfter(12);
    dashboard.getRange(1, 13).setValue('EPS').setFontWeight('bold');
    Utils.log(`  ✓ Added EPS at column M`);

    // Add Today Fwd P/E after Fwd P/E
    dashboard.insertColumnAfter(14);
    dashboard.getRange(1, 15).setValue('Today Fwd P/E').setFontWeight('bold');
    Utils.log(`  ✓ Added Today Fwd P/E at column O`);

    // Add Fwd EPS after Today Fwd P/E
    dashboard.insertColumnAfter(15);
    dashboard.getRange(1, 16).setValue('Fwd EPS').setFontWeight('bold');
    Utils.log(`  ✓ Added Fwd EPS at column P`);

  } else if (currentCols === 32) {
    Utils.log(`\nDetected 32-column structure (missing: EPS)`);

    // Add EPS after Today P/E
    dashboard.insertColumnAfter(12);
    dashboard.getRange(1, 13).setValue('EPS').setFontWeight('bold');
    Utils.log(`  ✓ Added EPS at column M`);

  } else {
    Utils.log(`\n⚠️ Unknown column structure (${currentCols} columns).`);
    Utils.log(`   Expected one of: 30, 31, 32, or 33 columns.`);
    Utils.log(`   Manual intervention may be required.`);
    return;
  }

  // Verify final structure
  const finalCols = dashboard.getLastColumn();
  if (finalCols === expectedCols) {
    Utils.log(`\n✅ Dashboard structure fixed! Now has ${finalCols} columns.`);

    // Update headers to ensure they're correct
    fixDashboardHeaders();

    // Migrate Log sheets
    Utils.log(`\nMigrating Log sheets...`);
    migrateLogSheets(currentCols);

  } else {
    Utils.log(`\n❌ Fix incomplete. Dashboard has ${finalCols} columns, expected ${expectedCols}.`);
  }

  Utils.log(`\n=== Structure Fix Complete ===`);
  Utils.log(`Next step: Run updateDailyReport() to populate the new columns with data.`);
}

/**
 * Updates Dashboard headers to match expected headers.
 */
function fixDashboardHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

  if (!dashboard) {
    Utils.log('ERROR: Dashboard sheet not found!');
    return;
  }

  const expectedHeaders = SheetManager.getDashboardHeaders();
  dashboard.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]).setFontWeight('bold');
  Utils.log(`✅ Dashboard headers updated (${expectedHeaders.length} columns)`);
}

/**
 * Migrates all Log sheets to match current Dashboard structure.
 * @param {number} oldColCount Previous column count before migration
 */
function migrateLogSheets(oldColCount) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let logCount = 0;

  const expectedLogCols = CONFIG.LOG_COL_COUNT;

  for (const sheet of sheets) {
    const sheetName = sheet.getName();
    if (sheetName.startsWith(CONFIG.SHEET_NAMES.LOG_PREFIX)) {
      const currentLogCols = sheet.getLastColumn();

      if (currentLogCols < expectedLogCols) {
        Utils.log(`  Migrating ${sheetName} (${currentLogCols} -> ${expectedLogCols} cols)...`);

        // Log sheets don't have EPS or Fwd EPS columns, only calculated P/E values
        // Need to add: Today P/E (after P/E) and Today Fwd P/E (after Fwd P/E)

        if (oldColCount === 30 && currentLogCols === 28) {
          // Add Today P/E after P/E (column 11) -> becomes 12
          sheet.insertColumnAfter(11);
          sheet.getRange(1, 12).setValue('Today P/E').setFontWeight('bold');

          // Add Today Fwd P/E after Fwd P/E (now column 13) -> becomes 14
          sheet.insertColumnAfter(13);
          sheet.getRange(1, 14).setValue('Today Fwd P/E').setFontWeight('bold');
        } else if (oldColCount === 31 && currentLogCols === 29) {
          // Only add Today Fwd P/E
          sheet.insertColumnAfter(13);
          sheet.getRange(1, 14).setValue('Today Fwd P/E').setFontWeight('bold');
        }

        // Update headers to match expected
        const logHeaders = SheetManager.getLogHeaders();
        sheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]).setFontWeight('bold');

        logCount++;
      }
    }
  }

  Utils.log(`✅ Migrated ${logCount} Log sheets`);
}

/**
 * One-click fix: Runs diagnosis, then applies fixes if needed.
 */
function diagnoseAndFix() {
  diagnoseDashboardStructure();

  Utils.log(`\n\n=== Applying Automated Fixes ===`);
  fixDashboardStructure();

  Utils.log(`\n\n=== All Fixes Applied ===`);
  Utils.log(`You can now run updateDailyReport() to populate data.`);
}

/**
 * Verifies that header arrays match the expected column counts.
 * Run this after any code changes to ensure consistency.
 */
function verifyHeaderConsistency() {
  Utils.log('=== Verifying Header Array Consistency ===');

  const dashboardHeaders = SheetManager.getDashboardHeaders();
  const logHeaders = SheetManager.getLogHeaders();

  Utils.log(`\nDashboard Headers:`);
  Utils.log(`  Expected: ${CONFIG.DASHBOARD_COL_COUNT} columns`);
  Utils.log(`  Actual:   ${dashboardHeaders.length} columns`);

  if (dashboardHeaders.length === CONFIG.DASHBOARD_COL_COUNT) {
    Utils.log(`  ✅ MATCH!`);
  } else {
    Utils.log(`  ❌ MISMATCH! Difference: ${dashboardHeaders.length - CONFIG.DASHBOARD_COL_COUNT}`);
  }

  Utils.log(`\nLog Headers:`);
  Utils.log(`  Expected: ${CONFIG.LOG_COL_COUNT} columns`);
  Utils.log(`  Actual:   ${logHeaders.length} columns`);

  if (logHeaders.length === CONFIG.LOG_COL_COUNT) {
    Utils.log(`  ✅ MATCH!`);
  } else {
    Utils.log(`  ❌ MISMATCH! Difference: ${logHeaders.length - CONFIG.LOG_COL_COUNT}`);
  }

  // Show key columns
  Utils.log(`\nKey Dashboard Columns (positions 11-16):`);
  for (let i = 10; i < 16 && i < dashboardHeaders.length; i++) {
    Utils.log(`  [${i + 1}] ${dashboardHeaders[i]}`);
  }

  Utils.log(`\nKey Log Columns (positions 11-14):`);
  for (let i = 10; i < 14 && i < logHeaders.length; i++) {
    Utils.log(`  [${i + 1}] ${logHeaders[i]}`);
  }

  Utils.log(`\n=== Verification Complete ===`);

  if (dashboardHeaders.length === CONFIG.DASHBOARD_COL_COUNT &&
      logHeaders.length === CONFIG.LOG_COL_COUNT) {
    Utils.log(`✅ All header arrays are consistent!`);
    return true;
  } else {
    Utils.log(`❌ Header arrays have mismatches. Check Sheet_Manager.gs.`);
    return false;
  }
}

/**
 * DEBUG: Test API call for a specific ticker to diagnose EPS/Forward EPS issues.
 * This function manually calls the API and logs every step of the data flow.
 *
 * @param {string} ticker Ticker symbol to test (default: 'AGNC')
 */
function debugApiCallForTicker(ticker = 'AGNC') {
  Utils.log(`=== DEBUG: API Call Test for ${ticker} ===`);

  try {
    // Step 1: Get current cache data
    Utils.log(`\n[STEP 1] Reading current cache data...`);
    const cachedData = SheetManager.getDashboardData();
    const cache = cachedData[ticker];

    if (cache) {
      Utils.log(`  ✓ Cache found for ${ticker}:`);
      Utils.log(`    - lastUpdated: ${cache.lastUpdated}`);
      Utils.log(`    - eps: ${cache.eps}`);
      Utils.log(`    - forwardEPS: ${cache.forwardEPS}`);
      Utils.log(`    - pe: ${cache.pe}`);
      Utils.log(`    - fwdPe: ${cache.fwdPe}`);
    } else {
      Utils.log(`  ℹ No cache found for ${ticker}`);
    }

    // Step 2: Call Alpha Vantage Overview API
    Utils.log(`\n[STEP 2] Calling AlphaVantageService.getCompanyOverview("${ticker}")...`);
    const overview = AlphaVantageService.getCompanyOverview(ticker);

    if (!overview) {
      Utils.log(`  ❌ API returned null/undefined`);
      return;
    }

    if (!overview.ticker) {
      Utils.log(`  ❌ API response missing ticker field`);
      Utils.log(`  Full response: ${JSON.stringify(overview, null, 2)}`);
      return;
    }

    Utils.log(`  ✓ API call successful. Ticker: ${overview.ticker}`);

    // Step 3: Inspect EPS-related fields
    Utils.log(`\n[STEP 3] Inspecting EPS-related fields in API response:`);
    Utils.log(`  - overview.dilutedEPSTTM: ${overview.dilutedEPSTTM} (${typeof overview.dilutedEPSTTM})`);
    Utils.log(`  - overview.eps: ${overview.eps} (${typeof overview.eps})`);
    Utils.log(`  - overview.peRatio: ${overview.peRatio} (${typeof overview.peRatio})`);
    Utils.log(`  - overview.forwardPE: ${overview.forwardPE} (${typeof overview.forwardPE})`);

    // Step 4: Simulate financialData construction
    Utils.log(`\n[STEP 4] Simulating financialData construction...`);
    const financialData = {
      ticker: ticker,
      buyPrice: 10.00, // dummy value
      quantity: 100,   // dummy value
      pe: overview.peRatio,
      eps: overview.dilutedEPSTTM || overview.eps,
      fwdPe: overview.forwardPE,
      peg: overview.pegRatio,
      ps: overview.priceToSalesRatio,
      pb: overview.priceToBookRatio,
      evEbitda: overview.evToEbitda
    };

    Utils.log(`  Constructed financialData.eps: ${financialData.eps} (${typeof financialData.eps})`);
    Utils.log(`  Condition (data.eps && data.eps > 0): ${!!(financialData.eps && financialData.eps > 0)}`);

    // Step 5: Call Earnings API for Forward EPS
    Utils.log(`\n[STEP 5] Calling AlphaVantageService.getForwardEPS("${ticker}")...`);
    Utilities.sleep(12000); // Rate limit

    try {
      const forwardEPS = AlphaVantageService.getForwardEPS(ticker);
      Utils.log(`  ✓ Earnings API call successful`);
      Utils.log(`  - forwardEPS: ${forwardEPS} (${typeof forwardEPS})`);
      Utils.log(`  - Condition (forwardEPS && forwardEPS > 0): ${!!(forwardEPS && forwardEPS > 0)}`);

      if (forwardEPS && forwardEPS > 0) {
        financialData.forwardEPS = forwardEPS;
        Utils.log(`  ✓ Set financialData.forwardEPS: ${financialData.forwardEPS}`);
      } else {
        Utils.log(`  ⚠ Forward EPS is null, 0, or negative. Not setting.`);
      }
    } catch (earningsError) {
      Utils.log(`  ❌ Earnings API error: ${earningsError.message}`);
      Utils.log(`  Stack: ${earningsError.stack}`);
    }

    // Step 6: Show final financialData object
    Utils.log(`\n[STEP 6] Final financialData object:`);
    Utils.log(JSON.stringify(financialData, null, 2));

    // Step 7: Test appendDashboardRow logic
    Utils.log(`\n[STEP 7] Testing appendDashboardRow logic...`);
    Utils.log(`  This would populate:`);
    Utils.log(`    - Column M (EPS): ${financialData.eps && financialData.eps > 0 ? financialData.eps : '(empty)'}`);
    Utils.log(`    - Column L (Today P/E): ${financialData.eps && financialData.eps > 0 ? '=B/M formula' : 'GOOGLEFINANCE formula'}`);
    Utils.log(`    - Column P (Fwd EPS): ${financialData.forwardEPS && financialData.forwardEPS > 0 ? financialData.forwardEPS : '(empty)'}`);
    Utils.log(`    - Column O (Today Fwd P/E): ${financialData.forwardEPS && financialData.forwardEPS > 0 ? '=B/P formula' : '(empty)'}`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack trace: ${error.stack}`);
  }

  Utils.log(`\n=== DEBUG Complete ===`);
  Utils.log(`\nRECOMMENDATIONS:`);
  Utils.log(`1. Check if API returned valid EPS values`);
  Utils.log(`2. Verify Alpha Vantage API key has quota remaining`);
  Utils.log(`3. Check if ticker "${ticker}" is valid and has fundamental data`);
  Utils.log(`4. If EPS is coming as string, may need type conversion in Main.gs`);
}

/**
 * DEBUG: Inspect current Dashboard data for a specific ticker.
 * Shows what's actually stored in the Dashboard sheet.
 *
 * @param {string} ticker Ticker symbol to inspect (default: 'AGNC')
 */
function debugDashboardDataForTicker(ticker = 'AGNC') {
  Utils.log(`=== DEBUG: Dashboard Data Inspection for ${ticker} ===`);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

  if (!dashboard) {
    Utils.log(`❌ Dashboard sheet not found!`);
    return;
  }

  const lastRow = dashboard.getLastRow();
  if (lastRow < 2) {
    Utils.log(`ℹ Dashboard is empty (no data rows)`);
    return;
  }

  // Find the row for this ticker
  const tickers = dashboard.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = -1;

  for (let i = 0; i < tickers.length; i++) {
    if (tickers[i][0] === ticker) {
      targetRow = i + 2; // +2 because row 1 is header, array is 0-indexed
      break;
    }
  }

  if (targetRow === -1) {
    Utils.log(`❌ Ticker "${ticker}" not found in Dashboard`);
    return;
  }

  Utils.log(`✓ Found ${ticker} at row ${targetRow}`);

  // Read the entire row
  const cols = CONFIG.DASHBOARD_COLS;
  const data = dashboard.getRange(targetRow, 1, 1, dashboard.getLastColumn()).getValues()[0];

  Utils.log(`\n[KEY COLUMNS]:`);
  Utils.log(`  A - Ticker: "${data[cols.TICKER - 1]}"`);
  Utils.log(`  B - Price: ${data[cols.PRICE - 1]}`);
  Utils.log(`  K - P/E: ${data[cols.PE - 1]}`);
  Utils.log(`  L - Today P/E: ${data[cols.TODAY_PE - 1]}`);
  Utils.log(`  M - EPS: ${data[cols.EPS - 1]} ${data[cols.EPS - 1] ? '✓' : '❌'}`);
  Utils.log(`  N - Fwd P/E: ${data[cols.FWD_PE - 1]}`);
  Utils.log(`  O - Today Fwd P/E: ${data[cols.TODAY_FWD_PE - 1]}`);
  Utils.log(`  P - Fwd EPS: ${data[cols.FWD_EPS - 1]} ${data[cols.FWD_EPS - 1] ? '✓' : '❌'}`);
  Utils.log(`  AG - Last Updated: ${data[cols.LAST_UPDATED - 1]}`);

  // Check if values are formulas
  Utils.log(`\n[FORMULA CHECK]:`);
  const formulaL = dashboard.getRange(targetRow, cols.TODAY_PE).getFormula();
  const formulaM = dashboard.getRange(targetRow, cols.EPS).getFormula();
  const formulaO = dashboard.getRange(targetRow, cols.TODAY_FWD_PE).getFormula();
  const formulaP = dashboard.getRange(targetRow, cols.FWD_EPS).getFormula();

  Utils.log(`  L (Today P/E): ${formulaL ? formulaL : '(not a formula, value: ' + data[cols.TODAY_PE - 1] + ')'}`);
  Utils.log(`  M (EPS): ${formulaM ? formulaM : '(not a formula, value: ' + data[cols.EPS - 1] + ')'}`);
  Utils.log(`  O (Today Fwd P/E): ${formulaO ? formulaO : '(not a formula, value: ' + data[cols.TODAY_FWD_PE - 1] + ')'}`);
  Utils.log(`  P (Fwd EPS): ${formulaP ? formulaP : '(not a formula, value: ' + data[cols.FWD_EPS - 1] + ')'}`);

  Utils.log(`\n=== Inspection Complete ===`);
}

/**
 * FORCE FIX: Directly updates Dashboard headers regardless of column count.
 * Use this when Dashboard has wrong headers despite having correct column count.
 */
function forceFixDashboardHeaders() {
  Utils.log('=== Force Fixing Dashboard Headers ===');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

  if (!dashboard) {
    Utils.log('ERROR: Dashboard sheet not found!');
    return;
  }

  // Read current state
  const currentCols = dashboard.getLastColumn();
  Utils.log(`Current Dashboard columns: ${currentCols}`);

  if (currentCols >= 1) {
    const currentHeaders = dashboard.getRange(1, 1, 1, currentCols).getValues()[0];
    Utils.log(`\nCurrent headers:`);
    currentHeaders.forEach((h, i) => {
      if (i >= 10 && i <= 20) { // Show problem area
        Utils.log(`  [${i + 1}] "${h}"`);
      }
    });
  }

  // Get expected headers from code
  const expectedHeaders = [
    'Ticker', 'Price $', 'Change %', 'Day Change $',
    'Cost Basis $', 'Market Value $', 'Gain/Loss %', 'Gain/Loss $', 'Weight %',
    'Market Cap $', 'P/E', 'Today P/E', 'EPS', 'Fwd P/E', 'Today Fwd P/E', 'Fwd EPS', 'PEG', 'P/S', 'P/B', 'EV/EBITDA', 'FCF Yield %',
    'Gross Margin %', 'Op Margin %', 'ROE %', 'ROIC %',
    'Rev Growth %', 'EPS Growth %',
    'Current Ratio', 'Debt/Equity',
    'RSI', 'Target Upside %',
    'System Memo', 'Last Updated'
  ];

  Utils.log(`\nExpected headers (${expectedHeaders.length} columns):`);
  expectedHeaders.forEach((h, i) => {
    if (i >= 10 && i <= 20) { // Show problem area
      Utils.log(`  [${i + 1}] "${h}"`);
    }
  });

  // Write the correct headers
  Utils.log(`\nWriting correct headers to Dashboard...`);
  dashboard.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]).setFontWeight('bold');

  // Delete any extra columns beyond expected count
  if (currentCols > expectedHeaders.length) {
    const extraCols = currentCols - expectedHeaders.length;
    Utils.log(`Deleting ${extraCols} extra columns...`);
    for (let i = 0; i < extraCols; i++) {
      dashboard.deleteColumn(expectedHeaders.length + 1);
    }
  }

  Utils.log(`\n✅ Dashboard headers force-updated!`);
  Utils.log(`   Total columns: ${expectedHeaders.length}`);

  // Verify
  const newHeaders = dashboard.getRange(1, 1, 1, expectedHeaders.length).getValues()[0];
  Utils.log(`\nVerifying new headers (positions 11-16):`);
  for (let i = 10; i < 16; i++) {
    const match = newHeaders[i] === expectedHeaders[i] ? '✅' : '❌';
    Utils.log(`  [${i + 1}] "${newHeaders[i]}" ${match}`);
  }

  Utils.log(`\n=== Force Fix Complete ===`);
  Utils.log(`Please check your Dashboard sheet now.`);
  Utils.log(`If headers look correct, run updateDailyReport() to populate data.`);
}

/**
 * TEST: Forward EPS Formula Calculation
 * Verifies that Forward EPS is correctly calculated as Price / Forward P/E in Dashboard.
 *
 * @param {string} ticker Ticker symbol to test (default: first stock in Dashboard)
 */
function testForwardEPSFormula(ticker = null) {
  Utils.log(`=== TEST: Forward EPS Formula Calculation ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`❌ Dashboard is empty. Run updateDailyReport() first.`);
      return;
    }

    let targetRow = 2; // Default to first stock

    // If ticker specified, find its row
    if (ticker) {
      const tickers = dashboard.getRange(2, 1, dashboard.getLastRow() - 1, 1).getValues();
      let found = false;

      for (let i = 0; i < tickers.length; i++) {
        if (tickers[i][0] === ticker) {
          targetRow = i + 2;
          found = true;
          break;
        }
      }

      if (!found) {
        Utils.log(`❌ Ticker "${ticker}" not found. Using first stock instead.`);
        ticker = tickers[0][0];
        targetRow = 2;
      }
    } else {
      ticker = dashboard.getRange(2, 1).getValue();
    }

    Utils.log(`\n[Testing ${ticker} at row ${targetRow}]`);

    const cols = CONFIG.DASHBOARD_COLS;

    // Read values
    const price = dashboard.getRange(targetRow, cols.PRICE).getValue();
    const fwdPe = dashboard.getRange(targetRow, cols.FWD_PE).getValue();
    const fwdEPS = dashboard.getRange(targetRow, cols.FWD_EPS).getValue();
    const fwdEPSFormula = dashboard.getRange(targetRow, cols.FWD_EPS).getFormula();

    Utils.log(`\n[VALUES]:`);
    Utils.log(`  Price (B): ${price}`);
    Utils.log(`  Forward P/E (N): ${fwdPe}`);
    Utils.log(`  Forward EPS (P): ${fwdEPS}`);

    Utils.log(`\n[FORMULA CHECK]:`);
    if (!fwdEPSFormula) {
      Utils.log(`  ❌ Column P (Fwd EPS) is NOT a formula!`);
      Utils.log(`     Current value: ${fwdEPS}`);
      Utils.log(`     Expected: =IF(N>0,B/N,"")`);
      return;
    }

    Utils.log(`  ✅ Column P is a formula: ${fwdEPSFormula}`);

    // Verify calculation
    if (fwdPe && fwdPe > 0) {
      const expectedFwdEPS = price / fwdPe;
      const difference = Math.abs(fwdEPS - expectedFwdEPS);
      const tolerance = 0.01; // Allow 1 cent difference due to rounding

      Utils.log(`\n[CALCULATION VERIFICATION]:`);
      Utils.log(`  Manual calculation: ${price} / ${fwdPe} = ${expectedFwdEPS.toFixed(2)}`);
      Utils.log(`  Formula result: ${fwdEPS ? fwdEPS.toFixed(2) : '(empty)'}`);
      Utils.log(`  Difference: ${difference.toFixed(4)}`);

      if (difference < tolerance) {
        Utils.log(`  ✅ MATCH! Forward EPS formula is calculating correctly.`);
      } else {
        Utils.log(`  ⚠️ MISMATCH! Formula may have an issue.`);
      }
    } else {
      Utils.log(`\n[CALCULATION VERIFICATION]:`);
      Utils.log(`  Forward P/E is ${fwdPe} (not positive)`);
      Utils.log(`  Forward EPS should be empty: ${fwdEPS === '' ? '✅ Correct' : '❌ Should be empty'}`);
    }

    Utils.log(`\n=== Forward EPS Formula Test Complete ===`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * TEST: EPS Formula Calculation
 * Verifies that EPS is correctly calculated as Price / P/E in Dashboard.
 *
 * @param {string} ticker Ticker symbol to test (default: first stock in Dashboard)
 */
function testEPSFormula(ticker = null) {
  Utils.log(`=== TEST: EPS Formula Calculation ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`❌ Dashboard is empty. Run updateDailyReport() first.`);
      return;
    }

    let targetRow = 2; // Default to first stock

    // If ticker specified, find its row
    if (ticker) {
      const tickers = dashboard.getRange(2, 1, dashboard.getLastRow() - 1, 1).getValues();
      let found = false;

      for (let i = 0; i < tickers.length; i++) {
        if (tickers[i][0] === ticker) {
          targetRow = i + 2;
          found = true;
          break;
        }
      }

      if (!found) {
        Utils.log(`❌ Ticker "${ticker}" not found. Using first stock instead.`);
        ticker = tickers[0][0];
        targetRow = 2;
      }
    } else {
      ticker = dashboard.getRange(2, 1).getValue();
    }

    Utils.log(`\n[Testing ${ticker} at row ${targetRow}]`);

    const cols = CONFIG.DASHBOARD_COLS;

    // Read values
    const price = dashboard.getRange(targetRow, cols.PRICE).getValue();
    const pe = dashboard.getRange(targetRow, cols.PE).getValue();
    const eps = dashboard.getRange(targetRow, cols.EPS).getValue();
    const epsFormula = dashboard.getRange(targetRow, cols.EPS).getFormula();

    Utils.log(`\n[VALUES]:`);
    Utils.log(`  Price (B): ${price}`);
    Utils.log(`  P/E (K): ${pe}`);
    Utils.log(`  EPS (M): ${eps}`);

    Utils.log(`\n[FORMULA CHECK]:`);
    if (!epsFormula) {
      Utils.log(`  ❌ Column M (EPS) is NOT a formula!`);
      Utils.log(`     Current value: ${eps}`);
      Utils.log(`     Expected: =IF(K>0,B/K,"")`);
      return;
    }

    Utils.log(`  ✅ Column M is a formula: ${epsFormula}`);

    // Verify calculation
    if (pe && pe > 0) {
      const expectedEPS = price / pe;
      const difference = Math.abs(eps - expectedEPS);
      const tolerance = 0.01; // Allow 1 cent difference due to rounding

      Utils.log(`\n[CALCULATION VERIFICATION]:`);
      Utils.log(`  Manual calculation: ${price} / ${pe} = ${expectedEPS.toFixed(2)}`);
      Utils.log(`  Formula result: ${eps ? eps.toFixed(2) : '(empty)'}`);
      Utils.log(`  Difference: ${difference.toFixed(4)}`);

      if (difference < tolerance) {
        Utils.log(`  ✅ MATCH! EPS formula is calculating correctly.`);
      } else {
        Utils.log(`  ⚠️ MISMATCH! Formula may have an issue.`);
      }
    } else {
      Utils.log(`\n[CALCULATION VERIFICATION]:`);
      Utils.log(`  P/E is ${pe} (not positive)`);
      Utils.log(`  EPS should be empty: ${eps === '' ? '✅ Correct' : '❌ Should be empty'}`);
    }

    Utils.log(`\n=== EPS Formula Test Complete ===`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * DEBUG: Check Dashboard Last Updated Time
 * Verifies when the Dashboard was last updated to understand if formulas need refresh.
 */
function debugDashboardUpdateStatus() {
  Utils.log(`=== DEBUG: Dashboard Update Status ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`❌ Dashboard is empty.`);
      return;
    }

    const cols = CONFIG.DASHBOARD_COLS;
    const lastRow = dashboard.getLastRow();

    Utils.log(`\n[Dashboard Info]:`);
    Utils.log(`  Total Rows: ${lastRow}`);
    Utils.log(`  Total Columns: ${dashboard.getLastColumn()}`);
    Utils.log(`  Expected Columns: ${CONFIG.DASHBOARD_COL_COUNT}`);

    // Check last updated dates for all tickers
    Utils.log(`\n[Last Updated Times]:`);
    for (let row = 2; row <= Math.min(lastRow, 6); row++) {
      const ticker = dashboard.getRange(row, cols.TICKER).getValue();
      const lastUpdated = dashboard.getRange(row, cols.LAST_UPDATED).getValue();
      const epsFormula = dashboard.getRange(row, cols.EPS).getFormula();
      const epsValue = dashboard.getRange(row, cols.EPS).getValue();

      Utils.log(`  Row ${row} (${ticker}):`);
      Utils.log(`    - Last Updated: ${lastUpdated}`);
      Utils.log(`    - EPS Formula: ${epsFormula || '(none)'}`);
      Utils.log(`    - EPS Value: ${epsValue || '(empty)'}`);
    }

    Utils.log(`\n=== Debug Complete ===`);
    Utils.log(`\nRECOMMENDATION: If "Last Updated" is old or EPS formulas are missing,`);
    Utils.log(`run updateDailyReport() to refresh Dashboard with GOOGLEFINANCE formulas.`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * DEBUG: Manually Test GOOGLEFINANCE Formula
 * Tests if GOOGLEFINANCE works for a specific ticker by writing a test formula.
 *
 * @param {string} ticker Ticker symbol to test (default: 'AAPL')
 */
function debugGoogleFinanceFormula(ticker = 'AAPL') {
  Utils.log(`=== DEBUG: Manual GOOGLEFINANCE Formula Test ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let testSheet = ss.getSheetByName('GOOGLEFINANCE_Test');

    // Create test sheet if it doesn't exist
    if (!testSheet) {
      testSheet = ss.insertSheet('GOOGLEFINANCE_Test');
      Utils.log(`  Created test sheet: GOOGLEFINANCE_Test`);
    } else {
      testSheet.clear();
      Utils.log(`  Cleared existing test sheet`);
    }

    // Write test formulas
    Utils.log(`\n[Writing test formulas for ${ticker}]:`);

    testSheet.getRange('A1').setValue('Metric');
    testSheet.getRange('B1').setValue('Formula');
    testSheet.getRange('C1').setValue('Value');

    const tests = [
      ['Price', `=GOOGLEFINANCE("${ticker}","price")`],
      ['P/E', `=GOOGLEFINANCE("${ticker}","pe")`],
      ['EPS', `=GOOGLEFINANCE("${ticker}","eps")`],
      ['Forward P/E', `=GOOGLEFINANCE("${ticker}","forwardpe")`],
      ['Forward P/E (IFERROR)', `=IFERROR(GOOGLEFINANCE("${ticker}","forwardpe"),"")`]
    ];

    tests.forEach((test, idx) => {
      const row = idx + 2;
      testSheet.getRange(`A${row}`).setValue(test[0]);
      testSheet.getRange(`B${row}`).setFormula(test[1]);
    });

    Utils.log(`  ✓ Wrote test formulas to GOOGLEFINANCE_Test sheet`);

    // Wait for formulas to calculate
    Utils.log(`\n[Waiting 5 seconds for formulas to calculate...]`);
    SpreadsheetApp.flush();
    Utilities.sleep(5000);

    // Read results
    Utils.log(`\n[Results for ${ticker}]:`);
    tests.forEach((test, idx) => {
      const row = idx + 2;
      const value = testSheet.getRange(`B${row}`).getValue();
      const displayValue = testSheet.getRange(`B${row}`).getDisplayValue();

      Utils.log(`  ${test[0]}:`);
      Utils.log(`    Formula: ${test[1]}`);
      Utils.log(`    Value: ${value}`);
      Utils.log(`    Display: ${displayValue}`);

      if (displayValue === '#N/A') {
        Utils.log(`    Status: ❌ #N/A Error - Data not available for this ticker`);
      } else if (value) {
        Utils.log(`    Status: ✅ Works`);
      } else {
        Utils.log(`    Status: ⚠️ Empty or zero`);
      }
    });

    Utils.log(`\n=== Manual Formula Test Complete ===`);
    Utils.log(`\nCheck the "GOOGLEFINANCE_Test" sheet to see the results.`);
    Utils.log(`\n💡 INTERPRETATION:`);
    Utils.log(`  - If Forward P/E shows #N/A: GOOGLEFINANCE doesn't have forward P/E data for this ticker`);
    Utils.log(`  - Common for: REITs, ETFs, small-cap stocks, international stocks`);
    Utils.log(`  - Solution: Use IFERROR wrapper or leave empty for unsupported tickers`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * DEBUG: Check All Dashboard Tickers for Forward P/E Support
 * Scans all tickers in Dashboard and reports which ones have #N/A for Forward P/E.
 */
function debugDashboardForwardPESupport() {
  Utils.log(`=== DEBUG: Dashboard Forward P/E Support Check ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`❌ Dashboard is empty.`);
      return;
    }

    const cols = CONFIG.DASHBOARD_COLS;
    const lastRow = dashboard.getLastRow();

    Utils.log(`\n[Scanning ${lastRow - 1} tickers for Forward P/E support]\n`);

    let supportedCount = 0;
    let unsupportedCount = 0;
    const unsupportedTickers = [];

    for (let row = 2; row <= lastRow; row++) {
      const ticker = dashboard.getRange(row, cols.TICKER).getValue();

      if (ticker === 'TOTAL') continue;

      const fwdPeValue = dashboard.getRange(row, cols.FWD_PE).getValue();
      const fwdPeDisplay = dashboard.getRange(row, cols.FWD_PE).getDisplayValue();
      const fwdPeFormula = dashboard.getRange(row, cols.FWD_PE).getFormula();

      if (fwdPeDisplay === '#N/A' || fwdPeDisplay.includes('N/A')) {
        unsupportedCount++;
        unsupportedTickers.push(ticker);
        Utils.log(`  ❌ ${ticker}: Forward P/E NOT available (#N/A)`);
      } else if (fwdPeValue && fwdPeValue > 0) {
        supportedCount++;
        Utils.log(`  ✅ ${ticker}: Forward P/E = ${fwdPeValue.toFixed(2)}`);
      } else {
        Utils.log(`  ⚠️ ${ticker}: Forward P/E empty or zero`);
      }
    }

    Utils.log(`\n=== Summary ===`);
    Utils.log(`  Total tickers scanned: ${lastRow - 1}`);
    Utils.log(`  ✅ Supported (has Forward P/E): ${supportedCount}`);
    Utils.log(`  ❌ Unsupported (#N/A): ${unsupportedCount}`);

    if (unsupportedTickers.length > 0) {
      Utils.log(`\n  Unsupported tickers: ${unsupportedTickers.join(', ')}`);
      Utils.log(`\n💡 RECOMMENDATION:`);
      Utils.log(`  These tickers don't have Forward P/E data in GOOGLEFINANCE.`);
      Utils.log(`  Options:`);
      Utils.log(`    1. Wrap formulas with IFERROR to hide #N/A errors`);
      Utils.log(`    2. Accept that Forward P/E is not available for these tickers`);
      Utils.log(`    3. Use alternative data source (Alpha Vantage) as fallback`);
    } else {
      Utils.log(`\n✅ All tickers support Forward P/E!`);
    }

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * DEBUG: Test GOOGLEFINANCE Attributes
 * Tests what attributes GOOGLEFINANCE supports for a given ticker.
 *
 * @param {string} ticker Ticker symbol to test (default: 'AAPL')
 */
function debugGoogleFinanceAttributes(ticker = 'AAPL') {
  Utils.log(`=== DEBUG: GOOGLEFINANCE Attribute Support Test ===`);
  Utils.log(`Testing ticker: ${ticker}\n`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let testSheet = ss.getSheetByName('GOOGLEFINANCE_Attributes_Test');

    if (!testSheet) {
      testSheet = ss.insertSheet('GOOGLEFINANCE_Attributes_Test');
    } else {
      testSheet.clear();
    }

    // Test all possible attributes
    const attributes = [
      'price', 'pe', 'eps', 'forwardpe',
      'high', 'low', 'volume', 'marketcap',
      'high52', 'low52', 'beta', 'shares',
      'priceopen', 'priceavg50', 'priceavg200',
      'div', 'yieldpct'
    ];

    testSheet.getRange('A1').setValue('Attribute');
    testSheet.getRange('B1').setValue('Formula');
    testSheet.getRange('C1').setValue('Result');
    testSheet.getRange('D1').setValue('Status');

    attributes.forEach((attr, idx) => {
      const row = idx + 2;
      const formula = `=IFERROR(GOOGLEFINANCE("${ticker}","${attr}"),"N/A")`;

      testSheet.getRange(row, 1).setValue(attr);
      testSheet.getRange(row, 2).setFormula(formula);
    });

    Utils.log(`✓ Wrote ${attributes.length} test formulas`);
    Utils.log(`\nWaiting 5 seconds for calculations...`);
    SpreadsheetApp.flush();
    Utilities.sleep(5000);

    // Check results
    Utils.log(`\n[Results]:\n`);

    let supported = 0;
    let unsupported = 0;

    attributes.forEach((attr, idx) => {
      const row = idx + 2;
      const result = testSheet.getRange(row, 2).getValue();
      const display = testSheet.getRange(row, 2).getDisplayValue();

      if (display === 'N/A' || result === 'N/A' || !result) {
        testSheet.getRange(row, 4).setValue('❌ Not Available');
        Utils.log(`  ❌ ${attr}: Not available`);
        unsupported++;
      } else {
        testSheet.getRange(row, 4).setValue('✅ Available');
        Utils.log(`  ✅ ${attr}: ${display}`);
        supported++;
      }
    });

    Utils.log(`\n=== Summary ===`);
    Utils.log(`  ✅ Supported: ${supported}/${attributes.length}`);
    Utils.log(`  ❌ Unsupported: ${unsupported}/${attributes.length}`);
    Utils.log(`\nCheck "GOOGLEFINANCE_Attributes_Test" sheet for full results.`);

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * TEST: Finviz Forward Metrics
 * Tests Finviz service for a specific ticker.
 *
 * @param {string} ticker Ticker symbol to test (default: 'NVDA')
 */
function testFinvizForwardMetrics(ticker = 'NVDA') {
  Utils.log(`=== TEST: Finviz Forward Metrics ===`);
  Utils.log(`Testing ticker: ${ticker}\n`);

  try {
    // Test individual methods
    Utils.log(`[Test 1: Forward P/E]`);
    const fwdPe = FinvizService.getForwardPE(ticker);
    Utils.log(`  Result: ${fwdPe}`);
    Utils.log(`  Status: ${fwdPe ? '✅ Success' : '❌ Failed'}\n`);

    Utils.log(`[Test 2: Forward EPS]`);
    const fwdEPS = FinvizService.getForwardEPS(ticker);
    Utils.log(`  Result: ${fwdEPS}`);
    Utils.log(`  Status: ${fwdEPS ? '✅ Success' : '❌ Failed'}\n`);

    // Test combined method (optimized)
    Utils.log(`[Test 3: Combined Forward Metrics (Optimized)]`);
    const combined = FinvizService.getForwardMetrics(ticker);
    Utils.log(`  Forward P/E: ${combined.fwdPe}`);
    Utils.log(`  Forward EPS: ${combined.fwdEPS}`);
    Utils.log(`  Status: ${(combined.fwdPe && combined.fwdEPS) ? '✅ Both retrieved' : '⚠️ Partial data'}\n`);

    Utils.log(`=== Test Complete ===`);

    if (fwdPe && fwdEPS) {
      Utils.log(`\n✅ All tests passed for ${ticker}!`);
      Utils.log(`\nCalculated Today Fwd P/E (if Price = $100):`);
      const mockPrice = 100;
      const todayFwdPE = mockPrice / fwdEPS;
      Utils.log(`  Price / Fwd EPS = ${mockPrice} / ${fwdEPS} = ${todayFwdPE.toFixed(2)}`);
    } else {
      Utils.log(`\n⚠️ Some tests failed. Check Finviz availability for ${ticker}.`);
    }

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * TEST: GOOGLEFINANCE EPS Integration
 * Verifies that GOOGLEFINANCE is correctly providing EPS, P/E, and Forward P/E.
 *
 * @param {string} ticker Ticker symbol to test (default: first stock in Dashboard)
 */
function testGoogleFinanceEPS(ticker = null) {
  Utils.log(`=== TEST: GOOGLEFINANCE EPS Integration ===`);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`❌ Dashboard is empty. Run updateDailyReport() first.`);
      return;
    }

    let targetRow = 2;

    // If ticker specified, find its row
    if (ticker) {
      const tickers = dashboard.getRange(2, 1, dashboard.getLastRow() - 1, 1).getValues();
      let found = false;

      for (let i = 0; i < tickers.length; i++) {
        if (tickers[i][0] === ticker) {
          targetRow = i + 2;
          found = true;
          break;
        }
      }

      if (!found) {
        Utils.log(`❌ Ticker "${ticker}" not found. Using first stock instead.`);
        ticker = tickers[0][0];
        targetRow = 2;
      }
    } else {
      ticker = dashboard.getRange(2, 1).getValue();
    }

    Utils.log(`\n[Testing ${ticker} at row ${targetRow}]`);

    // Check when this row was last updated
    const cols = CONFIG.DASHBOARD_COLS;
    const lastUpdated = dashboard.getRange(targetRow, cols.LAST_UPDATED).getValue();
    Utils.log(`  Last Updated: ${lastUpdated}`);

    // Read values and formulas
    Utils.log(`\n[COLUMN K: P/E]`);
    const pe = dashboard.getRange(targetRow, cols.PE).getValue();
    const peFormula = dashboard.getRange(targetRow, cols.PE).getFormula();
    Utils.log(`  Value: ${pe}`);
    Utils.log(`  Formula: ${peFormula || '(not a formula)'}`);
    Utils.log(`  Source: ${peFormula && peFormula.includes('GOOGLEFINANCE') ? '✅ GOOGLEFINANCE' : '❌ NOT GOOGLEFINANCE'}`);

    Utils.log(`\n[COLUMN M: EPS]`);
    const eps = dashboard.getRange(targetRow, cols.EPS).getValue();
    const epsFormula = dashboard.getRange(targetRow, cols.EPS).getFormula();
    Utils.log(`  Value: ${eps}`);
    Utils.log(`  Formula: ${epsFormula || '(not a formula)'}`);
    Utils.log(`  Source: ${epsFormula && epsFormula.includes('GOOGLEFINANCE') ? '✅ GOOGLEFINANCE' : '❌ NOT GOOGLEFINANCE'}`);

    Utils.log(`\n[COLUMN N: Forward P/E]`);
    const fwdPe = dashboard.getRange(targetRow, cols.FWD_PE).getValue();
    const fwdPeFormula = dashboard.getRange(targetRow, cols.FWD_PE).getFormula();
    Utils.log(`  Value: ${fwdPe}`);
    Utils.log(`  Formula: ${fwdPeFormula || '(not a formula)'}`);
    Utils.log(`  Source: ${fwdPeFormula && fwdPeFormula.includes('GOOGLEFINANCE') ? '✅ GOOGLEFINANCE' : '❌ NOT GOOGLEFINANCE'}`);

    Utils.log(`\n[COLUMN O: Today Fwd P/E]`);
    const todayFwdPe = dashboard.getRange(targetRow, cols.TODAY_FWD_PE).getValue();
    const todayFwdPeFormula = dashboard.getRange(targetRow, cols.TODAY_FWD_PE).getFormula();
    Utils.log(`  Value: ${todayFwdPe}`);
    Utils.log(`  Formula: ${todayFwdPeFormula || '(not a formula)'}`);
    Utils.log(`  Source: ${todayFwdPeFormula && todayFwdPeFormula.includes('GOOGLEFINANCE') ? '✅ GOOGLEFINANCE' : '❌ NOT GOOGLEFINANCE'}`);

    Utils.log(`\n[COLUMN P: Forward EPS]`);
    const fwdEPS = dashboard.getRange(targetRow, cols.FWD_EPS).getValue();
    const fwdEPSFormula = dashboard.getRange(targetRow, cols.FWD_EPS).getFormula();
    Utils.log(`  Value: ${fwdEPS}`);
    Utils.log(`  Formula: ${fwdEPSFormula || '(not a formula)'}`);
    Utils.log(`  Calculation: ${fwdEPSFormula ? '✅ Calculated (Price / Fwd P/E)' : '❌ NOT a formula'}`);

    // Verify Forward EPS calculation
    if (fwdEPSFormula && fwdPe && fwdPe > 0) {
      const price = dashboard.getRange(targetRow, cols.PRICE).getValue();
      const expectedFwdEPS = price / fwdPe;
      const difference = Math.abs(fwdEPS - expectedFwdEPS);

      Utils.log(`\n[FORWARD EPS CALCULATION VERIFICATION]:`);
      Utils.log(`  Price: ${price}`);
      Utils.log(`  Forward P/E: ${fwdPe}`);
      Utils.log(`  Expected Fwd EPS: ${expectedFwdEPS.toFixed(2)}`);
      Utils.log(`  Actual Fwd EPS: ${fwdEPS ? fwdEPS.toFixed(2) : '(empty)'}`);
      Utils.log(`  Match: ${difference < 0.01 ? '✅ Correct' : '❌ Incorrect'}`);
    }

    Utils.log(`\n=== GOOGLEFINANCE EPS Test Complete ===`);

    // Summary
    let issuesFound = 0;

    if (!peFormula || !peFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: P/E (K) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!epsFormula || !epsFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: EPS (M) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!fwdPeFormula || !fwdPeFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: Forward P/E (N) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!todayFwdPeFormula || !todayFwdPeFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: Today Fwd P/E (O) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!fwdEPSFormula) {
      Utils.log(`\n❌ ISSUE: Forward EPS (P) should be a calculated formula`);
      issuesFound++;
    }

    if (issuesFound === 0) {
      Utils.log(`\n✅ All GOOGLEFINANCE integrations are correct!`);
    } else {
      Utils.log(`\n⚠️ Found ${issuesFound} issue(s). Run updateDailyReport() to fix.`);
    }

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}

/**
 * TEST: Full Update Integration
 * Runs a complete update and verifies all new data sources (GOOGLEFINANCE).
 * Updated to reflect GOOGLEFINANCE as the source for EPS, P/E, and Forward P/E.
 */
function testFullUpdate() {
  Utils.log(`=== TEST: Full Update Integration ===`);

  try {
    Utils.log(`\n[1] Running updateDailyReport()...`);
    updateDailyReport();

    Utils.log(`\n[2] Waiting for GOOGLEFINANCE formulas to calculate...`);
    SpreadsheetApp.flush();
    Utilities.sleep(10000); // Longer wait for GOOGLEFINANCE

    Utils.log(`\n[3] Verifying Dashboard data...`);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log(`  ❌ Dashboard is empty after update!`);
      return;
    }

    const cols = CONFIG.DASHBOARD_COLS;
    const ticker = dashboard.getRange(2, 1).getValue();

    Utils.log(`\n[Checking ${ticker}]:`);

    // Check P/E (from GOOGLEFINANCE)
    const pe = dashboard.getRange(2, cols.PE).getValue();
    const peFormula = dashboard.getRange(2, cols.PE).getFormula();
    Utils.log(`  P/E (K): ${pe} ${peFormula && peFormula.includes('GOOGLEFINANCE') ? '✅ (GOOGLEFINANCE)' : '❌ (not GOOGLEFINANCE!)'}`);

    // Check EPS (from GOOGLEFINANCE - NEW!)
    const eps = dashboard.getRange(2, cols.EPS).getValue();
    const epsFormula = dashboard.getRange(2, cols.EPS).getFormula();
    Utils.log(`  EPS (M): ${eps} ${epsFormula && epsFormula.includes('GOOGLEFINANCE') ? '✅ (GOOGLEFINANCE)' : '❌ (not GOOGLEFINANCE!)'}`);

    // Check Forward P/E (from GOOGLEFINANCE - NEW!)
    const fwdPe = dashboard.getRange(2, cols.FWD_PE).getValue();
    const fwdPeFormula = dashboard.getRange(2, cols.FWD_PE).getFormula();
    Utils.log(`  Fwd P/E (N): ${fwdPe} ${fwdPeFormula && fwdPeFormula.includes('GOOGLEFINANCE') ? '✅ (GOOGLEFINANCE)' : '❌ (not GOOGLEFINANCE!)'}`);

    // Check Today Fwd P/E (from GOOGLEFINANCE - NEW!)
    const todayFwdPe = dashboard.getRange(2, cols.TODAY_FWD_PE).getValue();
    const todayFwdPeFormula = dashboard.getRange(2, cols.TODAY_FWD_PE).getFormula();
    Utils.log(`  Today Fwd P/E (O): ${todayFwdPe} ${todayFwdPeFormula && todayFwdPeFormula.includes('GOOGLEFINANCE') ? '✅ (GOOGLEFINANCE)' : '❌ (not GOOGLEFINANCE!)'}`);

    // Check Forward EPS (calculated from Price / Fwd P/E)
    const fwdEPS = dashboard.getRange(2, cols.FWD_EPS).getValue();
    const fwdEPSFormula = dashboard.getRange(2, cols.FWD_EPS).getFormula();
    Utils.log(`  Fwd EPS (P): ${fwdEPS} ${fwdEPSFormula ? '✅ (formula)' : '❌ (not formula!)'}`);

    Utils.log(`\n=== Full Update Test Complete ===`);

    // Summary
    let issuesFound = 0;

    if (!epsFormula || !epsFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: EPS (M) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!fwdPeFormula || !fwdPeFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: Forward P/E (N) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!todayFwdPeFormula || !todayFwdPeFormula.includes('GOOGLEFINANCE')) {
      Utils.log(`\n❌ ISSUE: Today Fwd P/E (O) should use GOOGLEFINANCE`);
      issuesFound++;
    }

    if (!fwdEPSFormula) {
      Utils.log(`\n❌ ISSUE: Forward EPS (P) should be a calculated formula`);
      issuesFound++;
    }

    if (!eps || eps <= 0) {
      Utils.log(`\n⚠️ WARNING: EPS (M) is empty or invalid`);
      Utils.log(`   Check if GOOGLEFINANCE("${ticker}","eps") returns data`);
    }

    if (!fwdEPS || fwdEPS <= 0) {
      Utils.log(`\n⚠️ WARNING: Forward EPS (P) is empty or invalid`);
      Utils.log(`   Check if GOOGLEFINANCE("${ticker}","forwardpe") returns data`);
    }

    if (issuesFound === 0) {
      Utils.log(`\n✅ All checks passed! GOOGLEFINANCE migration successful.`);
    } else {
      Utils.log(`\n⚠️ Found ${issuesFound} issue(s) that need attention.`);
    }

  } catch (error) {
    Utils.log(`\n❌ ERROR: ${error.message}`);
    Utils.log(`Stack: ${error.stack}`);
  }
}
