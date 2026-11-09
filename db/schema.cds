namespace lieferstatus;

using { cuid, managed } from '@sap/cds/common';

type Status : String(20) enum { Offen; InLieferung; Geliefert; Verzoegert; }

entity OrderTracking : cuid, managed {
  salesOrder    : String(10) @mandatory;
  customer      : String(10);
  status        : Status default 'Offen';
  plannedDate   : Date;
  delayReason   : String(255);
  statusCriticality : Integer = case
                                  when status = 'Geliefert'   then 3   // green
                                  when status = 'InLieferung' then 2   // orange
                                  when status = 'Verzoegert'  then 1   // red
                                  else 0                               // grey
                                end;
  statusText        : String(20) = case
                                  when status = 'InLieferung' then 'In Lieferung'
                                  when status = 'Verzoegert'  then 'Verzögert'
                                  else status
                                end;
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