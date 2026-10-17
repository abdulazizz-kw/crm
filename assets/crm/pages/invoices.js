(function () {
  "use strict";
  var esc = UI.esc;
  var f = { status: "", text: "" };

  function render() {
    var w = CRM.ws();
    var sum = function (st) {
      return w.invoices
        .filter(function (i) {
          return st.indexOf(i.status) !== -1;
        })
        .reduce(function (s, i) {
          return s + CRM.invoiceTotal(i).total;
        }, 0);
    };
    var cnt = function (st) {
      return w.invoices.filter(function (i) {
        return i.status === st;
      }).length;
    };
    var cards = [
      { tone: "bg-gradient-success", icon: "mdi-check-circle-outline", label: "Paid", value: UI.count(sum(["paid"]), "whole"), sub: cnt("paid") + " invoices" },
      { tone: "bg-gradient-info", icon: "mdi-send", label: "Waiting for payment", value: UI.count(sum(["sent"]), "whole"), sub: cnt("sent") + " sent" },
      { tone: "bg-gradient-danger", icon: "mdi-alert-outline", label: "Overdue", value: UI.count(sum(["overdue"]), "whole"), sub: cnt("overdue") + " overdue" },
      { tone: "bg-gradient-primary", icon: "mdi-pencil", label: "Drafts", value: UI.count(sum(["draft"]), "whole"), sub: cnt("draft") + " not sent yet" },
    ];
    document.getElementById("inv-stats").innerHTML = cards
      .map(function (c) {
        return (
          '<div class="col-xl-3 col-sm-6 grid-margin stretch-card"><div class="card"><div class="card-body crm-mini-stat"><span class="icon ' +
          c.tone +
          '"><i class="mdi ' +
          c.icon +
          '"></i></span><div><div class="label">' +
          c.label +
          '</div><div class="value">' +
          c.value +
          '</div><div class="crm-muted crm-small">' +
          esc(c.sub) +
          "</div></div></div></div></div>"
        );
      })
      .join("");

    var list = w.invoices
      .filter(function (i) {
        if (f.status && i.status !== f.status) return false;
        if (f.text) {
          var c = CRM.company(i.companyId);
          if ((i.number + " " + (c ? c.name : "")).toLowerCase().indexOf(f.text) === -1) return false;
        }
        return true;
      })
      .sort(function (a, b) {
        return b.issuedAt.localeCompare(a.issuedAt);
      });
    var el = document.getElementById("inv-table");
    if (!w.invoices.length) {
      el.innerHTML = UI.emptyState("mdi-file-document-outline", "No invoices yet", "Create one from a won deal, or from scratch.", '<button class="btn btn-gradient-primary mt-2" data-new>New invoice</button>');
      return;
    }
    if (!list.length) {
      el.innerHTML = UI.emptyState("mdi-magnify", "No invoices match", "Try another filter.");
      return;
    }
    el.innerHTML =
      '<table class="table"><thead><tr><th>Invoice</th><th>Customer</th><th>Issued</th><th>Due</th><th>Status</th><th class="text-end">Amount</th></tr></thead><tbody>' +
      list
        .map(function (i) {
          var c = CRM.company(i.companyId);
          return (
            '<tr data-href="invoice.html?id=' +
            i.id +
            '"><td><a class="crm-link fw-bold" href="invoice.html?id=' +
            i.id +
            '">' +
            esc(i.number) +
            "</a></td><td>" +
            (c ? '<div class="crm-row">' + UI.companyLogo(c, 28) + "<span>" + esc(c.name) + "</span></div>" : '<span class="crm-muted">Deleted customer</span>') +
            '</td><td class="crm-muted">' +
            UI.date(i.issuedAt) +
            '</td><td class="' +
            (i.status === "overdue" ? "text-danger" : "crm-muted") +
            '">' +
            UI.date(i.dueAt) +
            "</td><td>" +
            UI.badge(i.status) +
            '</td><td class="text-end fw-bold">' +
            UI.money(CRM.invoiceTotal(i).total) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  document.getElementById("f-status").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    f.status = b.getAttribute("data-s");
    this.querySelectorAll("button").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    render();
  });
  document.getElementById("f-text").addEventListener("input", function () {
    f.text = this.value.trim().toLowerCase();
    render();
  });
  document.getElementById("new-invoice").addEventListener("click", function () {
    InvoiceForm.open();
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-new]")) InvoiceForm.open();
    var tr = e.target.closest("tr[data-href]");
    if (tr && !e.target.closest("a")) UI.go(tr.getAttribute("data-href"));
  });
  document.addEventListener("crm:data", render);
  render();
  var forCompany = UI.qs("new");
  if (forCompany) InvoiceForm.open(null, { companyId: forCompany });
})();
