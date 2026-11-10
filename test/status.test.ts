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
import { s4ErrorMessage } from '../srv/lib/errors'

describe('s4ErrorMessage', () => {
  test('401 and 403 are reported as a credentials problem', () => {
    expect(s4ErrorMessage({ message: 'Error during request to remote service: Request failed with status code 401' })).toBe('S4_AUTH_FAILED')
    expect(s4ErrorMessage({ reason: { response: { status: 403 } } })).toBe('S4_AUTH_FAILED')
  })
  test('everything else is reported as unavailable', () => {
    expect(s4ErrorMessage({ message: 'Request failed with status code 503' })).toBe('S4_UNAVAILABLE')
    expect(s4ErrorMessage({ message: 'connect ECONNREFUSED' })).toBe('S4_UNAVAILABLE')
    expect(s4ErrorMessage(undefined)).toBe('S4_UNAVAILABLE')
  })
})
