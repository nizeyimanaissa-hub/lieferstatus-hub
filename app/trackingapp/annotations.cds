using TrackingService as service from '../../srv/tracking-service';

// Field labels, used everywhere in the app
annotate service.OrderTracking with {
  salesOrder        @title: '{i18n>SalesOrder}';
  customer          @title: '{i18n>Customer}';
  status            @title: '{i18n>Status}';
  statusText        @title: '{i18n>Status}';
  plannedDate       @title: '{i18n>PlannedDate}';
  delayReason       @title: '{i18n>DelayReason}';
  statusCriticality @UI.Hidden;
};

annotate service.OrderTracking with @(
  UI.HeaderInfo: {
    TypeName      : '{i18n>Tracking}',
    TypeNamePlural: '{i18n>Trackings}',
    Title         : { Value: salesOrder },
    Description   : { Value: statusText }
  },

  UI.SelectionFields: [ salesOrder, customer, status, plannedDate ],

  // List Report table, including a toolbar button
  UI.LineItem: [
    { Value: salesOrder },
    { Value: customer },
    { Value: statusText, Criticality: statusCriticality },
    { Value: plannedDate },
    { Value: delayReason },
    { $Type: 'UI.DataFieldForAction', Action: 'TrackingService.refreshStatus', Label: '{i18n>RefreshStatus}' }
  ],

  // Buttons in the Object Page header
  UI.Identification: [
    { $Type: 'UI.DataFieldForAction', Action: 'TrackingService.refreshStatus',  Label: '{i18n>RefreshStatus}' },
    { $Type: 'UI.DataFieldForAction', Action: 'TrackingService.markDelayed',    Label: '{i18n>MarkDelayed}' },
    { $Type: 'UI.DataFieldForAction', Action: 'TrackingService.notifyCustomer', Label: '{i18n>NotifyCustomer}' }
  ],

  UI.FieldGroup #General: { Data: [
    { Value: salesOrder },
    { Value: customer },
    { Value: statusText, Criticality: statusCriticality },
    { Value: plannedDate },
    { Value: delayReason }
  ]},

  // Object Page sections
  UI.Facets: [
    { $Type: 'UI.ReferenceFacet', Label: '{i18n>General}',       Target: '@UI.FieldGroup#General' },
    { $Type: 'UI.ReferenceFacet', Label: '{i18n>StatusHistory}', Target: 'statusLog/@UI.LineItem' },
    { $Type: 'UI.ReferenceFacet', Label: '{i18n>Notifications}', Target: 'notifications/@UI.LineItem' }
  ]
);

// Reload the tables after an action, and label the dialog field
annotate service.OrderTracking with actions {
  refreshStatus  @(Common.SideEffects: { TargetEntities: ['in/statusLog'] });
  markDelayed    @(Common.SideEffects: { TargetEntities: ['in/statusLog'] })
                 (reason @title: '{i18n>DelayReason}');
  notifyCustomer @(Common.SideEffects: { TargetEntities: ['in/notifications'] });
};

annotate service.StatusLog with @UI.LineItem: [
  { Value: createdAt },
  { Value: oldStatus, Label: '{i18n>OldStatus}' },
  { Value: newStatus, Label: '{i18n>NewStatus}' },
  { Value: comment,   Label: '{i18n>Comment}' }
];

annotate service.Notifications with @UI.LineItem: [
  { Value: createdAt },
  { Value: message, Label: '{i18n>Message}' },
  { Value: sentOk,  Label: '{i18n>SentOk}' }
];