import cds from '@sap/cds'
import path from 'path'

const { GET, POST } = cds.test(path.join(__dirname, '..'), '--with-mocks')

const base = '/tracking/OrderTracking'
const key = (id: string) => `${base}(ID=${id},IsActiveEntity=true)`
const T1 = 'd3b0a1e2-0001-4000-8000-000000000001'
const T3 = 'd3b0a1e2-0003-4000-8000-000000000003'
const asAnna = { auth: { username: 'anna', password: '123' } }  // Dispatcher
const asBen = { auth: { username: 'ben', password: '123' } }     // Viewer

describe('TrackingService', () => {
  test('lists the sample trackings', async () => {
    const { data } = await GET(`${base}?$filter=IsActiveEntity eq true`, asAnna)
    expect(data.value.length).toBeGreaterThanOrEqual(3)
  })

  test('markDelayed sets the status and writes a log entry', async () => {
    await POST(`${key(T1)}/TrackingService.markDelayed`, { reason: 'Spedition streikt' }, asAnna)
    const { data } = await GET(`${key(T1)}?$expand=statusLog`, asAnna)
    expect(data.status).toBe('Verzoegert')
    expect(data.delayReason).toBe('Spedition streikt')
    expect(data.statusLog.some((l: any) => l.newStatus === 'Verzoegert')).toBe(true)
  })

  test('markDelayed without a reason is rejected', async () => {
    await expect(
      POST(`${key(T1)}/TrackingService.markDelayed`, { reason: '' }, asAnna)
    ).rejects.toThrow(/400/)
  })

  test('a Viewer cannot run actions', async () => {
    await expect(
      POST(`${key(T1)}/TrackingService.markDelayed`, { reason: 'x' }, asBen)
    ).rejects.toThrow(/403/)
  })

  test('refreshStatus uses the S/4 mocks: completed goods issue -> Geliefert', async () => {
    await POST(`${key(T3)}/TrackingService.refreshStatus`, {}, asAnna)
    const { data } = await GET(key(T3), asAnna)
    expect(data.status).toBe('Geliefert')
  })

  test('saving a tracking for an unknown order fails', async () => {
    const { data: draft } = await POST(base, { salesOrder: '999999999', plannedDate: '2027-01-15' }, asAnna)
    await expect(
      POST(`${base}(ID=${draft.ID},IsActiveEntity=false)/TrackingService.draftActivate`, {}, asAnna)
    ).rejects.toThrow(/400/)
  })

  test('notifyCustomer without the iFlow logs a failed notification', async () => {
    await POST(`${key(T3)}/TrackingService.notifyCustomer`, {}, asAnna)
    const { data } = await GET(`${key(T3)}?$expand=notifications`, asAnna)
    expect(data.notifications.some((n: any) => n.sentOk === false)).toBe(true)
  })
})