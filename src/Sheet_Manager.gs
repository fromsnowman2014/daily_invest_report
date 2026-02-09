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
   * @return {Array<Object>} Array of stock objects {ticker, addDate, buyPrice, userMemo}.
   */
  getStockList: function() {
    const sheet = this.ensureSheet(CONFIG.SHEET_NAMES.STOCK_LIST);
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      Utils.log('Stock List is empty.');
      return [];
    }
    
    // Read from A2 to F{lastRow}
    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    const stockList = [];
    
    data.forEach(row => {
      const ticker = row[0]; // A: Ticker
      if (ticker) {
        stockList.push({
          ticker: ticker.toString().trim().toUpperCase(),
          addDate: row[1], // B: Add Date
          buyDate: row[2], // C: Buy Date
          buyPrice: row[3], // D: Buy Price
          userMemo: row[4], // E: User Memo
          tag: row[5]       // F: Tag
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
  }
};
