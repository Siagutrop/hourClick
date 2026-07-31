import { describe, it, expect } from 'vitest'
import { toMinutes, dayNetMinutes, formatTime, formatSignedTime } from './time'
import type { DayEntry } from './types'

describe('time helpers', () => {
  it('converts hh:mm to minutes', () => {
    expect(toMinutes('08:30')).toBe(510)
    expect(toMinutes('17:00')).toBe(1020)
  })

  it('formats minutes as readable time', () => {
    expect(formatTime(120)).toBe('2h 00')
    expect(formatTime(95)).toBe('1h 35')
  })

  it('formats signed minutes', () => {
    expect(formatSignedTime(60)).toBe('+1h 00')
    expect(formatSignedTime(-90)).toBe('-1h 30')
  })

  it('calculates expected net minutes with breaks', () => {
    const day: DayEntry = {
      _id: 'd1',
      type: 'day',
      date: '2025-01-01',
      crecheId: 'c1',
      expectedStart: '08:00',
      expectedEnd: '17:00',
      breakMinutes: 15,
      lunchMinutes: 45,
    }
    expect(dayNetMinutes(day, 'expected')).toBe(480)
  })

  it('uses actual breaks if present', () => {
    const day: DayEntry = {
      _id: 'd2',
      type: 'day',
      date: '2025-01-01',
      crecheId: 'c1',
      expectedStart: '08:00',
      expectedEnd: '17:00',
      breakMinutes: 15,
      lunchMinutes: 45,
      actualStart: '08:00',
      actualEnd: '17:00',
      actualBreakMinutes: 30,
      actualLunchMinutes: 60,
    }
    expect(dayNetMinutes(day, 'actual')).toBe(450)
  })
})
