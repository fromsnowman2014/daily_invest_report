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
