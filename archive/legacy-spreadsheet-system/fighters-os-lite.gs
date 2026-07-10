/**
 * FIGHTER'S OS — Lite Apps Script
 * ─────────────────────────────────────────────────────────────
 * Run AFTER uploading fighters-os.xlsx to Google Sheets.
 *
 * SETUP:
 * 1. Open fighters-os.xlsx in Google Sheets (via Google Drive)
 * 2. Extensions > Apps Script
 * 3. Paste this file (replace all existing code)
 * 4. Run addCheckboxesAndValidation()  ← takes < 30 seconds
 * 5. Done. Assign logSession / resetHUD / checkPhase to buttons.
 */

// ── Sheet name constants (must match your xlsx tab names exactly)
var S = {
  HUD:  'HUD',
  SET:  'Settings',
  LOG:  'FightLog',
  PLAY: 'Playbook',
  STAT: 'Stats'
};

// ════════════════════════════════════════════════════════
// STEP 1 — Run this ONCE after importing the xlsx
// ════════════════════════════════════════════════════════
function addCheckboxesAndValidation() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hud = ss.getSheetByName(S.HUD);

  // Day dropdown (B4)
  hud.getRange('B4').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['Day 1','Day 2','Day 3','Day 4','Day 5','Day 6'])
      .setAllowInvalid(false).build()
  );

  // Hip score dropdown (G4)
  hud.getRange('G4').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['1','2','3','4','5'])
      .setAllowInvalid(false).build()
  );

  // Mobility checkboxes (B9:B13)
  hud.getRange('B9:B13').insertCheckboxes();

  // PAP checkboxes: row 22, 28, 34, 40
  [22, 28, 34, 40].forEach(function(r) {
    hud.getRange('B' + r).insertCheckboxes();
  });

  // Cooldown checkboxes (B50:B54)
  hud.getRange('B50:B54').insertCheckboxes();

  // Phase validation in Settings
  var set = ss.getSheetByName(S.SET);
  set.getRange('B3').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['1','2','3'])
      .setAllowInvalid(false).build()
  );

  SpreadsheetApp.getUi().alert(
    '✅ Setup Complete!',
    'Checkboxes and dropdowns are live.\n\n' +
    'Now assign these functions to your button cells:\n' +
    '  ▶ LOG SESSION  →  logSession\n' +
    '  ↺ RESET HUD    →  resetHUD\n' +
    '  🔓 CHECK PHASE →  checkPhase',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// ════════════════════════════════════════════════════════
// LOG SESSION
// ════════════════════════════════════════════════════════
function logSession() {
  var ss      = SpreadsheetApp.getActiveSpreadsheet();
  var hud     = ss.getSheetByName(S.HUD);
  var log     = ss.getSheetByName(S.LOG);
  var ui      = SpreadsheetApp.getUi();
  var today   = new Date();
  var tz      = Session.getScriptTimeZone();

  var dayVal   = hud.getRange('B4').getValue();
  var dayNum   = parseInt(String(dayVal).replace('Day ', '')) || 0;
  var phase    = ss.getSheetByName(S.SET).getRange('B3').getValue();
  var hipScore = hud.getRange('G4').getValue();

  // Duplicate guard
  var lastRow = log.getLastRow();
  if (lastRow > 1) {
    var prevDate  = log.getRange(lastRow, 1).getValue();
    var prevDay   = log.getRange(lastRow, 2).getValue();
    var prevPhase = log.getRange(lastRow, 3).getValue();
    if (
      Utilities.formatDate(new Date(prevDate), tz, 'yyyyMMdd') ===
      Utilities.formatDate(today, tz, 'yyyyMMdd') &&
      prevDay === dayNum && prevPhase === phase
    ) {
      var r = ui.alert('⚠️ Duplicate?',
        'This Day + Phase was already logged today. Log again?',
        ui.ButtonSet.YES_NO);
      if (r !== ui.Button.YES) return;
    }
  }

  var row = [today, dayNum, phase, hipScore];

  // Strength sets: 4 exercises × 4 set rows each
  // Exercise 1 set rows: 18-21, Ex2: 24-27, Ex3: 30-33, Ex4: 36-39
  var exSetRows = [18, 24, 30, 36];
  exSetRows.forEach(function(startRow) {
    for (var s = 0; s < 4; s++) {
      var sr = startRow + s;
      row.push(hud.getRange(sr, 2).getValue() || ''); // kg
      row.push(hud.getRange(sr, 3).getValue() || ''); // reps
    }
  });

  // Mobility and cooldown checkbox counts
  var mobDone = hud.getRange('B9:B13').getValues().flat()
    .filter(function(v){ return v === true; }).length;
  var clrDone = hud.getRange('B50:B54').getValues().flat()
    .filter(function(v){ return v === true; }).length;

  var bagRounds = hud.getRange('G43').getValue() || 0;
  var notes     = hud.getRange('B46').getValue() || '';
  var pct       = hud.getRange('F57').getValue() || 0;

  row.push(mobDone, clrDone, bagRounds, notes, pct);

  log.appendRow(row);
  log.getRange(log.getLastRow(), 1).setNumberFormat('dd MMM yyyy');

  ui.alert('✅ Logged!',
    'Day ' + dayNum + ' | Phase ' + phase +
    '\nCompleteness: ' + pct + '%\nHip: ' + hipScore + '/5\n\nHit RESET HUD for next session.',
    ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════
// RESET HUD
// ════════════════════════════════════════════════════════
function resetHUD() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hud = ss.getSheetByName(S.HUD);
  var ui  = SpreadsheetApp.getUi();

  var r = ui.alert('↺ Reset HUD',
    'Clear all weights, reps, checkboxes, rounds and notes?\nDay/Phase selections preserved.',
    ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;

  // Strength input cells (load + reps cols B&C, set rows per exercise)
  var exSetRows = [18, 24, 30, 36];
  exSetRows.forEach(function(startRow) {
    for (var s = 0; s < 4; s++) {
      hud.getRange(startRow + s, 2, 1, 8).clearContent();
    }
  });

  hud.getRange('B9:B13').setValue(false);   // mob checkboxes
  [22, 28, 34, 40].forEach(function(pr) {   // PAP checkboxes
    hud.getRange('B' + pr).setValue(false);
  });
  hud.getRange('B50:B54').setValue(false);  // cooldown checkboxes
  hud.getRange('G43').clearContent();       // bag rounds
  hud.getRange('B46').clearContent();       // notes
  hud.getRange('G4').setValue(3);           // reset hip score to neutral

  ui.alert('✅ HUD Reset', 'Ready for next session.', ui.ButtonSet.OK);
}

// ════════════════════════════════════════════════════════
// CHECK PHASE
// ════════════════════════════════════════════════════════
function checkPhase() {
  var ss        = SpreadsheetApp.getActiveSpreadsheet();
  var set       = ss.getSheetByName(S.SET);
  var phase     = set.getRange('B3').getValue();
  var threshold = set.getRange('B4').getValue();
  var done      = set.getRange('B6').getValue(); // phase 1 count formula
  if (phase === 2) done = set.getRange('B7').getValue();
  if (phase === 3) done = set.getRange('B8').getValue();
  var ui = SpreadsheetApp.getUi();

  if (done >= threshold && phase < 3) {
    ui.alert('🔓 UNLOCK!',
      'Phase ' + phase + ' complete (' + done + '/' + threshold + ' sessions).\n\n' +
      'Go to the Settings tab and change "CURRENT PHASE" to ' + (phase + 1) + '.',
      ui.ButtonSet.OK);
  } else if (phase >= 3 && done >= threshold) {
    ui.alert('🏆 All Phases Complete!',
      'Total sessions: ' + done + '\nTime to plan Phase 4 with your coach.',
      ui.ButtonSet.OK);
  } else {
    ui.alert('🔒 Phase ' + phase,
      done + ' / ' + threshold + ' sessions complete.\n' +
      (threshold - done) + ' more until Phase ' + (phase + 1) + ' unlocks.',
      ui.ButtonSet.OK);
  }
}
