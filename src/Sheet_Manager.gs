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
   * Appends a row to the Dashboard sheet.
   * @param {Object} data The data object containing values.
   */
  appendDashboardRow: function(data) {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.DASHBOARD);
    const row = new Array(25).fill(''); // Initialize 25 columns
    
    const cols = CONFIG.DASHBOARD_COLS;
    
    // Map data to column index (Column Number - 1)
    row[cols.TICKER - 1] = data.ticker;
    row[cols.PRICE - 1] = data.price;
    row[cols.CHANGE_PCT - 1] = data.changePct;
    row[cols.GAIN_LOSS_PCT - 1] = data.gainLossPct;
    row[cols.GAIN_LOSS_ABS - 1] = data.gainLossAbs;
    row[cols.MARKET_CAP - 1] = data.marketCap;
    row[cols.PE - 1] = data.pe;
    row[cols.FWD_PE - 1] = data.fwdPe;
    row[cols.PEG - 1] = data.peg;
    row[cols.PS - 1] = data.ps;
    row[cols.PB - 1] = data.pb;
    row[cols.EV_EBITDA - 1] = data.evEbitda;
    row[cols.FCF_YIELD - 1] = data.fcfYield;
    row[cols.GROSS_MARGIN - 1] = data.grossMargin;
    row[cols.OP_MARGIN - 1] = data.opMargin;
    row[cols.ROE - 1] = data.roe;
    row[cols.ROIC - 1] = data.roic;
    row[cols.REV_GROWTH - 1] = data.revGrowth;
    row[cols.EPS_GROWTH - 1] = data.epsGrowth;
    row[cols.CURRENT_RATIO - 1] = data.currentRatio;
    row[cols.DEBT_EQUITY - 1] = data.debtEquity;
    row[cols.RSI - 1] = data.rsi;
    row[cols.TARGET_UPSIDE - 1] = data.targetUpside;
    row[cols.SYSTEM_MEMO - 1] = data.systemMemo;
    row[cols.LAST_UPDATED - 1] = Utils.formatDate(new Date());

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
   * Initializes a Log sheet for a ticker with headers.
   * Creates the sheet if it doesn't exist.
   * @param {string} ticker The stock ticker symbol.
   * @return {Sheet} The log sheet object.
   */
  initLogSheet: function(ticker) {
    const sheetName = this.getLogSheetName(ticker);
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Utils.log(`Created new log sheet: ${sheetName}`);
      
      // Set Header Row
      const headers = ['Date', 'Price', 'Fwd P/E', 'PEG', 'RSI', 'System Event'];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    
    return sheet;
  },

  /**
   * Upserts (update or insert) a daily snapshot row to a ticker's Log sheet.
   * If today's entry exists, it overwrites. Otherwise, it appends a new row.
   * @param {string} ticker The stock ticker symbol.
   * @param {Object} data The financial data object.
   */
  appendLogRow: function(ticker, data) {
    const sheet = this.initLogSheet(ticker);
    const today = Utils.formatDate(new Date());
    
    // Build row data based on CONFIG.LOG_COLS
    const cols = CONFIG.LOG_COLS;
    const rowData = new Array(6).fill('');
    
    rowData[cols.DATE - 1] = today;
    rowData[cols.PRICE - 1] = data.price;
    rowData[cols.FWD_PE - 1] = data.fwdPe;
    rowData[cols.PEG - 1] = data.peg;
    rowData[cols.RSI - 1] = data.rsi;
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
      sheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
      Utils.log(`Updated log entry for ${ticker} on ${today} (row ${existingRowIndex})`);
    } else {
      // Append new row
      sheet.appendRow(rowData);
      Utils.log(`Appended new log entry for ${ticker} on ${today}`);
    }
  }
};
