import AuthGate from './components/AuthGate.jsx'
import { DBProvider } from './db/index.jsx'
import AppShell from './components/AppShell.jsx'
import DailyIgnition from './components/DailyIgnition.jsx'
import './index.css'

export default function App() {
    return (
        <AuthGate>
            <DBProvider>
                <DailyIgnition />
                <AppShell />
            </DBProvider>
        </AuthGate>
    )
}
