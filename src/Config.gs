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

  // Dashboard Sheet (33 columns)
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
    PE: 11,              // K - API P/E (static)
    TODAY_PE: 12,        // L - Real-time P/E (Price / EPS)
    EPS: 13,             // M - TTM EPS from API (for Today P/E formula)
    FWD_PE: 14,          // N - API Forward P/E (static)
    TODAY_FWD_PE: 15,    // O - Real-time Forward P/E (Price / Forward EPS)
    FWD_EPS: 16,         // P - Forward EPS (next 4Q sum, for formula)
    PEG: 17,             // Q
    PS: 18,              // R
    PB: 19,              // S
    EV_EBITDA: 20,       // T
    FCF_YIELD: 21,       // U
    GROSS_MARGIN: 22,    // V
    OP_MARGIN: 23,       // W
    ROE: 24,             // X
    ROIC: 25,            // Y
    REV_GROWTH: 26,      // Z
    EPS_GROWTH: 27,      // AA
    CURRENT_RATIO: 28,   // AB
    DEBT_EQUITY: 29,     // AC
    RSI: 30,             // AD
    TARGET_UPSIDE: 31,   // AE
    SYSTEM_MEMO: 32,     // AF
    LAST_UPDATED: 33     // AG
  },
  DASHBOARD_COL_COUNT: 33,

  // Log Sheet (31 columns - mirrors Dashboard minus Ticker/Last Updated/Fwd EPS, plus Date)
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
    PE: 11,              // K - API P/E (static)
    TODAY_PE: 12,        // L - Real-time P/E
    FWD_PE: 13,          // M - API Forward P/E (static)
    TODAY_FWD_PE: 14,    // N - Real-time Forward P/E
    PEG: 15,             // O
    PS: 16,              // P
    PB: 17,              // Q
    EV_EBITDA: 18,       // R
    FCF_YIELD: 19,       // S
    GROSS_MARGIN: 20,    // T
    OP_MARGIN: 21,       // U
    ROE: 22,             // V
    ROIC: 23,            // W
    REV_GROWTH: 24,      // X
    EPS_GROWTH: 25,      // Y
    CURRENT_RATIO: 26,   // Z
    DEBT_EQUITY: 27,     // AA
    RSI: 28,             // AB
    TARGET_UPSIDE: 29,   // AC
    SYSTEM_EVENT: 30     // AD
  },
  LOG_COL_COUNT: 30
};
