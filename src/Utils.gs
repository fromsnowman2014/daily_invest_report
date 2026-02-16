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
   * Safely parses a float, returning null if invalid.
   * Returns null (not 0) so callers can distinguish "no data" from "actual zero".
   * @param {any} value The value to parse.
   * @return {number|null} The parsed number or null.
   */
  parseFloat: function(value) {
    if (value === null || value === undefined || value === '' || value === 'None' || value === '-') {
      return null;
    }
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
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
  },

  /**
   * Converts a 1-based column index to a spreadsheet column letter.
   * e.g., 1→A, 26→Z, 27→AA, 28→AB
   * @param {number} col 1-based column number.
   * @return {string} Column letter(s).
   */
  colToLetter: function(col) {
    let letter = '';
    while (col > 0) {
      col--;
      letter = String.fromCharCode(65 + (col % 26)) + letter;
      col = Math.floor(col / 26);
    }
    return letter;
  },

  /**
   * Checks if the US stock market is open today by analyzing GOOGLEFINANCE data.
   * Strategy: Compare current Dashboard Change % values across multiple tickers.
   * If all Change % values are 0, null, or error, market is likely closed.
   *
   * @param {Object} dashboardData Map of ticker -> data from readDashboardValues()
   * @return {boolean} True if market appears to be open (data has changed), false if closed.
   */
  isMarketOpenToday: function(dashboardData) {
    if (!dashboardData || Object.keys(dashboardData).length === 0) {
      this.log('No dashboard data available. Assuming market is closed.');
      return false;
    }

    const tickers = Object.keys(dashboardData);
    let validChangeCount = 0;
    let totalChecked = 0;

    // Check up to 5 tickers to avoid false positives
    const tickersToCheck = tickers.slice(0, Math.min(5, tickers.length));

    for (const ticker of tickersToCheck) {
      const data = dashboardData[ticker];
      totalChecked++;

      // Check if Change % exists and is a valid number
      if (data.changePct !== null &&
          data.changePct !== undefined &&
          typeof data.changePct === 'number' &&
          !isNaN(data.changePct)) {
        validChangeCount++;

        // If any ticker has non-zero change, market is definitely open
        if (Math.abs(data.changePct) > 0.00001) {
          this.log(`Market detected as OPEN (${ticker} has change: ${(data.changePct * 100).toFixed(2)}%)`);
          return true;
        }
      }
    }

    // If we have valid change data but all are exactly 0, it's ambiguous
    // Check the current day of week as additional signal
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      this.log('Market detected as CLOSED (Weekend detected)');
      return false;
    }

    // If all checked tickers have 0% change on a weekday, likely pre-market or no movement
    // In this case, we should still update logs (it's a trading day, just no movement yet)
    if (validChangeCount === totalChecked && validChangeCount > 0) {
      this.log('Market detected as OPEN (Weekday with valid data, zero movement is normal)');
      return true;
    }

    // If no valid data retrieved (all null/undefined), market is likely closed or GOOGLEFINANCE error
    this.log(`Market detected as CLOSED (No valid change data: ${validChangeCount}/${totalChecked} valid)`);
    return false;
  }
};
