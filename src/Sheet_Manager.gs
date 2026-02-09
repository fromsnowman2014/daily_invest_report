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

    // Read from A2 to G{lastRow} (7 columns: Ticker, Add Date, Buy Date, Buy Price, Quantity, Memo, Tag)
    const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
    const stockList = [];

    data.forEach(row => {
      const ticker = row[0]; // A: Ticker
      if (ticker) {
        stockList.push({
          ticker: ticker.toString().trim().toUpperCase(),
          addDate: row[1],    // B: Add Date
          buyDate: row[2],    // C: Buy Date
          buyPrice: row[3],   // D: Buy Price
          quantity: row[4],   // E: Quantity (Number of shares)
          userMemo: row[5],   // F: User Memo
          tag: row[6]         // G: Tag
        });
      }
    });

    return stockList;
  },

  /**
   * Reads the current Dashboard data for caching purposes.
   * Called BEFORE initDashboard() clears the sheet.
   * @return {Object} Map of ticker -> cached financial data
   */
  getDashboardData: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return {}; // Header only or empty

    const data = sheet.getRange(2, 1, lastRow - 1, 25).getValues();
    const dashboardMap = {};

    data.forEach(row => {
      const ticker = row[CONFIG.DASHBOARD_COLS.TICKER - 1];
      if (ticker) {
        dashboardMap[ticker] = {
          price: row[CONFIG.DASHBOARD_COLS.PRICE - 1],
          pe: row[CONFIG.DASHBOARD_COLS.PE - 1],
          fwdPe: row[CONFIG.DASHBOARD_COLS.FWD_PE - 1],
          peg: row[CONFIG.DASHBOARD_COLS.PEG - 1],
          ps: row[CONFIG.DASHBOARD_COLS.PS - 1],
          pb: row[CONFIG.DASHBOARD_COLS.PB - 1],
          evEbitda: row[CONFIG.DASHBOARD_COLS.EV_EBITDA - 1],
          fcfYield: row[CONFIG.DASHBOARD_COLS.FCF_YIELD - 1],
          grossMargin: row[CONFIG.DASHBOARD_COLS.GROSS_MARGIN - 1],
          opMargin: row[CONFIG.DASHBOARD_COLS.OP_MARGIN - 1],
          roe: row[CONFIG.DASHBOARD_COLS.ROE - 1],
          roic: row[CONFIG.DASHBOARD_COLS.ROIC - 1],
          revGrowth: row[CONFIG.DASHBOARD_COLS.REV_GROWTH - 1],
          epsGrowth: row[CONFIG.DASHBOARD_COLS.EPS_GROWTH - 1],
          currentRatio: row[CONFIG.DASHBOARD_COLS.CURRENT_RATIO - 1],
          debtEquity: row[CONFIG.DASHBOARD_COLS.DEBT_EQUITY - 1],
          rsi: row[CONFIG.DASHBOARD_COLS.RSI - 1],
          targetUpside: row[CONFIG.DASHBOARD_COLS.TARGET_UPSIDE - 1],
          systemMemo: row[CONFIG.DASHBOARD_COLS.SYSTEM_MEMO - 1],
          lastUpdated: row[CONFIG.DASHBOARD_COLS.LAST_UPDATED - 1]
        };
      }
    });

    return dashboardMap;
  },

  /**
   * Reads all Dashboard values AFTER formulas have been calculated.
   * Used in Phase 2 to get actual GOOGLEFINANCE values + all metrics for Log entries.
   * @return {Object} Map of ticker -> all metric values
   */
  readDashboardValues: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) return {};

    const data = sheet.getRange(2, 1, lastRow - 1, 25).getValues();
    const cols = CONFIG.DASHBOARD_COLS;
    const result = {};

    data.forEach(row => {
      const ticker = row[cols.TICKER - 1];
      if (ticker) {
        const toNum = function(val) {
          return (typeof val === 'number' && !isNaN(val)) ? val : (val || null);
        };
        result[ticker] = {
          price: toNum(row[cols.PRICE - 1]),
          changePct: toNum(row[cols.CHANGE_PCT - 1]),
          gainLossPct: toNum(row[cols.GAIN_LOSS_PCT - 1]),
          gainLossAbs: toNum(row[cols.GAIN_LOSS_ABS - 1]),
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
   */
  initDashboard: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    sheet.clear();

    // Set Header
    const headers = [
      'Ticker', 'Price', 'Change %', 'Gain/Loss %', 'Gain/Loss $', 'Market Cap',
      'P/E', 'Fwd P/E', 'PEG', 'P/S', 'P/B', 'EV/EBITDA', 'FCF Yield',
      'Gross Margin', 'Op Margin', 'ROE', 'ROIC',
      'Rev Growth', 'EPS Growth',
      'Current Ratio', 'Debt/Equity',
      'RSI', 'Target Upside',
      'System Memo', 'Last Updated'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  },

  /**
   * Appends or updates a row in the Dashboard sheet.
   * Supports hybrid mode: GOOGLEFINANCE formulas + Static Values.
   * @param {Object} data Financial data object.
   */
  appendDashboardRow: function(data) {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const ticker = data.ticker;

    // GOOGLEFINANCE Formulas
    const priceFormula = `=GOOGLEFINANCE("${ticker}", "price")`;
    const changePctFormula = `=GOOGLEFINANCE("${ticker}", "changepct")/100`;
    const marketCapFormula = `=GOOGLEFINANCE("${ticker}", "marketcap")`;
    const peFormulaLive = `=GOOGLEFINANCE("${ticker}", "pe")`;

    // Row index for formula references
    const newRowIdx = sheet.getLastRow() + 1;
    const priceColLetter = 'B'; // Column 2

    const buyPrice = data.buyPrice || 0;
    const quantity = data.quantity || 0;

    const gainLossPctFormula = buyPrice > 0
      ? `=(${priceColLetter}${newRowIdx} - ${buyPrice}) / ${buyPrice}`
      : "";

    const gainLossAbsFormula = (buyPrice > 0 && quantity > 0)
      ? `=(${priceColLetter}${newRowIdx} - ${buyPrice}) * ${quantity}`
      : "";

    // Prepare row data array (25 columns)
    const row = new Array(25).fill('');
    const cols = CONFIG.DASHBOARD_COLS;

    // 1. Static ID Data
    row[cols.TICKER - 1] = ticker;

    // 2. Formulas (Real-time from GOOGLEFINANCE)
    row[cols.PRICE - 1] = priceFormula;
    row[cols.CHANGE_PCT - 1] = changePctFormula;
    row[cols.GAIN_LOSS_PCT - 1] = gainLossPctFormula;
    row[cols.GAIN_LOSS_ABS - 1] = gainLossAbsFormula;
    row[cols.MARKET_CAP - 1] = marketCapFormula;

    // 3. Alpha Vantage / Hybrid Data (use ?? to preserve 0 values)
    if (data.pe && data.pe !== '') {
      row[cols.PE - 1] = data.pe;
    } else {
      row[cols.PE - 1] = peFormulaLive;
    }

    row[cols.FWD_PE - 1] = data.fwdPe != null ? data.fwdPe : '';
    row[cols.PEG - 1] = data.peg != null ? data.peg : '';
    row[cols.PS - 1] = data.ps != null ? data.ps : '';
    row[cols.PB - 1] = data.pb != null ? data.pb : '';
    row[cols.EV_EBITDA - 1] = data.evEbitda != null ? data.evEbitda : '';
    row[cols.FCF_YIELD - 1] = data.fcfYield != null ? data.fcfYield : '';
    row[cols.GROSS_MARGIN - 1] = data.grossMargin != null ? data.grossMargin : '';
    row[cols.OP_MARGIN - 1] = data.opMargin != null ? data.opMargin : '';
    row[cols.ROE - 1] = data.roe != null ? data.roe : '';
    row[cols.ROIC - 1] = data.roic != null ? data.roic : '';
    row[cols.REV_GROWTH - 1] = data.revGrowth != null ? data.revGrowth : '';
    row[cols.EPS_GROWTH - 1] = data.epsGrowth != null ? data.epsGrowth : '';
    row[cols.CURRENT_RATIO - 1] = data.currentRatio != null ? data.currentRatio : '';
    row[cols.DEBT_EQUITY - 1] = data.debtEquity != null ? data.debtEquity : '';
    row[cols.RSI - 1] = data.rsi != null ? data.rsi : '';
    row[cols.TARGET_UPSIDE - 1] = data.targetUpside != null ? data.targetUpside : '';
    row[cols.SYSTEM_MEMO - 1] = data.systemMemo || '';

    // 4. Metadata
    row[cols.LAST_UPDATED - 1] = data.lastUpdated || Utils.formatDate(new Date());

    sheet.appendRow(row);
  },

  // ==================== LOG SHEET FUNCTIONS ====================

  /**
   * Gets the log sheet name for a ticker.
   * @param {string} ticker The stock ticker symbol.
   * @return {string} The log sheet name (e.g., 'Log_NVDA').
   */
  getLogSheetName: function(ticker) {
    return CONFIG.SHEET_NAMES.LOG_PREFIX + ticker.toUpperCase();
  },

  /**
   * Returns the standard Log sheet headers (matches LOG_COLS order).
   * @return {Array<string>} Header labels.
   */
  getLogHeaders: function() {
    return [
      'Date', 'Price', 'Change %', 'Gain/Loss %', 'Gain/Loss $', 'Market Cap',
      'P/E', 'Fwd P/E', 'PEG', 'P/S', 'P/B', 'EV/EBITDA', 'FCF Yield',
      'Gross Margin', 'Op Margin', 'ROE', 'ROIC',
      'Rev Growth', 'EPS Growth',
      'Current Ratio', 'Debt/Equity',
      'RSI', 'Target Upside',
      'System Event'
    ];
  },

  /**
   * Initializes a Log sheet for a ticker with headers.
   * Creates the sheet if it doesn't exist.
   * Updates headers if they are outdated (e.g., old 6-column format).
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
      // Check if headers need updating (old format had fewer columns)
      const currentHeaderCount = sheet.getLastColumn();
      if (currentHeaderCount < headers.length) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
        Utils.log(`Updated log sheet headers for ${sheetName} (${currentHeaderCount} → ${headers.length} columns)`);
      }
    }

    return sheet;
  },

  /**
   * Upserts (update or insert) a daily snapshot row to a ticker's Log sheet.
   * If today's entry exists, it overwrites. Otherwise, it appends a new row.
   * Logs all Dashboard metrics (mirrors DASHBOARD_COLS, minus Ticker/Last Updated).
   * @param {string} ticker The stock ticker symbol.
   * @param {Object} data The financial data object from readDashboardValues().
   */
  appendLogRow: function(ticker, data) {
    const sheet = this.initLogSheet(ticker);
    const today = Utils.formatDate(new Date());

    // Build row data based on CONFIG.LOG_COLS (24 columns)
    const cols = CONFIG.LOG_COLS;
    const colCount = CONFIG.LOG_COL_COUNT;
    const rowData = new Array(colCount).fill('');
    const v = function(val) { return val != null ? val : ''; };

    rowData[cols.DATE - 1] = today;
    rowData[cols.PRICE - 1] = v(data.price);
    rowData[cols.CHANGE_PCT - 1] = v(data.changePct);
    rowData[cols.GAIN_LOSS_PCT - 1] = v(data.gainLossPct);
    rowData[cols.GAIN_LOSS_ABS - 1] = v(data.gainLossAbs);
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
          existingRowIndex = i + 2; // +2 because: 0-indexed + header row
          break;
        }
      }
    }

    if (existingRowIndex > 0) {
      // Update existing row (overwrite)
      sheet.getRange(existingRowIndex, 1, 1, colCount).setValues([rowData]);
      Utils.log(`Updated log entry for ${ticker} on ${today} (row ${existingRowIndex})`);
    } else {
      // Append new row
      sheet.appendRow(rowData);
      Utils.log(`Appended new log entry for ${ticker} on ${today}`);
    }
  }
};
