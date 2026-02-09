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
