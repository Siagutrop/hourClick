import { useState } from 'react'
import { Gaps } from './Gaps'
import { WeekView } from './WeekView'

type SubTab = 'gaps' | 'week'

export function Dashboard() {
  const [tab, setTab] = useState<SubTab>('week')

  return (
    <>
      <div className="tab-bar">
        <button className={tab === 'week' ? 'active' : ''} onClick={() => setTab('week')}>
          Résumé
        </button>
        <button className={tab === 'gaps' ? 'active' : ''} onClick={() => setTab('gaps')}>
          Écarts
        </button>
      </div>

      {tab === 'week' && <WeekView />}
      {tab === 'gaps' && <Gaps />}
    </>
  )
}
