import { BrowserRouter, HashRouter } from 'react-router'
import { ThemeProvider } from './contexts/ThemeContext'
import { NetworkModeProvider } from './contexts/NetworkModeContext'
import Router from './Router'

const AppRouter = import.meta.env.VITE_USE_HASH_ROUTE === 'true' ? HashRouter : BrowserRouter

export default function App() {
    return (
        <ThemeProvider>
            <NetworkModeProvider>
                <AppRouter>
                    <Router />
                </AppRouter>
            </NetworkModeProvider>
        </ThemeProvider>
    )
}
