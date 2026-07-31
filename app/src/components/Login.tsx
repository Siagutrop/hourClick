import { useState } from 'react'
import { hasUsers, listUsers, register, login, logout } from '../auth'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const isFirst = !hasUsers()
  const existingUsers = listUsers()

  const submit = async () => {
    if (!username.trim() || !pin) {
      setError('Saisis un nom et un mot de passe')
      return
    }
    try {
      if (isFirst) {
        if (pin.length < 4) {
          setError('4 caractères minimum')
          return
        }
        if (pin !== confirm) {
          setError('Les mots de passe ne correspondent pas')
          return
        }
        await register(username, pin)
        onLogin()
      } else {
        const ok = await login(username, pin)
        if (ok) {
          onLogin()
        } else {
          setError('Nom ou mot de passe incorrect')
        }
      }
    } catch (e) {
      setError(String(e))
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80svh' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 className="card-title">{isFirst ? 'Bienvenue' : 'HourClick'}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {isFirst
            ? 'Crée ton premier compte'
            : 'Connecte-toi à ton compte'}
        </p>

        {!isFirst && existingUsers.length > 0 && (
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
          </select>
        )}

        {(isFirst || username === 'Autre' || !existingUsers.length) && (
          <input
            type="text"
            value={username}
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

        {isFirst && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            placeholder="Confirmer le mot de passe"
            style={{ textAlign: 'center', marginTop: '0.75rem' }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}

        {error && (
          <p style={{ color: '#dc2626', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <button className="btn-primary" onClick={submit} style={{ marginTop: '1rem' }}>
          {isFirst ? 'Créer le compte' : 'Ouvrir'}
        </button>

        {!isFirst && (
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
