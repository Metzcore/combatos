/**
 * components/AuthGate.jsx — gates the app on a Supabase session.
 *
 *   loading  → brief spinner (matches DBProvider's loading style)
 *   no user  → SignIn only (a signed-out app shows nothing else, plan §5)
 *   signed in → children
 *
 * The DB/app tree mounts only when authed, so no Dexie/sync work happens for a
 * signed-out visitor.
 */

import { useAuth } from '../auth/AuthProvider.jsx'
import SignIn from './SignIn.jsx'

export default function AuthGate({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return (
            <div
                className="app"
                style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
            >
                <div style={{ textAlign: 'center', color: 'var(--dim)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: 8 }}>⚔️</div>
                    <div>Loading Fighter&apos;s OS…</div>
                </div>
            </div>
        )
    }

    if (!user) return <SignIn />

    return children
}
