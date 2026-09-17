import { useEffect, useState } from 'react'
import { getAllByType, getProfileDoc } from '../db'
import { dayGap, formatTime, meetingMinutesFor, replacementMinutesFor } from '../time'
import type { DayEntry, Leave, Meeting, Replacement } from '../types'

function weekBounds() {
  const now = new Date()
  const wd = (now.getDay() + 6) % 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - wd)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const iso = (d: Date) => d.toISOString().split('T')[0]
  return { start: iso(monday), end: iso(sunday) }
}

export function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
      {now.toLocaleTimeString('fr-FR')}
    </span>
  )
}

export function PresenceBadge() {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let alive = true
    const check = async () => {
      const today = new Date().toISOString().split('T')[0]
      const days = await getAllByType<DayEntry>('day')
      const active = days.find((d) => d.date === today && d.actualStart && !d.actualEnd)
      if (!alive) return
      if (active?.actualStart) {
        const [h, m] = active.actualStart.split(':').map(Number)
        const now = new Date()
        setElapsed(Math.max(0, now.getHours() * 60 + now.getMinutes() - (h * 60 + m)))
      } else {
        setElapsed(0)
      }
    }
    check()
    const t = setInterval(check, 30_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  if (elapsed <= 0) return null
  return (
    <p style={{ margin: '0.15rem 0 0', color: 'var(--primary)', fontSize: '0.65rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
      En poste depuis {formatTime(elapsed)}
    </p>
  )
}

export function WeeklyGoal() {
  const [days, setDays] = useState<DayEntry[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [replacements, setReplacements] = useState<Replacement[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [goal, setGoal] = useState(0)

  useEffect(() => {
    getAllByType<DayEntry>('day').then(setDays)
    getAllByType<Meeting>('meeting').then(setMeetings)
    getAllByType<Replacement>('replacement').then(setReplacements)
    getAllByType<Leave>('leave').then(setLeaves)
    getProfileDoc().then((p) => setGoal(p?.weeklyHoursGoal || 0))
  }, [])

  if (goal <= 0) return null

  const { start, end } = weekBounds()
  const weekDays = days.filter((d) => d.date >= start && d.date <= end)

  let done = 0
  for (const d of weekDays) {
    if (!d.expectedStart || !d.expectedEnd) continue
    const leave = leaves.find((l) => l.date === d.date)
    const extras = meetingMinutesFor(d.date, meetings) + replacementMinutesFor(d.date, replacements)
    done += dayGap(d, extras, leave).actual
  }

  const goalMin = goal * 60
  const pct = Math.min(100, Math.round((done / goalMin) * 100))
  const over = done > goalMin

  return (
    <div style={{ width: '6rem', flexShrink: 0 }} title={`Objectif semaine : ${formatTime(done)} / ${formatTime(goalMin)}`}>
      <div
        style={{
          height: '0.3rem',
          borderRadius: '999px',
          background: 'var(--primary-soft)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: over ? '#dc2626' : 'var(--primary)',
            borderRadius: '999px',
            transition: 'width 0.4s ease',
          }}
        />
      </div>
      <p
        style={{
          margin: '0.15rem 0 0',
          color: over ? '#dc2626' : 'var(--text-secondary)',
          fontSize: '0.65rem',
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {(done / 60).toFixed(1)}h / {goal}h
      </p>
    </div>
  )
}
