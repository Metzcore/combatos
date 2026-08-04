#!/usr/bin/env node

/**
 * Dry-run preflight for registering one approved training cartridge.
 *
 * It never copies a candidate, edits source, commits, pushes, deploys, assigns
 * an account, calls Supabase, or contacts a client. It only verifies the
 * candidate and existing registration surfaces, then prepares a human plan.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCartridge } from '../app/src/utils/validateCartridge.js'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CARTRIDGE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const SHA256_PATTERN = /^[a-f0-9]{64}$/

function sha256(buffer) {
    return createHash('sha256').update(buffer).digest('hex')
}

function listJsonFiles(directory) {
    return readdirSync(directory).filter((name) => name.endsWith('.json')).sort()
}

function parseJsonFile(path, label, errors) {
    try {
        return JSON.parse(readFileSync(path, 'utf8'))
    } catch (error) {
        errors.push(`${label} is not valid JSON: ${error.message}`)
        return null
    }
}

function duplicates(values) {
    const seen = new Set()
    return values.filter((value) => {
        if (seen.has(value)) return true
        seen.add(value)
        return false
    })
}

function parseRegistry(indexPath, errors) {
    const source = readFileSync(indexPath, 'utf8')
    const imports = new Map()
    const pattern = /^import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]\.\/([^/'"]+\.json)['"]\s*$/gm
    for (const [, variable, fileName] of source.matchAll(pattern)) {
        if (imports.has(variable)) errors.push(`registry imports ${variable} more than once`)
        imports.set(variable, fileName)
    }

    const list = source.match(/export const CARTRIDGES\s*=\s*\[([\s\S]*?)\]/)
    if (!list) {
        errors.push('registry is missing the CARTRIDGES array')
        return { registeredFiles: [] }
    }
    const variables = list[1].split(',').map((value) => value.trim()).filter(Boolean)
    const unknown = variables.filter((variable) => !imports.has(variable))
    if (unknown.length) errors.push(`registry CARTRIDGES references unknown import(s): ${unknown.join(', ')}`)
    const repeated = duplicates(variables)
    if (repeated.length) errors.push(`registry CARTRIDGES repeats import(s): ${[...new Set(repeated)].join(', ')}`)
    return { registeredFiles: variables.map((variable) => imports.get(variable)).filter(Boolean) }
}

function importIdentifier(cartridgeId) {
    return cartridgeId.replace(/-([a-z0-9])/g, (_, character) => character.toUpperCase())
}

function isInside(path, directory) {
    const relativePath = relative(directory, path)
    return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath))
}

function integrityLists(repoRoot) {
    return [
        resolve(repoRoot, 'app/src/utils/validateCartridge.test.js'),
        resolve(repoRoot, 'app/src/utils/exerciseCatalogueIntegrity.test.js')
    ]
}

/** Perform the preflight without writing any file. */
export function buildRegistrationPreflight({ repoRoot = REPO_ROOT, candidatePath, expectedSha256 }) {
    const errors = []
    const candidateAbsolutePath = candidatePath && resolve(candidatePath)
    const canonicalDirectory = resolve(repoRoot, 'cartridges')
    const mirrorDirectory = resolve(repoRoot, 'app/src/data/cartridges')
    const registryPath = resolve(mirrorDirectory, 'index.js')

    if (!candidatePath) errors.push('missing required --candidate <path>')
    if (!expectedSha256) errors.push('missing required --sha256 <lowercase-64-hex>')
    if (expectedSha256 && !SHA256_PATTERN.test(expectedSha256)) errors.push('--sha256 must be exactly 64 lowercase hexadecimal characters')
    if (candidateAbsolutePath && !candidateAbsolutePath.endsWith('.json')) errors.push('candidate path must name a .json file')
    if (candidateAbsolutePath && !existsSync(candidateAbsolutePath)) errors.push(`candidate does not exist: ${candidateAbsolutePath}`)

    let candidate = null
    let fileName = null
    let cartridgeId = null
    if (errors.length === 0) {
        const candidateBytes = readFileSync(candidateAbsolutePath)
        const actualSha256 = sha256(candidateBytes)
        if (actualSha256 !== expectedSha256) errors.push(`candidate SHA-256 mismatch: expected ${expectedSha256}, got ${actualSha256}`)
        if (candidateBytes.includes(0x0d)) errors.push('candidate contains CR bytes; approved hash must use LF-only JSON to survive checkout')
        candidate = parseJsonFile(candidateAbsolutePath, 'candidate', errors)
        fileName = candidateAbsolutePath.split(/[\\/]/).pop()
        cartridgeId = candidate?.cartridgeId
        if (!CARTRIDGE_ID_PATTERN.test(cartridgeId || '')) errors.push('candidate cartridgeId must be a lowercase-kebab identifier for safe registration')
        if (candidate && fileName !== `${cartridgeId}.json`) errors.push(`candidate file name must be ${cartridgeId}.json to match its cartridgeId`)
        if (candidate) {
            const validationErrors = validateCartridge(candidate)
            if (validationErrors.length) errors.push(`candidate structural validation failed: ${validationErrors.join('; ')}`)
        }
    }

    const canonicalNames = listJsonFiles(canonicalDirectory)
    const mirrorNames = listJsonFiles(mirrorDirectory)
    const missingMirrors = canonicalNames.filter((name) => !mirrorNames.includes(name))
    const missingCanonicals = mirrorNames.filter((name) => !canonicalNames.includes(name))
    if (missingMirrors.length) errors.push(`canonical cartridge(s) missing app mirror: ${missingMirrors.join(', ')}`)
    if (missingCanonicals.length) errors.push(`app mirror(s) missing canonical cartridge: ${missingCanonicals.join(', ')}`)

    const existingIds = []
    for (const name of canonicalNames) {
        const canonicalPath = resolve(canonicalDirectory, name)
        const mirrorPath = resolve(mirrorDirectory, name)
        const canonical = parseJsonFile(canonicalPath, `canonical ${name}`, errors)
        const mirror = existsSync(mirrorPath) ? parseJsonFile(mirrorPath, `app mirror ${name}`, errors) : null
        if (canonical?.cartridgeId) existingIds.push(canonical.cartridgeId)
        if (canonical && mirror && !readFileSync(canonicalPath).equals(readFileSync(mirrorPath))) errors.push(`canonical and app mirror differ byte-for-byte: ${name}`)
        if (canonical && mirror && canonical.cartridgeId !== mirror.cartridgeId) errors.push(`canonical and app mirror cartridgeId differ: ${name}`)
    }
    const duplicateIds = duplicates(existingIds)
    if (duplicateIds.length) errors.push(`canonical cartridgeId collision(s): ${[...new Set(duplicateIds)].join(', ')}`)

    const registry = parseRegistry(registryPath, errors)
    const missingRegistry = mirrorNames.filter((name) => !registry.registeredFiles.includes(name))
    const orphanedRegistry = registry.registeredFiles.filter((name) => !mirrorNames.includes(name))
    if (missingRegistry.length) errors.push(`app mirror(s) missing registry entry: ${missingRegistry.join(', ')}`)
    if (orphanedRegistry.length) errors.push(`registry entry has no app mirror: ${orphanedRegistry.join(', ')}`)
    const duplicateRegistryFiles = duplicates(registry.registeredFiles)
    if (duplicateRegistryFiles.length) errors.push(`registry repeats JSON file(s): ${[...new Set(duplicateRegistryFiles)].join(', ')}`)

    const canonicalTargetPath = cartridgeId && resolve(canonicalDirectory, `${cartridgeId}.json`)
    const mirrorTargetPath = cartridgeId && resolve(mirrorDirectory, `${cartridgeId}.json`)
    if (canonicalTargetPath && existsSync(canonicalTargetPath)) errors.push(`canonical target already exists: ${canonicalTargetPath}`)
    if (mirrorTargetPath && existsSync(mirrorTargetPath)) errors.push(`app mirror target already exists: ${mirrorTargetPath}`)
    if (cartridgeId && existingIds.includes(cartridgeId)) errors.push(`cartridgeId is already registered canonically: ${cartridgeId}`)

    const requiredLists = integrityLists(repoRoot)
    for (const path of requiredLists) {
        if (!existsSync(path)) errors.push(`required integrity list is missing: ${path}`)
        else if (fileName && readFileSync(path, 'utf8').includes(fileName)) errors.push(`candidate already appears in integrity list: ${path}`)
    }

    return {
        ok: errors.length === 0,
        errors,
        repoRoot,
        candidatePath: candidateAbsolutePath,
        expectedSha256,
        cartridgeId,
        fileName,
        importIdentifier: cartridgeId && importIdentifier(cartridgeId),
        canonicalTargetPath,
        mirrorTargetPath,
        registryPath,
        canonicalNames,
        requiredLists
    }
}

export function formatRegistrationPreflight(result) {
    const lines = [
        '# Cartridge registration preflight',
        '',
        `Status: ${result.ok ? 'READY FOR HUMAN REGISTRATION' : 'BLOCKED'}`,
        `Candidate: ${result.candidatePath ?? '(not provided)'}`,
        `Expected SHA-256: ${result.expectedSha256 ?? '(not provided)'}`,
        `Cartridge ID: ${result.cartridgeId ?? '(unavailable)'}`,
        ''
    ]
    if (!result.ok) {
        lines.push('## Blocking findings', '', ...result.errors.map((error) => `- ${error}`), '', 'No source, registry, test, deployment, assignment, database, or Git change was made.')
        return `${lines.join('\n')}\n`
    }
    lines.push(
        '## Verified without modifying source',
        '',
        '- Candidate raw SHA-256 matches the approved value and the file is LF-only.',
        '- Candidate passes `validateCartridge()` structural validation.',
        `- Existing canonical and app-mirror sets are byte-identical (${result.canonicalNames.length} cartridges).`,
        '- Existing app-mirror files are complete in the runtime registry.',
        '',
        '## Prepared human registration plan',
        '',
        `1. Copy the approved bytes to \`${relative(result.repoRoot, result.canonicalTargetPath)}\`.`,
        `2. Copy the same approved bytes to \`${relative(result.repoRoot, result.mirrorTargetPath)}\`.`,
        `3. In \`${relative(result.repoRoot, result.registryPath)}\`, add \`import ${result.importIdentifier} from './${result.fileName}'\` and append \`${result.importIdentifier}\` once to \`CARTRIDGES\`.`,
        '4. Add the filename once to each explicit integrity list:',
        ...result.requiredLists.map((path) => `   - \`${relative(result.repoRoot, path)}\``),
        '5. Run the focused validator, canonical/mirror, registry-completeness, full app test suite, and production build checks.',
        '',
        'This preflight intentionally stops here. A separate reviewed Track A task must make the listed source changes; deployment, assignment, database changes, and client contact remain developer-only actions.'
    )
    return `${lines.join('\n')}\n`
}

function parseArguments(argv) {
    const options = {}
    for (let index = 0; index < argv.length; index += 1) {
        const argument = argv[index]
        if (argument === '--candidate' || argument === '--sha256' || argument === '--report') {
            options[argument.slice(2)] = argv[index + 1]
            index += 1
        } else if (argument === '--help' || argument === '-h') {
            options.help = true
        } else {
            options.invalid = argument
        }
    }
    return options
}

function runCli() {
    const options = parseArguments(process.argv.slice(2))
    if (options.help) {
        console.log('Usage: node scripts/cartridge-registration-preflight.mjs --candidate <approved.json> --sha256 <lowercase-64-hex> [--report dev_files/cartridge-preflight/<id>.md]')
        return 0
    }
    if (options.invalid) {
        console.error(`Unknown argument: ${options.invalid}`)
        return 2
    }
    const result = buildRegistrationPreflight({ candidatePath: options.candidate, expectedSha256: options.sha256 })
    const report = formatRegistrationPreflight(result)
    console.log(report)
    if (options.report) {
        const reportPath = resolve(options.report)
        const allowedDirectory = resolve(REPO_ROOT, 'dev_files')
        if (!isInside(reportPath, allowedDirectory)) {
            console.error('--report must stay under this repository\'s ignored dev_files/ directory')
            return 2
        }
        mkdirSync(dirname(reportPath), { recursive: true })
        writeFileSync(reportPath, report, 'utf8')
        console.log(`Report written: ${reportPath}`)
    }
    return result.ok ? 0 : 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    process.exitCode = runCli()
}
