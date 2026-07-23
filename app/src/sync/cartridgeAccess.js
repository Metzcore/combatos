/**
 * Supabase reads and the one allowed account-side cartridge mutation.
 * RLS is authoritative; explicit user filters are retained as defence in
 * depth and to keep the client query's intent obvious.
 */

import { createCartridgeAccessSnapshot, isValidCartridgeId, isValidUserId } from '../cartridges/accessModel.js'

function assertUserId(userId) {
    if (!isValidUserId(userId)) throw new Error('A valid authenticated user ID is required.')
}

export async function fetchCartridgeAccess(client, userId) {
    assertUserId(userId)
    if (!client) throw new Error('Supabase is not configured for this build.')

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
