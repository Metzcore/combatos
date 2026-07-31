import AuthGate from './components/AuthGate.jsx'
import { DBProvider } from './db/index.jsx'
import AppShell from './components/AppShell.jsx'
import DailyIgnition from './components/DailyIgnition.jsx'
import { CartridgeAccessProvider } from './cartridges/CartridgeAccessProvider.jsx'
import useBackupPushScheduler from './hooks/useBackupPushScheduler.js'
import './index.css'

// W29 PR E — mounts the Agent auto-push scheduler. A component rather than a
// bare hook call: useBackupPushScheduler needs useDB(), which only resolves
// inside DBProvider. Renders nothing.
function BackupPushScheduler() {
    useBackupPushScheduler()
    return null
}

export default function App() {
    return (
        <AuthGate>
            <CartridgeAccessProvider>
                <DBProvider>
                    <BackupPushScheduler />
                    <DailyIgnition />
                    <AppShell />
                </DBProvider>
            </CartridgeAccessProvider>
        </AuthGate>
    )
}
