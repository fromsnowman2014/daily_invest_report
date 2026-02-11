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
    DASHBOARD_BACKUP: 'Dashboard_Backup',
    LOG_PREFIX: 'Log_'
  },

  // --- Column Indices (1-based) ---
  // Stock List Sheet
  STOCK_LIST_COLS: {
    TICKER: 1,      // A
    ADD_DATE: 2,    // B
    BUY_DATE: 3,    // C
    BUY_PRICE: 4,   // D
    QUANTITY: 5,    // E
    USER_MEMO: 6,   // F
    TAG: 7          // G
  },

  // Dashboard Sheet (29 columns)
  DASHBOARD_COLS: {
    TICKER: 1,           // A
    PRICE: 2,            // B
    CHANGE_PCT: 3,       // C
    DAY_CHANGE_ABS: 4,   // D - Day's P&L ($)
    COST_BASIS: 5,       // E - Total invested (AvgPrice × Qty)
    MARKET_VALUE: 6,     // F - Current value (Price × Qty)
    GAIN_LOSS_PCT: 7,    // G - Unrealized gain %
    GAIN_LOSS_ABS: 8,    // H - Unrealized gain $
    WEIGHT_PCT: 9,       // I - Portfolio allocation %
    MARKET_CAP: 10,      // J
    PE: 11,              // K
    FWD_PE: 12,          // L
    PEG: 13,             // M
    PS: 14,              // N
    PB: 15,              // O
    EV_EBITDA: 16,       // P
    FCF_YIELD: 17,       // Q
    GROSS_MARGIN: 18,    // R
    OP_MARGIN: 19,       // S
    ROE: 20,             // T
    ROIC: 21,            // U
    REV_GROWTH: 22,      // V
    EPS_GROWTH: 23,      // W
    CURRENT_RATIO: 24,   // X
    DEBT_EQUITY: 25,     // Y
    RSI: 26,             // Z
    TARGET_UPSIDE: 27,   // AA
    SYSTEM_MEMO: 28,     // AB
    LAST_UPDATED: 29     // AC
  },
  DASHBOARD_COL_COUNT: 29,

  // Log Sheet (28 columns - mirrors Dashboard minus Ticker/Last Updated, plus Date)
  LOG_COLS: {
    DATE: 1,             // A
    PRICE: 2,            // B
    CHANGE_PCT: 3,       // C
    DAY_CHANGE_ABS: 4,   // D
    COST_BASIS: 5,       // E
    MARKET_VALUE: 6,     // F
    GAIN_LOSS_PCT: 7,    // G
    GAIN_LOSS_ABS: 8,    // H
    WEIGHT_PCT: 9,       // I
    MARKET_CAP: 10,      // J
    PE: 11,              // K
    FWD_PE: 12,          // L
    PEG: 13,             // M
    PS: 14,              // N
    PB: 15,              // O
    EV_EBITDA: 16,       // P
    FCF_YIELD: 17,       // Q
    GROSS_MARGIN: 18,    // R
    OP_MARGIN: 19,       // S
    ROE: 20,             // T
    ROIC: 21,            // U
    REV_GROWTH: 22,      // V
    EPS_GROWTH: 23,      // W
    CURRENT_RATIO: 24,   // X
    DEBT_EQUITY: 25,     // Y
    RSI: 26,             // Z
    TARGET_UPSIDE: 27,   // AA
    SYSTEM_EVENT: 28     // AB
  },
  LOG_COL_COUNT: 28
};
