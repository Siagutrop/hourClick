import { useEffect, useState } from 'react'
import { getLocalDB, getAllByType } from '../db'
import { distanceMeters, routeMinutes } from '../distance'
import type { Meeting, HomeLocation } from '../types'

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export function Meetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [weekday, setWeekday] = useState(0)
  const [title, setTitle] = useState('')
  const [address, setAddress] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [geoStatus, setGeoStatus] = useState('')

  const load = async () => {
    const all = await getAllByType<Meeting>('meeting')
    setMeetings(all.sort((a, b) => a.weekday - b.weekday || a.title.localeCompare(b.title)))
    try {
      const doc = (await getLocalDB().get('home')) as HomeLocation
      setHome(doc)
    } catch {
      setHome(null)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const geocode = async (addr: string): Promise<{ lat: number; lon: number } | null> => {
    try {
      const q = encodeURIComponent(addr)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`,
        { headers: { 'User-Agent': 'HourClick' } }
      )
      const data = await res.json()
      if (data.length === 0) return null
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
    } catch {
      return null
    }
  }

  const add = async () => {
    if (!title.trim() || !address.trim()) {
      setGeoStatus('Saisis un titre et une adresse')
      return
    }
    setGeoStatus('Recherche du lieu…')
    const coords = await geocode(address.trim())
    if (!coords) {
      setGeoStatus('Adresse non trouvée — la réunion est enregistrée sans trajet')
    }
    let travelMinutes: number | undefined
    if (coords && home?.lat != null && home?.lon != null) {
      setGeoStatus('Calcul du trajet…')
      const oneWay = await routeMinutes(home.lat, home.lon, coords.lat, coords.lon)
      if (oneWay != null) travelMinutes = oneWay * 2
    }
    const meeting: Meeting = {
      _id: `meeting_${weekday}_${Date.now()}`,
      type: 'meeting',
      weekday,
      title: title.trim(),
      address: address.trim(),
      lat: coords?.lat,
      lon: coords?.lon,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      travelMinutes,
    }
    await getLocalDB().put(meeting)
    setTitle('')
    setAddress('')
    setStartTime('')
    setEndTime('')
    setGeoStatus('')
    load()
  }

  const remove = async (id: string, rev?: string) => {
    if (!rev) return
    if (confirm('Supprimer cette réunion ?')) {
      await getLocalDB().remove(id, rev)
      load()
    }
  }

  const kmFor = (m: Meeting) => {
    if (home?.lat == null || home?.lon == null || m.lat == null || m.lon == null) return null
    return Math.round((distanceMeters(home.lat, home.lon, m.lat, m.lon) / 1000) * 2 * 10) / 10
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Ajouter une réunion</h2>
        <label>Jour de la semaine</label>
        <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
          {WEEKDAYS.map((d, i) => (
            <option key={i} value={i}>
              {d}
            </option>
          ))}
        </select>

        <label>Titre</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Réunion d'équipe" />

        <label>Adresse / Lieu</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="5 rue des Réunions, 75000 Paris" />

        <label>Horaires (optionnel)</label>
        <div className="btn-row">
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>

        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          {geoStatus}
        </p>

        <button className="btn-primary" onClick={add} style={{ marginTop: '0.75rem' }}>
          Ajouter
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Mes réunions</h2>
        {meetings.length === 0 && <p className="empty">Aucune réunion enregistrée</p>}
        <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
          {meetings.map((m) => {
            const km = kmFor(m)
            return (
              <li key={m._id} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <strong>{WEEKDAYS[m.weekday]} — {m.title}</strong>
                    <small>{m.address}</small>
                    {m.startTime && m.endTime && (
                      <small>{m.startTime} → {m.endTime}</small>
                    )}
                    {km != null ? (
                      <small>
                        Trajet aller-retour : {km} km
                        {m.travelMinutes != null && ` — ~${m.travelMinutes} min`}
                      </small>
                    ) : (
                      <small>Trajet non calculable (adresse ou domicile manquant)</small>
                    )}
                  </div>
                  <button className="btn-danger btn-small" onClick={() => remove(m._id, m._rev)}>
                    Supprimer
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
