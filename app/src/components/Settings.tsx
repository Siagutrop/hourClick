import { useEffect, useRef, useState } from 'react'
import { getLocalDB, initSync, tryAutoSync, getProfileDoc, saveProfileDoc, getSyncCredentials } from '../db'
import { getCurrentUser, logout, hasUsers, listUsers, changePin } from '../auth'
import { themes, applyTheme, type ThemeName } from '../theme'
import { formatSignedTime, parseSignedTime } from '../time'
import { enableNotifications } from '../notifications'
import type { HomeLocation } from '../types'

export function Settings({ onLogout }: { onLogout: () => void }) {
  const envCredentials = Boolean(
    import.meta.env.VITE_COUCHDB_URL &&
    import.meta.env.VITE_COUCHDB_USER &&
    import.meta.env.VITE_COUCHDB_PASSWORD
  )
  const [url, setUrl] = useState(getSyncCredentials().url)
  const [username, setUsername] = useState(getSyncCredentials().username)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('Hors ligne')
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [homeAddress, setHomeAddress] = useState('')
  const [homeStatus, setHomeStatus] = useState('')
  const [theme, setTheme] = useState<ThemeName>('light')
  const [initialGap, setInitialGap] = useState('')
  const [weeklyGoal, setWeeklyGoal] = useState('')
  const [notifsEnabled, setNotifsEnabled] = useState(false)
  const [notifStatus, setNotifStatus] = useState('')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinStatus, setPinStatus] = useState('')
  const [gapStatus, setGapStatus] = useState('')
  const [backupStatus, setBackupStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const current = getCurrentUser()

  useEffect(() => {
    loadHome()
    loadProfile()
    const stored = localStorage.getItem('hourclick_theme') as ThemeName
    const initial = stored && themes[stored] ? stored : 'light'
    setTheme(initial)
    applyTheme(initial)
    tryAutoSync().then((s) => s && setStatus('Sync activee')).catch(() => setStatus('Hors ligne'))
  }, [])

  const loadProfile = async () => {
    const profile = await getProfileDoc()
    const v = profile?.initialGapMinutes ?? profile?.gapToleranceMinutes ?? 0
    setInitialGap(v ? formatSignedTime(v) : '')
    setWeeklyGoal(profile?.weeklyHoursGoal ? String(profile.weeklyHoursGoal) : '')
    setNotifsEnabled(Boolean(profile?.notificationsEnabled))
  }

  const saveGap = async () => {
    const parsed = parseSignedTime(initialGap)
    if (parsed === null) {
      setGapStatus('Format invalide — ex. +5h30, -1:15 ou 90')
      return
    }
    const goal = weeklyGoal.trim() === '' ? 0 : Number(weeklyGoal)
    if (Number.isNaN(goal) || goal < 0) {
      setGapStatus('Objectif invalide — ex. 35')
      return
    }
    await saveProfileDoc({ initialGapMinutes: parsed, weeklyHoursGoal: goal || undefined })
    setGapStatus('Enregistré')
    setTimeout(() => setGapStatus(''), 2000)
  }

  const toggleNotifs = async () => {
    if (!notifsEnabled) {
      const granted = await enableNotifications()
      if (!granted) {
        setNotifStatus('Notifications refusées par le navigateur')
        return
      }
      await saveProfileDoc({ notificationsEnabled: true })
      setNotifsEnabled(true)
      setNotifStatus('Rappels activés')
    } else {
      await saveProfileDoc({ notificationsEnabled: false })
      setNotifsEnabled(false)
      setNotifStatus('Rappels désactivés')
    }
    setTimeout(() => setNotifStatus(''), 2000)
  }

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

  const startSync = async () => {
    try {
      setStatus('Connexion…')
      await initSync(url, username, password)
      localStorage.setItem('hourclick_couch_url', url)
      localStorage.setItem('hourclick_couch_user', username)
      localStorage.removeItem('hourclick_couch_password')
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

  const exportData = async () => {
    setBackupStatus('Export en cours…')
    try {
      const result = await getLocalDB().allDocs({ include_docs: true })
      const docs = result.rows
        .map((r: any) => r.doc)
        .filter((d: any) => d && !d._id.startsWith('_design/'))
      const payload = JSON.stringify(
        { app: 'hourclick', user: current, exportedAt: new Date().toISOString(), docs },
        null,
        2
      )
      const blob = new Blob([payload], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `hourclick_${current}_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(a.href)
      setBackupStatus(`${docs.length} document(s) exportés`)
    } catch {
      setBackupStatus('Erreur d\'export')
    }
  }

  const importData = async (file: File) => {
    setBackupStatus('Import en cours…')
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const docs = Array.isArray(parsed) ? parsed : parsed.docs
      if (!Array.isArray(docs)) {
        setBackupStatus('Fichier invalide')
        return
      }
      const db = getLocalDB()
      const existing = await db.allDocs()
      const revById = new Map(existing.rows.map((r: any) => [r.id, r.value.rev]))
      const localProfile = await getProfileDoc()

      const clean = docs
        .filter((d: any) => d?._id && !d._id.startsWith('_design/'))
        .map((d: any) => {
          const doc = { ...d }
          const localRev = revById.get(doc._id)
          if (localRev) {
            doc._rev = localRev
          } else {
            delete doc._rev
          }
          if (doc._id === 'profile' && localProfile?.passwordHash) {
            doc.passwordHash = localProfile.passwordHash
            doc.username = localProfile.username
          }
          return doc
        })
      await db.bulkDocs(clean)
      setBackupStatus(`${clean.length} document(s) importés`)
    } catch {
      setBackupStatus('Erreur d\'import')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
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
        <h2 className="card-title">Écart de départ</h2>
        <label>Écart déjà accumulé quand tu as créé le compte</label>
        <input
          value={initialGap}
          onChange={(e) => setInitialGap(e.target.value)}
          placeholder="+5h30, -1:15 ou 90"
        />

        <label style={{ marginTop: '0.75rem' }}>Objectif hebdomadaire (heures)</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={weeklyGoal}
          onChange={(e) => setWeeklyGoal(e.target.value)}
          placeholder="35"
        />

        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {gapStatus || 'Solde initial + objectif pour la jauge du Tableau'}
        </p>
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn-primary" onClick={saveGap}>
            Enregistrer
          </button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Rappels de pointage</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {notifStatus ||
            'Notification à l\'heure prévue d\'arrivée et de départ (appli ouverte ou installée en PWA)'}
        </p>
        <button
          className={notifsEnabled ? 'btn-secondary' : 'btn-primary'}
          onClick={toggleNotifs}
          style={{ marginTop: '0.75rem' }}
        >
          {notifsEnabled ? 'Désactiver les rappels' : 'Activer les rappels'}
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Changer le PIN</h2>
        <label>Ancien PIN</label>
        <input
          type="password"
          inputMode="numeric"
          value={oldPin}
          onChange={(e) => setOldPin(e.target.value)}
        />
        <label>Nouveau PIN</label>
        <input
          type="password"
          inputMode="numeric"
          value={newPin}
          onChange={(e) => setNewPin(e.target.value)}
        />
        {pinStatus && (
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {pinStatus}
          </p>
        )}
        <button
          className="btn-secondary"
          style={{ marginTop: '0.75rem' }}
          onClick={async () => {
            try {
              await changePin(oldPin, newPin)
              setPinStatus('PIN modifié')
              setOldPin('')
              setNewPin('')
            } catch (e: any) {
              setPinStatus(e.message || 'Erreur')
            }
            setTimeout(() => setPinStatus(''), 3000)
          }}
        >
          Modifier
        </button>
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
        {envCredentials ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            Statut : <strong>{status}</strong> — synchronisation automatique vers{' '}
            <code>{import.meta.env.VITE_COUCHDB_URL}</code>
          </p>
        ) : (
          <>
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
              <button className="btn-primary" onClick={startSync}>Synchroniser</button>
            </div>
          </>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Sauvegarde</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {backupStatus ||
            'Tout est inclus : planning, jours, congés, réunions, remplacements, crèches, domicile et réglages'}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])}
          style={{ display: 'none' }}
        />
        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button className="btn-secondary" onClick={exportData}>
            Exporter
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Importer
          </button>
        </div>
      </section>
    </>
  )
}
