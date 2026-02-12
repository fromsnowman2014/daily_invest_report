/**
 * Sheet_Manager.gs
 * Handles all Google Sheet operations (Read/Write/Format).
 */

const SheetManager = {
  /**
   * Retrieves the active spreadsheet.
   * @return {Spreadsheet} The active spreadsheet.
   */
  getSpreadsheet: function() {
    return SpreadsheetApp.getActiveSpreadsheet();
  },

  /**
   * Ensures a sheet exists, creates it if not.
   * @param {string} sheetName Name of the sheet.
   * @return {Sheet} The sheet object.
   */
  ensureSheet: function(sheetName) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Utils.log(`Created new sheet: ${sheetName}`);
    }
    return sheet;
  },

  // ==================== STOCK LIST ====================

  /**
   * Reads the Stock List from the 'Stock List' sheet.
   * @return {Array<Object>} Array of stock objects.
   */
  getStockList: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.STOCK_LIST);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
      Utils.log('Stock List is empty.');
      return [];
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const stockList = [];

    data.forEach(row => {
      const ticker = row[0];
      if (ticker) {
        stockList.push({
          ticker: ticker.toString().trim().toUpperCase(),
          addDate: row[1],
          buyDate: row[2],
          buyPrice: row[3],
          quantity: row[4],
          userMemo: row[5],
          tag: row[6]
        });
      }
    });

    return stockList;
  },

  // ==================== DASHBOARD ====================

  /**
   * Returns Dashboard header labels (matches DASHBOARD_COLS order).
   */
  getDashboardHeaders: function() {

    return [
      'Ticker', 'Price $', 'Change %', 'Day Change $',
      'Cost Basis $', 'Market Value $', 'Gain/Loss %', 'Gain/Loss $', 'Weight %',
      'Market Cap $', 'P/E', 'Fwd P/E', 'PEG', 'P/S', 'P/B', 'EV/EBITDA', 'FCF Yield %',
      'Gross Margin %', 'Op Margin %', 'ROE %', 'ROIC %',
      'Rev Growth %', 'EPS Growth %',
      'Current Ratio', 'Debt/Equity',
      'RSI', 'Target Upside %',
      'System Memo', 'Last Updated'
    ];
  },

  /**
   * Reads the current Dashboard data for caching purposes.
   * Called BEFORE initDashboard() clears the sheet. Skips TOTAL row.
   * @return {Object} Map of ticker -> cached financial data
   */
  getDashboardData: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return {};

    const colCount = CONFIG.DASHBOARD_COL_COUNT;
    const data = sheet.getRange(2, 1, lastRow - 1, colCount).getValues();
    const cols = CONFIG.DASHBOARD_COLS;
    const dashboardMap = {};

    data.forEach(row => {
      const ticker = row[cols.TICKER - 1];
      if (ticker && ticker !== 'TOTAL') {
        dashboardMap[ticker] = {
          price: row[cols.PRICE - 1],
          pe: row[cols.PE - 1],
          fwdPe: row[cols.FWD_PE - 1],
          peg: row[cols.PEG - 1],
          ps: row[cols.PS - 1],
          pb: row[cols.PB - 1],
          evEbitda: row[cols.EV_EBITDA - 1],
          fcfYield: row[cols.FCF_YIELD - 1],
          grossMargin: row[cols.GROSS_MARGIN - 1],
          opMargin: row[cols.OP_MARGIN - 1],
          roe: row[cols.ROE - 1],
          roic: row[cols.ROIC - 1],
          revGrowth: row[cols.REV_GROWTH - 1],
          epsGrowth: row[cols.EPS_GROWTH - 1],
          currentRatio: row[cols.CURRENT_RATIO - 1],
          debtEquity: row[cols.DEBT_EQUITY - 1],
          rsi: row[cols.RSI - 1],
          targetUpside: row[cols.TARGET_UPSIDE - 1],
          systemMemo: row[cols.SYSTEM_MEMO - 1],
          lastUpdated: row[cols.LAST_UPDATED - 1]
        };
      }
    });

    return dashboardMap;
  },

  /**
   * Reads all Dashboard values AFTER formulas have been calculated.
   * Used in Phase 2 to get actual GOOGLEFINANCE values for Log entries.
   * Skips the TOTAL row.
   * @return {Object} Map of ticker -> all metric values
   */
  readDashboardValues: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return {};

    const colCount = CONFIG.DASHBOARD_COL_COUNT;
    const data = sheet.getRange(2, 1, lastRow - 1, colCount).getValues();
    const cols = CONFIG.DASHBOARD_COLS;
    const result = {};

    data.forEach(row => {
      const ticker = row[cols.TICKER - 1];
      if (ticker && ticker !== 'TOTAL') {
        const toNum = function(val) {
          return (typeof val === 'number' && !isNaN(val)) ? val : (val || null);
        };
        result[ticker] = {
          price: toNum(row[cols.PRICE - 1]),
          changePct: toNum(row[cols.CHANGE_PCT - 1]),
          dayChangeAbs: toNum(row[cols.DAY_CHANGE_ABS - 1]),
          costBasis: toNum(row[cols.COST_BASIS - 1]),
          marketValue: toNum(row[cols.MARKET_VALUE - 1]),
          gainLossPct: toNum(row[cols.GAIN_LOSS_PCT - 1]),
          gainLossAbs: toNum(row[cols.GAIN_LOSS_ABS - 1]),
          weightPct: toNum(row[cols.WEIGHT_PCT - 1]),
          marketCap: toNum(row[cols.MARKET_CAP - 1]),
          pe: toNum(row[cols.PE - 1]),
          fwdPe: toNum(row[cols.FWD_PE - 1]),
          peg: toNum(row[cols.PEG - 1]),
          ps: toNum(row[cols.PS - 1]),
          pb: toNum(row[cols.PB - 1]),
          evEbitda: toNum(row[cols.EV_EBITDA - 1]),
          fcfYield: toNum(row[cols.FCF_YIELD - 1]),
          grossMargin: toNum(row[cols.GROSS_MARGIN - 1]),
          opMargin: toNum(row[cols.OP_MARGIN - 1]),
          roe: toNum(row[cols.ROE - 1]),
          roic: toNum(row[cols.ROIC - 1]),
          revGrowth: toNum(row[cols.REV_GROWTH - 1]),
          epsGrowth: toNum(row[cols.EPS_GROWTH - 1]),
          currentRatio: toNum(row[cols.CURRENT_RATIO - 1]),
          debtEquity: toNum(row[cols.DEBT_EQUITY - 1]),
          rsi: toNum(row[cols.RSI - 1]),
          targetUpside: toNum(row[cols.TARGET_UPSIDE - 1]),
          systemMemo: row[cols.SYSTEM_MEMO - 1] || ''
        };
      }
    });

    return result;
  },

  /**
   * Initializes or Clears the Dashboard sheet structure.
   * @param {Sheet} [targetSheet] Optional sheet object to initialize (for testing).
   * @param {number} [expectedRows] Optional number of rows to format (optimization).
   */
  initDashboard: function(targetSheet, expectedRows) {
    const sheet = targetSheet || this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    sheet.clear();

    const headers = this.getDashboardHeaders();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    
    // Freeze 1 row and 1 column
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
    
    // Apply formatting to the empty sheet (pre-formatting columns)
    this.applyColumnFormats(sheet, expectedRows);
  },

  /**
   * Appends a stock row to the Dashboard sheet.
   * Uses GOOGLEFINANCE formulas for real-time data + static/cached fundamentals.
   * @param {Object} data Financial data object (must include ticker, buyPrice, quantity).
   */
  appendDashboardRow: function(data) {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const cols = CONFIG.DASHBOARD_COLS;
    const colCount = CONFIG.DASHBOARD_COL_COUNT;
    const ticker = data.ticker;
    const R = sheet.getLastRow() + 1; // Row index for this new row

    const buyPrice = data.buyPrice || 0;
    const quantity = data.quantity || 0;
    const costBasis = buyPrice * quantity;

    // Column letters for formula references
    const cPrice = Utils.colToLetter(cols.PRICE);           // B
    const cChangePct = Utils.colToLetter(cols.CHANGE_PCT);  // C
    const cCostBasis = Utils.colToLetter(cols.COST_BASIS);  // E
    const cMktValue = Utils.colToLetter(cols.MARKET_VALUE); // F

    // GOOGLEFINANCE Formulas
    const priceFormula = `=GOOGLEFINANCE("${ticker}","price")`;
    const changePctFormula = `=GOOGLEFINANCE("${ticker}","changepct")/100`;
    const marketCapFormula = `=GOOGLEFINANCE("${ticker}","marketcap")`;
    const peFormulaLive = `=GOOGLEFINANCE("${ticker}","pe")`;

    // Calculated Formulas
    const marketValueFormula = quantity > 0
      ? `=${cPrice}${R}*${quantity}`
      : '';
    const dayChangeFormula = (quantity > 0)
      ? `=IFERROR(${cMktValue}${R}*${cChangePct}${R}/(1+${cChangePct}${R}),0)`
      : '';
    const gainLossPctFormula = costBasis > 0
      ? `=IF(${cCostBasis}${R}>0,(${cMktValue}${R}-${cCostBasis}${R})/${cCostBasis}${R},"")`
      : '';
    const gainLossAbsFormula = costBasis > 0
      ? `=${cMktValue}${R}-${cCostBasis}${R}`
      : '';

    // Build row
    const row = new Array(colCount).fill('');
    const v = function(val) { return val != null ? val : ''; };

    row[cols.TICKER - 1] = ticker;
    row[cols.PRICE - 1] = priceFormula;
    row[cols.CHANGE_PCT - 1] = changePctFormula;
    row[cols.DAY_CHANGE_ABS - 1] = dayChangeFormula;
    row[cols.COST_BASIS - 1] = costBasis > 0 ? costBasis : '';
    row[cols.MARKET_VALUE - 1] = marketValueFormula;
    row[cols.GAIN_LOSS_PCT - 1] = gainLossPctFormula;
    row[cols.GAIN_LOSS_ABS - 1] = gainLossAbsFormula;
    row[cols.WEIGHT_PCT - 1] = ''; // Set later by setDashboardWeightFormulas
    row[cols.MARKET_CAP - 1] = marketCapFormula;

    // P/E: use API value if available, otherwise GOOGLEFINANCE fallback
    if (data.pe && data.pe !== '') {
      row[cols.PE - 1] = data.pe;
    } else {
      row[cols.PE - 1] = peFormulaLive;
    }

    row[cols.FWD_PE - 1] = v(data.fwdPe);
    row[cols.PEG - 1] = v(data.peg);
    row[cols.PS - 1] = v(data.ps);
    row[cols.PB - 1] = v(data.pb);
    row[cols.EV_EBITDA - 1] = v(data.evEbitda);
    row[cols.FCF_YIELD - 1] = v(data.fcfYield);
    row[cols.GROSS_MARGIN - 1] = v(data.grossMargin);
    row[cols.OP_MARGIN - 1] = v(data.opMargin);
    row[cols.ROE - 1] = v(data.roe);
    row[cols.ROIC - 1] = v(data.roic);
    row[cols.REV_GROWTH - 1] = v(data.revGrowth);
    row[cols.EPS_GROWTH - 1] = v(data.epsGrowth);
    row[cols.CURRENT_RATIO - 1] = v(data.currentRatio);
    row[cols.DEBT_EQUITY - 1] = v(data.debtEquity);
    row[cols.RSI - 1] = v(data.rsi);
    row[cols.TARGET_UPSIDE - 1] = v(data.targetUpside);
    row[cols.SYSTEM_MEMO - 1] = data.systemMemo || '';
    row[cols.LAST_UPDATED - 1] = data.lastUpdated || Utils.formatDate(new Date());

    sheet.appendRow(row);
  },

  /**
   * Appends a TOTAL summary row at the bottom of the Dashboard.
   * Uses SUM/formula references so it auto-updates with GOOGLEFINANCE.
   * @param {number} stockCount Number of stock rows (rows 2 to stockCount+1).
   * @return {number} The row index of the TOTAL row.
   */
  appendDashboardTotalRow: function(stockCount) {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const cols = CONFIG.DASHBOARD_COLS;
    const colCount = CONFIG.DASHBOARD_COL_COUNT;
    const T = stockCount + 2; // TOTAL row index (header=1, stocks=2..N+1, total=N+2)
    const S = 2;              // First stock row
    const E = T - 1;          // Last stock row

    const cDayChange = Utils.colToLetter(cols.DAY_CHANGE_ABS);
    const cCostBasis = Utils.colToLetter(cols.COST_BASIS);
    const cMktValue = Utils.colToLetter(cols.MARKET_VALUE);
    const cGainAbs = Utils.colToLetter(cols.GAIN_LOSS_ABS);
    const cWeightPct = Utils.colToLetter(cols.WEIGHT_PCT);

    const row = new Array(colCount).fill('');

    row[cols.TICKER - 1] = 'TOTAL';
    row[cols.DAY_CHANGE_ABS - 1] = `=SUM(${cDayChange}${S}:${cDayChange}${E})`;
    row[cols.COST_BASIS - 1] = `=SUM(${cCostBasis}${S}:${cCostBasis}${E})`;
    row[cols.MARKET_VALUE - 1] = `=SUM(${cMktValue}${S}:${cMktValue}${E})`;
    row[cols.GAIN_LOSS_PCT - 1] = `=IF(${cCostBasis}${T}>0,(${cMktValue}${T}-${cCostBasis}${T})/${cCostBasis}${T},"")`;
    row[cols.GAIN_LOSS_ABS - 1] = `=SUM(${cGainAbs}${S}:${cGainAbs}${E})`;
    row[cols.WEIGHT_PCT - 1] = `=SUM(${cWeightPct}${S}:${cWeightPct}${E})`;

    sheet.appendRow(row);

    // Format TOTAL row: bold + top border
    const totalRange = sheet.getRange(T, 1, 1, colCount);
    totalRange.setFontWeight('bold');
    totalRange.setBorder(true, null, null, null, null, null,
      SpreadsheetApp.BorderStyle.SOLID_MEDIUM, null);

    return T;
  },

  /**
   * Sets Weight % formulas for each stock row, referencing the TOTAL row's Market Value.
   * @param {number} stockCount Number of stock rows.
   * @param {number} totalRowIdx The TOTAL row index.
   */
  setDashboardWeightFormulas: function(stockCount, totalRowIdx) {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const cols = CONFIG.DASHBOARD_COLS;
    const cMktValue = Utils.colToLetter(cols.MARKET_VALUE); // F

    for (let r = 2; r <= stockCount + 1; r++) {
      const formula = `=IF(${cMktValue}$${totalRowIdx}>0,${cMktValue}${r}/${cMktValue}$${totalRowIdx},"")`;
      sheet.getRange(r, cols.WEIGHT_PCT).setFormula(formula);
    }
  },

  /**
   * Applies custom number formatting and conditional formatting to Dashboard columns.
   * 1. Market Cap (Col J): Shortened billions/millions.
   * 2. Conditional Formatting (Blue > 0, Red < 0): Change %, Day Change $, Gain/Loss %, Gain/Loss $.
   * @param {Sheet} [targetSheet] Optional sheet object to format (for testing).
   */
  /**
   * Applies custom number formatting and conditional formatting to columns.
   * Universal format for Dashboard and Log sheets (since column indices match for these fields).
   * 1. Market Cap (Col J): Shortened billions/millions.
   * 2. Conditional Formatting (Blue > 0, Red < 0): Change %, Day Change $, Gain/Loss %, Gain/Loss $.
   *
   * @param {Sheet} [targetSheet] Optional sheet object. If null, defaults to Dashboard.
   * @param {number} [numRowsToFormat] Optional number of rows to format. If null, uses maxRows.
   */
  applyColumnFormats: function(targetSheet, numRowsToFormat) {
    const sheet = targetSheet || this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const maxRows = sheet.getMaxRows();
    
    // If specific row count provided, use it (clipped to maxRows). Else use whole sheet.
    const effectiveMaxRow = numRowsToFormat ? Math.min(numRowsToFormat + 1, maxRows) : maxRows;
    
    if (effectiveMaxRow < 2) return;

    const cols = CONFIG.DASHBOARD_COLS; // Indices match LOG_COLS for these specific fields
    const numRows = effectiveMaxRow - 1;
    
    // --- 1. Number Formatting ---
    
    // 1a. Market Cap Format: [<999950]$0.0,"K";[<999950000]$0.0,,"M";$0.0,,,"B"
    // Apply to range J2:J(lastRow)
    const marketCapRange = sheet.getRange(2, cols.MARKET_CAP, numRows, 1);
    marketCapRange.setNumberFormat('[<999950]$0.0,"K";[<999950000]$0.0,,"M";$0.0,,,"B"');

    // 1b. Currency Format: $#,##0.00
    // Columns: Price, Day Change $, Cost Basis, Market Value, Gain/Loss $
    const currencyCols = [
      cols.PRICE,
      cols.DAY_CHANGE_ABS,
      cols.COST_BASIS,
      cols.MARKET_VALUE,
      cols.GAIN_LOSS_ABS
    ];
    
    currencyCols.forEach(colIndex => {
      sheet.getRange(2, colIndex, numRows, 1).setNumberFormat('$#,##0.00');
    });

    // 1c. Percent Format: 0.00%
    // Columns: Change %, Gain/Loss %, Weight %, FCF Yield, Gross Margin, Op Margin, ROE, ROIC, Rev Growth, EPS Growth, Target Upside
    const percentCols = [
      cols.CHANGE_PCT,
      cols.GAIN_LOSS_PCT,
      cols.WEIGHT_PCT,
      cols.FCF_YIELD,
      cols.GROSS_MARGIN,
      cols.OP_MARGIN,
      cols.ROE,
      cols.ROIC,
      cols.REV_GROWTH,
      cols.EPS_GROWTH,
      cols.TARGET_UPSIDE
    ];
    
    percentCols.forEach(colIndex => {
      sheet.getRange(2, colIndex, numRows, 1).setNumberFormat('0.00%');
    });
    
    // --- 2. Conditional Formatting ---
    // Columns to format: Change %, Day Change $, Gain/Loss %, Gain/Loss $
    const targetCols = [
      cols.CHANGE_PCT,
      cols.DAY_CHANGE_ABS,
      cols.GAIN_LOSS_PCT,
      cols.GAIN_LOSS_ABS
    ];
    
    // Clear existing rules to avoid duplicates
    sheet.clearConditionalFormatRules();
    
    const rules = [];
    
    targetCols.forEach(colIndex => {
      const range = sheet.getRange(2, colIndex, numRows, 1);
      
      // Rule 1: Greater than 0 -> Light Blue (#cfe2f3)
      const positiveRule = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberGreaterThan(0)
        .setBackground('#cfe2f3')
        .setRanges([range])
        .build();
        
      // Rule 2: Less than 0 -> Light Red (#f4cccc)
      const negativeRule = SpreadsheetApp.newConditionalFormatRule()
        .whenNumberLessThan(0)
        .setBackground('#f4cccc')
        .setRanges([range])
        .build();
        
      rules.push(positiveRule);
      rules.push(negativeRule);
    });
    
    sheet.setConditionalFormatRules(rules);

    // Utils.log(`Applied formats to ${sheet.getName()}`);
  },

  // ==================== LOG SHEET FUNCTIONS ====================

  /**
   * Gets the log sheet name for a ticker.
   */
  getLogSheetName: function(ticker) {
    return CONFIG.SHEET_NAMES.LOG_PREFIX + ticker.toUpperCase();
  },

  /**
   * Returns Log sheet headers (matches LOG_COLS order).
   */
  getLogHeaders: function() {
    return [
      'Date', 'Price $', 'Change %', 'Day Change $',
      'Cost Basis $', 'Market Value $', 'Gain/Loss %', 'Gain/Loss $', 'Weight %',
      'Market Cap $', 'P/E', 'Fwd P/E', 'PEG', 'P/S', 'P/B', 'EV/EBITDA', 'FCF Yield %',
      'Gross Margin %', 'Op Margin %', 'ROE %', 'ROIC %',
      'Rev Growth %', 'EPS Growth %',
      'Current Ratio', 'Debt/Equity',
      'RSI', 'Target Upside %',
      'System Event'
    ];
  },

  /**
   * Initializes a Log sheet for a ticker with headers.
   * Creates the sheet if it doesn't exist.
   * Updates headers if they are outdated.
   * @param {string} ticker The stock ticker symbol.
   * @return {Sheet} The log sheet object.
   */
  initLogSheet: function(ticker) {
    const sheetName = this.getLogSheetName(ticker);
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    const headers = this.getLogHeaders();

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Utils.log(`Created new log sheet: ${sheetName}`);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    } else {
      // Update headers if they differ (auto-update existing sheets)
      const currentHeaders = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
      const headersChanged = JSON.stringify(currentHeaders) !== JSON.stringify(headers);
      
      if (headersChanged) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
        Utils.log(`Updated log sheet headers for ${sheetName}`);
      }
    }
    
    // Ensure frozen panes: 1 row, 1 column
    sheet.setFrozenRows(1);
    sheet.setFrozenColumns(1);
    
    // Apply Formatting (applies to existing sheets too)
    this.applyColumnFormats(sheet);

    return sheet;
  },

  /**
   * Upserts a daily snapshot row to a ticker's Log sheet.
   * If today's entry exists, it overwrites. Otherwise, it appends a new row.
   * @param {string} ticker The stock ticker symbol.
   * @param {Object} data The financial data from readDashboardValues().
   */
  appendLogRow: function(ticker, data) {
    const sheet = this.initLogSheet(ticker);
    const today = Utils.formatDate(new Date());

    const cols = CONFIG.LOG_COLS;
    const colCount = CONFIG.LOG_COL_COUNT;
    const rowData = new Array(colCount).fill('');
    const v = function(val) { return val != null ? val : ''; };

    rowData[cols.DATE - 1] = today;
    rowData[cols.PRICE - 1] = v(data.price);
    rowData[cols.CHANGE_PCT - 1] = v(data.changePct);
    rowData[cols.DAY_CHANGE_ABS - 1] = v(data.dayChangeAbs);
    rowData[cols.COST_BASIS - 1] = v(data.costBasis);
    rowData[cols.MARKET_VALUE - 1] = v(data.marketValue);
    rowData[cols.GAIN_LOSS_PCT - 1] = v(data.gainLossPct);
    rowData[cols.GAIN_LOSS_ABS - 1] = v(data.gainLossAbs);
    rowData[cols.WEIGHT_PCT - 1] = v(data.weightPct);
    rowData[cols.MARKET_CAP - 1] = v(data.marketCap);
    rowData[cols.PE - 1] = v(data.pe);
    rowData[cols.FWD_PE - 1] = v(data.fwdPe);
    rowData[cols.PEG - 1] = v(data.peg);
    rowData[cols.PS - 1] = v(data.ps);
    rowData[cols.PB - 1] = v(data.pb);
    rowData[cols.EV_EBITDA - 1] = v(data.evEbitda);
    rowData[cols.FCF_YIELD - 1] = v(data.fcfYield);
    rowData[cols.GROSS_MARGIN - 1] = v(data.grossMargin);
    rowData[cols.OP_MARGIN - 1] = v(data.opMargin);
    rowData[cols.ROE - 1] = v(data.roe);
    rowData[cols.ROIC - 1] = v(data.roic);
    rowData[cols.REV_GROWTH - 1] = v(data.revGrowth);
    rowData[cols.EPS_GROWTH - 1] = v(data.epsGrowth);
    rowData[cols.CURRENT_RATIO - 1] = v(data.currentRatio);
    rowData[cols.DEBT_EQUITY - 1] = v(data.debtEquity);
    rowData[cols.RSI - 1] = v(data.rsi);
    rowData[cols.TARGET_UPSIDE - 1] = v(data.targetUpside);
    rowData[cols.SYSTEM_EVENT - 1] = data.systemMemo || '';

    // Search for existing entry with today's date
    const lastRow = sheet.getLastRow();
    let existingRowIndex = -1;

    if (lastRow >= 2) {
      const dateColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < dateColumn.length; i++) {
        if (Utils.formatDate(dateColumn[i][0]) === today) {
          existingRowIndex = i + 2;
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      sheet.getRange(existingRowIndex, 1, 1, colCount).setValues([rowData]);
      Utils.log(`Updated log entry for ${ticker} on ${today} (row ${existingRowIndex})`);
    } else {
      sheet.appendRow(rowData);
      Utils.log(`Appended new log entry for ${ticker} on ${today}`);
    }
  },

  // ==================== BACKUP / RESTORE ====================

  /**
   * Creates a full backup of the Dashboard sheet before clearing.
   * Copies the entire sheet (values, formulas, formatting) to Dashboard_Backup.
   * If Dashboard_Backup already exists, it is replaced.
   */
  backupDashboard: function() {
    const ss = this.getSpreadsheet();
    const dashboard = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD);

    if (!dashboard || dashboard.getLastRow() < 2) {
      Utils.log('Dashboard is empty. Skipping backup.');
      return;
    }

    // Delete existing backup sheet if it exists
    const existingBackup = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD_BACKUP);
    if (existingBackup) {
      ss.deleteSheet(existingBackup);
      Utils.log('Deleted previous Dashboard_Backup.');
    }

    // Copy Dashboard → Dashboard_Backup
    const backupSheet = dashboard.copyTo(ss);
    backupSheet.setName(CONFIG.SHEET_NAMES.DASHBOARD_BACKUP);

    // Move backup sheet to end to keep it out of the way
    ss.setActiveSheet(backupSheet);
    ss.moveActiveSheet(ss.getNumSheets());

    Utils.log(`Dashboard backed up to "${CONFIG.SHEET_NAMES.DASHBOARD_BACKUP}" (${dashboard.getLastRow()} rows).`);
  },

  /**
   * Restores Dashboard from Dashboard_Backup.
   * Used when updateDailyReport fails mid-execution.
   * @return {boolean} True if restore succeeded, false if no backup found.
   */
  restoreDashboard: function() {
    const ss = this.getSpreadsheet();
    const backup = ss.getSheetByName(CONFIG.SHEET_NAMES.DASHBOARD_BACKUP);

    if (!backup || backup.getLastRow() < 2) {
      Utils.log('No valid backup found. Cannot restore.');
      return false;
    }

    // Clear current Dashboard
    const dashboard = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    dashboard.clear();

    // Copy all data from backup
    const lastRow = backup.getLastRow();
    const lastCol = backup.getLastColumn();

    if (lastRow > 0 && lastCol > 0) {
      const data = backup.getRange(1, 1, lastRow, lastCol).getValues();
      dashboard.getRange(1, 1, lastRow, lastCol).setValues(data);
      dashboard.setFrozenRows(1);
      dashboard.getRange(1, 1, 1, lastCol).setFontWeight('bold');
    }

    Utils.log(`Dashboard restored from backup (${lastRow} rows).`);
    return true;
  }
};
