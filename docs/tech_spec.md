# 🛠️ Daily Invest Report - Technical Documentation

This document outlines the technical specifications for implementing the "Google Sheets Intelligent Stock Tracker" using Google Apps Script (GAS).

---

## 1. Project Structure (Google Apps Script)

The GAS project will be organized into the following files to ensure modularity and maintainability.

| File Name | Purpose |
| :--- | :--- |
| `Config.gs` | Configuration constants (API Keys, Sheet Names, Thresholds). |
| `Main.gs` | Entry point for triggers and orchestration logic. |
| `FMP_Service.gs` | Functions to interact with Financial Modeling Prep API. |
| `Gemini_Service.gs` | Functions to interact with Google Gemini API. |
| `Sheet_Manager.gs` | Functions to read/write/format Google Sheets. |
| `Utils.gs` | Helper functions (Date formatting, Error handling). |

---

## 2. Data Structures & Constants (`Config.gs`)

```javascript
const CONFIG = {
  FMP_API_KEY: PropertiesService.getScriptProperties().getProperty('FMP_API_KEY'),
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
  
  SHEET_NAMES: {
    STOCK_LIST: 'Stock List',
    DASHBOARD: 'Dashboard',
    LOG_PREFIX: 'Log_'
  },
  
  // Column Indices (1-based for getRange)
  INDICES: {
    STOCK_LIST: { TICKER: 1, ADD_DATE: 2, BUY_DATE: 3, BUY_PRICE: 4, MEMO: 5, TAG: 6 },
    DASHBOARD: { TICKER: 1, PRICE: 2, CHANGE: 3, MY_RETURN: 4, ... } 
  }
};
```

---

## 3. API Specifications

### 3.1. Financial Modeling Prep (FMP) API

*   **Base URL:** `https://financialmodelingprep.com/api/v3`
*   **Authentication:** `apikey` query parameter.

#### Required Endpoints

1.  **Key Metrics (TTM)** - *Valuation & Health*
    *   `GET /key-metrics-ttm/{ticker}`
    *   **Fields:** `peRatioTTM`, `pbRatioTTM`, `debtToEquityTTM`, `dividendYieldTTM`, `interestCoverageTTM`

2.  **Ratios (TTM)** - *Profitability & Efficiency*
    *   `GET /ratios-ttm/{ticker}`
    *   **Fields:** `grossProfitMarginTTM`, `operatingProfitMarginTTM`, `returnOnEquityTTM`, `returnOnInvestedCapitalTTM`, `priceToSalesRatioTTM`, `priceEarningsToGrowthRatioTTM` (PEG)

3.  **Quote** - *Real-time Price & Market Cap*
    *   `GET /quote/{ticker}`
    *   **Fields:** `price`, `changesPercentage`, `marketCap`, `eps`, `pe`

4.  **Stock News** - *Analysis Input*
    *   `GET /stock_news?tickers={ticker}&limit=5`
    *   **Fields:** `title`, `text`, `publishedDate`, `site`

### 3.2. Google Gemini API

*   **Model:** `gemini-1.5-flash` (Cost-effective & Fast)
*   **Task:** Summary and Sentiment Analysis.

#### Request Payload
```json
{
  "contents": [{
    "parts": [{
      "text": "Summarize the following news for ${ticker} into one Korean sentence with sentiment keywords (Positive/Negative): \n[News Titles...]"
    }]
  }]
}
```

---

## 4. Function Signatures

### `FMP_Service.gs`
*   `fetchFinancialMetrics(ticker)`: Returns object with merged metrics (Keys: `pe`, `peg`, `roe`, `margin`, etc).
*   `fetchStockNews(ticker)`: Returns array of recent news objects.

### `Gemini_Service.gs`
*   `analyzeNewsSentiment(ticker, newsArray)`: Returns string (System Memo content).

### `Sheet_Manager.gs`
*   `getStockList()`: Returns array of objects `{ticker, addDate, buyPrice, userMemo}`.
*   `updateDashboard(ticker, data)`: Updates the specific row in Dashboard sheet.
*   `appendLog(ticker, data)`: Appends a new row to `Log_{Ticker}` sheet. Creates sheet if missing.
*   `ensureSheetExists(sheetName)`: Helper to create sheet with header if not exists.

---

## 5. Automation Logic (`Main.gs`)

### `updateDailyReport()`
*   **Trigger:** Time-driven (e.g., Daily at 6:45 PM).
*   **Flow:**
    1.  Call `Sheet_Manager.getStockList()`.
    2.  Iterate through each stock:
        *   `try-catch` block for error handling.
        *   Get financial data via `FMP_Service`.
        *   Get news via `FMP_Service` -> Summarize via `Gemini_Service`.
        *   `Sheet_Manager.updateDashboard()`.
        *   `Sheet_Manager.appendLog()`.
