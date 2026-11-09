sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"trackingapp/test/integration/pages/OrderTrackingList.gen",
	"trackingapp/test/integration/pages/OrderTrackingObjectPage.gen"
], function (JourneyRunner, OrderTrackingListGenerated, OrderTrackingObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('trackingapp') + '/test/flp.html#app-preview',
        pages: {
			onTheOrderTrackingListGenerated: OrderTrackingListGenerated,
			onTheOrderTrackingObjectPageGenerated: OrderTrackingObjectPageGenerated
        },
        async: true
    });

    return runner;
});

