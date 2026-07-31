import { useEffect, useState } from 'react'
import { getLocalDB, initSync, tryAutoSync } from '../db'
import { getCurrentUser, logout, hasUsers, listUsers } from '../auth'
import { themes, applyTheme, type ThemeName } from '../theme'
import type { HomeLocation } from '../types'

export function Settings({ onLogout }: { onLogout: () => void }) {
  const [url, setUrl] = useState(import.meta.env.VITE_COUCHDB_URL || localStorage.getItem('hourclick_couch_url') || '')
  const [username, setUsername] = useState(localStorage.getItem('hourclick_couch_user') || '')
  const [password, setPassword] = useState(localStorage.getItem('hourclick_couch_password') || '')
  const [status, setStatus] = useState('Hors ligne')
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [homeAddress, setHomeAddress] = useState('')
  const [homeStatus, setHomeStatus] = useState('')
  const [theme, setTheme] = useState<ThemeName>('light')
  const current = getCurrentUser()

  useEffect(() => {
    loadHome()
    const stored = localStorage.getItem('hourclick_theme') as ThemeName
    const initial = stored && themes[stored] ? stored : 'light'
    setTheme(initial)
    applyTheme(initial)
    tryAutoSync().then(() => setStatus('Sync activee')).catch(() => setStatus('Hors ligne'))
  }, [])

  const loadHome = async () => {
    try {
      const doc = (await getLocalDB().get('home')) as HomeLocation
      setHome(doc)
      setHomeAddress(doc.address)
    } catch {
      setHome(null)
      setHomeAddress('')
    }
  }

  const changeTheme = (name: ThemeName) => {
    setTheme(name)
    applyTheme(name)
    localStorage.setItem('hourclick_theme', name)
  }

  const test = async () => {
    if (!url) {
      setStatus('Saisis une URL')
      return
    }
    try {
      setStatus('Test…')
      const res = await fetch(`${url}/`, {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      })
      setStatus(res.ok ? 'Serveur joignable et authentifie' : `Réponse inattendue : ${res.status}`)
    } catch {
      setStatus('Serveur injoignable')
    }
  }

  const startSync = async () => {
    try {
      setStatus('Connexion…')
      await initSync(url, username, password)
      localStorage.setItem('hourclick_couch_url', url)
      localStorage.setItem('hourclick_couch_user', username)
      localStorage.setItem('hourclick_couch_password', password)
      setStatus('Sync activee')
    } catch (e: any) {
      setStatus(`Erreur : ${e.message || e}`)
    }
  }

  const handleLogout = () => {
    logout()
    onLogout()
  }

  const searchHome = async () => {
    if (!homeAddress.trim()) return
    setHomeStatus('Recherche…')
    try {
      const q = encodeURIComponent(homeAddress)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
        { headers: { 'User-Agent': 'HourClick' } }
      )
      const data = await res.json()
      if (data.length === 0) {
        setHomeStatus('Adresse non trouvée')
        return
      }
      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      const doc: HomeLocation = {
        _id: 'home',
        _rev: home?._rev,
        type: 'home',
        address: homeAddress.trim(),
        lat,
        lon,
      }
      await getLocalDB().put(doc)
      setHome(doc)
      setHomeStatus(`Trouvé (${lat.toFixed(5)}, ${lon.toFixed(5)})`)
    } catch {
      setHomeStatus('Erreur de recherche')
    }
  }

  return (
    <>
      <section className="card" style={{ textAlign: 'center' }}>
        <span className="badge">Compte connecté</span>
        <h2 style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>{current}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {hasUsers() ? `${listUsers().length} compte(s) sur cet appareil` : 'Aucun autre compte'}
        </p>
        <button className="btn-secondary" onClick={handleLogout} style={{ marginTop: '1rem' }}>
          Changer de compte
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Theme</h2>
        <div className="btn-row" style={{ flexWrap: 'wrap' }}>
          {(Object.keys(themes) as ThemeName[]).map((t) => (
            <button
              key={t}
              className={theme === t ? 'btn-primary' : 'btn-secondary'}
              onClick={() => changeTheme(t)}
              style={{ flex: '1 1 40%', minWidth: '100px' }}
            >
              {t === 'light' ? 'Clair' : t === 'dark' ? 'Sombre' : t === 'forest' ? 'Foret' : 'Rose'}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Adresse du domicile</h2>
        <input
          value={homeAddress}
          onChange={(e) => setHomeAddress(e.target.value)}
          placeholder="12 rue des Lilas, 75000 Paris"
        />
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {homeStatus || (home ? `${home.lat?.toFixed(5)}, ${home.lon?.toFixed(5)}` : 'Aucune adresse enregistrée')}
        </p>
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={searchHome}>
            Chercher les coordonnees
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Synchronisation</h2>
        <label>Serveur CouchDB</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://couch.heolyas.uk" />

        <label>Utilisateur CouchDB</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />

        <label>Mot de passe CouchDB</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

        <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)' }}>
          Statut : <strong>{status}</strong>
        </p>

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={test}>Tester</button>
          <button className="btn-primary" onClick={startSync}>Synchroniser</button>
        </div>
      </section>
    </>
  )
}
