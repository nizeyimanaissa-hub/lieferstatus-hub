import cds from '@sap/cds'
import { calculateStatus, Status } from './lib/status'

const { SELECT, INSERT, UPDATE } = cds.ql
const LOG = cds.log('tracking')
const today = () => new Date().toISOString().slice(0, 10)

export default class TrackingService extends cds.ApplicationService {
  async init() {
    const { OrderTracking, SalesOrders, Deliveries, DeliveryItems } = this.entities
    const db = cds.entities('lieferstatus')

    const salesOrderApi = await cds.connect.to('API_SALES_ORDER_SRV')
    const deliveryApi = await cds.connect.to('API_OUTBOUND_DELIVERY_SRV_0002')

    // Reads on S/4HANA entities are delegated to the APIs
    this.on('READ', SalesOrders, req => salesOrderApi.run(req.query))
    this.on('READ', [Deliveries, DeliveryItems], req => deliveryApi.run(req.query))

    // Writes a new status and a log entry, but only if something changed
    const changeStatus = async (tracking: any, newStatus: Status, comment: string) => {
      if (tracking.status === newStatus) return false
      await UPDATE.entity(db.OrderTracking, tracking.ID).with({ status: newStatus })
      await INSERT.into(db.StatusLog).entries({
        tracking_ID: tracking.ID, oldStatus: tracking.status, newStatus, comment
      })
      return true
    }

    // Validation: order must exist in S/4, no duplicates, no past dates
    this.before('CREATE', OrderTracking, async req => {
      const { salesOrder, plannedDate } = req.data
      const order = await salesOrderApi.run(
        SELECT.one.from(SalesOrders).columns('SalesOrder').where({ SalesOrder: salesOrder })
      )
      if (!order) return req.error({ status: 400, message: 'ORDER_NOT_FOUND', args: [salesOrder], target: 'salesOrder' })

      const duplicate = await SELECT.one.from(db.OrderTracking).where({ salesOrder })
      if (duplicate) return req.error({ status: 409, message: 'DUPLICATE_TRACKING', args: [salesOrder], target: 'salesOrder' })

      if (plannedDate && plannedDate < today()) {
        req.error({ status: 400, message: 'PLANNED_DATE_IN_PAST', target: 'plannedDate' })
      }
    })

    // Action: recalculate the status from S/4HANA
    this.on('refreshStatus', OrderTracking, async req => {
      const tracking = await SELECT.one.from(req.subject)
      const order = await salesOrderApi.run(
        SELECT.one.from(SalesOrders).where({ SalesOrder: tracking.salesOrder })
      )
      if (!order) return req.reject({ status: 404, message: 'ORDER_NOT_FOUND', args: [tracking.salesOrder] })

      const items = await deliveryApi.run(
        SELECT.from(DeliveryItems).columns('DeliveryDocument').where({ ReferenceSDDocument: tracking.salesOrder })
      )
      let goodsMovementStatus: string | undefined
      if (items.length) {
        const delivery = await deliveryApi.run(
          SELECT.one.from(Deliveries).where({ DeliveryDocument: items[0].DeliveryDocument })
        )
        goodsMovementStatus = delivery?.OverallGoodsMovementStatus
      }

      const newStatus = calculateStatus({
        orderDeliveryStatus: order.OverallTotalDeliveryStatus,
        goodsMovementStatus,
        plannedDate: tracking.plannedDate,
        manualDelay: !!tracking.delayReason
      })
      const changed = await changeStatus(tracking, newStatus, 'Status aus S/4HANA aktualisiert')
      if (!changed) req.info({ message: 'STATUS_UNCHANGED' })
      LOG.info(`Order ${tracking.salesOrder}: ${tracking.status} -> ${newStatus}`)
      return SELECT.one.from(req.subject)
    })

    // Action: report a delay manually
    this.on('markDelayed', OrderTracking, async req => {
      const reason = req.data.reason?.trim()
      if (!reason) return req.reject({ status: 400, message: 'REASON_REQUIRED', target: 'reason' })

      const tracking = await SELECT.one.from(req.subject)
      await UPDATE.entity(db.OrderTracking, tracking.ID).with({ delayReason: reason })
      await changeStatus(tracking, 'Verzoegert', reason)
      return SELECT.one.from(req.subject)
    })

        // Action: notify the customer through the iFlow
    this.on('notifyCustomer', OrderTracking, async req => {
      const tracking = await SELECT.one.from(req.subject)
      const payload = {
        salesOrder: tracking.salesOrder,
        customer: tracking.customer,
        status: tracking.status,
        delayReason: tracking.delayReason
      }

      try {
        const iflow = await cds.connect.to('LIEFERSTATUS_IFLOW')
        const response = await iflow.send({ method: 'POST', path: '/lieferstatus/notify', data: payload })
        await INSERT.into(db.Notification).entries({
          tracking_ID: tracking.ID, message: response.message, sentOk: true
        })
        req.info({ message: 'NOTIFICATION_SENT', args: [tracking.salesOrder] })
      } catch (err: any) {
        LOG.error('iFlow call failed', err.message)
        await INSERT.into(db.Notification).entries({
          tracking_ID: tracking.ID, message: `Fehler: ${err.message}`, sentOk: false
        })
        req.warn({ message: 'NOTIFICATION_FAILED' })
      }
      return SELECT.one.from(req.subject)
    })

    return super.init()
  }
}