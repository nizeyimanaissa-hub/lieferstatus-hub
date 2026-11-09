import { calculateStatus } from '../srv/lib/status'

const today = '2026-11-19'

describe('calculateStatus', () => {
  test('goods issue completed -> Geliefert, even with a reported delay', () => {
    expect(calculateStatus({ goodsMovementStatus: 'C', manualDelay: true, today })).toBe('Geliefert')
  })
  test('manual delay -> Verzoegert', () => {
    expect(calculateStatus({ orderDeliveryStatus: 'B', manualDelay: true, today })).toBe('Verzoegert')
  })
  test('delivery created -> InLieferung', () => {
    expect(calculateStatus({ orderDeliveryStatus: 'C', manualDelay: false, today })).toBe('InLieferung')
  })
  test('planned date in the past -> Verzoegert', () => {
    expect(calculateStatus({ orderDeliveryStatus: 'A', plannedDate: '2026-11-01', manualDelay: false, today })).toBe('Verzoegert')
  })
  test('nothing happened yet -> Offen', () => {
    expect(calculateStatus({ orderDeliveryStatus: 'A', plannedDate: '2026-12-01', manualDelay: false, today })).toBe('Offen')
  })
})