interface User {
  username: string
  passwordHash: string
  credentialId?: string
}

const USERS_KEY = 'hourclick_users'
const CURRENT_USER_KEY = 'hourclick_current_user'

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
  const users = getUsers()
  if (users.find((u) => u.username === username)) {
    throw new Error('Ce compte existe déjà')
  }
  const h = await hashPassword(pin)
  users.push({ username, passwordHash: h })
  saveUsers(users)
  setCurrentUser(username)
}

export async function login(username: string, pin: string) {
  const users = getUsers()
  const user = users.find((u) => u.username === username)

  if (pin.length < 4) {
    throw new Error('4 caractères minimum')
  }

  const h = await hashPassword(pin)

  if (!user) {
    users.push({ username, passwordHash: h })
    saveUsers(users)
    setCurrentUser(username)
    return true
  }

  if (h !== user.passwordHash) return false
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
