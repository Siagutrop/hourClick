import { useEffect, useState, type ReactNode, lazy, Suspense } from 'react'
import { DayForm } from './components/DayForm'
import { Data } from './components/Data'
import { Dashboard } from './components/Dashboard'
import { Settings } from './components/Settings'
import { Login } from './components/Login'
import { applyTheme, themes, type ThemeName } from './theme'

const Itinerary = lazy(() => import('./components/Itinerary'))

type Tab = 'day' | 'data' | 'itinerary' | 'dashboard' | 'settings'

const icons: Record<Tab, ReactNode> = {
  day: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  data: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="8" y1="11" x2="8" y2="11" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="12" y1="11" x2="12" y2="11" />
      <line x1="12" y1="16" x2="12" y2="16" />
      <line x1="16" y1="11" x2="16" y2="11" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  ),
  itinerary: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <polygon points="1 6 1 22 8 18 16 22 21.5 18 21.5 2 15 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="15" y1="6" x2="15" y2="22" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

const tabs: { key: Tab; label: string }[] = [
  { key: 'day', label: 'Auj.' },
  { key: 'data', label: 'Données' },
  { key: 'itinerary', label: 'Trajet' },
  { key: 'dashboard', label: 'Tableau' },
  { key: 'settings', label: 'Réglages' },
]

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [tab, setTab] = useState<Tab>('day')

  useEffect(() => {
    const stored = localStorage.getItem('hourclick_theme') as ThemeName
    const initial = stored && themes[stored] ? stored : 'light'
    applyTheme(initial)
  }, [])

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />
  }

  return (
    <>
      <header className="header">
        <h1>HourClick</h1>
      </header>

      <main className="page">
        {tab === 'day' && <DayForm />}
        {tab === 'data' && <Data />}
        {tab === 'itinerary' && (
          <Suspense fallback={<p className="page">Chargement de la carte…</p>}>
            <Itinerary />
          </Suspense>
        )}
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'settings' && <Settings onLogout={() => setIsAuthenticated(false)} />}
      </main>

      <nav className="bottom-nav">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            <span className="icon">{icons[t.key]}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}

export default App
