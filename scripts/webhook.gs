/**
 * Fighter's OS — Apps Script Webhook
 * ─────────────────────────────────────────────────────────
 * Deploy this as a Web App in Google Apps Script:
 *   Extensions > Apps Script > Deploy > New Deployment
 *   Type: Web App
 *   Execute as: Me
 *   Who has access: Anyone (no sign-in required)
 *
 * Copy the Web App URL and set it as WEBHOOK_URL in the PWA's
 * src/sync/syncQueue.js file.
 *
 * The PWA sends a POST request with a JSON body.
 * This script appends one row to the FightLog sheet.
 */

var LOG_SHEET_NAME = 'FightLog';

/**
 * doPost — receives session log from the PWA
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss  = SpreadsheetApp.openById('1k6UqYdopkfSwav_Bzqb07vEJMybhHMflKnmrSNmT278');
    var log = ss.getSheetByName(LOG_SHEET_NAME);

    if (!log) {
      return _response({ error: 'FightLog sheet not found' }, 404);
    }

    // Build the row array matching fight-log-schema.md
    var row = [
      payload.date     || new Date().toISOString().slice(0, 10),
      payload.day      || 0,
      payload.phase    || 1,
      payload.hipScore || 3,
      payload.sessionType || 'S&C'
    ];

    // 4 exercises × 4 sets × 3 values (kg, reps, papReps) = 48 columns
    var strength = payload.strength || [];
    for (var ex = 0; ex < 4; ex++) {
      var sets = (strength[ex] && strength[ex].sets) ? strength[ex].sets : [];
      for (var s = 0; s < 4; s++) {
        row.push(sets[s] ? (sets[s].kg   || '') : '');
        row.push(sets[s] ? (sets[s].reps || '') : '');
        row.push(sets[s] ? (sets[s].papReps || '') : '');
      }
    }

    var coreString = (payload.core || []).map(function(c) {
      return c.ex + " — " + c.sets + "x" + c.reps;
    }).join("\n");

    row.push(
      coreString           || '',
      payload.altSessionDetails || '',
      payload.sessionDuration   || '',
      payload.mobDone      || 0,
      payload.clrDone      || 0,
      payload.bagRounds    || 0,
      payload.bagCourse    || '',
      payload.bagModules   || '',
      payload.bagWorkouts  || '',
      payload.notes        || '',
      payload.completeness || 0
    );

    log.appendRow(row);

    // Format date cell
    var lastRow = log.getLastRow();
    log.getRange(lastRow, 1).setNumberFormat('dd MMM yyyy');

    return _response({ status: 'ok', row: lastRow });

  } catch (err) {
    return _response({ error: err.message }, 500);
  }
}

/**
 * doGet — simple health check (visit the URL in a browser to confirm it's live)
 */
function doGet() {
  return _response({ status: 'Fighter\'s OS Webhook is live ✅' });
}

function _response(obj, code) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
