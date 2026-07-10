/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         F I G H T E R ' S   O S  —  v1.0                  ║
 * ║         Google Apps Script | Macken St. FlyeFit            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a NEW blank Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code, paste this entire file
 * 4. Save (Ctrl+S)
 * 5. Select function "buildFightersOS" from the dropdown
 * 6. Click ▶ Run — grant permissions when prompted
 * 7. Return to the spreadsheet — your HUD is live on the first tab
 *
 * THEN: Import your playbook data
 * 8. Open the "📖 Playbook" tab (currently hidden — right-click any tab > Show)
 * 9. Clear all rows below row 1 (the header row stays)
 * 10. File > Import > Upload playbook.csv > Replace current sheet > No separator detection
 * 11. Re-hide the Playbook tab (right-click > Hide sheet)
 * 12. Navigate back to HUD — you are ready to train
 *
 * DAILY USAGE:
 * - Select your Day from the dropdown in B5
 * - Fill in the Hip Score (1-5) in F5
 * - Train. Fill in weights and reps. Tick your checkboxes.
 * - Hit [LOG SESSION] when done.
 * - Hit [RESET HUD] to clear for next session.
 */

// ════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════

var TAB = {
  HUD:      '🏠 HUD',
  SETTINGS: '⚙️ Settings',
  PLAYBOOK: '📖 Playbook',
  LOG:      '📊 Fight Log',
  STATS:    '📈 Stats'
};

var C = {
  // Backgrounds
  BG:       '#0a0a14',
  PANEL:    '#13132a',
  INPUT:    '#1e1e3f',
  HEADER:   '#110000',
  DIVIDER:  '#1e1e3a',
  // Accents
  RED:      '#e63946',
  GOLD:     '#ffd60a',
  GREEN:    '#06d6a0',
  AMBER:    '#ffb703',
  BLUE:     '#48cae4',
  // Text
  WHITE:    '#ffffff',
  DIM:      '#8888aa',
  LABEL:    '#a0a8cc',
  BODY:     '#d0d0e8'
};

// HUD cell references (used by script functions)
var HUD_REFS = {
  DAY:          'B5',     // Day dropdown
  HIP:          'F5',     // Hip score 1-5
  // Mobility checkboxes: B8:B12
  MOB_CB_START: 8,
  MOB_CB_END:   12,
  // Strength sets: cols C,D (load,reps) rows 16-43 (4 exercises x up to 4 sets)
  // Bag rounds completed
  BAG_ROUNDS:   'I31',
  // Cooldown checkboxes: B35:B39
  CLR_CB_START: 35,
  CLR_CB_END:   39,
  // Completeness output
  COMPLETE_PCT: 'F43',
  // Log output row
  NOTES_CELL:   'C32'
};

// ════════════════════════════════════════════════
// MAIN BUILDER
// ════════════════════════════════════════════════

function buildFightersOS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();

  var resp = ui.alert(
    '⚔️ Build Fighter\'s OS?',
    'This will create/overwrite all Fighter\'s OS tabs in this spreadsheet.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  ss.rename("Fighter's OS ⚔️");

  // Always build Playbook first (other tabs reference it)
  _recreateSheet(ss, TAB.PLAYBOOK);
  _recreateSheet(ss, TAB.SETTINGS);
  _recreateSheet(ss, TAB.HUD);
  _recreateSheet(ss, TAB.LOG);
  _recreateSheet(ss, TAB.STATS);

  // Remove default Sheet1
  var sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1) { try { ss.deleteSheet(sheet1); } catch(e) {} }

  setupPlaybook(ss);
  setupSettings(ss);
  setupHUD(ss);
  setupFightLog(ss);
  setupStats(ss);

  // Navigate to HUD
  ss.setActiveSheet(ss.getSheetByName(TAB.HUD));

  ui.alert(
    '✅ Fighter\'s OS is LIVE!',
    'You are on the HUD tab.\n\n' +
    'NEXT STEP: Import your playbook.csv data into the 📖 Playbook tab.\n' +
    'See the instructions at the top of this script file for details.',
    ui.ButtonSet.OK
  );
}

function _recreateSheet(ss, name) {
  var existing = ss.getSheetByName(name);
  if (existing) ss.deleteSheet(existing);
  return ss.insertSheet(name);
}

// ════════════════════════════════════════════════
// PLAYBOOK TAB
// ════════════════════════════════════════════════

function setupPlaybook(ss) {
  var sh = ss.getSheetByName(TAB.PLAYBOOK);
  sh.setTabColor('#3d3d5c');

  var headers = [
    'Key','Phase','Day','Block','Slot','Variant',
    'Exercise','Sets','Target_Reps','Load_Note',
    'PAP_Exercise','PAP_Sets','PAP_Reps',
    'Combo_Focus','Cue'
  ];

  var hdr = sh.getRange(1, 1, 1, headers.length);
  hdr.setValues([headers]);
  hdr.setBackground('#1a1a2e');
  hdr.setFontColor(C.WHITE);
  hdr.setFontWeight('bold');
  hdr.setFontFamily('Inter');

  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(7, 260);
  sh.setColumnWidth(14, 300);
  sh.setColumnWidth(15, 300);

  sh.hideSheet();
}

// ════════════════════════════════════════════════
// SETTINGS TAB
// ════════════════════════════════════════════════

function setupSettings(ss) {
  var sh = ss.getSheetByName(TAB.SETTINGS);
  sh.setTabColor('#2a2a4a');
  sh.setColumnWidth(1, 260);
  sh.setColumnWidth(2, 180);
  sh.setColumnWidth(3, 320);

  sh.getRange('A1:C1').merge()
    .setValue('⚙️  FIGHTER\'S OS — SETTINGS')
    .setBackground(C.RED)
    .setFontColor(C.WHITE)
    .setFontSize(14)
    .setFontWeight('bold')
    .setFontFamily('Inter')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 45);

  var rows = [
    ['', '', ''],
    ['CURRENT PHASE', 1, 'Change to 2 or 3 when unlocked'],
    ['SESSIONS PER PHASE (unlock threshold)', 12, 'Phase 2 unlocks after 12 completed gym sessions'],
    ['', '', ''],
    ['PHASE 1 SESSIONS LOGGED', '=COUNTIFS(\'📊 Fight Log\'!C:C,1,\'📊 Fight Log\'!B:B,"<>2",\'📊 Fight Log\'!B:B,"<>4")', 'Auto-calculated from Fight Log'],
    ['PHASE 2 SESSIONS LOGGED', '=COUNTIFS(\'📊 Fight Log\'!C:C,2,\'📊 Fight Log\'!B:B,"<>2",\'📊 Fight Log\'!B:B,"<>4")', 'Auto-calculated from Fight Log'],
    ['PHASE 3 SESSIONS LOGGED', '=COUNTIFS(\'📊 Fight Log\'!C:C,3,\'📊 Fight Log\'!B:B,"<>2",\'📊 Fight Log\'!B:B,"<>4")', 'Auto-calculated from Fight Log'],
    ['', '', ''],
    ['PHASE UNLOCK STATUS', '=IF(B5>=B4,"🔓 PHASE "&(B3+1)&" UNLOCKED — Update Phase above!","🔒 "&(B4-B5)&" sessions until Phase "&(B3+1)&" unlocks")', 'Auto-updates'],
    ['', '', ''],
    ['ATHLETE', 'Fighter\'s OS User', 'Edit your name here'],
    ['BRANCH', 'FlyeFit Macken St.', ''],
    ['START DATE', new Date(), 'Your Day 1']
  ];

  for (var i = 0; i < rows.length; i++) {
    var r = sh.getRange(i + 2, 1, 1, 3);
    r.setValues([rows[i]]);
    r.setFontFamily('Inter');
    r.setFontColor(C.BODY);
    r.setBackground(C.PANEL);
  }

  // Style label column
  sh.getRange('A4:A14').setFontColor(C.LABEL).setFontWeight('bold');

  // Style the phase value cell — make it editable and obvious
  sh.getRange('B3').setBackground('#2a0000').setFontColor(C.GOLD)
    .setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center');

  var phaseValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['1', '2', '3'])
    .setAllowInvalid(false).build();
  sh.getRange('B3').setDataValidation(phaseValidation);

  // Highlight unlock status
  sh.getRange('B10').setFontColor(C.GREEN).setFontWeight('bold');

  sh.setFrozenRows(1);
}

// ════════════════════════════════════════════════
// HUD TAB
// ════════════════════════════════════════════════

function setupHUD(ss) {
  var sh = ss.getSheetByName(TAB.HUD);
  sh.setTabColor(C.RED);

  // Column widths
  sh.setColumnWidth(1, 240); // A: Labels
  sh.setColumnWidth(2, 80);  // B: S1 load or checkbox
  sh.setColumnWidth(3, 60);  // C: S1 reps
  sh.setColumnWidth(4, 80);  // D: S2 load
  sh.setColumnWidth(5, 60);  // E: S2 reps
  sh.setColumnWidth(6, 80);  // F: S3 load
  sh.setColumnWidth(7, 60);  // G: S3 reps
  sh.setColumnWidth(8, 80);  // H: S4 load
  sh.setColumnWidth(9, 60);  // I: S4 reps / rounds

  // Freeze top 6 rows (selector area always visible)
  sh.setFrozenRows(6);

  // ── TITLE BLOCK ──────────────────────────────
  sh.getRange('A1:I1').merge()
    .setValue('⚔️  F I G H T E R \'S   O S')
    .setBackground(C.RED)
    .setFontColor(C.WHITE)
    .setFontSize(22)
    .setFontWeight('bold')
    .setFontFamily('Inter')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sh.setRowHeight(1, 60);

  sh.getRange('A2:I2').merge()
    .setValue('FlyeFit Macken Street  |  Combat Performance System')
    .setBackground(C.HEADER)
    .setFontColor(C.DIM)
    .setFontSize(10)
    .setFontFamily('Inter')
    .setHorizontalAlignment('center');
  sh.setRowHeight(2, 28);

  // ── SELECTOR ROW ─────────────────────────────
  _sectionDivider(sh, 3);

  sh.getRange('A4').setValue('SELECT YOUR DAY')
    .setFontColor(C.LABEL).setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.getRange('B4').setValue('Select ▼')
    .setFontColor(C.GOLD).setBackground(C.INPUT).setHorizontalAlignment('center').setFontWeight('bold');

  var dayValidation = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6'])
    .setAllowInvalid(false).build();
  sh.getRange('B4').setDataValidation(dayValidation);

  sh.getRange('D4').setValue('PHASE')
    .setFontColor(C.LABEL).setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.getRange('E4').setFormula('="Phase "&\'⚙️ Settings\'!B3')
    .setFontColor(C.WHITE).setBackground(C.INPUT).setHorizontalAlignment('center').setFontWeight('bold');

  sh.getRange('G4').setValue('HIP SCORE  (1-5)')
    .setFontColor(C.LABEL).setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.getRange('H4').setValue(3)
    .setFontColor(C.WHITE).setBackground(C.INPUT).setHorizontalAlignment('center').setFontWeight('bold');

  var hipValidation = SpreadsheetApp.newDataValidation()
    .requireValueInRange(sh.getRange('H4'), true)
    .requireNumberBetween(1, 5)
    .setAllowInvalid(false).build();
  sh.getRange('H4').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['1','2','3','4','5'])
      .setAllowInvalid(false).build()
  );

  // Hip status label
  sh.getRange('I4').setFormula(
    '=IF(H4<=2,"🔴 HIGH ALERT",IF(H4=3,"🟡 MODERATE","🟢 GOOD")'
  ).setFontWeight('bold').setFontFamily('Inter').setHorizontalAlignment('center').setBackground(C.PANEL);

  sh.setRowHeight(4, 36);

  // Fight-gym day notice (row 5)
  sh.getRange('A5:I5').merge()
    .setFormula('=IF(OR(B4="Day 2",B4="Day 4"),"🥊  FIGHT GYM DAY  — Log your session in the Notes section below","")')
    .setFontColor(C.GREEN).setBackground(C.PANEL).setHorizontalAlignment('center')
    .setFontWeight('bold').setFontFamily('Inter').setFontSize(11);
  sh.setRowHeight(5, 30);

  _sectionDivider(sh, 6);

  // ── MOBILITY BLOCK ────────────────────────────
  _blockHeader(sh, 7, '🔥  MOBILITY  &  INJURY PREP', C.AMBER);
  sh.setRowHeight(7, 32);

  // Sub-header for sets columns
  sh.getRange('A8').setValue('Movement').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B8').setValue('✓ Done').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter').setHorizontalAlignment('center');
  sh.getRange('C8').setValue('Duration / Sets').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('D8').setValue('Cue').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('D8:I8').merge();
  sh.setRowHeight(8, 26);

  // 5 mobility slots (rows 9-13)
  for (var mob = 1; mob <= 5; mob++) {
    var mobRow = 8 + mob;
    var mobSlot = mob;
    // Exercise name formula (hip-aware: if hip score ≤2 AND high-alert variant exists, use it)
    var keyStd  = '"P"&\'⚙️ Settings\'!B3&"-D"&MID(B4,5,1)&"-MOB-' + mobSlot + '-STD"';
    var keyHA   = '"P"&\'⚙️ Settings\'!B3&"-D"&MID(B4,5,1)&"-MOB-' + mobSlot + '-HA"';
    var lookupExStd = 'IFERROR(INDEX(\'📖 Playbook\'!G:G,MATCH(' + keyStd + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupExHA  = 'IFERROR(INDEX(\'📖 Playbook\'!G:G,MATCH(' + keyHA  + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupDurStd = 'IFERROR(INDEX(\'📖 Playbook\'!I:I,MATCH(' + keyStd + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupCueStd = 'IFERROR(INDEX(\'📖 Playbook\'!O:O,MATCH(' + keyStd + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupCueHA  = 'IFERROR(INDEX(\'📖 Playbook\'!O:O,MATCH(' + keyHA  + ',\'📖 Playbook\'!A:A,0)),"")';

    var exFormula  = '=IF(H4<=2,IF(' + lookupExHA + '<>"","🔴 "' + '&' + lookupExHA + ',' + lookupExStd + '),' + lookupExStd + ')';
    var cueFormula = '=IF(H4<=2,IF(' + lookupCueHA + '<>"",' + lookupCueHA + ',' + lookupCueStd + '),' + lookupCueStd + ')';

    sh.getRange(mobRow, 1).setFormula(exFormula).setBackground(C.PANEL).setFontColor(C.BODY).setFontFamily('Inter');
    sh.getRange(mobRow, 2).insertCheckboxes().setBackground(C.INPUT).setHorizontalAlignment('center');
    sh.getRange(mobRow, 3).setFormula('=' + lookupDurStd).setBackground(C.PANEL).setFontColor(C.DIM).setFontFamily('Inter').setFontSize(9);
    sh.getRange(mobRow, 4, 1, 6).merge().setFormula(cueFormula).setBackground(C.PANEL)
      .setFontColor(C.DIM).setFontFamily('Inter').setFontSize(9).setWrap(true);
    sh.setRowHeight(mobRow, 32);
  }

  _sectionDivider(sh, 14);

  // ── STRENGTH + PAP BLOCK ─────────────────────
  _blockHeader(sh, 15, '💪  STRENGTH  +  PAP  SUPERSETS', C.RED);
  sh.setRowHeight(15, 32);

  // Column headers for sets
  var setHdrRow = 16;
  sh.getRange('A' + setHdrRow).setValue('Exercise').setFontColor(C.LABEL).setFontWeight('bold').setBackground(C.PANEL).setFontFamily('Inter');
  var setCols = ['S1 kg','S1 reps','S2 kg','S2 reps','S3 kg','S3 reps','S4 kg','S4 reps'];
  for (var sc = 0; sc < setCols.length; sc++) {
    sh.getRange(setHdrRow, sc + 2).setValue(setCols[sc]).setFontColor(C.LABEL).setFontWeight('bold')
      .setBackground(C.PANEL).setFontFamily('Inter').setFontSize(9).setHorizontalAlignment('center');
  }
  sh.setRowHeight(setHdrRow, 24);

  // 4 exercise slots (each takes: 1 name row + 4 set rows + 1 PAP row = 6 rows)
  var strStartRow = 17;
  for (var ex = 1; ex <= 4; ex++) {
    var exRow = strStartRow + (ex - 1) * 6;
    var strKey = '"P"&\'⚙️ Settings\'!B3&"-D"&MID(B4,5,1)&"-STR-' + ex + '"';
    var lookupStrEx  = 'IFERROR(INDEX(\'📖 Playbook\'!G:G,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupStrTgt = 'IFERROR(INDEX(\'📖 Playbook\'!I:I,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupStrNote = 'IFERROR(INDEX(\'📖 Playbook\'!J:J,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupPAP    = 'IFERROR(INDEX(\'📖 Playbook\'!K:K,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupPAPSets = 'IFERROR(INDEX(\'📖 Playbook\'!L:L,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupPAPReps = 'IFERROR(INDEX(\'📖 Playbook\'!M:M,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupStrCue = 'IFERROR(INDEX(\'📖 Playbook\'!O:O,MATCH(' + strKey + ',\'📖 Playbook\'!A:A,0)),"")';

    // Exercise name + target row
    sh.getRange(exRow, 1).setFormula('=IF(' + lookupStrEx + '="","","[A' + ex + '] "&' + lookupStrEx + ')')
      .setBackground(C.INPUT).setFontColor(C.WHITE).setFontWeight('bold').setFontFamily('Inter');
    sh.getRange(exRow, 2, 1, 7).merge()
      .setFormula('=IF(' + lookupStrEx + '="","",("Target: "&' + lookupStrTgt + ' & "  |  " &' + lookupStrNote + '))')
      .setBackground(C.INPUT).setFontColor(C.DIM).setFontFamily('Inter').setFontSize(9).setWrap(false);
    sh.getRange(exRow, 9).setFormula('=IF(' + lookupStrCue + '="","","💡 "&' + lookupStrCue + ')')
      .setBackground(C.INPUT).setFontColor(C.AMBER).setFontFamily('Inter').setFontSize(8).setWrap(true);
    sh.setRowHeight(exRow, 30);

    // 4 set input rows
    for (var s = 1; s <= 4; s++) {
      var setRow = exRow + s;
      sh.getRange(setRow, 1).setValue('Set ' + s)
        .setFontColor(C.LABEL).setFontSize(9).setBackground(C.PANEL).setFontFamily('Inter')
        .setHorizontalAlignment('right');
      // Load and reps input cells (cols B-I)
      sh.getRange(setRow, 2).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center'); // S1 load
      sh.getRange(setRow, 3).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center'); // S1 reps
      sh.getRange(setRow, 4).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.getRange(setRow, 5).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.getRange(setRow, 6).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.getRange(setRow, 7).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.getRange(setRow, 8).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.getRange(setRow, 9).setBackground(C.INPUT).setFontColor(C.WHITE).setHorizontalAlignment('center');
      sh.setRowHeight(setRow, 28);
    }

    // PAP row
    var papRow = exRow + 5;
    sh.getRange(papRow, 1).setFormula(
      '=IF(' + lookupPAP + '="","","⚡ PAP: "&' + lookupPAP + '  & "  (" & ' + lookupPAPSets + ' & "×" & ' + lookupPAPReps + ' & ")")'
    ).setBackground('#1a0a00').setFontColor(C.AMBER).setFontWeight('bold').setFontFamily('Inter');
    sh.getRange(papRow, 2).insertCheckboxes().setBackground('#1a0a00').setHorizontalAlignment('center');
    sh.getRange(papRow, 3).setValue('✓ PAP Done').setFontColor(C.DIM).setFontSize(9)
      .setBackground('#1a0a00').setFontFamily('Inter');
    sh.getRange(papRow, 4, 1, 6).merge().setBackground('#1a0a00');
    sh.setRowHeight(papRow, 28);
  }

  _sectionDivider(sh, 41);

  // ── BAG BLOCK ─────────────────────────────────
  _blockHeader(sh, 42, '🥊  VARGA BAG WORK', C.RED);
  sh.setRowHeight(42, 32);

  // Combo focus (from Playbook)
  var bagKey = '"P"&\'⚙️ Settings\'!B3&"-D"&MID(B4,5,1)&"-BAG-1"';
  var lookupBagCombos = 'IFERROR(INDEX(\'📖 Playbook\'!N:N,MATCH(' + bagKey + ',\'📖 Playbook\'!A:A,0)),"—")';
  var lookupBagTarget = 'IFERROR(INDEX(\'📖 Playbook\'!I:I,MATCH(' + bagKey + ',\'📖 Playbook\'!A:A,0)),"—")';
  var lookupBagCue    = 'IFERROR(INDEX(\'📖 Playbook\'!O:O,MATCH(' + bagKey + ',\'📖 Playbook\'!A:A,0)),"—")';

  sh.getRange('A43').setValue('Target Rounds').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B43:E43').merge().setFormula('=' + lookupBagTarget)
    .setFontColor(C.BODY).setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('F43').setValue('ROUNDS DONE:').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter').setHorizontalAlignment('right');
  sh.getRange('G43').setBackground(C.INPUT).setFontColor(C.GOLD).setFontWeight('bold')
    .setHorizontalAlignment('center').setValue('');
  sh.getRange('H43:I43').merge().setBackground(C.PANEL);
  sh.setRowHeight(43, 32);

  sh.getRange('A44').setValue('Combo Focus').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B44:I44').merge().setFormula('=' + lookupBagCombos)
    .setFontColor(C.BODY).setBackground(C.PANEL).setFontFamily('Inter').setWrap(true);
  sh.setRowHeight(44, 50);

  sh.getRange('A45').setValue('Coach Cue').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B45:I45').merge().setFormula('=' + lookupBagCue)
    .setFontColor(C.AMBER).setBackground(C.PANEL).setFontFamily('Inter').setFontStyle('italic').setWrap(true);
  sh.setRowHeight(45, 40);

  sh.getRange('A46').setValue('Session Notes').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B46:I46').merge().setValue('')
    .setBackground(C.INPUT).setFontColor(C.WHITE).setFontFamily('Inter');
  sh.setRowHeight(46, 40);

  _sectionDivider(sh, 47);

  // ── COOLDOWN BLOCK ────────────────────────────
  _blockHeader(sh, 48, '❄️  COOLDOWN  &  STRETCH', C.BLUE);
  sh.setRowHeight(48, 32);

  sh.getRange('A49').setValue('Movement').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('B49').setValue('✓ Done').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter').setHorizontalAlignment('center');
  sh.getRange('C49').setValue('Duration').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.getRange('D49:I49').merge().setValue('Note').setFontColor(C.LABEL).setFontWeight('bold')
    .setBackground(C.PANEL).setFontFamily('Inter');
  sh.setRowHeight(49, 26);

  for (var clr = 1; clr <= 5; clr++) {
    var clrRow = 49 + clr;
    var clrKey = '"P"&\'⚙️ Settings\'!B3&"-D"&MID(B4,5,1)&"-CLR-' + clr + '"';
    var lookupClrEx  = 'IFERROR(INDEX(\'📖 Playbook\'!G:G,MATCH(' + clrKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupClrDur = 'IFERROR(INDEX(\'📖 Playbook\'!I:I,MATCH(' + clrKey + ',\'📖 Playbook\'!A:A,0)),"")';
    var lookupClrCue = 'IFERROR(INDEX(\'📖 Playbook\'!J:J,MATCH(' + clrKey + ',\'📖 Playbook\'!A:A,0)),"")';

    sh.getRange(clrRow, 1).setFormula('=' + lookupClrEx)
      .setBackground(C.PANEL).setFontColor(C.BODY).setFontFamily('Inter');
    sh.getRange(clrRow, 2).insertCheckboxes().setBackground(C.INPUT).setHorizontalAlignment('center');
    sh.getRange(clrRow, 3).setFormula('=' + lookupClrDur)
      .setBackground(C.PANEL).setFontColor(C.DIM).setFontFamily('Inter').setFontSize(9);
    sh.getRange(clrRow, 4, 1, 6).merge().setFormula('=' + lookupClrCue)
      .setBackground(C.PANEL).setFontColor(C.DIM).setFontFamily('Inter').setFontSize(9).setWrap(true);
    sh.setRowHeight(clrRow, 30);
  }

  _sectionDivider(sh, 55);

  // ── COMPLETENESS + ACTIONS ─────────────────────
  _blockHeader(sh, 56, '📊  SESSION COMPLETENESS', C.GREEN);
  sh.setRowHeight(56, 32);

  // Completeness formula:
  // Mob: 5 checkboxes (B9:B13), weight 20%
  // Str: count non-empty load cells (B18:I41 even cols are loads), weight 40%
  // Bag: G43 / target rounds, weight 20%
  // Clr: 5 checkboxes (B50:B54), weight 20%
  // Flat formula (as requested by athlete): sum of done / total * 100
  var completeFormula =
    '=ROUND((' +
    '(COUNTIF(B9:B13,TRUE) + COUNTIF(B50:B54,TRUE))' +
    ' + COUNTA(B18:I41) / 2' +         // each set has 2 cells (load+reps), counts filled ones
    ' + IF(ISNUMBER(G43),MIN(G43,6),0)' + // bag rounds (cap at target)
    ') / (' +
    '10' +                // 5 mob + 5 clr checkboxes
    ' + 48' +             // 4 exercises × 4 sets × 2 fields (load+reps) = 64... simplified to filled cells
    ' + 6' +              // target bag rounds
    ') * 100, 1)';

  sh.getRange('A57:E57').merge().setValue('Completeness %')
    .setFontColor(C.LABEL).setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.getRange('F57:I57').merge().setFormula(completeFormula)
    .setFontColor(C.GREEN).setFontSize(20).setFontWeight('bold').setFontFamily('Inter')
    .setBackground(C.PANEL).setHorizontalAlignment('center');
  sh.setRowHeight(57, 40);

  sh.getRange('A58').setValue('Hip Score Today')
    .setFontColor(C.LABEL).setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.getRange('B58').setFormula('=H4').setFontColor(C.WHITE)
    .setFontWeight('bold').setBackground(C.PANEL).setHorizontalAlignment('center');
  sh.getRange('C58:I58').merge().setFormula('=IF(H4<=2,"🔴 HIGH ALERT — Hip protocol active",IF(H4=3,"🟡 MODERATE — Monitor closely","🟢 GOOD — Standard protocol"))')
    .setFontWeight('bold').setFontFamily('Inter').setBackground(C.PANEL);
  sh.setRowHeight(58, 30);

  _sectionDivider(sh, 59);

  // ── BUTTONS ROW ───────────────────────────────
  sh.getRange('A60:D60').merge().setValue('▶  LOG SESSION')
    .setBackground(C.RED).setFontColor(C.WHITE).setFontSize(14).setFontWeight('bold')
    .setFontFamily('Inter').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange('F60:I60').merge().setValue('↺  RESET HUD')
    .setBackground('#2a2a4a').setFontColor(C.LABEL).setFontSize(12).setFontWeight('bold')
    .setFontFamily('Inter').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(60, 48);

  sh.getRange('E60').setBackground(C.BG);

  // Phase check button
  sh.getRange('A61:I61').merge().setValue('🔓  CHECK PHASE UNLOCK STATUS')
    .setBackground('#1a1a2e').setFontColor(C.LABEL).setFontSize(10).setFontWeight('normal')
    .setFontFamily('Inter').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.setRowHeight(61, 32);

  // ── GLOBAL BACKGROUND ─────────────────────────
  sh.getRange('A1:I61').setBackground(C.BG); // base bg
  // Overridden by individual cell settings above, but catches any missed cells

  // ── CONDITIONAL FORMATTING ────────────────────

  // Checkbox tick → green fill
  var mobRange = sh.getRange('A9:I13');
  var mobCF = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B9=TRUE')
    .setBackground('#052e16')
    .setFontColor(C.GREEN)
    .setRanges([mobRange])
    .build();

  var clrRange = sh.getRange('A50:I54');
  var clrCF = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$B50=TRUE')
    .setBackground('#052e16')
    .setFontColor(C.GREEN)
    .setRanges([clrRange])
    .build();

  // High-alert hip → red tint on mobility section
  var hipAlertRange = sh.getRange('A7:I13');
  var hipCF = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$H$4<=2')
    .setBackground('#2a0000')
    .setRanges([hipAlertRange])
    .build();

  // Completeness % colour
  var pctRange = sh.getRange('F57:I57');
  var pctRedCF = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(50)
    .setFontColor(C.RED)
    .setRanges([pctRange])
    .build();
  var pctAmberCF = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberBetween(50, 79)
    .setFontColor(C.AMBER)
    .setRanges([pctRange])
    .build();
  var pctGreenCF = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThanOrEqualTo(80)
    .setFontColor(C.GREEN)
    .setRanges([pctRange])
    .build();

  sh.setConditionalFormatRules([mobCF, clrCF, hipCF, pctRedCF, pctAmberCF, pctGreenCF]);

  // ── TAB COLOR ─────────────────────────────────
  sh.setTabColor(C.RED);
}

// ════════════════════════════════════════════════
// FIGHT LOG TAB
// ════════════════════════════════════════════════

function setupFightLog(ss) {
  var sh = ss.getSheetByName(TAB.LOG);
  sh.setTabColor('#1a3a1a');

  // Build headers
  var headers = ['Date', 'Day', 'Phase', 'Hip Score'];

  // 4 exercises × 4 sets × 2 (load, reps)
  for (var e = 1; e <= 4; e++) {
    for (var s = 1; s <= 4; s++) {
      headers.push('Ex' + e + '_S' + s + '_kg');
      headers.push('Ex' + e + '_S' + s + '_reps');
    }
  }

  headers.push('Mob_Done', 'Clr_Done', 'Bag_Rounds', 'Notes', 'Completeness_%');

  var hdrRange = sh.getRange(1, 1, 1, headers.length);
  hdrRange.setValues([headers]);
  hdrRange.setBackground('#0d2a0d');
  hdrRange.setFontColor(C.WHITE);
  hdrRange.setFontWeight('bold');
  hdrRange.setFontFamily('Inter');
  hdrRange.setFontSize(9);

  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 110); // Date
  sh.setColumnWidth(2, 60);  // Day
  sh.setColumnWidth(3, 60);  // Phase
  sh.setColumnWidth(4, 80);  // Hip Score

  // Remaining set columns — narrow
  for (var col = 5; col <= 36; col++) {
    sh.setColumnWidth(col, 55);
  }

  sh.setColumnWidth(37, 60); // Mob_Done
  sh.setColumnWidth(38, 60); // Clr_Done
  sh.setColumnWidth(39, 80); // Bag_Rounds
  sh.setColumnWidth(40, 200); // Notes
  sh.setColumnWidth(41, 120); // Completeness

  // Alternating row formatting (formula-based CF)
  var dataRange = sh.getRange('A2:AO1000');
  dataRange.setBackground('#0a140a').setFontColor(C.BODY).setFontFamily('Inter').setFontSize(9);

  var altRowCF = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=MOD(ROW(),2)=0')
    .setBackground('#0d1a0d')
    .setRanges([dataRange])
    .build();

  sh.setConditionalFormatRules([altRowCF]);
  sh.getRange('A1:AO1').setFontFamily('Inter');
}

// ════════════════════════════════════════════════
// STATS TAB
// ════════════════════════════════════════════════

function setupStats(ss) {
  var sh = ss.getSheetByName(TAB.STATS);
  sh.setTabColor('#1a1a3a');
  sh.setColumnWidth(1, 200);
  sh.setColumnWidth(2, 120);
  sh.setColumnWidth(3, 160);

  sh.getRange('A1:D1').merge()
    .setValue('📈  PERFORMANCE STATS')
    .setBackground(C.RED)
    .setFontColor(C.WHITE)
    .setFontSize(14)
    .setFontWeight('bold')
    .setFontFamily('Inter')
    .setHorizontalAlignment('center');
  sh.setRowHeight(1, 45);

  // Summary stats
  var stats = [
    ['', '', ''],
    ['TOTAL SESSIONS LOGGED', '=COUNTA(\'📊 Fight Log\'!A:A)-1', ''],
    ['CURRENT PHASE', '=\'⚙️ Settings\'!B3', ''],
    ['PHASE UNLOCK STATUS', '=\'⚙️ Settings\'!B10', ''],
    ['', '', ''],
    ['AVG COMPLETENESS %', '=IFERROR(AVERAGE(\'📊 Fight Log\'!AO:AO),0)&"%"', ''],
    ['BEST COMPLETENESS %', '=IFERROR(MAX(\'📊 Fight Log\'!AO:AO),0)&"%"', ''],
    ['', '', ''],
    ['LAST 7 HIP SCORES', '', ''],
    ['', '=IFERROR(SPARKLINE(IFERROR(QUERY(\'📊 Fight Log\'!D:D,"SELECT D WHERE D IS NOT NULL ORDER BY D LIMIT 7"),{}))', '→ Trend (flat/up = good)']
  ];

  for (var i = 0; i < stats.length; i++) {
    var row = sh.getRange(i + 2, 1, 1, 3);
    row.setValues([stats[i]]);
    row.setBackground(C.PANEL).setFontColor(C.BODY).setFontFamily('Inter');
  }

  sh.getRange('A3:A12').setFontWeight('bold').setFontColor(C.LABEL);
  sh.getRange('B3:B12').setFontColor(C.GOLD).setFontWeight('bold');
}

// ════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════

function _blockHeader(sh, row, text, color) {
  sh.getRange(row, 1, 1, 9).merge()
    .setValue(text)
    .setBackground(color)
    .setFontColor(C.WHITE)
    .setFontSize(11)
    .setFontWeight('bold')
    .setFontFamily('Inter')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle')
    .setPaddingTop ? null : null; // no-op for compatibility
}

function _sectionDivider(sh, row) {
  sh.getRange(row, 1, 1, 9).merge()
    .setValue('')
    .setBackground(C.DIVIDER);
  sh.setRowHeight(row, 6);
}

// ════════════════════════════════════════════════
// ACTION FUNCTIONS
// ════════════════════════════════════════════════

/**
 * logSession()
 * Called by the [LOG SESSION] button.
 * Reads HUD, computes completeness, appends row to Fight Log.
 * Duplicate guard: won't log twice same Day+Phase on same date.
 */
function logSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hud = ss.getSheetByName(TAB.HUD);
  var log = ss.getSheetByName(TAB.LOG);

  // Gather core fields
  var today     = new Date();
  var dayVal    = hud.getRange('B4').getValue();
  var dayNum    = parseInt(String(dayVal).replace('Day ', '')) || 0;
  var phaseNum  = ss.getSheetByName(TAB.SETTINGS).getRange('B3').getValue();
  var hipScore  = hud.getRange('H4').getValue();

  // Duplicate guard
  var lastRow = log.getLastRow();
  if (lastRow > 1) {
    var lastDate  = log.getRange(lastRow, 1).getValue();
    var lastDay   = log.getRange(lastRow, 2).getValue();
    var lastPhase = log.getRange(lastRow, 3).getValue();
    if (
      Utilities.formatDate(new Date(lastDate), Session.getScriptTimeZone(), 'yyyy-MM-dd') ===
      Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd') &&
      lastDay === dayNum && lastPhase === phaseNum
    ) {
      var ui = SpreadsheetApp.getUi();
      var resp = ui.alert(
        '⚠️ Duplicate Warning',
        'A session for ' + dayVal + ' Phase ' + phaseNum + ' was already logged today.\n\nOverwrite / add another row?',
        ui.ButtonSet.YES_NO
      );
      if (resp !== ui.Button.YES) return;
    }
  }

  // Build data row
  var rowData = [today, dayNum, phaseNum, hipScore];

  // Collect strength sets (4 exercises × 4 sets × 2 cols)
  var strRow = 18; // row of Set 1 for Exercise 1
  for (var ex = 0; ex < 4; ex++) {
    var exStartRow = strRow + ex * 6;
    for (var s = 0; s < 4; s++) {
      var setRow = exStartRow + s;
      // Columns B (col 2) = S1 load, C (col 3) = S1 reps... B,C,D,E,F,G,H,I
      // We log as pairs: load | reps per set
      // But HUD stores all 4 sets inline per exercise in rows 18-21, 24-27, 30-33, 36-39
      rowData.push(hud.getRange(setRow, 2).getValue() || '');  // kg
      rowData.push(hud.getRange(setRow, 3).getValue() || '');  // reps
    }
  }

  // Mobility, Cooldown, Bag
  var mobDone = hud.getRange('B9:B13').getValues().flat()
    .filter(function(v) { return v === true; }).length;
  var clrDone = hud.getRange('B50:B54').getValues().flat()
    .filter(function(v) { return v === true; }).length;
  var bagRounds = hud.getRange('G43').getValue() || 0;
  var notes     = hud.getRange('B46').getValue() || '';

  // Completeness (read the formula result from the sheet)
  var completeness = hud.getRange('F57').getValue() || 0;

  rowData.push(mobDone, clrDone, bagRounds, notes, completeness);

  // Append row
  log.appendRow(rowData);

  // Format the date cell
  var newRow = log.getLastRow();
  log.getRange(newRow, 1).setNumberFormat('dd MMM yyyy');

  SpreadsheetApp.getUi().alert(
    '✅ Session Logged!',
    'Day ' + dayNum + ' | Phase ' + phaseNum + '\n' +
    'Completeness: ' + completeness + '%\n' +
    'Hip Score: ' + hipScore + '/5\n\n' +
    'Hit RESET HUD to clear for next session.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * resetHUD()
 * Clears input cells only. Preserves Day and Phase selections.
 */
function resetHUD() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var hud = ss.getSheetByName(TAB.HUD);
  var ui  = SpreadsheetApp.getUi();

  var resp = ui.alert(
    '↺ Reset HUD',
    'This will clear all weights, reps, checkboxes, bag rounds and notes.\nDay and Phase selections will be preserved. Continue?',
    ui.ButtonSet.YES_NO
  );
  if (resp !== ui.Button.YES) return;

  // Clear strength set inputs (4 exercises, 4 set rows each, cols B-I)
  var strRow = 18;
  for (var ex = 0; ex < 4; ex++) {
    var exStart = strRow + ex * 6;
    for (var s = 0; s < 4; s++) {
      hud.getRange(exStart + s, 2, 1, 8).clearContent();
    }
  }

  // Clear mobility checkboxes
  hud.getRange('B9:B13').setValue(false);

  // Clear PAP checkboxes (rows 22, 28, 34, 40 — the PAP rows)
  hud.getRange('B22').setValue(false);
  hud.getRange('B28').setValue(false);
  hud.getRange('B34').setValue(false);
  hud.getRange('B40').setValue(false);

  // Clear bag rounds and notes
  hud.getRange('G43').clearContent();
  hud.getRange('B46').clearContent();

  // Clear cooldown checkboxes
  hud.getRange('B50:B54').setValue(false);

  // Reset hip score to 3 (neutral default)
  hud.getRange('H4').setValue(3);

  ui.alert('✅ HUD Reset', 'Ready for your next session.', ui.ButtonSet.OK);
}

/**
 * checkPhase()
 * Counts gym sessions in Fight Log for current phase.
 * Alerts if threshold reached.
 */
function checkPhase() {
  var ss       = SpreadsheetApp.getActiveSpreadsheet();
  var settings = ss.getSheetByName(TAB.SETTINGS);
  var currentPhase   = settings.getRange('B3').getValue();
  var threshold      = settings.getRange('B4').getValue();
  var sessionsLogged = settings.getRange('B5').getValue(); // formula result

  var ui = SpreadsheetApp.getUi();

  if (sessionsLogged >= threshold && currentPhase < 3) {
    ui.alert(
      '🔓 PHASE UNLOCK!',
      'You have completed ' + sessionsLogged + ' sessions in Phase ' + currentPhase + '!\n\n' +
      'Go to the ⚙️ Settings tab and change "CURRENT PHASE" to ' + (currentPhase + 1) + '.\n\n' +
      'The Playbook will automatically load Phase ' + (currentPhase + 1) + ' exercises.',
      ui.ButtonSet.OK
    );
  } else if (currentPhase >= 3 && sessionsLogged >= threshold) {
    ui.alert(
      '🏆 PHASE 3 COMPLETE!',
      'You have finished all three phases.\n\n' +
      'Total gym sessions: ' + sessionsLogged + '\n\n' +
      'Consider running a new cycle or consulting your coach for a custom Phase 4.',
      ui.ButtonSet.OK
    );
  } else {
    ui.alert(
      '🔒 Phase ' + currentPhase + ' in Progress',
      'Sessions completed: ' + sessionsLogged + ' / ' + threshold + '\n' +
      (threshold - sessionsLogged) + ' more gym sessions until Phase ' + (currentPhase + 1) + ' unlocks.\n\n' +
      'Keep going.',
      ui.ButtonSet.OK
    );
  }
}
