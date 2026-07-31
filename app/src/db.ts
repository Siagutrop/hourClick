import { getCurrentUser } from './auth'

declare global {
  interface Window {
    PouchDB: any
  }
}

const PouchDB = window.PouchDB

export function getLocalDB() {
  const user = getCurrentUser() || 'default'
  return new PouchDB(`hourclick_${user}`)
}

let remoteDB: any = null
let syncHandler: any = null

export const initSync = async (
  url: string,
  username: string,
  password: string,
  dbName = 'hourclick'
) => {
  const user = getCurrentUser() || 'default'
  if (remoteDB) {
    remoteDB.close()
  }
  if (syncHandler) {
    syncHandler.cancel()
  }

  const fullUrl = `${url}/${dbName}_${user}`
  const authHeader = `Basic ${btoa(`${username}:${password}`)}`

  const createRes = await fetch(fullUrl, {
    method: 'PUT',
    headers: { Authorization: authHeader },
  })

  if (!createRes.ok && createRes.status !== 412) {
    const text = await createRes.text()
    throw new Error(`Impossible de creer la base distante : ${createRes.status} ${text}`)
  }

  remoteDB = new PouchDB(fullUrl, {
    auth: { username, password },
  })

  syncHandler = getLocalDB().sync(remoteDB, { live: true, retry: true })
  syncHandler.on('error', (err: any) => {
    console.error('Sync error', err)
  })

  return syncHandler
}

export const tryAutoSync = async () => {
  const url = localStorage.getItem('hourclick_couch_url')
  const username = localStorage.getItem('hourclick_couch_user')
  const password = localStorage.getItem('hourclick_couch_password')
  if (url && username && password) {
    return initSync(url, username, password)
  }
  return null
}

export const getAllByType = async <T extends { type: string }>(
  type: string
): Promise<T[]> => {
  const result = await getLocalDB().allDocs({ include_docs: true })
  return result.rows
    .map((r: any) => r.doc as unknown as T | undefined)
    .filter((d: T | undefined): d is T => d?.type === type)
}
