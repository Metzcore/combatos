import AuthGate from './components/AuthGate.jsx'
import { DBProvider } from './db/index.jsx'
import AppShell from './components/AppShell.jsx'
import DailyIgnition from './components/DailyIgnition.jsx'
import { CartridgeAccessProvider } from './cartridges/CartridgeAccessProvider.jsx'
import './index.css'

export default function App() {
    return (
        <AuthGate>
            <CartridgeAccessProvider>
                <DBProvider>
                    <DailyIgnition />
                    <AppShell />
                </DBProvider>
            </CartridgeAccessProvider>
        </AuthGate>
    )
}
