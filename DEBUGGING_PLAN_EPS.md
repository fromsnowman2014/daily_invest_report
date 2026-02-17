# EPS/Forward EPS Debugging Plan

## 📋 Issue Summary

**Problem**: Columns M (EPS), O (Today Fwd P/E), and P (Fwd EPS) remain empty in the Dashboard even after expected API calls on 2/17.

**Known Facts**:
- Dashboard headers are correct (verified with `verifyHeaderConsistency()`)
- Column L (Today P/E) = 7.68 ✅
- Column M (EPS) = empty ❌
- Column N (Fwd P/E) = 7.71 ✅
- Column O (Today Fwd P/E) = empty ❌
- Column P (Fwd EPS) = empty ❌
- User states "two calls" should have occurred on 2/17
- Previous execution log showed "Total API Calls: 0" (all stocks using cache)

**Root Cause Hypothesis**:
1. API calls not actually occurring (cache still being used)
2. API calls occurring but Alpha Vantage not returning EPS/Forward EPS data
3. API returning data but in unexpected format (e.g., strings like "None" or "-")
4. Data being retrieved but not properly assigned to financialData object
5. Data type mismatch causing condition checks to fail

---

## 🔍 Debugging Tools Added

### 1. **debugApiCallForTicker(ticker = 'AGNC')**
**Location**: `src/Diagnostic_Fix.gs` (lines 347-459)

**Purpose**: Manually test API calls for a specific ticker to diagnose the complete data flow.

**What it does**:
- Reads current cache data
- Calls `AlphaVantageService.getCompanyOverview()` and logs raw response
- Inspects EPS-related fields (dilutedEPSTTM, eps, peRatio, forwardPE)
- Calls `AlphaVantageService.getForwardEPS()` and logs raw response
- Simulates financialData construction
- Shows what would be populated in columns M, O, P
- Provides recommendations

**When to use**: Run this manually to test a single API call and see exactly what data Alpha Vantage is returning.

**Example**:
```javascript
debugApiCallForTicker('AGNC')  // Test AGNC
debugApiCallForTicker('AAPL')  // Test Apple
```

---

### 2. **debugDashboardDataForTicker(ticker = 'AGNC')**
**Location**: `src/Diagnostic_Fix.gs` (lines 461-530)

**Purpose**: Inspect what's currently stored in the Dashboard for a specific ticker.

**What it does**:
- Finds the ticker's row in Dashboard
- Shows values in key columns (A, B, K, L, M, N, O, P, AG)
- Checks if values are formulas or static values
- Identifies which columns are empty vs populated

**When to use**: Run this to see the current state of data in the Dashboard.

**Example**:
```javascript
debugDashboardDataForTicker('AGNC')
```

---

### 3. **Enhanced Logging in updateDailyReport()**
**Location**: `src/Main.gs` (lines 106-189)

**What was added**:
- **Lines 107-111**: Log raw API response for EPS fields (dilutedEPSTTM, eps, peRatio, forwardPE) with data types
- **Lines 137-138**: Log constructed financialData.eps value and condition check result
- **Lines 147-165**: Enhanced Forward EPS logging with raw response, data type, and condition check
- **Lines 184-188**: Log final financialData before passing to appendDashboardRow

**Purpose**: Capture the exact values at each step of the API call → data construction → function call pipeline.

**When active**: These logs will appear automatically during `updateDailyReport()` execution when API calls are made.

---

### 4. **Enhanced Logging in appendDashboardRow()**
**Location**: `src/Sheet_Manager.gs` (lines 306-343)

**What was added**:
- **Lines 306-322**: Detailed EPS evaluation logging
  - Shows data.eps value and type
  - Shows condition evaluation result
  - Confirms if column M is being populated or left empty
  - Shows formula being set in column L
- **Lines 329-343**: Detailed Forward EPS evaluation logging
  - Shows data.forwardEPS value and type
  - Shows condition evaluation result
  - Confirms if columns O and P are being populated or left empty

**Purpose**: Verify that data received in appendDashboardRow matches what was passed from Main.gs.

**When active**: These logs will appear automatically during `updateDailyReport()` execution for every stock row.

---

## 🎯 Debugging Strategy

### Phase 1: Manual API Test (Immediate)

**Goal**: Determine if Alpha Vantage is returning EPS data.

**Steps**:
1. Open Google Apps Script Editor
2. Run function: `debugApiCallForTicker('AGNC')`
3. Check execution log for:
   - ✅ API call successful?
   - ✅ `overview.dilutedEPSTTM` has value?
   - ✅ `overview.eps` has value?
   - ✅ `forwardEPS` has value?
   - ✅ Data types are numbers (not strings)?

**Expected Outcomes**:

**Scenario A**: API returns valid EPS data
```
[STEP 3] Inspecting EPS-related fields in API response:
  - overview.dilutedEPSTTM: 1.25 (number)
  - overview.eps: 1.25 (number)
  - overview.forwardPE: 7.71 (number)

[STEP 5] Calling AlphaVantageService.getForwardEPS("AGNC")...
  - forwardEPS: 1.30 (number)
  - Condition (forwardEPS && forwardEPS > 0): true
```
→ **Conclusion**: API is working. Problem is elsewhere (cache not updating, rotation logic issue).

**Scenario B**: API returns null/empty EPS
```
[STEP 3] Inspecting EPS-related fields in API response:
  - overview.dilutedEPSTTM: null (object)
  - overview.eps: undefined (undefined)

[STEP 5] Calling AlphaVantageService.getForwardEPS("AGNC")...
  - forwardEPS: null (object)
```
→ **Conclusion**: Alpha Vantage is not providing EPS data for this ticker. May be REITs or ETFs limitation.

**Scenario C**: API returns string values
```
[STEP 3] Inspecting EPS-related fields in API response:
  - overview.dilutedEPSTTM: "1.25" (string)
  - overview.eps: "1.25" (string)
```
→ **Conclusion**: Data type issue. Need to add parseFloat conversion in Main.gs.

**Scenario D**: API call fails
```
[STEP 2] Calling AlphaVantageService.getCompanyOverview("AGNC")...
  ❌ API returned null/undefined
```
→ **Conclusion**: API key issue, quota exceeded, or network problem.

---

### Phase 2: Check Current Dashboard State

**Goal**: Verify what's currently stored in the Dashboard.

**Steps**:
1. Run function: `debugDashboardDataForTicker('AGNC')`
2. Check execution log for:
   - What values are in columns M and P?
   - Are they empty strings, null, or formula errors?
   - What is the Last Updated date?

**Expected Insights**:
- If Last Updated is recent but EPS is empty → API didn't provide data
- If Last Updated is old → Cache is being used (no new API call)

---

### Phase 3: Run Full Update with Enhanced Logging

**Goal**: Observe the complete data flow during `updateDailyReport()`.

**Steps**:
1. Run function: `updateDailyReport()`
2. Monitor execution log for each ticker, looking for:
   - Is `shouldFetchApi` true or false?
   - If true, what does API return?
   - What is constructed in financialData.eps?
   - What is passed to appendDashboardRow?
   - What condition evaluations happen in appendDashboardRow?

**Key Log Patterns to Watch**:

**Pattern 1: Cache being used (no API call)**
```
[AGNC] Data fresh enough (1 days). Using cache.
[AGNC] 🔍 DEBUG - Final financialData before appendDashboardRow:
  - eps: undefined (undefined)
  - forwardEPS: undefined (undefined)
```
→ **Diagnosis**: Rotation logic is preventing API calls. Cache has no data.

**Pattern 2: API called but no data returned**
```
[AGNC] 🔍 DEBUG - Raw API Response:
  - dilutedEPSTTM: null (object)
  - eps: undefined (undefined)

[AGNC] 🔍 DEBUG - Final financialData before appendDashboardRow:
  - eps: null (object)
  - forwardEPS: null (object)

🔍 [appendDashboardRow] AGNC - EPS Evaluation:
  - data.eps: null (object)
  - Condition (data.eps && data.eps > 0): false
  - ⚠️ EPS condition failed. Column M will be empty.
```
→ **Diagnosis**: API returns null/undefined for EPS. Alpha Vantage doesn't have this data.

**Pattern 3: String data causing failure**
```
[AGNC] 🔍 DEBUG - Raw API Response:
  - dilutedEPSTTM: "-" (string)
  - eps: "None" (string)

[AGNC] 🔍 DEBUG - Final financialData before appendDashboardRow:
  - eps: "-" (string)

🔍 [appendDashboardRow] AGNC - EPS Evaluation:
  - data.eps: "-" (string)
  - Condition (data.eps && data.eps > 0): false
  - ⚠️ EPS condition failed. Column M will be empty.
```
→ **Diagnosis**: API returns strings like "-" or "None". Need parseFloat conversion with validation.

**Pattern 4: Success case**
```
[AGNC] 🔍 DEBUG - Raw API Response:
  - dilutedEPSTTM: 1.25 (number)
  - eps: 1.25 (number)

[AGNC] 🔍 DEBUG - Final financialData before appendDashboardRow:
  - eps: 1.25 (number)
  - forwardEPS: 1.30 (number)

🔍 [appendDashboardRow] AGNC - EPS Evaluation:
  - data.eps: 1.25 (number)
  - Condition (data.eps && data.eps > 0): true
  - ✅ Setting EPS in column M: 1.25
```
→ **Diagnosis**: Everything working correctly!

---

### Phase 4: Force API Call for Specific Ticker

**Goal**: If rotation logic is preventing API calls, force an update for a specific ticker.

**Steps**:
1. Run function: `updateDailyReport('AGNC')`  // Force update for AGNC
2. This bypasses the rotation logic and forces an API call
3. Check if EPS data is populated after this

---

## 🔧 Potential Fixes Based on Diagnosis

### Fix 1: String-to-Number Conversion Issue

**If diagnosis shows**: API returns strings like "1.25" instead of numbers

**Solution**: Add parseFloat conversion in Main.gs

**Location**: `src/Main.gs` around line 118

**Change**:
```javascript
// Before
eps: overview.dilutedEPSTTM || overview.eps,

// After
eps: parseFloat(overview.dilutedEPSTTM) || parseFloat(overview.eps) || null,
```

And for Forward EPS (around line 155):
```javascript
// Before
const forwardEPS = AlphaVantageService.getForwardEPS(ticker);

// After
const forwardEPS = parseFloat(AlphaVantageService.getForwardEPS(ticker)) || null;
```

---

### Fix 2: Invalid String Values ("-", "None", "N/A")

**If diagnosis shows**: API returns placeholder strings like "-", "None", "N/A"

**Solution**: Add validation helper function

**Location**: Add to `src/Utils.gs`

```javascript
/**
 * Safely parses a numeric value from API response.
 * Returns null if value is not a valid positive number.
 */
parseNumeric: function(value) {
  if (value == null || value === '' || value === '-' || value === 'None' || value === 'N/A') {
    return null;
  }
  const num = parseFloat(value);
  return (!isNaN(num) && num > 0) ? num : null;
}
```

Then use in Main.gs:
```javascript
eps: Utils.parseNumeric(overview.dilutedEPSTTM) || Utils.parseNumeric(overview.eps),
```

---

### Fix 3: Rotation Logic Preventing Updates

**If diagnosis shows**: Cache is always being used, no API calls happening

**Solution**: Check rotation conditions in Main.gs (lines 72-100)

**Possible issues**:
- `ROTATION_INTERVAL_DAYS` is too high (currently 7)
- `lastUpdated` date is being set incorrectly
- Cache check logic has bug

**Test**: Run `updateDailyReport('AGNC')` to force update for one ticker.

---

### Fix 4: Alpha Vantage Doesn't Provide Data for REITs

**If diagnosis shows**: API returns null for all REIT tickers (AGNC, NLY, etc.)

**Explanation**: Alpha Vantage may not provide diluted EPS for REITs due to different accounting standards.

**Solution**: Accept that EPS columns will remain empty for REITs. Document this limitation.

**Alternative**: Use different data source for REITs (Yahoo Finance, FMP, etc.)

---

## 📊 Quick Reference: What Each Log Shows

| Log Location | What It Shows | Action If Suspicious |
|--------------|---------------|---------------------|
| `[STEP 2] Raw API Response` | What Alpha Vantage returns | Check if values are null/string |
| `[STEP 4] Constructed financialData.eps` | What we extract from API | Check if extraction logic is correct |
| `[STEP 5] forwardEPS` | What Earnings API returns | Check if earnings data exists |
| `🔍 DEBUG - Final financialData` | What gets passed to Sheet_Manager | Verify no data loss in transmission |
| `🔍 [appendDashboardRow] EPS Evaluation` | Why columns M/O/P are empty/filled | Check condition logic |

---

## 🚀 Next Steps for User

### Immediate Actions:

1. **Run manual diagnostic**:
   ```javascript
   debugApiCallForTicker('AGNC')
   ```
   → This will show if Alpha Vantage is returning EPS data

2. **Check current state**:
   ```javascript
   debugDashboardDataForTicker('AGNC')
   ```
   → This will show what's currently in the Dashboard

3. **Run full update with logging**:
   ```javascript
   updateDailyReport()
   ```
   → Watch the execution log for the detailed debug output

4. **Force update if needed**:
   ```javascript
   updateDailyReport('AGNC')  // Force API call for AGNC
   ```
   → Bypass rotation logic to test a single ticker

### Expected Timeline:

- **Immediate (2 min)**: Run `debugApiCallForTicker('AGNC')` to see raw API data
- **Short (5 min)**: Run `updateDailyReport()` and analyze logs
- **Based on findings**: Apply appropriate fix from the "Potential Fixes" section

### Success Criteria:

After applying the appropriate fix:
- Column M (EPS) shows numeric values (e.g., 1.25)
- Column L (Today P/E) shows formula `=B/M` (not GOOGLEFINANCE)
- Column P (Fwd EPS) shows numeric values (e.g., 1.30)
- Column O (Today Fwd P/E) shows formula `=B/P`
- No errors in execution log

---

## 🧹 Cleanup After Debugging

Once the issue is resolved, remove debug logs:

1. **Main.gs**: Remove lines 107-111, 137-138, 147-165, 184-188
2. **Sheet_Manager.gs**: Remove lines 306-322, 329-343

Keep the diagnostic functions in `Diagnostic_Fix.gs` for future troubleshooting.

---

## 📞 Common Questions

**Q: Why does Today P/E (L) show 7.68 but EPS (M) is empty?**
A: Today P/E is calculated by GOOGLEFINANCE formula when EPS is not available. The fallback is `=GOOGLEFINANCE("ticker","pe")`.

**Q: Why does Fwd P/E (N) show 7.71 but Today Fwd P/E (O) is empty?**
A: Fwd P/E comes from Alpha Vantage API's `forwardPE` field. Today Fwd P/E requires Forward EPS (column P), which requires a separate Earnings API call.

**Q: Can I see the actual API responses?**
A: Yes! Run `debugApiCallForTicker('AGNC')` to see the raw JSON response from Alpha Vantage.

**Q: Why is cache being used instead of making new API calls?**
A: Rotation logic checks `lastUpdated` date. If less than 7 days old AND data exists in cache, it skips API call to save quota.

**Q: How do I force an API call?**
A: Run `updateDailyReport('AGNC')` with the ticker as a parameter to force update for that specific ticker.

---

## 🎓 Learning Points

This debugging plan demonstrates:

1. **Systematic Diagnosis**: Break down a complex issue into testable components
2. **Logging Strategy**: Add logs at key decision points (API call, data construction, condition evaluation)
3. **Hypothesis Testing**: List multiple potential causes and design tests for each
4. **Progressive Investigation**: Start with simple manual tests, then move to full system observation
5. **Documentation**: Clear action items and expected outcomes for each step
