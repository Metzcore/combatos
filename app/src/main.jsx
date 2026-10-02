// Must stay first: registers the install-event listener before anything else
// runs (see installCapture.js).
import './installCapture.js'
// Registers the service worker and tracks "new version ready" (W40). Module
// scope on purpose: update checks must run even on the sign-in screen.
import './swUpdate.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>
)
