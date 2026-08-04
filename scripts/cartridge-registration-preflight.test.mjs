import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildRegistrationPreflight, formatRegistrationPreflight } from './cartridge-registration-preflight.mjs'

function hash(value) {
    return createHash('sha256').update(value).digest('hex')
}

function validCartridge(cartridgeId) {
    return {
        cartridgeId,
        label: 'Preflight fixture',
        schemaVersion: 3,
        cartridgeVersion: '1.0.0',
        summary: 'A compact fixture that exercises the local registration preflight.',
        outcomes: ['Confirm structural validation', 'Confirm registration planning'],
        tags: ['fixture'],
        requirements: { equipment: [] },
        cycle: { dayCount: 1 },
        days: [{ day: 1, label: 'Day 1', type: 'training', blocks: [{ kind: 'strength', items: [{ id: 'd1-strength-1', name: 'Fixture squat', sets: 3, reps: '5' }] }] }]
    }
}

function createFixture() {
    const root = mkdtempSync(join(tmpdir(), 'cartridge-registration-preflight-'))
    const canonicalDirectory = join(root, 'cartridges')
    const mirrorDirectory = join(root, 'app/src/data/cartridges')
    const utilsDirectory = join(root, 'app/src/utils')
    mkdirSync(canonicalDirectory, { recursive: true })
    mkdirSync(mirrorDirectory, { recursive: true })
    mkdirSync(utilsDirectory, { recursive: true })
    const existingBytes = `${JSON.stringify(validCartridge('existing-program'), null, 2)}\n`
    writeFileSync(join(canonicalDirectory, 'existing-program.json'), existingBytes)
    writeFileSync(join(mirrorDirectory, 'existing-program.json'), existingBytes)
    writeFileSync(join(mirrorDirectory, 'index.js'), "import existingProgram from './existing-program.json'\n\nexport const CARTRIDGES = [existingProgram]\n")
    writeFileSync(join(utilsDirectory, 'validateCartridge.test.js'), "const cartridgeNames = ['existing-program.json']\n")
    writeFileSync(join(utilsDirectory, 'exerciseCatalogueIntegrity.test.js'), "const CARTRIDGE_NAMES = ['existing-program.json']\n")
    const candidatePath = join(root, 'new-program.json')
    const candidateBytes = `${JSON.stringify(validCartridge('new-program'), null, 2)}\n`
    writeFileSync(candidatePath, candidateBytes)
    return { root, candidatePath, candidateBytes }
}

test('prepares every registration surface for a structurally valid approved candidate', () => {
    const fixture = createFixture()
    try {
        const result = buildRegistrationPreflight({ repoRoot: fixture.root, candidatePath: fixture.candidatePath, expectedSha256: hash(fixture.candidateBytes) })
        assert.equal(result.ok, true)
        assert.equal(result.importIdentifier, 'newProgram')
        const report = formatRegistrationPreflight(result)
        assert.match(report, /READY FOR HUMAN REGISTRATION/)
        assert.match(report, /app[\\/]src[\\/]data[\\/]cartridges[\\/]index\.js/)
        assert.match(report, /validateCartridge\.test\.js/)
        assert.match(report, /exerciseCatalogueIntegrity\.test\.js/)
    } finally {
        rmSync(fixture.root, { recursive: true, force: true })
    }
})

test('blocks a SHA mismatch', () => {
    const fixture = createFixture()
    try {
        const result = buildRegistrationPreflight({ repoRoot: fixture.root, candidatePath: fixture.candidatePath, expectedSha256: '0'.repeat(64) })
        assert.equal(result.ok, false)
        assert.match(result.errors.join('\n'), /SHA-256 mismatch/)
    } finally {
        rmSync(fixture.root, { recursive: true, force: true })
    }
})

test('blocks a canonical and app-mirror drift', () => {
    const fixture = createFixture()
    try {
        writeFileSync(join(fixture.root, 'app/src/data/cartridges/existing-program.json'), '{"cartridgeId":"existing-program"}\n')
        const result = buildRegistrationPreflight({ repoRoot: fixture.root, candidatePath: fixture.candidatePath, expectedSha256: hash(fixture.candidateBytes) })
        assert.equal(result.ok, false)
        assert.match(result.errors.join('\n'), /differ byte-for-byte/)
    } finally {
        rmSync(fixture.root, { recursive: true, force: true })
    }
})
