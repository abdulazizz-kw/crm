(function () {
  "use strict";
  var esc = UI.esc;
  var id = UI.qs("id");

  function render() {
    var inv = CRM.byId(CRM.ws().invoices, id);
    var root = document.getElementById("invoice");
    var actions = document.getElementById("inv-actions");
    if (!inv) {
      document.getElementById("inv-title").textContent = "Invoice not found";
      actions.innerHTML = "";
      root.innerHTML = '<div class="card"><div class="card-body">' + UI.emptyState("mdi-file-question", "This invoice doesn't exist", "It may have been deleted.", '<a class="btn btn-gradient-primary mt-2" href="invoices.html">Back to invoices</a>') + "</div></div>";
      return;
    }
    document.title = inv.number + " · " + UI.APP_NAME;
    document.getElementById("inv-title").innerHTML = esc(inv.number) + " " + UI.badge(inv.status);
    var next = {
      draft: '<button class="btn btn-gradient-info" data-status="sent"><i class="mdi mdi-send"></i> Mark as sent</button>',
      sent: '<button class="btn btn-gradient-success" data-status="paid"><i class="mdi mdi-check"></i> Mark as paid</button>',
      overdue: '<button class="btn btn-gradient-success" data-status="paid"><i class="mdi mdi-check"></i> Mark as paid</button>',
      paid: '<button class="btn btn-light" data-status="sent"><i class="mdi mdi-undo"></i> Mark unpaid</button>',
    }[inv.status];
    actions.innerHTML =
      '<button class="btn btn-light" id="edit"><i class="mdi mdi-pencil"></i> Edit</button>' +
      '<button class="btn btn-light" id="print"><i class="mdi mdi-printer"></i> Print / PDF</button>' +
      next;

    var w = CRM.ws();
    var c = CRM.company(inv.companyId);
    var contact = c
      ? w.contacts.filter(function (p) {
          return p.companyId === c.id;
        })[0]
      : null;
    var t = CRM.invoiceTotal(inv);
    root.innerHTML =
      '<div class="crm-invoice"><div class="card"><div class="card-body">' +
      '<div class="d-flex justify-content-between flex-wrap gap-3 mb-5"><div><div class="crm-brand mb-2"><img src="assets/images/logo-mini.svg" alt=""><span>' +
      esc(w.workspace.name) +
      '</span></div><div class="crm-muted crm-small">' +
      esc(CRM.me().email) +
      '</div></div><div class="text-md-end"><h2 class="mb-1">Invoice</h2><div class="crm-muted">' +
      esc(inv.number) +
      "</div></div></div>" +
      '<div class="row mb-5"><div class="col-sm-6 mb-3"><div class="crm-muted crm-small mb-1">Bill to</div><div class="fw-bold">' +
      esc(c ? c.name : "Deleted customer") +
      "</div>" +
      (contact ? "<div>" + esc(contact.name) + '</div><div class="crm-muted crm-small">' + esc(contact.email) + "</div>" : "") +
      (c && c.city ? '<div class="crm-muted crm-small">' + esc(c.city) + ", Kuwait</div>" : "") +
      '</div><div class="col-sm-6 text-sm-end"><div><span class="crm-muted">Issued</span> ' +
      UI.date(inv.issuedAt) +
      '</div><div><span class="crm-muted">Due</span> <span class="' +
      (inv.status === "overdue" ? "text-danger fw-bold" : "") +
      '">' +
      UI.date(inv.dueAt) +
      "</span></div></div></div>" +
      '<div class="table-responsive"><table class="table"><thead><tr><th>Description</th><th class="text-end">Qty</th><th class="text-end">Unit price</th><th class="text-end">Amount</th></tr></thead><tbody>' +
      inv.items
        .map(function (it) {
          return "<tr><td>" + esc(it.description) + '</td><td class="text-end">' + it.quantity + '</td><td class="text-end">' + UI.money(it.unitPrice) + '</td><td class="text-end">' + UI.money(it.quantity * it.unitPrice) + "</td></tr>";
        })
        .join("") +
      "</tbody></table></div>" +
      '<div class="totals mt-4"><div><span class="crm-muted">Subtotal</span><span>' +
      UI.money(t.subtotal) +
      "</span></div>" +
      (inv.taxRate ? '<div><span class="crm-muted">Tax (' + Math.round(inv.taxRate * 10000) / 100 + '%)</span><span>' + UI.money(t.tax) + "</span></div>" : "") +
      '<div class="grand"><span>Total</span><span>' +
      UI.money(t.total) +
      "</span></div></div>" +
      (inv.notes ? '<p class="crm-muted mt-5 mb-0">' + esc(inv.notes) + "</p>" : "") +
      "</div></div>" +
      '<div class="text-end mt-3 no-print"><button class="btn btn-link text-danger" id="delete"><i class="mdi mdi-delete-outline"></i> Delete invoice</button></div></div>';
  }

  document.addEventListener("click", function (e) {
    var inv = CRM.byId(CRM.ws().invoices, id);
    if (!inv) return;
    var st = e.target.closest("[data-status]");
    if (st) {
      var status = st.getAttribute("data-status");
      CRM.updateInvoice(id, { status: status });
      if (status === "paid") CRM.addActivity("note", inv.number + " was paid", { companyId: inv.companyId });
      UI.toast(status === "paid" ? "Marked as paid" : "Marked as sent");
      render();
      UI.renderNotifications();
    }
    if (e.target.closest("#print")) window.print();
    if (e.target.closest("#edit")) InvoiceForm.open(inv);
    if (e.target.closest("#delete") && confirm("Delete " + inv.number + "?")) {
      CRM.deleteInvoice(id);
      location.href = "invoices.html";
    }
  });
  document.addEventListener("crm:data", render);
  render();
})();
