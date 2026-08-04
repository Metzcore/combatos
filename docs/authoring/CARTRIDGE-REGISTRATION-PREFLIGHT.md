# Cartridge registration preflight

Use this **Track A-only** dry-run after a coach has approved a candidate cartridge and its
raw-byte SHA-256, but before anyone copies it into the app or edits the runtime registry.

It deliberately does not copy a JSON file, edit source, commit, push, deploy, assign an account,
call Supabase, or contact a client. It verifies the candidate and prepares the exact four
registration surfaces for a separately reviewed implementation task:

1. canonical `cartridges/<cartridgeId>.json`;
2. byte-identical app mirror `app/src/data/cartridges/<cartridgeId>.json`;
3. runtime registry `app/src/data/cartridges/index.js`;
4. explicit integrity lists in `validateCartridge.test.js` and
   `exerciseCatalogueIntegrity.test.js`.

## Run

From the Fight-Camp repository root:

```powershell
node scripts/cartridge-registration-preflight.mjs `
  --candidate "C:\path\to\approved-candidate.json" `
  --sha256 "<approved lowercase SHA-256>" `
  --report "dev_files\cartridge-preflight\<cartridge-id>.md"
```

The optional report must stay beneath ignored `dev_files/`. The command otherwise writes nothing.
It exits `0` only when the candidate and all existing registration surfaces pass; `1` means a
preflight blocker and `2` means invalid command input.

## What it checks

- Candidate raw SHA-256 equals the approved value and the JSON is LF-only, so `.gitattributes`
  preserves the approved hash on checkout.
- Candidate filename matches its lower-kebab `cartridgeId` and passes `validateCartridge()`.
- Existing canonical and app-mirror file sets match exactly and each pair is byte-identical.
- Existing app-mirror files are all represented once in `CARTRIDGES`, with no orphaned registry
  entry.
- The candidate does not already exist, and the report contains the exact import, registry and
  test-list additions a human implementation task must review.

## After a green report

A fresh, scoped Track A task may make the report's listed source edits, then run the focused
validator/integrity/registry tests, full app test suite, and production build. That task still
stops for developer review. Deployment, protected assignment, database changes and client contact
are never performed by this preflight.
