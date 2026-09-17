import { useEffect, useRef, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { getLocalDB, getAllByType } from '../db'
import { distanceMeters } from '../distance'
import type { Creche, DayEntry, HomeLocation, Leave, Meeting, Replacement } from '../types'

export function DayForm() {
  const dateInputRef = useRef<HTMLInputElement>(null)
  const today = new Date().toISOString().split('T')[0]
  const [creches, setCreches] = useState<Creche[]>([])
  const [date, setDate] = useState(today)
  const [crecheId, setCrecheId] = useState('')
  const [expectedStart, setExpectedStart] = useState('08:00')
  const [expectedEnd, setExpectedEnd] = useState('17:00')
  const [actualStart, setActualStart] = useState('')
  const [actualEnd, setActualEnd] = useState('')
  const [notes, setNotes] = useState('')
  const [breakMinutes, setBreakMinutes] = useState(0)
  const [lunchMinutes, setLunchMinutes] = useState(0)
  const [actualBreakMinutes, setActualBreakMinutes] = useState(0)
  const [actualLunchMinutes, setActualLunchMinutes] = useState(0)
  const [gpsStatus, setGpsStatus] = useState('')
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [km, setKm] = useState(0)
  const [leave, setLeave] = useState<Leave | null>(null)
  const [plannedDays, setPlannedDays] = useState<DayEntry[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [replacements, setReplacements] = useState<Replacement[]>([])
  const [replCrecheId, setReplCrecheId] = useState('')
  const [replStart, setReplStart] = useState('')
  const [replEnd, setReplEnd] = useState('')
  const [replBreak, setReplBreak] = useState(0)
  const [showReplForm, setShowReplForm] = useState(false)

  useEffect(() => {
    getAllByType<Creche>('creche').then(setCreches)
    getAllByType<Meeting>('meeting').then(setMeetings)
    loadHome()
    loadDayPlanning()
    loadReplacements()
  }, [])

  const weekdayOfDate = (new Date(date).getDay() + 6) % 7
  const dayMeetings = meetings.filter((m) => m.weekday === weekdayOfDate)

  const meetingKm = (m: Meeting) => {
    if (home?.lat == null || home?.lon == null || m.lat == null || m.lon == null) return null
    return Math.round((distanceMeters(home.lat, home.lon, m.lat, m.lon) / 1000) * 2 * 10) / 10
  }

  const applyDoc = (doc?: DayEntry) => {
    if (doc) {
      setExpectedStart(doc.expectedStart || '')
      setExpectedEnd(doc.expectedEnd || '')
      setActualStart(doc.actualStart || '')
      setActualEnd(doc.actualEnd || '')
      setBreakMinutes(doc.breakMinutes || 0)
      setLunchMinutes(doc.lunchMinutes || 0)
      setActualBreakMinutes(doc.actualBreakMinutes ?? doc.breakMinutes ?? 0)
      setActualLunchMinutes(doc.actualLunchMinutes ?? doc.lunchMinutes ?? 0)
      setNotes(doc.notes || '')
    } else {
      setExpectedStart('')
      setExpectedEnd('')
      setActualStart('')
      setActualEnd('')
      setBreakMinutes(0)
      setLunchMinutes(0)
      setActualBreakMinutes(0)
      setActualLunchMinutes(0)
      setNotes('')
    }
  }

  const loadDayPlanning = async () => {
    const all = await getAllByType<DayEntry>('day')
    const forDate = all.filter((d) => d.date === date)
    setPlannedDays(forDate)
    let nextCrecheId = crecheId
    if (forDate.length === 1) {
      nextCrecheId = forDate[0].crecheId
      setCrecheId(nextCrecheId)
    } else if (!forDate.some((d) => d.crecheId === crecheId)) {
      nextCrecheId = ''
      setCrecheId('')
    }
    applyDoc(forDate.find((d) => d.crecheId === nextCrecheId))
  }

  const loadHome = async () => {
    try {
      const doc = (await getLocalDB().get('home')) as HomeLocation
      setHome(doc)
    } catch {
      setHome(null)
    }
  }

  const loadLeave = async () => {
    try {
      const doc = (await getLocalDB().get(`leave_${date}`)) as Leave
      setLeave(doc)
    } catch {
      setLeave(null)
    }
  }

  const loadReplacements = async () => {
    const all = await getAllByType<Replacement>('replacement')
    setReplacements(all.filter((r) => r.date === date))
  }

  const addReplacement = async () => {
    if (!replCrecheId || !replStart || !replEnd) {
      setGpsStatus('Remplacement : choisis une crèche et les horaires')
      return
    }
    const doc: Replacement = {
      _id: `repl_${date}_${Date.now()}`,
      type: 'replacement',
      date,
      crecheId: replCrecheId,
      startTime: replStart,
      endTime: replEnd,
      breakMinutes: replBreak || undefined,
    }
    await getLocalDB().put(doc)
    setReplCrecheId('')
    setReplStart('')
    setReplEnd('')
    setReplBreak(0)
    setShowReplForm(false)
    loadReplacements()
  }

  const removeReplacement = async (r: Replacement) => {
    if (!r._rev || !confirm('Supprimer ce remplacement ?')) return
    await getLocalDB().remove(r._id, r._rev)
    loadReplacements()
  }

  useEffect(() => {
    loadLeave()
    loadDayPlanning()
    loadReplacements()
  }, [date])

  useEffect(() => {
    const creche = creches.find((c) => c._id === crecheId)
    if (home?.lat != null && home?.lon != null && creche?.lat != null && creche?.lon != null) {
      const oneWay = distanceMeters(home.lat, home.lon, creche.lat, creche.lon) / 1000
      setKm(Math.round(oneWay * 2 * 10) / 10)
    } else {
      setKm(0)
    }
  }, [home, crecheId, creches])

  useEffect(() => {
    if (crecheId) {
      applyDoc(plannedDays.find((d) => d.crecheId === crecheId))
    }
  }, [crecheId])

  const save = async (overrides?: Partial<DayEntry>) => {
    if (!crecheId) return
    const id = `day_${date}_${crecheId}`
    let existing: DayEntry | undefined
    try {
      existing = (await getLocalDB().get(id)) as DayEntry
    } catch {}

    const planned = plannedDays.find((d) => d.crecheId === crecheId)

    const entry: DayEntry = {
      _id: id,
      _rev: existing?._rev,
      type: 'day',
      date,
      crecheId,
      expectedStart: planned?.expectedStart,
      expectedEnd: planned?.expectedEnd,
      breakMinutes: planned?.breakMinutes,
      lunchMinutes: planned?.lunchMinutes,
      actualStart: (overrides?.actualStart as string) || actualStart || undefined,
      actualEnd: (overrides?.actualEnd as string) || actualEnd || undefined,
      actualBreakMinutes,
      actualLunchMinutes,
      notes: notes || undefined,
    }

    await getLocalDB().put(entry)
    if (!overrides || (overrides.actualStart === undefined && overrides.actualEnd === undefined)) {
      setGpsStatus('Journée enregistrée')
    }
  }

  const now = (setter: (v: string) => void) => {
    const t = new Date().toTimeString().slice(0, 5)
    setter(t)
  }

  const punchClock = async (kind: 'start' | 'end') => {
    if (!crecheId) {
      setGpsStatus('Sélectionne une crèche d’abord')
      return
    }
    setGpsStatus('Localisation…')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const creche = creches.find((c) => c._id === crecheId)
        if (!creche || creche.lat == null || creche.lon == null) {
          setGpsStatus('La crèche n’a pas de coordonnées GPS')
          return
        }
        const d = distanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          creche.lat,
          creche.lon
        )
        if (d > 300) {
          setGpsStatus(`Tu es à ${Math.round(d)} m, trop loin pour pointer automatiquement.`)
          return
        }
        const t = new Date().toTimeString().slice(0, 5)
        if (kind === 'start') {
          setActualStart(t)
          await save({ actualStart: t })
        } else {
          setActualEnd(t)
          await save({ actualEnd: t })
        }
        setGpsStatus(`Pointage à ${Math.round(d)} m de ${creche.name}`)
      },
      (err) => {
        setGpsStatus(`GPS refusé ou indisponible : ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const nearestCreche = () => {
    setGpsStatus('Localisation…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const withDist = creches
          .filter((c) => c.lat != null && c.lon != null && plannedDays.some((d) => d.crecheId === c._id))
          .map((c) => ({
            ...c,
            dist: distanceMeters(pos.coords.latitude, pos.coords.longitude, c.lat!, c.lon!),
          }))
          .sort((a, b) => a.dist - b.dist)

        if (withDist.length === 0) {
          setGpsStatus('Aucune crèche avec des coordonnées GPS')
          return
        }

        const nearest = withDist[0]
        setCrecheId(nearest._id)
        setGpsStatus(`Crèche la plus proche : ${nearest.name} (${Math.round(nearest.dist)} m)`)
      },
      (err) => {
        setGpsStatus(`GPS refusé ou indisponible : ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Jour de travail</h2>
        <label>Date</label>
        <input
          ref={dateInputRef}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ position: 'absolute', visibility: 'hidden', width: 0, height: 0 }}
        />
        <button
          className="btn-small btn-secondary"
          onClick={() => dateInputRef.current?.showPicker?.()}
          style={{ width: '100%', marginBottom: '0.5rem' }}
        >
          {date}
        </button>
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', marginBottom: '0.75rem', paddingBottom: '0.25rem' }}>
          <button
            className="btn-small btn-secondary"
            onClick={() => setDate(subDays(new Date(date), 1).toISOString().split('T')[0])}
            style={{ minWidth: '2rem', padding: '0.5rem' }}
          >
            ‹
          </button>
          {[-1, 0, 1].map((offset) => {
            const d = addDays(new Date(date), offset)
            const dStr = d.toISOString().split('T')[0]
            return (
              <button
                key={dStr}
                className={dStr === date ? 'btn-small btn-primary' : 'btn-small btn-secondary'}
                onClick={() => setDate(dStr)}
                style={{ flex: '1 1 auto', minWidth: '3.5rem', padding: '0.35rem 0.25rem', fontSize: '0.7rem', lineHeight: 1.2 }}
              >
                <span>{format(d, 'EEE', { locale: fr }).replace('.', '')}</span>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>{format(d, 'dd/MM')}</span>
              </button>
            )
          })}
          <button
            className="btn-small btn-secondary"
            onClick={() => setDate(addDays(new Date(date), 1).toISOString().split('T')[0])}
            style={{ minWidth: '2rem', padding: '0.5rem' }}
          >
            ›
          </button>
        </div>

        {leave && (
          <div
            className="card live"
            style={{
              marginTop: '0.75rem',
              padding: '0.75rem',
              background: 'var(--primary-soft)',
              border: '1px solid var(--primary)',
              borderRadius: '0.75rem',
            }}
          >
            <strong style={{ color: 'var(--primary)' }}>
              {leave.reason === 'conge' ? 'Congé' : leave.reason === 'maladie' ? 'Maladie' : leave.reason === 'formation' ? 'Formation' : leave.reason === 'rattrapage' ? "Rattrapage d'heures" : 'Autre'}
              {leave.halfDay ? ` — ${leave.halfDay === 'morning' ? 'Matin' : 'Après-midi'}` : ''}
            </strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              {leave.paid ? 'Payé' : 'Non payé'}
              {leave.notes ? ` — ${leave.notes}` : ''}
            </p>
          </div>
        )}

        {dayMeetings.map((m) => {
          const km = meetingKm(m)
          return (
            <div
              key={m._id}
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--primary-soft)',
                border: '1px solid var(--primary)',
                borderRadius: '0.75rem',
              }}
            >
              <strong style={{ color: 'var(--primary)' }}>Réunion — {m.title}</strong>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                {m.address}
                {m.startTime && m.endTime ? ` — ${m.startTime} → ${m.endTime}` : ''}
                {km != null ? ` — trajet A/R : ${km} km` : ''}
                {m.travelMinutes != null ? ` (~${m.travelMinutes} min)` : ''}
              </p>
            </div>
          )
        })}

        {replacements.map((r) => {
          const creche = creches.find((c) => c._id === r.crecheId)
          return (
            <div
              key={r._id}
              style={{
                marginTop: '0.75rem',
                padding: '0.75rem',
                background: 'var(--primary-soft)',
                border: '1px solid var(--primary)',
                borderRadius: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
              }}
            >
              <div>
                <strong style={{ color: 'var(--primary)' }}>
                  Remplacement — {creche?.name || r.crecheId}
                </strong>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
                  {r.startTime} → {r.endTime}
                  {r.breakMinutes ? ` — pause ${r.breakMinutes} min` : ''}
                </p>
              </div>
              <button className="btn-danger btn-small" onClick={() => removeReplacement(r)}>
                ×
              </button>
            </div>
          )
        })}

        {showReplForm ? (
          <div style={{ marginTop: '0.75rem' }}>
            <label>Crèche du remplacement</label>
            <select value={replCrecheId} onChange={(e) => setReplCrecheId(e.target.value)}>
              <option value="">Choisir une crèche…</option>
              {creches.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="btn-row" style={{ marginTop: '0.5rem' }}>
              <input type="time" value={replStart} onChange={(e) => setReplStart(e.target.value)} />
              <input type="time" value={replEnd} onChange={(e) => setReplEnd(e.target.value)} />
            </div>
            <label style={{ marginTop: '0.5rem' }}>Pause (min)</label>
            <input
              type="number"
              min={0}
              step={5}
              value={replBreak}
              onChange={(e) => setReplBreak(Number(e.target.value))}
              placeholder="0"
            />
            <div className="btn-row" style={{ marginTop: '0.5rem' }}>
              <button className="btn-primary" onClick={addReplacement}>
                Ajouter
              </button>
              <button className="btn-secondary" onClick={() => setShowReplForm(false)}>
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn-secondary"
            onClick={() => setShowReplForm(true)}
            style={{ marginTop: '0.75rem' }}
          >
            + Remplacement
          </button>
        )}

        <label>Crèche</label>
        {plannedDays.length === 0 ? (
          <p style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>
            Aucune prévision pour cette date. Ajoute-la dans Données &gt; Planning.
          </p>
        ) : (
          <select value={crecheId} onChange={(e) => setCrecheId(e.target.value)}>
            <option value="">Choisir une crèche…</option>
            {creches
              .filter((c) => plannedDays.some((d) => d.crecheId === c._id))
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
          </select>
        )}

        <button className="btn-secondary" onClick={nearestCreche} style={{ marginTop: '0.75rem' }} disabled={plannedDays.length === 0}>
          Détecter la plus proche
        </button>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {km > 0 ? `Trajet aller-retour : ${km} km` : 'Adresse domicile ou coordonnees crèche manquantes'}
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Horaires</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="time-table">
            <thead>
              <tr>
                <th></th>
                <th>Arrivée</th>
                <th>Départ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="expected-row">
                <td className="row-label">Prévu</td>
                <td>
                  {expectedStart ? (
                    <input
                      type="time"
                      value={expectedStart}
                      onChange={(e) => setExpectedStart(e.target.value)}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>—</span>
                  )}
                </td>
                <td>
                  {expectedEnd ? (
                    <input
                      type="time"
                      value={expectedEnd}
                      onChange={(e) => setExpectedEnd(e.target.value)}
                    />
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>—</span>
                  )}
                </td>
              </tr>
              <tr className="actual-row">
                <td className="row-label"><span className="live-dot" />Effectif</td>
                <td>
                  <input
                    type="time"
                    value={actualStart}
                    onChange={(e) => setActualStart(e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="time"
                    value={actualEnd}
                    onChange={(e) => setActualEnd(e.target.value)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="time-table">
            <thead>
              <tr>
                <th></th>
                <th>Autres (min)</th>
                <th>Repas (min)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="expected-row">
                <td className="row-label">Prévu</td>
                <td>
                  <input
                    type="number"
                    value={breakMinutes}
                    disabled
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={lunchMinutes}
                    disabled
                  />
                </td>
              </tr>
              <tr className="actual-row">
                <td className="row-label"><span className="live-dot" />Réel</td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={actualBreakMinutes}
                    onChange={(e) => setActualBreakMinutes(Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    value={actualLunchMinutes}
                    onChange={(e) => setActualLunchMinutes(Number(e.target.value))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn-small btn-secondary" onClick={() => now(setActualStart)}>
            Arrivée maintenant
          </button>
          <button className="btn-small btn-secondary" onClick={() => now(setActualEnd)}>
            Départ maintenant
          </button>
        </div>

        <div className="btn-row" style={{ marginTop: '0.5rem' }}>
          <button className="btn-primary" onClick={() => punchClock('start')}>
            Pointer arrivée GPS
          </button>
          <button className="btn-primary" onClick={() => punchClock('end')}>
            Pointer départ GPS
          </button>
        </div>

        {gpsStatus && (
          <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {gpsStatus}
          </p>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Notes</h2>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Commentaire du jour" />
        <button className="btn-primary" onClick={() => save()} style={{ marginTop: '1rem' }}>
          Enregistrer la journée
        </button>
      </section>
    </>
  )
}
