# Phase 1 Code Implementation

Please copy the following code into your Google Apps Script project. create separate files for each section.

## 1. Config.gs
```javascript
/**
 * Config.gs
 * Configuration constants for the Daily Invest Report script.
 */

const CONFIG = {
  // --- API ---
  FMP_API_KEY: PropertiesService.getScriptProperties().getProperty('FMP_API_KEY'),
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  
  FMP_BASE_URL: 'https://financialmodelingprep.com/api/v3',
  GEMINI_MODEL: 'gemini-1.5-flash',

  // --- Spreadsheet ---
  SHEET_NAMES: {
    STOCK_LIST: 'Stock List',
    DASHBOARD: 'Dashboard',
    LOG_PREFIX: 'Log_'
  },

  // --- Column Indices (1-based) ---
  // Stock List Sheet
  STOCK_LIST_COLS: {
    TICKER: 1,      // A
    ADD_DATE: 2,    // B
    BUY_DATE: 3,    // C
    BUY_PRICE: 4,   // D
    USER_MEMO: 5,   // E
    TAG: 6          // F
  },

  // Dashboard Sheet
  DASHBOARD_COLS: {
    TICKER: 1,           // A
    PRICE: 2,            // B
    CHANGE_PCT: 3,       // C
    GAIN_LOSS_PCT: 4,    // D
    GAIN_LOSS_ABS: 5,    // E
    MARKET_CAP: 6,       // F
    PE: 7,               // G
    FWD_PE: 8,           // H
    PEG: 9,              // I
    PS: 10,              // J
    PB: 11,              // K
    EV_EBITDA: 12,       // L
    FCF_YIELD: 13,       // M
    GROSS_MARGIN: 14,    // N
    OP_MARGIN: 15,       // O
    ROE: 16,             // P
    ROIC: 17,            // Q
    REV_GROWTH: 18,      // R
    EPS_GROWTH: 19,      // S
    CURRENT_RATIO: 20,   // T
    DEBT_EQUITY: 21,     // U
    RSI: 22,             // V
    TARGET_UPSIDE: 23,   // W
    SYSTEM_MEMO: 24,     // X
    LAST_UPDATED: 25     // Y
  },

  // Log Sheet
  LOG_COLS: {
    DATE: 1,
    PRICE: 2,
    FWD_PE: 3,
    PEG: 4,
    RSI: 5,
    SYSTEM_EVENT: 6
  }
};
```

## 2. Utils.gs
```javascript
/**
 * Utils.gs
 * Utility functions for date formatting, logging, and common operations.
 */

const Utils = {
  /**
   * Formats a date object to 'YYYY-MM-DD' string.
   * @param {Date} date The date object to format.
   * @return {string} The formatted date string.
   */
  formatDate: function(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  },

  /**
   * Logs messages to the execution log with a timestamp.
   * @param {string} message The message to log.
   */
  log: function(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  },

  /**
   * Safely parses a float, returning 0 or null if invalid.
   * @param {any} value The value to parse.
   * @return {number} The parsed number or 0.
   */
  parseFloat: function(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  },
  
  /**
   * Calculates percentage change.
   * @param {number} current Current value.
   * @param {number} previous Previous value.
   * @return {number} Percentage change (e.g., 0.05 for 5%).
   */
  calculateChange: function(current, previous) {
    if (!previous || previous === 0) return 0;
    return (current - previous) / previous;
  }
};
```

## 3. Sheet_Manager.gs
```javascript
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
```

## 4. Main.gs
```javascript
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
```
