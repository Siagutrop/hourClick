import type { DayEntry, Leave, Meeting, Replacement } from './types'

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

export function parseSignedTime(s: string): number | null {
  const t = s.trim()
  if (!t) return 0
  const sign = t.startsWith('-') ? -1 : 1
  const body = t.replace(/^[+-]/, '').trim()
  const hhmm = body.match(/^(\d+)(?::(\d+))?$/)
  if (hhmm) {
    return sign * (Number(hhmm[1]) * 60 + Number(hhmm[2] || 0))
  }
  const human = body.match(/^(\d+)h(?:\s*(\d+))?$/)
  if (human) {
    return sign * (Number(human[1]) * 60 + Number(human[2] || 0))
  }
  const mins = Number(body)
  if (!Number.isNaN(mins)) return sign * mins
  return null
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

export function weekdayOf(isoDate: string) {
  return (new Date(`${isoDate}T12:00:00`).getDay() + 6) % 7
}

export function meetingMinutesFor(date: string, meetings: Meeting[]) {
  const wd = weekdayOf(date)
  return meetings
    .filter((m) => m.weekday === wd && m.startTime && m.endTime)
    .reduce(
      (s, m) => s + Math.max(0, toMinutes(m.endTime) - toMinutes(m.startTime)),
      0
    )
}

export function replacementMinutesFor(date: string, replacements: Replacement[]) {
  return replacements
    .filter((r) => r.date === date)
    .reduce(
      (s, r) =>
        s + Math.max(0, toMinutes(r.endTime) - toMinutes(r.startTime) - (r.breakMinutes || 0)),
      0
    )
}

export function dayGap(
  d: DayEntry,
  extrasMin: number,
  leave?: Leave
): { expected: number; actual: number; diff: number; neutralized: boolean } {
  let expected = dayNetMinutes(d, 'expected')
  let actual = dayNetMinutes(d, 'actual') + extrasMin
  let neutralized = false
  if (leave && leave.paid && leave.reason !== 'rattrapage') {
    if (leave.halfDay) {
      expected = expected / 2
    } else {
      neutralized = true
      expected = 0
      actual = 0
    }
  }
  return { expected, actual, diff: actual - expected, neutralized }
}
