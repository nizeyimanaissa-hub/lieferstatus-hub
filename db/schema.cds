namespace lieferstatus;

using { cuid, managed } from '@sap/cds/common';

type Status : String(20) enum { Offen; InLieferung; Geliefert; Verzoegert; }

entity OrderTracking : cuid, managed {
  salesOrder    : String(10) @mandatory;
  customer      : String(10);
  status        : Status default 'Offen';
  plannedDate   : Date;
  delayReason   : String(255);
  statusLog     : Composition of many StatusLog on statusLog.tracking = $self;
  notifications : Composition of many Notification on notifications.tracking = $self;
}

entity StatusLog : cuid, managed {
  tracking  : Association to OrderTracking;
  oldStatus : Status;
  newStatus : Status;
  comment   : String(255);
}

entity Notification : cuid, managed {
  tracking : Association to OrderTracking;
  message  : String(500);
  sentOk   : Boolean default false;
}