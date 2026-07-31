import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getAllByType } from '../db'
import type { Creche, DayEntry } from '../types'

const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export default function Itinerary() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [creches, setCreches] = useState<Creche[]>([])
  const [days, setDays] = useState<DayEntry[]>([])
  const [navStatus, setNavStatus] = useState('')

  useEffect(() => {
    getAllByType<Creche>('creche').then(setCreches)
    getAllByType<DayEntry>('day').then(setDays)
  }, [])

  const dayCreches = useMemo(() => {
    const todayIds = days
      .filter((d) => d.date === date)
      .map((d) => d.crecheId)
    return creches.filter((c) => todayIds.includes(c._id) && c.lat != null && c.lon != null)
  }, [date, creches, days])

  const center = useMemo(() => {
    if (dayCreches.length === 0) return { lat: 48.8566, lon: 2.3522 }
    const avgLat = dayCreches.reduce((s, c) => s + c.lat!, 0) / dayCreches.length
    const avgLon = dayCreches.reduce((s, c) => s + c.lon!, 0) / dayCreches.length
    return { lat: avgLat, lon: avgLon }
  }, [dayCreches])

  const openGoogleMaps = () => {
    if (dayCreches.length === 0) return
    setNavStatus('Localisation…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const origin = `${pos.coords.latitude},${pos.coords.longitude}`
        const points = dayCreches.map((c) => `${c.lat},${c.lon}`)
        const destination = points[points.length - 1]
        const waypoints = points.slice(0, -1).join('|')
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
        if (waypoints) {
          url += `&waypoints=${waypoints}`
        }
        window.open(url, '_blank')
        setNavStatus('')
      },
      () => {
        const points = dayCreches.map((c) => `${c.lat},${c.lon}`)
        const origin = points[0]
        const destination = points[points.length - 1]
        const waypoints = points.slice(1, -1).join('/')
        let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
        if (waypoints) {
          url += `&waypoints=${waypoints.replaceAll('/', '|')}`
        }
        window.open(url, '_blank')
        setNavStatus('Position non disponible, itinéraire depuis la première crèche')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const openWaze = () => {
    if (dayCreches.length === 0) return
    setNavStatus('Localisation…')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const first = dayCreches[0]
        const url = `https://waze.com/ul?ll=${first.lat},${first.lon}&navigate=yes&from=${pos.coords.latitude},${pos.coords.longitude}`
        window.open(url, '_blank')
        setNavStatus('')
      },
      () => {
        const first = dayCreches[0]
        const url = `https://waze.com/ul?ll=${first.lat},${first.lon}&navigate=yes`
        window.open(url, '_blank')
        setNavStatus('Position non disponible, navigation depuis la position Waze')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Itinéraire du jour</h2>
        <label>Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        {dayCreches.length === 0 ? (
          <p className="empty">Aucune crèche avec GPS pour cette date.</p>
        ) : (
          <>
            <p style={{ marginTop: '0.75rem', fontWeight: 500 }}>
              {dayCreches.map((c) => c.name).join(' → ')}
            </p>
            <div className="btn-row" style={{ marginTop: '0.75rem' }}>
              <button className="btn-primary" onClick={openGoogleMaps}>
                Google Maps
              </button>
              <button className="btn-secondary" onClick={openWaze}>
                Waze
              </button>
            </div>
            {navStatus && (
              <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {navStatus}
              </p>
            )}
          </>
        )}
      </section>

      {dayCreches.length > 0 && (
        <section className="card" style={{ padding: 0 }}>
          <div className="map-container" style={{ height: '320px' }}>
            <MapContainer
              center={[center.lat, center.lon]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              />
              {dayCreches.map((c) => (
                <Marker key={c._id} position={[c.lat!, c.lon!]} icon={defaultIcon}>
                  <Popup>{c.name}</Popup>
                </Marker>
              ))}
              {dayCreches.length > 1 && (
                <Polyline positions={dayCreches.map((c) => [c.lat!, c.lon!])} color="#4f46e5" />
              )}
            </MapContainer>
          </div>
        </section>
      )}
    </>
  )
}
