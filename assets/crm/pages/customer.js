(function () {
  "use strict";
  var esc = UI.esc;
  var id = UI.qs("id");
  var KIND_ICON = { call: "mdi-phone", email: "mdi-email-outline", meeting: "mdi-account-group", note: "mdi-note-text", stage: "mdi-swap-horizontal" };
  var KIND_BG = { call: "bg-gradient-info", email: "bg-gradient-primary", meeting: "bg-gradient-success", note: "bg-gradient-warning", stage: "bg-gradient-danger" };

  function render() {
    var c = CRM.company(id);
    var root = document.getElementById("customer");
    if (!c) {
      document.getElementById("cust-title").textContent = "Customer not found";
      document.querySelector(".crm-actions").classList.add("d-none");
      root.innerHTML = '<div class="card"><div class="card-body">' + UI.emptyState("mdi-account-question", "This customer doesn't exist", "It may have been deleted, or it belongs to another workspace.", '<a class="btn btn-gradient-primary mt-2" href="customers.html">Back to customers</a>') + "</div></div>";
      return;
    }
    document.title = c.name + " · " + UI.APP_NAME;
    document.getElementById("cust-title").textContent = c.name;
    var w = CRM.ws();
    var owner = CRM.member(c.ownerId);
    var contacts = w.contacts.filter(function (p) {
      return p.companyId === c.id;
    });
    var deals = w.deals
      .filter(function (d) {
        return d.companyId === c.id;
      })
      .sort(function (a, b) {
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    var invoices = w.invoices.filter(function (i) {
      return i.companyId === c.id;
    });
    var acts = w.activities.filter(function (a) {
      return a.companyId === c.id;
    });
    var now = new Date().toISOString();
    var upcoming = w.events
      .filter(function (e) {
        return e.companyId === c.id && e.start >= now;
      })
      .sort(function (a, b) {
        return a.start.localeCompare(b.start);
      });
    var won = 0,
      open = 0;
    deals.forEach(function (d) {
      var k = CRM.stageOf(d).kind;
      if (k === "won") won += d.value;
      if (k === "open") open += d.value;
    });
    var owed = invoices
      .filter(function (i) {
        return i.status === "sent" || i.status === "overdue";
      })
      .reduce(function (s, i) {
        return s + CRM.invoiceTotal(i).total;
      }, 0);

    var header =
      '<div class="card mb-4"><div class="card-body"><div class="crm-row flex-wrap">' +
      UI.companyLogo(c, 64) +
      '<div class="grow"><h3 class="mb-1">' +
      esc(c.name) +
      " " +
      UI.badge(c.status) +
      '</h3><div class="crm-muted">' +
      [c.industry, c.city].filter(Boolean).map(esc).join(" · ") +
      (c.website ? ' · <a href="https://' + esc(c.website.replace(/^https?:\/\//, "")) + '" target="_blank" rel="noopener">' + esc(c.website) + "</a>" : "") +
      "</div><div class=\"mt-2\">" +
      c.tags
        .map(function (t) {
          return '<span class="crm-chip">' + esc(t) + "</span>";
        })
        .join("") +
      '</div></div><div class="d-flex gap-4 flex-wrap">' +
      [
        ["Lifetime value", UI.count(won)],
        ["Open deals", UI.count(open)],
        ["Owed to you", UI.count(owed)],
      ]
        .map(function (s) {
          return '<div><div class="crm-muted crm-small">' + s[0] + '</div><div class="fs-5 fw-bold">' + s[1] + "</div></div>";
        })
        .join("") +
      "</div></div></div></div>";

    var left =
      '<div class="card mb-4"><div class="card-body"><h4 class="card-title">Details</h4><dl class="row mb-0 crm-small">' +
      [
        ["Account owner", owner ? UI.avatar(owner, 22) + " " + esc(owner.name) : "None"],
        ["Industry", esc(c.industry || "None")],
        ["City", esc(c.city || "None")],
        ["Customer since", UI.date(c.createdAt)],
      ]
        .map(function (r) {
          return '<dt class="col-sm-5 crm-muted fw-normal mb-2">' + r[0] + '</dt><dd class="col-sm-7 mb-2">' + r[1] + "</dd>";
        })
        .join("") +
      "</dl></div></div>" +
      '<div class="card mb-4"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="card-title mb-0">Contacts</h4><button class="btn btn-sm btn-inverse-primary" id="add-contact"><i class="mdi mdi-plus"></i> Add</button></div>' +
      (contacts.length
        ? contacts
            .map(function (p) {
              return (
                '<div class="crm-row mb-3">' +
                UI.avatar({ name: p.name, color: "#9a55ff" }, 36) +
                '<div class="grow" style="min-width:0"><div class="fw-bold">' +
                esc(p.name) +
                '</div><div class="crm-muted crm-small">' +
                esc(p.title || "") +
                '</div><div class="crm-small">' +
                (p.email ? '<a class="crm-contact-line" href="mailto:' + esc(p.email) + '"><i class="mdi mdi-email-outline"></i> ' + esc(p.email) + "</a>" : "") +
                (p.phone ? '<a class="crm-contact-line" href="tel:' + esc(p.phone.replace(/\s/g, "")) + '"><i class="mdi mdi-phone"></i> ' + esc(p.phone) + "</a>" : "") +
                '</div></div><button class="btn btn-sm btn-link text-muted" data-del-contact="' +
                p.id +
                '" title="Remove contact"><i class="mdi mdi-close"></i></button></div>'
              );
            })
            .join("")
        : '<p class="crm-muted mb-0">No contacts yet.</p>') +
      "</div></div>" +
      '<div class="card mb-4"><div class="card-body"><h4 class="card-title">Upcoming</h4>' +
      (upcoming.length
        ? upcoming
            .slice(0, 4)
            .map(function (e) {
              return '<div class="crm-agenda-item"><div class="when">' + UI.date(e.start, false) + "<br>" + UI.time(e.start) + '</div><div class="kind bg-gradient-primary"></div><div>' + esc(e.title) + "</div></div>";
            })
            .join("")
        : '<p class="crm-muted mb-2">Nothing scheduled.</p>') +
      '<a class="btn btn-sm btn-inverse-primary mt-2" href="schedule.html?company=' +
      c.id +
      '"><i class="mdi mdi-calendar-plus"></i> Schedule something</a></div></div>' +
      '<button class="btn btn-outline-danger btn-sm" id="delete-customer"><i class="mdi mdi-delete-outline"></i> Delete customer</button>';

    var dealRows = deals.length
      ? '<div class="table-responsive"><table class="table mb-0"><thead><tr><th>Deal</th><th>Stage</th><th class="text-end">Value</th><th>Close</th></tr></thead><tbody>' +
        deals
          .map(function (d) {
            var s = CRM.stageOf(d);
            return '<tr data-href="pipeline.html?deal=' + d.id + '"><td>' + esc(d.title) + "</td><td>" + UI.badge(s.kind, s.name) + '</td><td class="text-end">' + UI.money(d.value) + '</td><td class="crm-muted crm-small">' + UI.date(d.expectedClose) + "</td></tr>";
          })
          .join("") +
        "</tbody></table></div>"
      : '<p class="crm-muted mb-0">No deals yet.</p>';

    var invRows = invoices.length
      ? invoices
          .map(function (i) {
            return '<div class="crm-row mb-2"><a class="grow crm-link" href="invoice.html?id=' + i.id + '">' + esc(i.number) + ' <span class="crm-muted crm-small">· ' + UI.date(i.issuedAt) + "</span></a>" + UI.badge(i.status) + '<span class="fw-bold">' + UI.money(CRM.invoiceTotal(i).total) + "</span></div>";
          })
          .join("")
      : '<p class="crm-muted mb-0">No invoices yet.</p>';

    var right =
      '<div class="card mb-4"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="card-title mb-0">Deals</h4><button class="btn btn-sm btn-inverse-primary" data-crm-new-deal data-company="' +
      c.id +
      '"><i class="mdi mdi-plus"></i> New deal</button></div>' +
      dealRows +
      "</div></div>" +
      '<div class="card mb-4"><div class="card-body"><h4 class="card-title">Activity</h4>' +
      '<form id="log-form" class="mb-4"><div class="input-group"><select class="form-select" name="kind" style="max-width:130px"><option value="note">Note</option><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option></select><input class="form-control" name="body" placeholder="What happened?" required><button class="btn btn-gradient-primary">Log</button></div></form>' +
      '<ul class="crm-timeline">' +
      (acts.length
        ? acts
            .slice(0, 12)
            .map(function (a) {
              var m = CRM.member(a.memberId);
              return '<li><span class="dot ' + KIND_BG[a.kind] + '"><i class="mdi ' + KIND_ICON[a.kind] + '"></i></span><div class="body">' + esc(a.body) + '</div><div class="meta">' + UI.cap(a.kind) + " · " + esc(m ? m.name : "") + " · " + UI.ago(a.at) + "</div></li>";
            })
            .join("")
        : '<li class="crm-muted ps-0">No activity yet.</li>') +
      "</ul></div></div>" +
      '<div class="card mb-4"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h4 class="card-title mb-0">Invoices</h4><a class="btn btn-sm btn-inverse-primary" href="invoices.html?new=' +
      c.id +
      '"><i class="mdi mdi-plus"></i> New invoice</a></div>' +
      invRows +
      "</div></div>";

    root.innerHTML = header + '<div class="row"><div class="col-lg-4">' + left + '</div><div class="col-lg-8">' + right + "</div></div>";
  }

  document.getElementById("customer").addEventListener("submit", function (e) {
    if (e.target.id !== "log-form") return;
    e.preventDefault();
    var fd = new FormData(e.target);
    var body = String(fd.get("body") || "").trim();
    if (!body) return;
    CRM.addActivity(fd.get("kind"), body, { companyId: id });
    UI.toast("Activity logged");
    render();
  });
  document.getElementById("customer").addEventListener("click", function (e) {
    var del = e.target.closest("[data-del-contact]");
    if (del) {
      var contactId = del.getAttribute("data-del-contact");
      UI.confirmAction({
        title: "Remove " + CRM.contact(contactId).name + "?",
        message: "The contact is removed from this customer.",
        confirmLabel: "Remove",
        onConfirm: function () {
          CRM.deleteContact(contactId);
          render();
        },
      });
    }
    if (e.target.closest("#add-contact")) {
      UI.formModal({
        title: "Add contact",
        submit: "Add contact",
        fields: [
          { name: "name", label: "Name", required: true, col: "col-md-6" },
          { name: "title", label: "Job title", col: "col-md-6" },
          { name: "email", label: "Email", type: "email", col: "col-md-6" },
          { name: "phone", label: "Phone", col: "col-md-6" },
        ],
        onSubmit: function (d) {
          CRM.addContact({ companyId: id, name: d.name.trim(), title: d.title.trim(), email: d.email.trim(), phone: d.phone.trim() });
          UI.toast("Contact added");
          render();
        },
      });
    }
    if (e.target.closest("#delete-customer"))
      UI.confirmAction({
        title: "Delete " + CRM.company(id).name + "?",
        message: "This deletes the customer with all its contacts and deals. It can't be undone.",
        confirmLabel: "Delete customer",
        onConfirm: function () {
          CRM.deleteCompany(id);
          location.href = "customers.html";
        },
      });
    var tr = e.target.closest("tr[data-href]");
    if (tr) UI.go(tr.getAttribute("data-href"));
  });
  document.getElementById("edit-customer").addEventListener("click", function () {
    UI.openCompanyForm(CRM.company(id));
  });
  document.getElementById("new-deal").addEventListener("click", function () {
    UI.openDealForm(null, { companyId: id });
  });
  document.addEventListener("crm:data", render);
  render();
})();
