// index.js — bundled cartridge registry
//
// These JSON files MIRROR the canonical, authored source at repo-root
// `cartridges/*.json` (validated by app/src/utils/validateCartridge.js and
// its tests). They're copied in here — not imported across the Vite project
// root — because Vite's dev server / build only resolves modules inside its
// root by default; this avoids relying on undocumented fs.allow behavior.
// Same pattern as data/playbook.js mirroring the root-level playbook.csv.
//
// Keep in sync manually when a cartridge changes. If this drifts often
// enough to hurt, promote to a small sync script (see csv_to_js.py for the
// existing precedent) rather than fixing it by hand indefinitely.

import combatosFoundation2026 from './combatos-foundation-2026.json'
import combatosOperator2026 from './combatos-operator-2026.json'
import apexProtocolPhase1 from './apex-protocol-phase1.json'

export const CARTRIDGES = [combatosFoundation2026, combatosOperator2026, apexProtocolPhase1]

export default CARTRIDGES
