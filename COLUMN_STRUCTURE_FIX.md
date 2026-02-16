# Dashboard Column Structure Fix

## Problem Summary

The Dashboard sheet has an outdated column structure that doesn't match the updated code expectations, causing:

1. **Missing Headers (K, L, M)**: Columns K, L, M show no headers, and subsequent columns are shifted
2. **`NaN days` Error**: Cache date calculation fails because of structural mismatch
3. **Data Not Populating**: New columns (Today P/E, EPS, Today Fwd P/E, Fwd EPS) are missing

## Root Cause

The codebase was updated to add 3 new columns:
- **Today P/E** (Column L) - Real-time P/E calculated from current price / EPS
- **EPS** (Column M) - TTM EPS from Alpha Vantage for Today P/E calculation
- **Today Fwd P/E** (Column O) - Real-time Forward P/E calculated from current price / Forward EPS
- **Fwd EPS** (Column P) - Sum of next 4 quarters estimated EPS

However, the Dashboard sheet structure was never migrated, so it still has the old 30-column layout instead of the new 33-column layout.

### Expected vs Actual Structure

**Expected (33 columns):**
```
A: Ticker
B: Price $
C: Change %
D: Day Change $
E: Cost Basis $
F: Market Value $
G: Gain/Loss %
H: Gain/Loss $
I: Weight %
J: Market Cap $
K: P/E              ← API P/E (static)
L: Today P/E        ← NEW: Real-time P/E (Price / EPS)
M: EPS              ← NEW: TTM EPS from API
N: Fwd P/E          ← API Forward P/E (static)
O: Today Fwd P/E    ← NEW: Real-time Fwd P/E (Price / Fwd EPS)
P: Fwd EPS          ← NEW: Next 4Q estimated EPS sum
Q: PEG
R: P/S
... (continues)
```

**Actual (30 columns):**
```
A-J: Same as above
K: P/E
L: (empty header) ← Should be "Today P/E"
M: (empty header) ← Should be "EPS"
N: Fwd P/E        ← This is showing in screenshot as "Fwd P/E" in position N (correct)
O: PEG            ← This is showing as "PEG" in position O (should be at Q)
... (shifted by 3 columns)
```

## Solution

### Option 1: Quick Fix (Recommended)

Run the automated diagnostic and fix script:

1. Open Google Apps Script Editor
2. Run function: `diagnoseAndFix()`

This will:
- Diagnose the current structure
- Automatically add missing columns
- Update headers for Dashboard and all Log sheets
- Preserve existing data

### Option 2: Step-by-Step Fix

If you prefer manual control:

1. **Diagnose first** (recommended):
   ```javascript
   diagnoseDashboardStructure()
   ```
   This will show you exactly what's wrong.

2. **Apply structure fix**:
   ```javascript
   fixDashboardStructure()
   ```
   This will add missing columns and update headers.

3. **Populate data**:
   ```javascript
   updateDailyReport()
   ```
   This will fetch fresh data and populate the new columns.

### Option 3: Manual Migration

If you prefer to run the existing migration scripts sequentially:

1. Add Today P/E column:
   ```javascript
   migrateAddTodayPE()
   ```

2. Add EPS column:
   ```javascript
   migrateAddEPS()
   ```

3. Add Today Fwd P/E and Fwd EPS columns:
   ```javascript
   migrateAddTodayFwdPE()
   ```

4. Run update:
   ```javascript
   updateDailyReport()
   ```

## Files Modified

### New Files Added
- `src/Diagnostic_Fix.gs` - Diagnostic and automated fix scripts

### Existing Files (for reference)
- `src/Config.gs` - Column configuration (already correct at 33 columns)
- `src/Sheet_Manager.gs` - Header definitions (already correct)
- `src/Main.gs` - Migration scripts (already exist)

## Expected Outcome After Fix

1. **Dashboard**: Will have 33 columns with proper headers
2. **Log Sheets**: Will have 30 columns (they don't store EPS/Fwd EPS, only calculated values)
3. **NaN Error**: Will be resolved as dates will be properly read
4. **Data**: New columns will be populated on next `updateDailyReport()` run

## Verification Steps

After running the fix, verify:

1. ✅ Dashboard header row shows all 33 column names
2. ✅ Column L shows "Today P/E"
3. ✅ Column M shows "EPS"
4. ✅ Column O shows "Today Fwd P/E"
5. ✅ Column P shows "Fwd EPS"
6. ✅ No "NaN days" errors in execution log
7. ✅ Run `updateDailyReport()` and check that Today P/E calculates correctly

## Notes

- The fix preserves all existing data
- Dashboard_Backup is automatically created before any changes
- If anything goes wrong, run `restoreDashboardManual()` to revert
- Today is a market holiday, so GOOGLEFINANCE might return stale data
- Alpha Vantage API may have hit daily limit (25 calls/day)
