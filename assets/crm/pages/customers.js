(function () {
  "use strict";
  var esc = UI.esc;
  var f = { text: "", status: "", owner: "", sort: "name" };

  var ownerSel = document.getElementById("f-owner");
  CRM.ws().members.forEach(function (m) {
    ownerSel.insertAdjacentHTML("beforeend", '<option value="' + esc(m.id) + '">' + esc(m.name) + "</option>");
  });

  function rows() {
    var w = CRM.ws();
    return w.companies.map(function (c) {
      var deals = w.deals.filter(function (d) {
        return d.companyId === c.id;
      });
      var open = 0;
      var won = 0;
      deals.forEach(function (d) {
        var k = CRM.stageOf(d).kind;
        if (k === "open") open += d.value;
        if (k === "won") won += d.value;
      });
      var contacts = w.contacts.filter(function (p) {
        return p.companyId === c.id;
      });
      var last = w.activities.filter(function (a) {
        return a.companyId === c.id;
      })[0];
      return { c: c, open: open, won: won, contact: contacts[0], contacts: contacts, last: last ? last.at : c.createdAt };
    });
  }

  function stats(all) {
    var count = function (s) {
      return all.filter(function (r) {
        return r.c.status === s;
      }).length;
    };
    var ltv = all.reduce(function (s, r) {
      return s + r.won;
    }, 0);
    var items = [
      { icon: "mdi-domain", tone: "bg-gradient-primary", label: "Customers", value: all.length },
      { icon: "mdi-check-decagram", tone: "bg-gradient-success", label: "Active", value: count("active") },
      { icon: "mdi-account-plus", tone: "bg-gradient-info", label: "Leads", value: count("lead") },
      { icon: "mdi-cash-multiple", tone: "bg-gradient-danger", label: "Revenue won", value: UI.money(ltv, { whole: true }) },
    ];
    document.getElementById("cust-stats").innerHTML = items
      .map(function (i) {
        return (
          '<div class="col-xl-3 col-sm-6 grid-margin stretch-card"><div class="card"><div class="card-body crm-mini-stat"><span class="icon ' +
          i.tone +
          '"><i class="mdi ' +
          i.icon +
          '"></i></span><div><div class="label">' +
          i.label +
          '</div><div class="value">' +
          esc(i.value) +
          "</div></div></div></div></div>"
        );
      })
      .join("");
  }

  function render() {
    var all = rows();
    stats(all);
    var list = all.filter(function (r) {
      if (f.status && r.c.status !== f.status) return false;
      if (f.owner && r.c.ownerId !== f.owner) return false;
      if (f.text) {
        var hay = [r.c.name, r.c.industry, r.c.city, r.c.tags.join(" ")]
          .concat(
            r.contacts.map(function (p) {
              return p.name + " " + p.email;
            }),
          )
          .join(" ")
          .toLowerCase();
        if (hay.indexOf(f.text) === -1) return false;
      }
      return true;
    });
    list.sort(function (a, b) {
      if (f.sort === "value") return b.won - a.won;
      if (f.sort === "open") return b.open - a.open;
      if (f.sort === "recent") return b.last.localeCompare(a.last);
      return a.c.name.localeCompare(b.c.name);
    });
    var el = document.getElementById("cust-table");
    if (!all.length) {
      el.innerHTML = UI.emptyState("mdi-account-group-outline", "No customers yet", "Add your first customer to start tracking deals.", '<button class="btn btn-gradient-primary mt-2" data-add-first>Add customer</button>');
      return;
    }
    if (!list.length) {
      el.innerHTML = UI.emptyState("mdi-magnify", "No matches", "Try a different search or clear the filters.");
      return;
    }
    el.innerHTML =
      '<table class="table"><thead><tr><th>Customer</th><th>Main contact</th><th>Status</th><th>Owner</th><th class="text-end">Open deals</th><th class="text-end">Lifetime value</th><th>Last activity</th></tr></thead><tbody>' +
      list
        .map(function (r) {
          return (
            '<tr data-href="customer.html?id=' +
            r.c.id +
            '"><td><div class="crm-row">' +
            UI.companyLogo(r.c, 36) +
            '<div class="grow"><a class="crm-link fw-bold" href="customer.html?id=' +
            r.c.id +
            '">' +
            esc(r.c.name) +
            '</a><div class="crm-muted crm-small">' +
            esc(r.c.industry) +
            (r.c.city ? " · " + esc(r.c.city) : "") +
            "</div></div></div></td><td>" +
            (r.contact ? esc(r.contact.name) + '<div class="crm-muted crm-small">' + esc(r.contact.email) + "</div>" : '<span class="crm-muted">None</span>') +
            "</td><td>" +
            UI.badge(r.c.status) +
            "</td><td>" +
            UI.avatar(CRM.member(r.c.ownerId), 28) +
            '</td><td class="text-end">' +
            (r.open ? UI.money(r.open) : '<span class="crm-muted">None</span>') +
            '</td><td class="text-end">' +
            UI.money(r.won) +
            '</td><td class="crm-muted crm-small">' +
            UI.ago(r.last) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  function exportCsv() {
    var lines = [["Customer", "Industry", "City", "Website", "Status", "Owner", "Contact", "Email", "Phone", "Open deals", "Lifetime value"]];
    rows().forEach(function (r) {
      var o = CRM.member(r.c.ownerId);
      lines.push([r.c.name, r.c.industry, r.c.city, r.c.website, r.c.status, o ? o.name : "", r.contact ? r.contact.name : "", r.contact ? r.contact.email : "", r.contact ? r.contact.phone : "", r.open, r.won]);
    });
    var csv = lines
      .map(function (l) {
        return l
          .map(function (v) {
            return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");
    UI.downloadFile("customers.csv", csv, "text/csv");
  }

  document.getElementById("f-text").addEventListener("input", function () {
    f.text = this.value.trim().toLowerCase();
    render();
  });
  ["status", "owner", "sort"].forEach(function (k) {
    document.getElementById("f-" + k).addEventListener("change", function () {
      f[k] = this.value;
      render();
    });
  });
  document.getElementById("add-customer").addEventListener("click", function () {
    UI.openCompanyForm();
  });
  document.getElementById("export-csv").addEventListener("click", exportCsv);
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-add-first]")) UI.openCompanyForm();
    var tr = e.target.closest("tr[data-href]");
    if (tr && !e.target.closest("a")) location.href = tr.getAttribute("data-href");
  });
  document.addEventListener("crm:company-added", function (e) {
    location.href = "customer.html?id=" + e.detail;
  });
  document.addEventListener("crm:data", render);
  render();
})();
