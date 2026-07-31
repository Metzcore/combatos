/**
 * db/backupRedaction.js — the device-secret boundary for backups (W29). PURE.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * `exportFullBackup()` enumerates every Dexie table dynamically, and `settings`
 * is one of them. The Agent surface stores a backup endpoint and its bearer
 * token as settings. Without a boundary, that composes into a genuine hole:
 *
 *   every backup file would contain the credential needed to write to the
 *   endpoint that backup is being sent to.
 *
 * Worse, it is self-reinforcing — the pushed copy carries the token to the
 * remote, the downloaded copy carries it into whatever the user does with the
 * file, and neither is obvious from looking at the UI.
 *
 * WHY A DENYLIST HERE RATHER THAN MOVING SECRETS ELSEWHERE
 * Two tempting alternatives are both worse:
 *   - Moving secrets to localStorage would dodge the exporter by hiding the
 *     coupling rather than stating it, and weakens data ownership for no
 *     security gain (localStorage is not a vault).
 *   - A dedicated Dexie `secrets` table would be enumerated by `db.tables`
 *     too, so it changes nothing unless the exporter is also taught about it —
 *     i.e. exactly this module, with extra schema cost.
 *
 * WHAT THIS DELIBERATELY CHANGES
 * The backup's promise narrows from "every table, every row" to "all
 * recoverable user data, excluding device credentials". That is a real
 * semantic change, so `backup.js` bumps its format version and emits
 * `redactedSettings` listing the KEY NAMES that were withheld — a restore
 * (whenever one exists) must be able to tell the user what to reconfigure
 * rather than silently producing a half-working device.
 *
 * ADDING A KEY HERE IS A SECURITY DECISION. Anything that authenticates this
 * device to a remote belongs on the list. Ordinary preferences do not — over-
 * redacting silently degrades what a backup can restore.
 */

/**
 * Settings keys whose VALUES must never leave the device inside a backup.
 *
 * Note these are exported for the Agent surface to import, so the writer and
 * the redactor can never drift apart — a new credential key added in one place
 * without the other is the exact failure this module exists to prevent.
 */
export const AGENT_ENDPOINT_URL_KEY = 'agentBackupEndpointUrl'
export const AGENT_ENDPOINT_TOKEN_KEY = 'agentBackupToken'

export const SENSITIVE_SETTING_KEYS = Object.freeze([
    AGENT_ENDPOINT_URL_KEY,
    AGENT_ENDPOINT_TOKEN_KEY,
])

/** True if this settings key's value must be withheld from backups. */
export function isSensitiveSettingKey(key) {
    return SENSITIVE_SETTING_KEYS.includes(key)
}

/**
 * redactSettingsRows — split a settings table dump into safe rows and the
 * names of what was withheld.
 *
 * Returns `{ rows, redactedKeys }`. Rows are returned in input order with the
 * sensitive ones REMOVED ENTIRELY — not blanked, not replaced with a
 * placeholder. A `{ key, value: '' }` row would round-trip through a future
 * restore and overwrite a good credential with an empty one.
 *
 * Defensive about input: a non-array (corrupt read, undefined table) yields an
 * empty result rather than throwing, because a backup failing hard is worse
 * than a backup that is honest about being empty.
 */
export function redactSettingsRows(rows) {
    if (!Array.isArray(rows)) return { rows: [], redactedKeys: [] }

    const safe = []
    const redactedKeys = []
    for (const row of rows) {
        // A row without a usable key can't be matched against the denylist, so
        // it cannot be proven safe. Keep it — it is also not a credential by
        // construction, since credentials are written under known keys.
        if (row && typeof row.key === 'string' && isSensitiveSettingKey(row.key)) {
            redactedKeys.push(row.key)
            continue
        }
        safe.push(row)
    }
    return { rows: safe, redactedKeys }
}
