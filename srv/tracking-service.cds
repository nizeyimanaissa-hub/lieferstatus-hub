using { lieferstatus as db } from '../db/schema';

service TrackingService @(path: '/tracking') {
  entity OrderTracking as projection on db.OrderTracking;
  @readonly entity StatusLog as projection on db.StatusLog;
  @readonly entity Notifications as projection on db.Notification;
}