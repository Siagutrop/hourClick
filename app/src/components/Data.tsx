import { useState } from 'react'
import { Planning } from './Planning'
import { Creches } from './Creches'
import { Conges } from './Conges'

type SubTab = 'planning' | 'creches' | 'conges'

export function Data() {
  const [tab, setTab] = useState<SubTab>('planning')

  return (
    <>
      <div className="tab-bar">
        <button className={tab === 'planning' ? 'active' : ''} onClick={() => setTab('planning')}>
          Planning
        </button>
        <button className={tab === 'creches' ? 'active' : ''} onClick={() => setTab('creches')}>
          Crèches
        </button>
        <button className={tab === 'conges' ? 'active' : ''} onClick={() => setTab('conges')}>
          Congés
        </button>
      </div>

      {tab === 'planning' && <Planning />}
      {tab === 'creches' && <Creches />}
      {tab === 'conges' && <Conges />}
    </>
  )
}
