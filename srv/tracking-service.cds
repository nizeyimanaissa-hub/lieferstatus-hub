using { lieferstatus as db } from '../db/schema';
using { API_SALES_ORDER_SRV as s4 } from './external/API_SALES_ORDER_SRV';
using { API_OUTBOUND_DELIVERY_SRV_0002 as dlv } from './external/API_OUTBOUND_DELIVERY_SRV_0002';

service TrackingService @(path: '/tracking') {
  entity OrderTracking as projection on db.OrderTracking actions {
    action refreshStatus()                 returns OrderTracking;
    action markDelayed(reason : String(255)) returns OrderTracking;
    action notifyCustomer()                returns OrderTracking;
  };
  @readonly entity StatusLog as projection on db.StatusLog;
  @readonly entity Notifications as projection on db.Notification;

  @readonly entity SalesOrders as projection on s4.A_SalesOrder {
    key SalesOrder,
        SoldToParty,
        SalesOrganization,
        CreationDate,
        RequestedDeliveryDate,
        TotalNetAmount,
        TransactionCurrency,
        OverallSDProcessStatus,
        OverallTotalDeliveryStatus
  };

  @readonly entity Deliveries as projection on dlv.A_OutbDeliveryHeader {
    key DeliveryDocument,
        ShippingPoint,
        PlannedGoodsIssueDate,
        ActualGoodsMovementDate,
        OverallGoodsMovementStatus
  };
  @readonly entity DeliveryItems as projection on dlv.A_OutbDeliveryItem {
    key DeliveryDocument,
    key DeliveryDocumentItem,
        ReferenceSDDocument
  };
}
annotate TrackingService.OrderTracking with @odata.draft.enabled;
