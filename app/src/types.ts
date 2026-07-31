export interface Creche {
  _id: string
  _rev?: string
  type: 'creche'
  name: string
  address: string
  lat?: number
  lon?: number
}

export interface DayEntry {
  _id: string
  _rev?: string
  type: 'day'
  date: string
  crecheId: string
  expectedStart?: string
  expectedEnd?: string
  actualStart?: string
  actualEnd?: string
  breakMinutes?: number
  lunchMinutes?: number
  actualBreakMinutes?: number
  actualLunchMinutes?: number
  notes?: string
}

export interface Leave {
  _id: string
  _rev?: string
  type: 'leave'
  date: string
  reason: 'conge' | 'maladie' | 'formation' | 'autre'
  paid: boolean
  halfDay?: 'morning' | 'afternoon'
  notes?: string
}

export interface HomeLocation {
  _id: string
  _rev?: string
  type: 'home'
  address: string
  lat?: number
  lon?: number
}
