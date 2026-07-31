interface User {
  username: string
  passwordHash: string
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
  if (!user) return false
  const h = await hashPassword(pin)
  if (h !== user.passwordHash) return false
  setCurrentUser(username)
  return true
}

export function listUsers() {
  return getUsers().map((u) => u.username)
}
