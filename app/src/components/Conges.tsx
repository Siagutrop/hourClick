import { useEffect, useMemo, useState } from 'react'
import { format, addDays, isBefore, isSameDay } from 'date-fns'
import { getLocalDB, getAllByType } from '../db'
import type { Leave } from '../types'

const reasons: { key: Leave['reason']; label: string }[] = [
  { key: 'conge', label: 'Congé' },
  { key: 'maladie', label: 'Maladie' },
  { key: 'formation', label: 'Formation' },
  { key: 'autre', label: 'Autre' },
]

function halfDayLabel(h?: 'morning' | 'afternoon') {
  if (h === 'morning') return 'Matin'
  if (h === 'afternoon') return 'Après-midi'
  return ''
}

function halfDayValue(h?: 'morning' | 'afternoon') {
  if (h === 'morning' || h === 'afternoon') return 0.5
  return 1
}

export function Conges() {
  const today = new Date().toISOString().split('T')[0]
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(today)
  const [reason, setReason] = useState<Leave['reason']>('conge')
  const [paid, setPaid] = useState(true)
  const [startHalf, setStartHalf] = useState<'full' | 'morning' | 'afternoon'>('full')
  const [endHalf, setEndHalf] = useState<'full' | 'morning' | 'afternoon'>('full')
  const [notes, setNotes] = useState('')
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [status, setStatus] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLeaves(await getAllByType<Leave>('leave'))
  }

  const includedDays = useMemo(() => {
    let total = 0
    let current = new Date(start)
    const last = new Date(end)
    while (isBefore(current, last) || isSameDay(current, last)) {
      if (isSameDay(current, start) && isSameDay(current, end)) {
        total += halfDayValue(startHalf === 'full' ? undefined : startHalf)
      } else if (isSameDay(current, start)) {
        total += halfDayValue(startHalf === 'full' ? undefined : startHalf)
      } else if (isSameDay(current, end)) {
        total += halfDayValue(endHalf === 'full' ? undefined : endHalf)
      } else {
        total += 1
      }
      current = addDays(current, 1)
    }
    return total
  }, [start, end, startHalf, endHalf])

  const add = async () => {
    setStatus('Enregistrement…')
    const dates: string[] = []
    let current = new Date(start)
    const last = new Date(end)
    while (isBefore(current, last) || isSameDay(current, last)) {
      dates.push(format(current, 'yyyy-MM-dd'))
      current = addDays(current, 1)
    }

    for (const date of dates) {
      const id = `leave_${date}`
      let existing: Leave | undefined
      try {
        existing = (await getLocalDB().get(id)) as Leave
      } catch {}

      let half: Leave['halfDay'] = undefined
      if (start === end) {
        if (startHalf !== 'full') half = startHalf as Leave['halfDay']
      } else {
        if (isSameDay(new Date(date), new Date(start)) && startHalf !== 'full') {
          half = startHalf as Leave['halfDay']
        } else if (isSameDay(new Date(date), new Date(end)) && endHalf !== 'full') {
          half = endHalf as Leave['halfDay']
        }
      }

      const doc: Leave = {
        _id: id,
        _rev: existing?._rev,
        type: 'leave',
        date,
        reason,
        paid,
        halfDay: half,
        notes: notes || undefined,
      }
      await getLocalDB().put(doc)
    }

    setStatus(`${dates.length} jour(s) enregistré(s) — ${includedDays} jour(s) inclus`)
    setNotes('')
    load()
  }

  const remove = async (id: string, rev?: string) => {
    if (!rev) return
    await getLocalDB().remove(id, rev)
    load()
  }

  const isRange = start !== end

  return (
    <>
      <section className="card">
        <h2 className="card-title">Marquer un congé</h2>

        <div className="btn-row">
          <div style={{ flex: 1 }}>
            <label>Du</label>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label>Au</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>

        <label>Type</label>
        <select value={reason} onChange={(e) => setReason(e.target.value as Leave['reason'])}>
          {reasons.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>

        {isRange ? (
          <>
            <label>Temps au début</label>
            <select value={startHalf} onChange={(e) => setStartHalf(e.target.value as typeof startHalf)}>
              <option value="full">Journée complète</option>
              <option value="morning">Matin</option>
              <option value="afternoon">Après-midi</option>
            </select>

            <label>Temps à la fin</label>
            <select value={endHalf} onChange={(e) => setEndHalf(e.target.value as typeof endHalf)}>
              <option value="full">Journée complète</option>
              <option value="morning">Matin</option>
              <option value="afternoon">Après-midi</option>
            </select>
          </>
        ) : (
          <>
            <label>Temps</label>
            <select value={startHalf} onChange={(e) => setStartHalf(e.target.value as typeof startHalf)}>
              <option value="full">Journée complète</option>
              <option value="morning">Matin</option>
              <option value="afternoon">Après-midi</option>
            </select>
          </>
        )}

        <p style={{ marginTop: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
          Total jours inclus : {includedDays}
        </p>

        <label>Payé ?</label>
        <select value={paid ? 'paye' : 'nonpaye'} onChange={(e) => setPaid(e.target.value === 'paye')}>
          <option value="paye">Payé</option>
          <option value="nonpaye">Non payé</option>
        </select>

        <label>Notes</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaire" />

        <button className="btn-primary" onClick={add} style={{ marginTop: '1rem' }}>
          Enregistrer
        </button>

        {status && (
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {status}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Congés enregistrés</h2>
        {leaves.length === 0 && <p className="empty">Aucun congé enregistré</p>}
        <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
          {leaves.map((l) => (
            <li key={l._id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <strong>{l.date}</strong>
                  <small>
                    {reasons.find((r) => r.key === l.reason)?.label} — {l.paid ? 'Payé' : 'Non payé'}
                    {l.halfDay ? ` — ${halfDayLabel(l.halfDay)}` : ''}
                  </small>
                  {l.notes && <small>{l.notes}</small>}
                </div>
                <button className="btn-danger btn-small" onClick={() => remove(l._id, l._rev)}>
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
