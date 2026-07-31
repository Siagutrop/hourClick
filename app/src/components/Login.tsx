import { useEffect, useState } from 'react'
import { listUsers, login as authLogin, logout, registerFingerprint, loginWithFingerprint, hasFingerprintSupport } from '../auth'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const existingUsers = listUsers()
  const isOther = username === 'Autre' || !existingUsers.length
  const canUseFingerprint = hasFingerprintSupport()

  useEffect(() => {
    if (canUseFingerprint && existingUsers.some((u) => u)) {
      handleFingerprint()
    }
  }, [])

  const handleFingerprint = async () => {
    try {
      setMsg('Lecture de l\'empreinte…')
      await loginWithFingerprint()
      onLogin()
    } catch {
      setMsg('')
    }
  }

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

  const registerPrint = async () => {
    if (!username.trim()) {
      setError('Saisis un nom d\'utilisateur')
      return
    }
    try {
      await registerFingerprint(username)
      setMsg('Empreinte enregistrée')
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
              setMsg('')
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
            setMsg('')
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

        {msg && (
          <p style={{ color: 'var(--primary)', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            {msg}
          </p>
        )}

        <button className="btn-primary" onClick={submit} style={{ marginTop: '1rem' }}>
          {existingUsers.length ? 'Ouvrir' : 'Créer le compte'}
        </button>

        {canUseFingerprint && (
          <>
            <button
              className="btn-secondary"
              onClick={handleFingerprint}
              style={{ marginTop: '0.75rem' }}
            >
              Empreinte digitale
            </button>
            {username && username !== 'Autre' && (
              <button
                className="btn-secondary"
                onClick={registerPrint}
                style={{ marginTop: '0.5rem' }}
              >
                Enregistrer mon empreinte
              </button>
            )}
          </>
        )}

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
