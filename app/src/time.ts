import type { DayEntry } from './types'

export function toMinutes(t?: string) {
  if (!t) return 0
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function dayNetMinutes(d: DayEntry, kind: 'expected' | 'actual') {
  const start = kind === 'expected' ? d.expectedStart : d.actualStart
  const end = kind === 'expected' ? d.expectedEnd : d.actualEnd
  if (!start || !end) return 0
  let minutes = toMinutes(end) - toMinutes(start)
  if (kind === 'expected') {
    minutes -= d.breakMinutes || 0
    minutes -= d.lunchMinutes || 0
  } else {
    minutes -= (d.actualBreakMinutes ?? d.breakMinutes) || 0
    minutes -= (d.actualLunchMinutes ?? d.lunchMinutes) || 0
  }
  return Math.max(0, minutes)
}

export function formatTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}h ${m.toString().padStart(2, '0')}`
}

export function formatSignedTime(min: number) {
  const sign = min >= 0 ? '+' : '-'
  const h = Math.floor(Math.abs(min) / 60)
  const m = Math.abs(min) % 60
  return `${sign}${h}h ${m.toString().padStart(2, '0')}`
}

export function hoursFromMinutes(min: number) {
  return (min / 60).toFixed(2)
}
