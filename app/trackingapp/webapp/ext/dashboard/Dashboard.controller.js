sap.ui.define([
  "sap/fe/core/PageController",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/base/Log"
], function (PageController, JSONModel, Filter, FilterOperator, Log) {
  "use strict";

  const DAY = 86400000;
  const STATUS_KEY = {
    Offen: "statusOffen",
    InLieferung: "statusInLieferung",
    Geliefert: "statusGeliefert",
    Verzoegert: "statusVerzoegert"
  };
  // Filter bar fields the KPI tiles follow. status/plannedDate are left out on purpose:
  // the tiles set those themselves, so the other tiles keep their numbers when one is active.
  const FOLLOWED_FIELDS = ["salesOrder", "customer"];
  const OPERATORS = {
    EQ: FilterOperator.EQ, NE: FilterOperator.NE,
    Contains: FilterOperator.Contains, NotContains: FilterOperator.NotContains,
    StartsWith: FilterOperator.StartsWith, EndsWith: FilterOperator.EndsWith,
    BT: FilterOperator.BT
  };

  function pct(n, max) { return max ? Math.round((n / max) * 100) : 0; }

  function goTo(hashPart) {
    const h = window.location.hash;
    const i = h.indexOf("&/");
    window.location.hash = i >= 0 ? h.slice(0, i) + "&/" + hashPart : "#/" + hashPart;
  }

  return PageController.extend("trackingapp.ext.dashboard.Dashboard", {

    onInit: function () {
      PageController.prototype.onInit.apply(this, arguments);
      this._dash = new JSONModel({ attention: [], canCreate: false });
      this.getView().setModel(this._dash, "dash");
      this._uiFilters = [];
      // In onInit the view has no OData model yet (it is only propagated once the
      // view is attached to the app), so load as soon as the model becomes available.
      this.getView().attachModelContextChange(this._init, this);
      this._init();
    },

    onBeforeRendering: function () {
      this._init();
    },

    _model: function () {
      const comp = this.getOwnerComponent && this.getOwnerComponent();
      const model = this.getView().getModel() || (comp && comp.getModel());
      return model && model.bindList ? model : null;
    },

    _text: function (key, args) {
      const i18n = this.getView().getModel("i18n");
      const bundle = i18n && i18n.getResourceBundle();
      return bundle && bundle.getText ? bundle.getText(key, args) : key;
    },

    _init: function () {
      this._load();
      this._loadPermissions();
    },

    // Who may create orders? Asked from the service so Viewers do not see the button.
    _loadPermissions: function () {
      const model = this._model();
      if (!model || this._permRequested) { return; }
      this._permRequested = true;
      model.bindContext("/userPermissions()").requestObject().then((res) => {
        this._dash.setProperty("/canCreate", !!(res && res.canCreate));
      }).catch((e) => {
        this._permRequested = false;
        Log.error("Dashboard: could not read permissions", e);
      });
    },

    _load: function () {
      if (this._loading) { return; }
      const model = this._model();
      if (!model) { return; }
      this._loading = true;
      const filters = [new Filter("IsActiveEntity", FilterOperator.EQ, true)].concat(this._uiFilters);
      const list = model.bindList("/OrderTracking", null, null, filters,
        { $select: "ID,salesOrder,customer,status,plannedDate,delayReason" });
      list.requestContexts(0, 1000).then((ctxs) => {
        const data = this._compute(ctxs.map((c) => c.getObject()));
        data.canCreate = this._dash.getProperty("/canCreate");
        this._dash.setData(data);
      }).catch((e) => {
        Log.error("Dashboard: could not load orders", e);
      }).finally(() => {
        this._loading = false;
      });
    },

    _compute: function (rows) {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const total = rows.length;
      const by = { Offen: 0, InLieferung: 0, Geliefert: 0, Verzoegert: 0 };
      let overdue = 0, due7 = 0;

      rows.forEach((r) => {
        by[r.status] = (by[r.status] || 0) + 1;
        const planned = r.plannedDate ? new Date(r.plannedDate + "T00:00:00") : null;
        if (planned && r.status !== "Geliefert") {
          if (planned < today) { overdue++; }
          else if (planned - today <= 7 * DAY) { due7++; }
        }
      });

      const attention = rows
        .filter((r) => r.status === "Verzoegert" ||
          (r.status !== "Geliefert" && r.plannedDate && new Date(r.plannedDate + "T00:00:00") < today))
        .sort((a, b) => (a.plannedDate || "").localeCompare(b.plannedDate || ""))
        .map((r) => ({
          id: r.ID,
          title: this._text("attentionOrder", [r.salesOrder]),
          date: r.plannedDate || "",
          subtitle: this._text("attentionCustomer", [r.customer || "-"]) +
            (r.delayReason ? " · " + r.delayReason : ""),
          statusText: STATUS_KEY[r.status] ? this._text(STATUS_KEY[r.status]) : r.status,
          state: r.status === "Verzoegert" ? "Error" : "Warning"
        }));

      return {
        total: total,
        deliveredPct: pct(by.Geliefert || 0, total),
        transit: by.InLieferung || 0,
        delayed: by.Verzoegert || 0,
        overdue: overdue,
        overdueColor: overdue > 0 ? "Error" : "Good",
        due7: due7,
        attention: attention
      };
    },

    _filterBar: function () {
      const bb = this.byId("FilterBar");
      return (bb && bb.getContent && bb.getContent()) || bb;
    },

    _currentConditions: function (fb) {
      if (!fb) { return {}; }
      if (fb.getFilterConditions) { return fb.getFilterConditions() || {}; }
      if (fb.getConditions) { return fb.getConditions() || {}; }
      return {};
    },

    // Filter bar "Go": make the KPI tiles follow sales order / customer
    onFilterSearch: function () {
      const conditions = this._currentConditions(this._filterBar());
      const filters = [];
      FOLLOWED_FIELDS.forEach((field) => {
        (conditions[field] || []).forEach((cond) => {
          const op = OPERATORS[cond.operator];
          if (!op || !cond.values || cond.values.length === 0) { return; }
          filters.push(op === FilterOperator.BT
            ? new Filter(field, op, cond.values[0], cond.values[1])
            : new Filter(field, op, cond.values[0]));
        });
      });
      this._uiFilters = filters;
      this._load();
    },

    onAttention: function (oEvent) {
      const pop = this.byId("attentionPopover");
      if (pop.isOpen()) { pop.close(); } else { pop.openBy(oEvent.getSource()); }
    },

    onOpenOrder: function (oEvent) {
      this.byId("attentionPopover").close();
      const id = oEvent.getSource().getBindingContext("dash").getProperty("id");
      goTo("OrderTracking(ID=" + id + ",IsActiveEntity=true)");
    },

    // Clicking a KPI tile filters the table below; clicking it again (or "Total") clears it
    onKpi: function (oEvent) {
      const tile = oEvent.getSource();
      const kpi = tile.getCustomData().find((d) => d.getKey() === "kpi").getValue();
      const fmt = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
        "-" + String(d.getDate()).padStart(2, "0");
      const today = new Date();
      const plus7 = new Date(today.getTime() + 7 * DAY);
      const c = (operator, ...values) => ({ operator, values, validated: "NotValidated" });

      let conditions = {};
      if (kpi === "delivered") { conditions = { status: [c("EQ", "Geliefert")] }; }
      else if (kpi === "transit") { conditions = { status: [c("EQ", "InLieferung")] }; }
      else if (kpi === "delayed") { conditions = { status: [c("EQ", "Verzoegert")] }; }
      else if (kpi === "overdue") {
        conditions = { status: [c("NE", "Geliefert")], plannedDate: [c("LT", fmt(today))] };
      } else if (kpi === "due7") {
        conditions = { status: [c("NE", "Geliefert")], plannedDate: [c("BT", fmt(today), fmt(plus7))] };
      }

      // Same tile again toggles the filter off
      const off = kpi === "all" || this._activeKpi === kpi;
      this._activeKpi = off ? null : kpi;
      this._markActive(tile, !off);

      const fb = this._filterBar();
      if (!fb || !fb.setFilterConditions) {
        Log.error("Dashboard: filter bar not available");
        return;
      }
      // Keep what the user typed (sales order, customer, ...); only replace what tiles control
      const next = Object.assign({}, this._currentConditions(fb));
      delete next.status;
      delete next.plannedDate;
      Object.assign(next, off ? {} : conditions);
      Promise.resolve(fb.setFilterConditions(next)).then(() => {
        if (fb.triggerSearch) { fb.triggerSearch(); }
      });
    },

    _markActive: function (tile, on) {
      tile.getParent().getItems().forEach((t) => t.removeStyleClass("lsTileActive"));
      if (on) { tile.addStyleClass("lsTileActive"); }
    },

    // Creates a new draft order and opens it on the object page
    onCreate: function () {
      const model = this.getView().getModel();
      const ctx = model.bindList("/OrderTracking").create({});
      ctx.created().then(() => ctx.requestProperty("ID")).then((id) => {
        goTo("OrderTracking(ID=" + id + ",IsActiveEntity=false)");
      }).catch((e) => Log.error("Dashboard: could not create order", e));
    },

    onRowPress: function (oEvent) {
      const ctx = oEvent.getParameter("bindingContext") ||
        (oEvent.getParameter("contexts") || [])[0] ||
        (oEvent.getSource().getBindingContext && oEvent.getSource().getBindingContext());
      if (!ctx) { return; }
      goTo("OrderTracking(ID=" + ctx.getProperty("ID") +
        ",IsActiveEntity=" + (ctx.getProperty("IsActiveEntity") !== false) + ")");
    },

    // Called by Fiori elements each time the page is shown (e.g. coming back from an order)
    onPageReady: function () {
      this._load();
    }
  });
});
