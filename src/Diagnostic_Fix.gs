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
