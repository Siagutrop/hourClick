import type { Profile } from './types'

interface User {
  username: string
  passwordHash: string
  credentialId?: string
}

const USERS_KEY = 'hourclick_users'
const CURRENT_USER_KEY = 'hourclick_current_user'
const PROFILE_ID = 'profile'

function simpleHash(pin: string) {
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const c = pin.charCodeAt(i)
    hash = (hash << 5) - hash + c
    hash |= 0
  }
  return 's:' + Math.abs(hash).toString(16)
}

export async function hashPassword(pin: string) {
  const subtle = typeof crypto !== 'undefined' ? crypto.subtle : undefined
  if (!subtle?.digest) {
    return simpleHash(pin)
  }
  const buf = new TextEncoder().encode(pin)
  const digest = await subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]')
  } catch {
    return []
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

function addLocalUser(username: string, passwordHash: string) {
  const users = getUsers()
  const existing = users.find((u) => u.username === username)
  if (existing) {
    existing.passwordHash = passwordHash
  } else {
    users.push({ username, passwordHash })
  }
  saveUsers(users)
}

function bufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export function getUserDB(username: string) {
  return new (window as any).PouchDB(`hourclick_${username}`)
}

async function getProfile(username: string): Promise<Profile | null> {
  try {
    return (await getUserDB(username).get(PROFILE_ID)) as Profile
  } catch {
    return null
  }
}

const getCouchCredentials = () => ({
  url: import.meta.env.VITE_COUCHDB_URL || localStorage.getItem('hourclick_couch_url') || '',
  user: import.meta.env.VITE_COUCHDB_USER || localStorage.getItem('hourclick_couch_user') || '',
  pass: import.meta.env.VITE_COUCHDB_PASSWORD || localStorage.getItem('hourclick_couch_password') || '',
})

export const pullRemoteUser = async (
  username: string
): Promise<{ profile: Profile | null } | null> => {
  const { url, user, pass } = getCouchCredentials()
  if (!url || !user || !pass) return null
  try {
    const remote = new (window as any).PouchDB(`${url}/hourclick_${username}`, {
      auth: { username: user, password: pass },
    })
    await getUserDB(username).replicate.from(remote)
    return { profile: await getProfile(username) }
  } catch {
    return null
  }
}

export function setCurrentUser(username: string) {
  localStorage.setItem(CURRENT_USER_KEY, username)
}

export function getCurrentUser(): string | null {
  return localStorage.getItem(CURRENT_USER_KEY)
}

export function logout() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function hasUsers() {
  return getUsers().length > 0
}

export async function register(username: string, pin: string) {
  const existing =
    (await getProfile(username)) || (await pullRemoteUser(username))?.profile
  if (existing) {
    throw new Error('Ce compte existe déjà — connecte-toi')
  }
  const h = await hashPassword(pin)
  await getUserDB(username).put({
    _id: PROFILE_ID,
    type: 'profile',
    username,
    passwordHash: h,
  } satisfies Profile)
  addLocalUser(username, h)
  setCurrentUser(username)
}

export async function login(username: string, pin: string) {
  if (pin.length < 4) {
    throw new Error('4 caractères minimum')
  }

  const h = await hashPassword(pin)
  let profile = await getProfile(username)
  let remoteOk = false

  if (!profile) {
    const pulled = await pullRemoteUser(username)
    remoteOk = pulled !== null
    profile = pulled?.profile || null
  }

  if (!profile) {
    const local = getUsers().find((u) => u.username === username)
    if (local && local.passwordHash !== h) {
      return false
    }
    if (!local && !remoteOk) {
      return false
    }
    await getUserDB(username).put({
      _id: PROFILE_ID,
      type: 'profile',
      username,
      passwordHash: h,
    } satisfies Profile)
    addLocalUser(username, h)
    setCurrentUser(username)
    return true
  }

  if (profile.passwordHash !== h) return false
  addLocalUser(username, h)
  setCurrentUser(username)
  return true
}

export function listUsers() {
  return getUsers().map((u) => u.username)
}

export function hasFingerprintSupport() {
  return typeof window !== 'undefined' &&
    window.PublicKeyCredential !== undefined &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
}

export async function registerFingerprint(username: string) {
  const users = getUsers()
  const user = users.find((u) => u.username === username)
  if (!user) {
    throw new Error('Crée d\'abord un compte avec un mot de passe')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = new TextEncoder().encode(username)

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: 'HourClick' },
      user: {
        id: userId,
        name: username,
        displayName: username,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
      },
    },
  })) as PublicKeyCredential

  const credentialId = bufferToBase64(credential.rawId)
  user.credentialId = credentialId
  saveUsers(users)
}

export async function loginWithFingerprint(): Promise<string | null> {
  const users = getUsers().filter((u) => u.credentialId)
  if (users.length === 0) {
    throw new Error('Aucune empreinte enregistrée')
  }

  const allowCredentials = users.map((u) => ({
    id: new Uint8Array(base64ToBuffer(u.credentialId!)),
    type: 'public-key' as const,
  }))

  const challenge = crypto.getRandomValues(new Uint8Array(32))

  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge,
      allowCredentials,
      userVerification: 'required',
    },
  })) as PublicKeyCredential

  const credentialId = bufferToBase64(credential.rawId)
  const user = users.find((u) => u.credentialId === credentialId)
  if (!user) {
    throw new Error('Empreinte non reconnue')
  }

  setCurrentUser(user.username)
  return user.username
}
