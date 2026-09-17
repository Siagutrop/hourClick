import { useEffect, useState } from 'react'
import {
  listUsers,
  login as authLogin,
  register as authRegister,
  registerFingerprint,
  loginWithFingerprint,
  hasFingerprintSupport,
} from '../auth'

export function Login({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>(listUsers().length ? 'login' : 'register')
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const existingUsers = listUsers()
  const canUseFingerprint = hasFingerprintSupport()

  useEffect(() => {
    if (canUseFingerprint && existingUsers.length > 0) {
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
    setBusy(true)
    setError('')
    setMsg('')
    try {
      if (mode === 'register') {
        if (pin !== confirm) {
          setError('Les mots de passe ne correspondent pas')
          return
        }
        await authRegister(username.trim(), pin)
        onLogin()
      } else {
        setMsg('Vérification…')
        const ok = await authLogin(username.trim(), pin)
        if (ok) {
          onLogin()
        } else {
          setError('Nom ou mot de passe incorrect')
        }
      }
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setBusy(false)
      setMsg('')
    }
  }

  const registerPrint = async () => {
    if (!username.trim()) {
      setError('Saisis un nom d\'utilisateur')
      return
    }
    try {
      await registerFingerprint(username.trim())
      setMsg('Empreinte enregistrée')
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    }
  }

  const switchMode = (m: 'login' | 'register') => {
    setMode(m)
    setError('')
    setMsg('')
    setPin('')
    setConfirm('')
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80svh' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h2 className="card-title">HourClick</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          {mode === 'login' ? 'Connecte-toi à ton compte' : 'Crée ton compte'}
        </p>

        <input
          type="text"
          list="hourclick-users"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            setError('')
          }}
          placeholder="Nom d’utilisateur"
          style={{ textAlign: 'center' }}
          autoComplete="username"
        />
        <datalist id="hourclick-users">
          {existingUsers.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value)
            setError('')
          }}
          placeholder="Mot de passe"
          style={{ textAlign: 'center', marginTop: '0.75rem' }}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />

        {mode === 'register' && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              setError('')
            }}
            placeholder="Confirmer le mot de passe"
            style={{ textAlign: 'center', marginTop: '0.75rem' }}
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        )}

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

        <button className="btn-primary" onClick={submit} disabled={busy} style={{ marginTop: '1rem' }}>
          {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>

        {mode === 'login' ? (
          <button className="btn-secondary" onClick={() => switchMode('register')} style={{ marginTop: '0.75rem' }}>
            Créer un compte
          </button>
        ) : (
          <button className="btn-secondary" onClick={() => switchMode('login')} style={{ marginTop: '0.75rem' }}>
            J’ai déjà un compte
          </button>
        )}

        {canUseFingerprint && mode === 'login' && (
          <>
            <button
              className="btn-secondary"
              onClick={handleFingerprint}
              style={{ marginTop: '0.75rem' }}
            >
              Empreinte digitale
            </button>
            {username.trim() && (
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
      </div>
    </div>
  )
}
