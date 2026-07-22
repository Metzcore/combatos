import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useAuth } from '../auth/AuthProvider.jsx'
import { CARTRIDGE_BY_ID } from '../data/cartridges/index.js'
import {
    CARTRIDGE_ACCESS_RESET_EVENT,
    createCartridgeAccessSnapshot,
    mapCartridgeAccess,
} from './accessModel.js'
import {
    clearCartridgeAccessCache,
    readCartridgeAccessCache,
    writeCartridgeAccessCache,
} from '../db/cartridgeAccess.js'
import { fetchCartridgeAccess, setActiveCartridge } from '../sync/cartridgeAccess.js'
import { supabase } from '../sync/supabaseClient.js'

const CartridgeAccessContext = createContext(null)

const EMPTY_STATE = {
    snapshot: null,
    source: null,
    loading: true,
    refreshing: false,
    offline: false,
    error: null,
    errorKind: null,
    activatingId: null,
}

function looksLikeNetworkFailure(error) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true
    const message = `${error?.message ?? ''} ${error?.details ?? ''}`.toLowerCase()
    return message.includes('failed to fetch') || message.includes('network') || error?.status === 0
}

export function CartridgeAccessProvider({ children }) {
    const { user, authMode } = useAuth()
    const userId = user?.id ?? null
    const [state, setState] = useState(EMPTY_STATE)
    const operationRef = useRef(0)
    const activatingRef = useRef(false)

    const refresh = useCallback(async () => {
        if (!userId || authMode !== 'online') {
            return { data: null, error: new Error('Connect to refresh your programs.') }
        }
        if (activatingRef.current) {
            return { data: null, error: new Error('Program activation is already in progress.') }
        }

        const operation = ++operationRef.current
        setState((previous) => ({
            ...previous,
            loading: previous.snapshot === null,
            refreshing: true,
            error: null,
            errorKind: null,
        }))

        try {
            const snapshot = await fetchCartridgeAccess(supabase, userId)
            if (operation !== operationRef.current) return { data: null, error: null }

            let cacheError = null
            try {
                await writeCartridgeAccessCache(snapshot)
            } catch (error) {
                cacheError = error
            }
            if (operation !== operationRef.current) return { data: null, error: null }

            setState({
                snapshot,
                source: 'server',
                loading: false,
                refreshing: false,
                offline: false,
                error: cacheError,
                errorKind: cacheError ? 'cache' : null,
                activatingId: null,
            })
            return { data: snapshot, error: cacheError }
        } catch (error) {
            if (operation !== operationRef.current) return { data: null, error }
            setState((previous) => ({
                ...previous,
                loading: false,
                refreshing: false,
                offline: looksLikeNetworkFailure(error),
                error,
                errorKind: 'refresh',
            }))
            return { data: null, error }
        }
    }, [authMode, userId])

    useEffect(() => {
        let cancelled = false
        const operation = ++operationRef.current

        setState(EMPTY_STATE)

        async function initialise() {
            if (!userId) {
                if (!cancelled) setState({ ...EMPTY_STATE, loading: false })
                return
            }

            let cached = null
            try {
                const deviceCache = await readCartridgeAccessCache()
                if (deviceCache?.userId === userId) {
                    cached = deviceCache
                } else if (deviceCache) {
                    // Account switching is unsupported, but a stale cache from
                    // another identity must never become this user's fallback.
                    await clearCartridgeAccessCache()
                }
            } catch (error) {
                if (!cancelled && operation === operationRef.current) {
                    setState((previous) => ({ ...previous, loading: false, error }))
                }
            }

            if (cancelled || operation !== operationRef.current) return

            if (cached) {
                setState({
                    snapshot: cached,
                    source: 'cache',
                    loading: false,
                    refreshing: false,
                    offline: authMode === 'offline',
                    error: null,
                    errorKind: null,
                    activatingId: null,
                })
            }

            if (authMode === 'online') {
                await refresh()
            } else if (!cached) {
                setState((previous) => ({ ...previous, loading: false, offline: true }))
            }
        }

        initialise()

        const handleOnline = () => {
            if (authMode === 'online' && !activatingRef.current) refresh()
        }
        const handleReset = () => {
            operationRef.current += 1
            activatingRef.current = false
        }
        if (typeof window !== 'undefined') window.addEventListener('online', handleOnline)
        if (typeof window !== 'undefined') {
            window.addEventListener(CARTRIDGE_ACCESS_RESET_EVENT, handleReset)
        }

        return () => {
            cancelled = true
            operationRef.current += 1
            if (typeof window !== 'undefined') window.removeEventListener('online', handleOnline)
            if (typeof window !== 'undefined') {
                window.removeEventListener(CARTRIDGE_ACCESS_RESET_EVENT, handleReset)
            }
        }
    }, [authMode, refresh, userId])

    const activate = useCallback(async (cartridgeId) => {
        if (!userId || authMode !== 'online') {
            return { data: null, error: new Error('Connect before changing your active program.') }
        }
        if (activatingRef.current) {
            return { data: null, error: new Error('Program activation is already in progress.') }
        }

        const current = state.snapshot
        if (!current?.availableIds.includes(cartridgeId)) {
            return { data: null, error: new Error('That program is not available to this user.') }
        }

        activatingRef.current = true
        const operation = ++operationRef.current
        setState((previous) => ({
            ...previous,
            activatingId: cartridgeId,
            error: null,
            errorKind: null,
        }))

        try {
            const confirmedId = await setActiveCartridge(
                supabase,
                userId,
                cartridgeId,
                current.availableIds
            )
            if (operation !== operationRef.current) return { data: null, error: null }

            const snapshot = createCartridgeAccessSnapshot({
                ...current,
                activeId: confirmedId,
                syncedAt: new Date().toISOString(),
            })

            let cacheError = null
            try {
                await writeCartridgeAccessCache(snapshot)
            } catch (error) {
                cacheError = error
            }
            if (operation !== operationRef.current) return { data: null, error: null }

            setState({
                snapshot,
                source: 'server',
                loading: false,
                refreshing: false,
                offline: false,
                error: cacheError,
                errorKind: cacheError ? 'cache' : null,
                activatingId: null,
            })
            return { data: snapshot, error: cacheError }
        } catch (error) {
            if (operation === operationRef.current) {
                setState((previous) => ({
                    ...previous,
                    activatingId: null,
                    error,
                    errorKind: 'activation',
                }))
            }
            return { data: null, error }
        } finally {
            activatingRef.current = false
        }
    }, [authMode, state.snapshot, userId])

    const mapped = useMemo(
        () => mapCartridgeAccess(state.snapshot, CARTRIDGE_BY_ID),
        [state.snapshot]
    )

    const value = useMemo(() => ({
        ...state,
        ...mapped,
        refresh,
        activate,
    }), [activate, mapped, refresh, state])

    return (
        <CartridgeAccessContext.Provider value={value}>
            {children}
        </CartridgeAccessContext.Provider>
    )
}

export function useCartridgeAccess() {
    const context = useContext(CartridgeAccessContext)
    if (!context) {
        throw new Error('useCartridgeAccess must be used within CartridgeAccessProvider')
    }
    return context
}
