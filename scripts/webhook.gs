/**
 * Fighter's OS — Apps Script Webhook (v3)
 * ─────────────────────────────────────────────────────────
 * Deploy this as a Web App in Google Apps Script:
 *   Extensions > Apps Script > Deploy > New Deployment
 *   Type: Web App
 *   Execute as: Me
 *   Who has access: Anyone (no sign-in required)
 *
 * The webhook URL lives as the `webhookUrl` default in app/src/db/index.jsx (settings store).
 *
 * The PWA sends a POST request with a JSON body.
 * This script appends one row to the FightLog sheet, or on action:'delete'
 * SOFT-DELETES the matching row: the row is kept and 'CANCELLED' is written
 * to its Status column (column 66, the column after sessionId). A blank
 * Status cell means the row is active — existing rows written before v3
 * have no Status value and are therefore treated as active with no
 * migration needed. The 'Status' header cell (row 1, column 66) is typed
 * by hand in the Sheet once; this script never writes to the header row
 * (it will, however, widen the sheet grid to 66 columns on the first
 * delete if needed, so deletes work even before the header is typed).
 * Functional changes to this file require manually redeploying the Apps Script; comment-only changes do not.
 */

var LOG_SHEET_NAME = 'FightLog';

// Status column index (1-based). Derived from the frozen LOG row layout,
// which writes exactly 65 columns: 5 meta (date, day, phase, hipScore,
// sessionType) + 48 strength (4 ex × 4 sets × 3 values) + 11 tail (core,
// altSessionDetails, sessionDuration, mobDone, clrDone, bagRounds,
// bagCourse, bagModules, bagWorkouts, notes, completeness) + sessionId.
// Status is the first column after sessionId. A fixed index is used
// deliberately instead of getLastColumn()+1: getLastColumn() grows to 66
// as soon as the Status header or the first CANCELLED value exists, which
// would make a dynamic +1 point one column too far.
var STATUS_COL = 66;

/**
 * doPost — receives session log from the PWA
 */
function doPost(e) {
  try {
    var rawData = JSON.parse(e.postData.contents);
    var ss  = SpreadsheetApp.openById('1k6UqYdopkfSwav_Bzqb07vEJMybhHMflKnmrSNmT278');
    var log = ss.getSheetByName(LOG_SHEET_NAME);

    if (!log) {
      return _response({ error: 'FightLog sheet not found' }, 404);
    }

    var action = rawData.action || 'log';
    var sessionId = rawData.sessionId || null;
    var payload = rawData.payload || rawData; // backwards compat

    if (action === 'delete') {
      if (!sessionId) return _response({ error: 'No sessionId provided' }, 400);
      
      var lastRow = log.getLastRow();
      if (lastRow < 2) return _response({ status: 'No rows to delete' });
      
      // Search the last 100 rows for the sessionId
      var startRow = Math.max(2, lastRow - 100);
      var numRows = lastRow - startRow + 1;
      var numCols = log.getLastColumn();
      var values = log.getRange(startRow, 1, numRows, numCols).getValues();
      
      for (var i = numRows - 1; i >= 0; i--) {
        var rowString = values[i].join("||");
        if (rowString.indexOf(sessionId) !== -1) {
          var targetRow = startRow + i;
          // Soft delete (decision D1, W17): keep the row, mark it CANCELLED.
          // Idempotent — re-marking an already-cancelled row is harmless.
          // Grid-width guard: the sheet grid may be exactly as wide as the
          // written data (65 cols), and getRange would throw out of bounds —
          // widening here makes the soft delete order-independent of the
          // manual 'Status' header step.
          if (log.getMaxColumns() < STATUS_COL) {
            log.insertColumnsAfter(log.getMaxColumns(), STATUS_COL - log.getMaxColumns());
          }
          log.getRange(targetRow, STATUS_COL).setValue('CANCELLED');
          return _response({ status: 'ok', cancelled: sessionId });
        }
      }
      return _response({ status: 'not found' });
    }

    // Default 'log' action
    var row = [
      payload.date     ?? new Date().toISOString().slice(0, 10),
      payload.day      ?? 0,
      payload.phase    ?? 1,
      payload.hipScore ?? 3,
      payload.sessionType ?? 'S&C'
    ];

    // 4 exercises × 4 sets × 3 values (kg, reps, papReps) = 48 columns
    var strength = payload.strength || [];
    for (var ex = 0; ex < 4; ex++) {
      var sets = (strength[ex] && strength[ex].sets) ? strength[ex].sets : [];
      for (var s = 0; s < 4; s++) {
        row.push(sets[s] ? (sets[s].kg   ?? '') : '');
        row.push(sets[s] ? (sets[s].reps ?? '') : '');
        row.push(sets[s] ? (sets[s].papReps ?? '') : '');
      }
    }

    var coreString = (payload.core || []).map(function(c) {
      return c.ex + " — " + c.sets + "x" + c.reps;
    }).join("\n");

    row.push(
      coreString           ?? '',
      payload.altSessionDetails ?? '',
      payload.sessionDuration   ?? '',
      payload.mobDone      ?? 0,
      payload.clrDone      ?? 0,
      payload.bagRounds    ?? 0,
      payload.bagCourse    ?? '',
      payload.bagModules   ?? '',
      payload.bagWorkouts  ?? '',
      payload.notes        ?? '',
      payload.completeness ?? 0,
      sessionId            ?? ''  // Append sessionId at the very end
    );

    log.appendRow(row);

    // Format date cell
    var lastRowAdded = log.getLastRow();
    log.getRange(lastRowAdded, 1).setNumberFormat('dd MMM yyyy');

    return _response({ status: 'ok', row: lastRowAdded });

  } catch (err) {
    return _response({ error: err.message }, 500);
  }
}

/**
 * doGet — simple health check (visit the URL in a browser to confirm it's live)
 */
function doGet() {
  return _response({ status: 'Fighter\'s OS Webhook (v3) is live ✅' });
}

function _response(obj, code) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
