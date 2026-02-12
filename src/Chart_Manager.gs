
/**
 * Chart_Manager.gs
 * Handles chart generation for Log Sheets.
 */

const ChartManager = {
  /**
   * Creates a line chart for the active column in a Log Sheet.
   * X-Axis: Date (Column A)
   * Y-Axis: Active Column (Selected by user)
   */
  createHistoryChart: function() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const sheetName = sheet.getName();
    
    // validation: Must be a Log sheet
    if (!sheetName.startsWith(CONFIG.SHEET_NAMES.LOG_PREFIX)) {
      Browser.msgBox('Error', 'This feature only works on "Log_XXXX" sheets.', Browser.Buttons.OK);
      return;
    }
    
    const activeRange = sheet.getActiveRange();
    const colIndex = activeRange.getColumn();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headerName = headers[colIndex - 1]; // 0-based index
    
    // Validation: Check if valid column for graphing (must be numeric usually)
    if (colIndex === 1) {
      Browser.msgBox('Error', 'Cannot graph Date vs Date. Please select a value column.', Browser.Buttons.OK);
      return;
    }
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      Browser.msgBox('Error', 'Not enough data to graph.', Browser.Buttons.OK);
      return;
    }
    
    // Ranges
    const dateRange = sheet.getRange(2, 1, lastRow - 1, 1); // Col A (Date) excluding header
    const dataRange = sheet.getRange(2, colIndex, lastRow - 1, 1); // Active Col excluding header
    
    // Remove existing charts to avoid duplicates overlaying
    const existingCharts = sheet.getCharts();
    existingCharts.forEach(chart => sheet.removeChart(chart));
    
    // Create Chart
    const chartBuilder = sheet.newChart()
      .setChartType(Charts.ChartType.LINE)
      .addRange(dateRange)
      .addRange(dataRange)
      .setPosition(2, 5, 0, 0) // Row 2, Col 5 (E), Offset 0,0
      .setOption('title', `${headerName} History`)
      .setOption('hAxis', {title: 'Date'})
      .setOption('vAxis', {title: headerName})
      .setOption('legend', {position: 'bottom'})
      .setOption('curveType', 'function') // Smooth curve
      .setNumHeaders(0); // We excluded headers from range, so 0
      
    sheet.insertChart(chartBuilder.build());
    
    // Optional: Log success
    // Utils.log(`Created chart for ${headerName} on ${sheetName}`);
  }
};
