/**
 * Fighter's OS — Apps Script Webhook (v2)
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
 * This script appends one row to the FightLog sheet, or on action:'delete' HARD-DELETES the matching row (log.deleteRow).
 * Functional changes to this file require manually redeploying the Apps Script; comment-only changes do not.
 */

var LOG_SHEET_NAME = 'FightLog';

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
          // Actual row deletion prevents formatting inheritance bugs and is cleaner
          log.deleteRow(targetRow);
          return _response({ status: 'ok', deleted: sessionId });
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
  return _response({ status: 'Fighter\'s OS Webhook (v2) is live ✅' });
}

function _response(obj, code) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
