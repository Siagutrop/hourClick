import { useState } from 'react'
import { listUsers, login as authLogin, logout } from '../auth'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const existingUsers = listUsers()
  const isOther = username === 'Autre' || !existingUsers.length

  const submit = async () => {
    if (!username.trim() || !pin) {
      setError('Saisis un nom et un mot de passe')
      return
    }
    try {
      const ok = await authLogin(username, pin)
      if (ok) {
        onLogin()
      } else {
        setError('Mot de passe incorrect')
      }
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80svh' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 className="card-title">HourClick</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {existingUsers.length ? 'Connecte-toi à ton compte' : 'Crée ton compte'}
        </p>

        {existingUsers.length > 0 && (
          <select
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{ marginBottom: '0.75rem' }}
          >
            <option value="">Choisir un compte…</option>
            {existingUsers.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            <option value="Autre">Autre compte</option>
          </select>
        )}

        {isOther && (
          <input
            type="text"
            value={username === 'Autre' ? '' : username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
            placeholder="Nom d’utilisateur"
            style={{ textAlign: 'center' }}
          />
        )}

        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError('')
          }}
          placeholder="Mot de passe"
          style={{ textAlign: 'center', marginTop: '0.75rem' }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {error && (
          <p style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <button className="btn-primary" onClick={submit} style={{ marginTop: '1rem' }}>
          {existingUsers.length ? 'Ouvrir' : 'Créer le compte'}
        </button>

        {existingUsers.length > 0 && (
          <>
            <button
              className="btn-secondary"
              onClick={() => setUsername('Autre')}
              style={{ marginTop: '0.75rem' }}
            >
              Autre compte
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                logout()
              }}
              style={{ marginTop: '0.5rem' }}
            >
              Tout effacer
            </button>
          </>
        )}
      </div>
    </div>
  )
}
