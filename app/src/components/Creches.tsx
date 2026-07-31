import { useEffect, useState } from 'react'
import { getLocalDB, getAllByType } from '../db'
import type { Creche } from '../types'

export function Creches() {
  const [creches, setCreches] = useState<Creche[]>([])
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')

  const load = async () => {
    setCreches(await getAllByType<Creche>('creche'))
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    if (!name.trim()) return
    const creche: Creche = {
      _id: `creche_${Date.now()}`,
      type: 'creche',
      name: name.trim(),
      address: address.trim(),
      lat: lat ? Number(lat) : undefined,
      lon: lon ? Number(lon) : undefined,
    }
    await getLocalDB().put(creche)
    setName('')
    setAddress('')
    setLat('')
    setLon('')
    load()
  }

  const remove = async (id: string, rev?: string) => {
    if (!rev) return
    if (confirm('Supprimer cette crèche ?')) {
      await getLocalDB().remove(id, rev)
      load()
    }
  }

  const locate = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude))
        setLon(String(pos.coords.longitude))
      },
      () => alert('Géolocalisation impossible'),
      { enableHighAccuracy: true }
    )
  }

  return (
    <>
      <section className="card">
        <h2 className="card-title">Ajouter une crèche</h2>
        <label>Nom</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Les P’tits Loups" />

        <label>Adresse</label>
        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue des Lilas" />

        <label>Coordonnées GPS</label>
        <div className="btn-row">
          <input
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Latitude"
            type="number"
            step="any"
          />
          <input
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="Longitude"
            type="number"
            step="any"
          />
        </div>

        <div className="btn-row" style={{ marginTop: '0.75rem' }}>
          <button className="btn-secondary" onClick={locate}>
            Utiliser ma position
          </button>
        </div>

        <button className="btn-primary" onClick={add} style={{ marginTop: '1rem' }}>
          Ajouter
        </button>
      </section>

      <section className="card">
        <h2 className="card-title">Mes crèches</h2>
        {creches.length === 0 && <p className="empty">Aucune crèche enregistrée</p>}
        <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
          {creches.map((c) => (
            <li key={c._id} className="list-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <strong>{c.name}</strong>
                  <small>{c.address || 'Adresse non renseignée'}</small>
                  {c.lat != null && c.lon != null && (
                    <small>{c.lat.toFixed(5)}, {c.lon.toFixed(5)}</small>
                  )}
                </div>
                <button className="btn-danger btn-small" onClick={() => remove(c._id, c._rev)}>
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
