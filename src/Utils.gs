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
  }
};
