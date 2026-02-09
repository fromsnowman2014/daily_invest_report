/**
 * Config.gs
 * Configuration constants for the Daily Invest Report script.
 */

const CONFIG = {
  // --- API ---
  ALPHA_VANTAGE_API_KEY: PropertiesService.getScriptProperties().getProperty('ALPHA_VANTAGE_API_KEY'),
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  
  ALPHA_VANTAGE_BASE_URL: 'https://www.alphavantage.co/query',
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
    QUANTITY: 5,    // E - Number of shares
    USER_MEMO: 6,   // F
    TAG: 7          // G
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

  // Log Sheet (mirrors Dashboard metrics for historical tracking)
  LOG_COLS: {
    DATE: 1,            // A
    PRICE: 2,           // B
    CHANGE_PCT: 3,      // C
    GAIN_LOSS_PCT: 4,   // D
    GAIN_LOSS_ABS: 5,   // E
    MARKET_CAP: 6,      // F
    PE: 7,              // G
    FWD_PE: 8,          // H
    PEG: 9,             // I
    PS: 10,             // J
    PB: 11,             // K
    EV_EBITDA: 12,      // L
    FCF_YIELD: 13,      // M
    GROSS_MARGIN: 14,   // N
    OP_MARGIN: 15,      // O
    ROE: 16,            // P
    ROIC: 17,           // Q
    REV_GROWTH: 18,     // R
    EPS_GROWTH: 19,     // S
    CURRENT_RATIO: 20,  // T
    DEBT_EQUITY: 21,    // U
    RSI: 22,            // V
    TARGET_UPSIDE: 23,  // W
    SYSTEM_EVENT: 24    // X
  },
  LOG_COL_COUNT: 24
};
