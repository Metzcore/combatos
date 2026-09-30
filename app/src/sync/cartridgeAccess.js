/**
 * Supabase reads and the one allowed account-side cartridge mutation.
 * RLS is authoritative; explicit user filters are retained as defence in
 * depth and to keep the client query's intent obvious.
 */

import { createCartridgeAccessSnapshot, isValidCartridgeId, isValidUserId } from '../cartridges/accessModel.js'

function assertUserId(userId) {
    if (!isValidUserId(userId)) throw new Error('A valid authenticated user ID is required.')
}

// W36: PostgREST rejects a token whose `iat` is ahead of its own clock with
// 401 PGRST303 ("JWT issued at future"). Supabase Auth's and PostgREST's
// clocks were measured ≥0.93s apart (edge logs, 2026-09-29/30), so a read
// fired in the first second after a password sign-in can fail with a valid
// token, and the user landed on "Couldn't load your plan". Waiting lets the
// clocks agree; the same token then passes. Matched on the published code,
// never the message text. Every other error still surfaces immediately.
const TOKEN_NOT_YET_VALID_CODE = 'PGRST303'
const TOKEN_RETRY_DELAYS_MS = [1000, 2000]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function isTokenNotYetValidError(error) {
    return error?.code === TOKEN_NOT_YET_VALID_CODE
}

export async function fetchCartridgeAccess(client, userId, { delay = wait } = {}) {
    assertUserId(userId)
    if (!client) throw new Error('Supabase is not configured for this build.')

    for (let attempt = 0; ; attempt += 1) {
        try {
            return await readCartridgeAccess(client, userId)
        } catch (error) {
            if (!isTokenNotYetValidError(error) || attempt >= TOKEN_RETRY_DELAYS_MS.length) throw error
            await delay(TOKEN_RETRY_DELAYS_MS[attempt])
        }
    }
}

async function readCartridgeAccess(client, userId) {
    const [availabilityResult, profileResult] = await Promise.all([
        client
            .from('user_cartridges')
            .select('cartridge_id, assigned_at')
            .eq('user_id', userId)
            .order('assigned_at', { ascending: true }),
        client
            .from('profiles')
            .select('assigned_cartridge')
            .eq('id', userId)
            .single(),
    ])

    if (availabilityResult.error) throw availabilityResult.error
    if (profileResult.error) throw profileResult.error

    return createCartridgeAccessSnapshot({
        userId,
        availableIds: (availabilityResult.data ?? []).map((row) => row.cartridge_id),
        activeId: profileResult.data?.assigned_cartridge ?? null,
    })
}

export async function setActiveCartridge(client, userId, cartridgeId, availableIds) {
    assertUserId(userId)
    if (!client) throw new Error('Supabase is not configured for this build.')
    if (!isValidCartridgeId(cartridgeId) || !availableIds?.includes(cartridgeId)) {
        throw new Error('That program is not available to this user.')
    }

    const { data, error } = await client
        .from('profiles')
        .update({ assigned_cartridge: cartridgeId })
        .eq('id', userId)
        .select('assigned_cartridge')
        .single()

    if (error) throw error
    if (data?.assigned_cartridge !== cartridgeId) {
        throw new Error('Supabase did not confirm the requested active program.')
    }

    return cartridgeId
}
