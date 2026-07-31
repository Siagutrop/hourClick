import { useEffect, useState } from 'react'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getLocalDB, getAllByType } from '../db'
import type { Creche, DayEntry } from '../types'

type Row = {
  crecheId: string
  start: string
  end: string
  breakMinutes: number
  lunchMinutes: number
}

export function Planning() {
  const [creches, setCreches] = useState<Creche[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const getMonday = (d: string) => {
    const date = new Date(d)
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(date.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  const startDate = getMonday(selectedDate)
  const [rows, setRows] = useState<Record<string, Row>>({})

  useEffect(() => {
    getAllByType<Creche>('creche').then(setCreches)
    loadDays()
  }, [])

  const loadDays = async () => {
    const all = await getAllByType<DayEntry>('day')
    const next: Record<string, Row> = {}
    for (const d of all) {
      if (d.expectedStart && d.expectedEnd) {
        next[d.date] = {
          crecheId: d.crecheId,
          start: d.expectedStart,
          end: d.expectedEnd,
          breakMinutes: d.breakMinutes || 0,
          lunchMinutes: d.lunchMinutes || 0,
        }
      }
    }
    setRows(next)
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(new Date(startDate), i)
    return format(d, 'yyyy-MM-dd')
  })

  const update = (date: string, field: keyof Row, value: string | number) => {
    setRows((prev) => ({
      ...prev,
      [date]: { ...prev[date], [field]: value },
    }))
  }

  const save = async (date: string) => {
    const row = rows[date]
    if (!row?.crecheId) return
    const id = `day_${date}_${row.crecheId}`
    let existing: DayEntry | undefined
    try {
      existing = (await getLocalDB().get(id)) as DayEntry
    } catch {}

    const entry: DayEntry = {
      _id: id,
      _rev: existing?._rev,
      type: 'day',
      date,
      crecheId: row.crecheId,
      expectedStart: row.start || '08:00',
      expectedEnd: row.end || '17:00',
      actualStart: existing?.actualStart,
      actualEnd: existing?.actualEnd,
      breakMinutes: row.breakMinutes || undefined,
      lunchMinutes: row.lunchMinutes || undefined,
      notes: existing?.notes,
    }

    await getLocalDB().put(entry)
    await loadDays()
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Planning à l’avance</h2>
        <label>Semaine à partir du lundi</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </section>

      {weekDays.map((date) => {
        const row = rows[date] || {
          crecheId: '',
          start: '08:00',
          end: '17:00',
          breakMinutes: 0,
          lunchMinutes: 0,
        }
        return (
          <section key={date} className="card">
            <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
              {format(new Date(date), 'EEEE d MMMM', { locale: fr })}
            </h3>
            <label>Crèche</label>
            <select
              value={row.crecheId}
              onChange={(e) => update(date, 'crecheId', e.target.value)}
            >
              <option value="">Choisir…</option>
              {creches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>

            <label style={{ marginTop: '0.75rem' }}>Prévu</label>
            <div className="btn-row">
              <input
                type="time"
                value={row.start}
                onChange={(e) => update(date, 'start', e.target.value)}
              />
              <input
                type="time"
                value={row.end}
                onChange={(e) => update(date, 'end', e.target.value)}
              />
            </div>

            <label style={{ marginTop: '0.75rem' }}>Pauses</label>
            <div className="btn-row" style={{ alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Autres (min)</small>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={row.breakMinutes}
                  onChange={(e) => update(date, 'breakMinutes', Number(e.target.value))}
                />
              </div>
              <div style={{ flex: 1 }}>
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Repas (min)</small>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={row.lunchMinutes}
                  onChange={(e) => update(date, 'lunchMinutes', Number(e.target.value))}
                />
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={() => save(date)}
              style={{ marginTop: '0.75rem' }}
            >
              Enregistrer
            </button>
          </section>
        )
      })}
    </>
  )
}
