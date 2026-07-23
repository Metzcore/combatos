import { describe, expect, it, vi } from 'vitest'
import { fetchCartridgeAccess, setActiveCartridge } from './cartridgeAccess.js'

const USER_ID = '11111111-1111-4111-8111-111111111111'

function fetchClient({ availability, profile }) {
    const availabilityOrder = vi.fn().mockResolvedValue(availability)
    const availabilityEq = vi.fn(() => ({ order: availabilityOrder }))
    const availabilitySelect = vi.fn(() => ({ eq: availabilityEq }))

    const profileSingle = vi.fn().mockResolvedValue(profile)
    const profileEq = vi.fn(() => ({ single: profileSingle }))
    const profileSelect = vi.fn(() => ({ eq: profileEq }))

    return {
        client: {
            from: vi.fn((table) => table === 'user_cartridges'
                ? { select: availabilitySelect }
                : { select: profileSelect }),
        },
        availabilityEq,
        availabilityOrder,
        profileEq,
    }
}

describe('fetchCartridgeAccess', () => {
    it('reads both own-user sources and creates one complete snapshot', async () => {
        const { client, availabilityEq, availabilityOrder, profileEq } = fetchClient({
            availability: {
                data: [
                    { cartridge_id: 'program-one', assigned_at: '2026-07-01' },
                    { cartridge_id: 'program-two', assigned_at: '2026-07-02' },
                ],
                error: null,
            },
            profile: { data: { assigned_cartridge: 'program-two' }, error: null },
        })

        const result = await fetchCartridgeAccess(client, USER_ID)

        expect(result).toMatchObject({
            userId: USER_ID,
            availableIds: ['program-one', 'program-two'],
            activeId: 'program-two',
        })
        expect(availabilityEq).toHaveBeenCalledWith('user_id', USER_ID)
        expect(profileEq).toHaveBeenCalledWith('id', USER_ID)
        expect(availabilityOrder).toHaveBeenCalledWith('assigned_at', { ascending: true })
    })

    it('rejects the entire read when either server source fails', async () => {
        const serverError = new Error('network down')
        const { client } = fetchClient({
            availability: { data: null, error: serverError },
            profile: { data: { assigned_cartridge: null }, error: null },
        })

        await expect(fetchCartridgeAccess(client, USER_ID)).rejects.toBe(serverError)
    })

    it('rejects inconsistent server facts instead of selecting a fallback', async () => {
        const { client } = fetchClient({
            availability: { data: [{ cartridge_id: 'program-one' }], error: null },
            profile: { data: { assigned_cartridge: 'program-two' }, error: null },
        })

        await expect(fetchCartridgeAccess(client, USER_ID))
            .rejects.toThrow('Invalid cartridge access snapshot')
    })
})

describe('setActiveCartridge', () => {
    function activationClient(result) {
        const single = vi.fn().mockResolvedValue(result)
        const select = vi.fn(() => ({ single }))
        const eq = vi.fn(() => ({ select }))
        const update = vi.fn(() => ({ eq }))
        return { client: { from: vi.fn(() => ({ update })) }, update, eq }
    }

    it('updates only the own profile and returns the confirmed ID', async () => {
        const { client, update, eq } = activationClient({
            data: { assigned_cartridge: 'program-two' },
            error: null,
        })

        await expect(setActiveCartridge(
            client,
            USER_ID,
            'program-two',
            ['program-one', 'program-two']
        )).resolves.toBe('program-two')
        expect(update).toHaveBeenCalledWith({ assigned_cartridge: 'program-two' })
        expect(eq).toHaveBeenCalledWith('id', USER_ID)
    })

    it('does not contact Supabase for an unavailable program', async () => {
        const { client } = activationClient({ data: null, error: null })

        await expect(setActiveCartridge(client, USER_ID, 'program-two', ['program-one']))
            .rejects.toThrow('not available')
        expect(client.from).not.toHaveBeenCalled()
    })

    it('requires exact Supabase confirmation', async () => {
        const { client } = activationClient({
            data: { assigned_cartridge: 'program-one' },
            error: null,
        })

        await expect(setActiveCartridge(
            client,
            USER_ID,
            'program-two',
            ['program-one', 'program-two']
        )).rejects.toThrow('did not confirm')
    })
})
