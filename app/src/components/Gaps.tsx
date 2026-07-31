import { useEffect, useState } from 'react'
import { getAllByType } from '../db'
import { dayNetMinutes, formatTime, formatSignedTime } from '../time'
import type { Creche, DayEntry } from '../types'

export function Gaps() {
  const [days, setDays] = useState<DayEntry[]>([])
  const [creches, setCreches] = useState<Creche[]>([])

  useEffect(() => {
    getAllByType<DayEntry>('day').then(setDays)
    getAllByType<Creche>('creche').then(setCreches)
  }, [])

  const crecheName = (id: string) => creches.find((c) => c._id === id)?.name || id

  const rows = days
    .filter((d) => d.expectedStart && d.expectedEnd)
    .map((d) => {
      const expected = dayNetMinutes(d, 'expected')
      const actual = dayNetMinutes(d, 'actual')
      const diff = actual - expected
      return { ...d, expected, actual, diff }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const totalDiff = rows.reduce((sum, r) => sum + r.diff, 0)

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
                    Prévu {formatTime(r.expected)} — Effectif {formatTime(r.actual)}
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
                  {formatSignedTime(r.diff)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
