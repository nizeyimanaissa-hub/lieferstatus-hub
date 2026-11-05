import cds from '@sap/cds'

export default class TrackingService extends cds.ApplicationService {
  async init() {
    const salesOrderApi = await cds.connect.to('API_SALES_ORDER_SRV')

    const deliveryApi = await cds.connect.to('API_OUTBOUND_DELIVERY_SRV_0002')

    // Reads on SalesOrders go to S/4HANA, not to your own database
    this.on('READ', 'SalesOrders', req => salesOrderApi.run(req.query))
    this.on('READ', 'Deliveries', req => deliveryApi.run(req.query))

    return super.init()
  }
}