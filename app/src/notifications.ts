import { getAllByType } from './db'
import { toMinutes } from './time'
import type { DayEntry } from './types'

const NOTIF_PREFIX = 'hourclick_notif_'

function alreadySent(key: string) {
  return localStorage.getItem(NOTIF_PREFIX + key) === '1'
}

function markSent(key: string) {
  localStorage.setItem(NOTIF_PREFIX + key, '1')
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
  } catch {
    // Certains navigateurs mobiles exigent le service worker
    navigator.serviceWorker?.ready
      .then((reg) => reg.showNotification(title, { body, icon: '/pwa-192x192.png' }))
      .catch(() => {})
  }
}

async function checkOnce() {
  const today = new Date().toISOString().split('T')[0]
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes()

  const days = await getAllByType<DayEntry>('day')
  const todays = days.filter((d) => d.date === today && d.expectedStart && d.expectedEnd)

  for (const d of todays) {
    if (!d.actualStart && nowMin >= toMinutes(d.expectedStart) && !alreadySent(`${today}_start`)) {
      notify('HourClick', "Pense à pointer ton arrivée")
      markSent(`${today}_start`)
    }
    if (d.actualStart && !d.actualEnd && nowMin >= toMinutes(d.expectedEnd!) && !alreadySent(`${today}_end`)) {
      notify('HourClick', "Pense à pointer ton départ")
      markSent(`${today}_end`)
    }
  }
}

export function startReminders() {
  checkOnce().catch(() => {})
  const timer = setInterval(() => checkOnce().catch(() => {}), 60_000)
  return () => clearInterval(timer)
}

export async function enableNotifications(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') return true
  const perm = await Notification.requestPermission()
  return perm === 'granted'
}
