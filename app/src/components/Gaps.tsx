import { useEffect, useState } from 'react'
import { getAllByType, getProfileDoc } from '../db'
import { dayGap, formatTime, formatSignedTime, meetingMinutesFor, replacementMinutesFor } from '../time'
import type { Creche, DayEntry, Leave, Meeting, Replacement } from '../types'

const LEAVE_LABELS: Record<Leave['reason'], string> = {
  conge: 'Congé',
  maladie: 'Maladie',
  formation: 'Formation',
  rattrapage: "Rattrapage d'heures",
  autre: 'Autre',
}

export function Gaps() {
  const [days, setDays] = useState<DayEntry[]>([])
  const [creches, setCreches] = useState<Creche[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [replacements, setReplacements] = useState<Replacement[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [initialGap, setInitialGap] = useState(0)

  useEffect(() => {
    getAllByType<DayEntry>('day').then(setDays)
    getAllByType<Creche>('creche').then(setCreches)
    getAllByType<Meeting>('meeting').then(setMeetings)
    getAllByType<Replacement>('replacement').then(setReplacements)
    getAllByType<Leave>('leave').then(setLeaves)
    getProfileDoc().then((p) =>
      setInitialGap(p?.initialGapMinutes ?? p?.gapToleranceMinutes ?? 0)
    )
  }, [])

  const crecheName = (id: string) => creches.find((c) => c._id === id)?.name || id

  const leaveFor = (date: string) => leaves.find((l) => l.date === date)

  const rows = days
    .filter((d) => d.expectedStart && d.expectedEnd)
    .map((d) => {
      const leave = leaveFor(d.date)
      const meetingMin = meetingMinutesFor(d.date, meetings)
      const replMin = replacementMinutesFor(d.date, replacements)
      const { expected, actual, diff, neutralized } = dayGap(d, meetingMin + replMin, leave)
      return { ...d, expected, actual, meetingMin, replMin, diff, leave, neutralized }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalDiff = initialGap + rows.reduce((sum, r) => sum + r.diff, 0)

  return (
    <>
      <section className="card" style={{ textAlign: 'center' }}>
        <span className="badge">Différence totale</span>
        <h2
          style={{
            fontSize: '2.5rem',
            margin: '0.25rem 0',
            color: totalDiff >= 0 ? '#15803d' : '#dc2626',
          }}
        >
          {formatSignedTime(totalDiff)}
        </h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {totalDiff >= 0 ? 'Tu as fait des heures en plus' : 'Tu as moins travaillé que prévu'}
          {initialGap !== 0 && ` (dont ${formatSignedTime(initialGap)} de solde initial)`}
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Détail par jour</h2>
        {rows.length === 0 && <p className="empty">Aucune prévision enregistrée</p>}
        <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
          {rows.map((r) => (
            <li key={r._id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{r.date}</strong>
                  <small>{crecheName(r.crecheId)}</small>
                  <small>
                    {r.neutralized ? (
                      <>
                        {LEAVE_LABELS[r.leave!.reason]} — journée neutralisée
                      </>
                    ) : (
                      <>
                        Prévu {formatTime(r.expected)} — Effectif {formatTime(r.actual)}
                        {r.leave?.reason === 'rattrapage' &&
                          ` — rattrapage${r.leave.halfDay ? ` (${r.leave.halfDay === 'morning' ? 'matin' : 'après-midi'})` : ''}`}
                        {r.leave && r.leave.reason !== 'rattrapage' &&
                          ` — ${LEAVE_LABELS[r.leave.reason]}${r.leave.halfDay ? ` (${r.leave.halfDay === 'morning' ? 'matin' : 'après-midi'})` : ''}`}
                        {r.meetingMin > 0 && ` (dont ${formatTime(r.meetingMin)} réunion)`}
                        {r.replMin > 0 && ` (dont ${formatTime(r.replMin)} remplacement)`}
                      </>
                    )}
                  </small>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: r.diff >= 0 ? '#15803d' : '#dc2626',
                    fontSize: '1.1rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.neutralized ? '—' : formatSignedTime(r.diff)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
