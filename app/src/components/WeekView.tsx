import { useEffect, useState } from 'react'
import { getAllByType, getLocalDB } from '../db'
import { getCurrentUser } from '../auth'
import { distanceMeters } from '../distance'
import { dayNetMinutes, formatTime, formatSignedTime } from '../time'
import type { DayEntry, Creche, HomeLocation, Leave } from '../types'

function formatFrenchDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function calcKm(home: HomeLocation | null, creche: Creche | undefined) {
  if (home?.lat == null || home?.lon == null || creche?.lat == null || creche?.lon == null) {
    return 0
  }
  const oneWay = distanceMeters(home.lat, home.lon, creche.lat, creche.lon) / 1000
  return Math.round(oneWay * 2 * 10) / 10
}

export function WeekView() {
  const [days, setDays] = useState<DayEntry[]>([])
  const [creches, setCreches] = useState<Creche[]>([])
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    getAllByType<DayEntry>('day').then(setDays)
    getAllByType<Creche>('creche').then(setCreches)
    getAllByType<Leave>('leave').then(setLeaves)
    getLocalDB()
      .get('home')
      .then((doc: unknown) => setHome(doc as HomeLocation))
      .catch(() => setHome(null))
  }, [])

  const crecheName = (id: string) => creches.find((c) => c._id === id)?.name || id

  const filteredDays = days.filter((d) => d.date.startsWith(month))
  const filteredLeaves = leaves.filter((l) => l.date.startsWith(month))

  const { totalMinutes, totalExpected, totalGap, totalKm } = filteredDays.reduce(
    (acc, d) => {
      const expected = dayNetMinutes(d, 'expected')
      const actual = dayNetMinutes(d, 'actual')
      const creche = creches.find((c) => c._id === d.crecheId)
      const km = calcKm(home, creche)
      return {
        totalMinutes: acc.totalMinutes + actual,
        totalExpected: acc.totalExpected + expected,
        totalGap: acc.totalGap + (actual - expected),
        totalKm: acc.totalKm + km,
      }
    },
    { totalMinutes: 0, totalExpected: 0, totalGap: 0, totalKm: 0 }
  )

  const hours = (totalMinutes / 60).toFixed(2)

  const totalLeaveDays = filteredLeaves.reduce((sum, l) => sum + (l.halfDay ? 0.5 : 1), 0)

  const rows = filteredDays.map((d) => {
    const expected = dayNetMinutes(d, 'expected')
    const actual = dayNetMinutes(d, 'actual')
    const gap = actual - expected
    const creche = creches.find((c) => c._id === d.crecheId)
    const km = calcKm(home, creche)
    return [
      formatFrenchDate(d.date),
      crecheName(d.crecheId),
      d.expectedStart || '-',
      d.expectedEnd || '-',
      d.actualStart || '-',
      d.actualEnd || '-',
      String(d.breakMinutes || 0),
      String(d.lunchMinutes || 0),
      formatTime(actual),
      formatSignedTime(gap),
      String(km > 0 ? km : '-'),
      d.notes || '',
    ]
  })

  const leaveRows = filteredLeaves.map((l) => [
    formatFrenchDate(l.date),
    l.reason === 'conge' ? 'Conge' : l.reason === 'maladie' ? 'Maladie' : l.reason === 'formation' ? 'Formation' : 'Autre',
    l.halfDay ? (l.halfDay === 'morning' ? 'Matin' : 'Apres-midi') : 'Journee',
    l.paid ? 'Paye' : 'Non paye',
    l.notes || '',
  ])

  const exportCSV = () => {
    const header = [
      'Date',
      'Creche',
      'Arr prevu',
      'Dep prevu',
      'Arr effectif',
      'Dep effectif',
      'Autres (min)',
      'Repas (min)',
      'Total net',
      'Ecart',
      'Km AR',
      'Notes',
    ]
    let csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
      .join('\n')

    if (leaveRows.length > 0) {
      csv += `\n\nTotal jours de conge inclus : ${totalLeaveDays}\n`
      csv += 'Conges\n'
      const leaveHeader = ['Date', 'Type', 'Temps', 'Paye', 'Notes']
      csv += [leaveHeader, ...leaveRows]
        .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
        .join('\n')
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `heures-${month}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const exportPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ])
    const doc = new jsPDF({ orientation: 'landscape' })
    const user = getCurrentUser() || 'Utilisateur'
    const now = new Date().toLocaleDateString('fr-FR')
    const [y, m] = month.split('-')
    const title = `RELEVE HORAIRE - ${m}/${y}`

    doc.setFontSize(18)
    doc.text(title, 14, 20)

    doc.setFontSize(11)
    doc.setTextColor(80)
    doc.text(`Employe : ${user}`, 14, 28)
    doc.text(`Total effectif : ${hours} heures`, 14, 34)
    doc.text(`Total prevu : ${(totalExpected / 60).toFixed(2)} heures`, 14, 40)
    doc.text(`Ecart total : ${formatSignedTime(totalGap)}`, 14, 46)
    doc.text(`Kilometres AR : ${totalKm} km`, 14, 52)
    doc.text(`Journees pointees : ${filteredDays.filter((d) => d.actualStart && d.actualEnd).length}`, 14, 58)
    doc.text(`Jours de conge inclus : ${totalLeaveDays}`, 14, 64)
    doc.text(`Genere le : ${now}`, 14, 70)

    autoTable(doc, {
      startY: 78,
      head: [
        ['Date', 'Creche', 'Arr prevu', 'Dep prevu', 'Arr effectif', 'Dep effectif', 'Autres', 'Repas', 'Total net', 'Ecart', 'Km AR', 'Notes'],
      ],
      body: rows,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
      },
      bodyStyles: {
        textColor: 60,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 28 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 18 },
        6: { cellWidth: 15 },
        7: { cellWidth: 15 },
        8: { cellWidth: 19 },
        9: { cellWidth: 19 },
        10: { cellWidth: 15 },
        11: { cellWidth: 'auto' },
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    })

    if (leaveRows.length > 0) {
      const finalY = (doc as any).lastAutoTable?.finalY || 150
      doc.setFontSize(14)
      doc.text('Conges', 14, finalY + 16)
      autoTable(doc, {
        startY: finalY + 22,
        head: [['Date', 'Type', 'Temps', 'Paye', 'Notes']],
        body: leaveRows,
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: 255,
          fontStyle: 'bold',
        },
        bodyStyles: {
          textColor: 60,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 'auto' },
        },
        styles: {
          fontSize: 9,
          cellPadding: 2,
        },
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
      })
    }

    doc.save(`heures-${month}.pdf`)
  }

  return (
    <>
      <section className="card" style={{ textAlign: 'center' }}>
        <span className="badge">Total effectif net</span>
        <h2 style={{ fontSize: '2.5rem', margin: '0.25rem 0', color: 'var(--primary)' }}>{hours} h</h2>
        <p style={{ color: 'var(--text-secondary)' }}>
          {filteredDays.filter((d) => d.actualStart && d.actualEnd).length} journée(s) pointée(s)
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Ecart total : {formatSignedTime(totalGap)} — Prévu : {(totalExpected / 60).toFixed(2)} h — {totalKm} km AR — {totalLeaveDays} jour(s) de congé
        </p>
      </section>

      <section className="card">
        <h2 className="card-title">Exporter un mois</h2>
        <label>Mois</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          <button className="btn-secondary" onClick={exportCSV}>CSV</button>
          <button className="btn-primary" onClick={exportPDF}>PDF</button>
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">Historique</h2>
        {filteredDays.length === 0 && filteredLeaves.length === 0 && <p className="empty">Aucune journée ce mois-ci</p>}
        <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
          {filteredLeaves.map((l) => (
            <li key={l._id} className="list-item">
              <strong>{l.date}</strong>
              <small>
                {l.reason === 'conge' ? 'Congé' : l.reason === 'maladie' ? 'Maladie' : l.reason === 'formation' ? 'Formation' : 'Autre'}
                {l.halfDay ? ` — ${l.halfDay === 'morning' ? 'Matin' : 'Après-midi'}` : ''}
              </small>
              <small>{l.paid ? 'Payé' : 'Non payé'}</small>
              {l.notes && <small>{l.notes}</small>}
            </li>
          ))}
          {filteredDays.map((d) => {
            const creche = creches.find((c) => c._id === d.crecheId)
            const km = calcKm(home, creche)
            return (
              <li key={d._id} className="list-item">
                <strong>{d.date}</strong>
                <small>{crecheName(d.crecheId)}</small>
                <small>Prévu : {d.expectedStart} → {d.expectedEnd}</small>
                <small>Effectif : {d.actualStart || '-'} → {d.actualEnd || '-'}</small>
                {km > 0 && <small>Trajet : {km} km AR</small>}
                {(d.breakMinutes || d.lunchMinutes) ? (
                  <small>
                    Pauses : {d.breakMinutes || 0} min autres + {d.lunchMinutes || 0} min repas
                  </small>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
