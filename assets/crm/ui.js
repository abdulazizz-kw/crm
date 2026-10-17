/*
 * Shared UI for every CRM page: navbar, sidebar, footer, formatting helpers,
 * modals and toasts. Runs before PurpleAdmin's misc.js so the injected markup
 * gets the template's sidebar behaviour.
 */
(function (global) {
  "use strict";

  var APP_NAME = "Purple CRM";

  var NAV = [
    { href: "index.html", label: "Overview", icon: "mdi-view-dashboard-outline" },
    { href: "pipeline.html", label: "Pipeline", icon: "mdi-view-column" },
    { href: "customers.html", label: "Customers", icon: "mdi-account-group-outline", also: ["customer.html"] },
    { href: "schedule.html", label: "Schedule", icon: "mdi-calendar-month-outline" },
    { href: "invoices.html", label: "Invoices", icon: "mdi-file-document-outline", also: ["invoice.html"] },
    { href: "team.html", label: "Team", icon: "mdi-account-star" },
    { href: "settings.html", label: "Settings", icon: "mdi-settings" },
  ];

  // ---------- formatting ----------

  var DIGITS = { KWD: 3, BHD: 3, OMR: 3, JOD: 3 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function money(v, opts) {
    opts = opts || {};
    var cur = CRM.ws().workspace.currency || "KWD";
    var d = opts.compact || opts.whole ? 0 : DIGITS[cur] != null ? DIGITS[cur] : 2;
    try {
      return new Intl.NumberFormat("en", {
        style: "currency",
        currency: cur,
        notation: opts.compact ? "compact" : "standard",
        minimumFractionDigits: d,
        maximumFractionDigits: opts.compact ? 1 : d,
      }).format(v || 0);
    } catch (err) {
      return cur + " " + Number(v || 0).toFixed(d);
    }
  }

  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function date(iso, withYear) {
    if (!iso) return "";
    var d = new Date(iso);
    return d.getDate() + " " + MONTHS[d.getMonth()] + (withYear === false ? "" : " " + d.getFullYear());
  }

  function time(iso) {
    var d = new Date(iso);
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }

  function ago(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    var future = s < 0;
    s = Math.abs(s);
    var out =
      s < 60 ? "just now" : s < 3600 ? Math.round(s / 60) + "m" : s < 86400 ? Math.round(s / 3600) + "h" : Math.round(s / 86400) + "d";
    if (out === "just now") return out;
    return future ? "in " + out : out + " ago";
  }

  function toInputDate(iso) {
    var d = iso ? new Date(iso) : new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function fromInputDate(v) {
    var p = v.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2], 12).toISOString();
  }

  function initials(name) {
    return String(name || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (p) {
        return p[0].toUpperCase();
      })
      .join("");
  }

  function avatar(member, size) {
    if (!member) return "";
    size = size || 32;
    return (
      '<span class="crm-avatar" title="' +
      esc(member.name) +
      '" style="width:' +
      size +
      "px;height:" +
      size +
      "px;font-size:" +
      Math.round(size * 0.38) +
      "px;background:" +
      esc(member.color) +
      '">' +
      esc(initials(member.name)) +
      "</span>"
    );
  }

  function companyLogo(company, size) {
    size = size || 36;
    var hue = 0;
    for (var i = 0; i < company.name.length; i++) hue = (hue * 31 + company.name.charCodeAt(i)) % 360;
    return (
      '<span class="crm-logo" style="width:' +
      size +
      "px;height:" +
      size +
      "px;font-size:" +
      Math.round(size * 0.36) +
      "px;--h:" +
      hue +
      '">' +
      esc(initials(company.name)) +
      "</span>"
    );
  }

  var STATUS_BADGE = {
    lead: "badge-gradient-info",
    active: "badge-gradient-success",
    churned: "badge-gradient-danger",
    paid: "badge-gradient-success",
    sent: "badge-gradient-info",
    draft: "badge-gradient-secondary",
    overdue: "badge-gradient-danger",
    open: "badge-gradient-primary",
    won: "badge-gradient-success",
    lost: "badge-gradient-danger",
  };

  function badge(status, label) {
    return '<span class="badge ' + (STATUS_BADGE[status] || "badge-gradient-secondary") + '">' + esc(label || cap(status)) + "</span>";
  }

  function cap(s) {
    s = String(s || "");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function qs(name) {
    return new URLSearchParams(location.search).get(name);
  }

  // ---------- layout ----------

  function currentPage() {
    var p = location.pathname.split("/").pop();
    return p || "index.html";
  }

  function navbarHtml() {
    var me = CRM.me();
    return (
      '<nav class="navbar default-layout-navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">' +
      '<div class="text-center navbar-brand-wrapper d-flex align-items-center justify-content-center">' +
      '<a class="navbar-brand brand-logo crm-brand" href="index.html"><img src="assets/images/logo-mini.svg" alt="" /><span>' +
      esc(APP_NAME) +
      "</span></a>" +
      '<a class="navbar-brand brand-logo-mini" href="index.html"><img src="assets/images/logo-mini.svg" alt="' +
      esc(APP_NAME) +
      '" /></a>' +
      "</div>" +
      '<div class="navbar-menu-wrapper d-flex align-items-stretch">' +
      '<button class="navbar-toggler align-self-center" type="button" data-toggle="minimize" aria-label="Collapse sidebar"><span class="mdi mdi-menu"></span></button>' +
      '<div class="search-field d-none d-md-block crm-search">' +
      '<form class="d-flex align-items-center h-100" action="#" onsubmit="return false">' +
      '<div class="input-group"><div class="input-group-prepend bg-transparent"><i class="input-group-text border-0 mdi mdi-magnify"></i></div>' +
      '<input id="crm-search" type="text" autocomplete="off" class="form-control bg-transparent border-0" placeholder="Search customers, deals, invoices…  ( / )">' +
      "</div></form>" +
      '<div class="crm-search-results dropdown-menu" id="crm-search-results"></div>' +
      "</div>" +
      '<ul class="navbar-nav navbar-nav-right">' +
      '<li class="nav-item d-none d-sm-flex"><button class="btn btn-sm btn-gradient-primary crm-quick-deal" data-crm-new-deal><i class="mdi mdi-plus"></i> New deal</button></li>' +
      '<li class="nav-item"><a class="nav-link" href="#" id="crm-theme-toggle" title="Switch light/dark"><i class="mdi ' +
      (CRM.state.theme === "dark" ? "mdi-weather-sunny" : "mdi-weather-night") +
      '"></i></a></li>' +
      '<li class="nav-item dropdown">' +
      '<a class="nav-link count-indicator dropdown-toggle" id="notificationDropdown" href="#" data-bs-toggle="dropdown" aria-label="Notifications"><i class="mdi mdi-bell-outline"></i><span class="count-symbol bg-danger d-none" id="crm-notif-dot"></span></a>' +
      '<div class="dropdown-menu dropdown-menu-end navbar-dropdown preview-list crm-notifs" aria-labelledby="notificationDropdown" id="crm-notifs"></div>' +
      "</li>" +
      '<li class="nav-item nav-profile dropdown">' +
      '<a class="nav-link dropdown-toggle" id="profileDropdown" href="#" data-bs-toggle="dropdown" aria-expanded="false">' +
      '<div class="nav-profile-img">' +
      avatar(me, 32) +
      '<span class="availability-status online"></span></div>' +
      '<div class="nav-profile-text"><p class="mb-0 text-black">' +
      esc(CRM.ws().workspace.name) +
      "</p></div></a>" +
      '<div class="dropdown-menu dropdown-menu-end navbar-dropdown crm-ws-menu" aria-labelledby="profileDropdown" id="crm-ws-menu"></div>' +
      "</li>" +
      "</ul>" +
      '<button class="navbar-toggler navbar-toggler-right d-lg-none align-self-center" type="button" data-toggle="offcanvas" aria-label="Menu"><span class="mdi mdi-menu"></span></button>' +
      "</div></nav>"
    );
  }

  function sidebarHtml() {
    var me = CRM.me();
    var page = currentPage();
    var stale = CRM.staleDeals().length;
    var items = NAV.map(function (n) {
      var active = n.href === page || (n.also && n.also.indexOf(page) !== -1);
      var count = n.href === "pipeline.html" && stale ? '<span class="crm-nav-count" title="Deals needing attention">' + stale + "</span>" : "";
      return (
        '<li class="nav-item' +
        (active ? " active" : "") +
        '"><a class="nav-link" href="' +
        n.href +
        '"><span class="menu-title">' +
        n.label +
        "</span>" +
        count +
        '<i class="mdi ' +
        n.icon +
        ' menu-icon"></i></a></li>'
      );
    }).join("");
    return (
      '<nav class="sidebar sidebar-offcanvas" id="sidebar"><ul class="nav">' +
      '<li class="nav-item nav-profile"><a href="team.html" class="nav-link">' +
      '<div class="nav-profile-image">' +
      avatar(me, 44) +
      '<span class="login-status online"></span></div>' +
      '<div class="nav-profile-text d-flex flex-column"><span class="font-weight-bold mb-2">' +
      esc(me.name) +
      '</span><span class="text-secondary text-small">' +
      esc(me.title) +
      "</span></div>" +
      '<i class="mdi mdi-bookmark-check text-success nav-profile-badge"></i></a></li>' +
      items +
      '<li class="nav-item sidebar-actions"><span class="nav-link">' +
      '<button class="btn btn-block btn-lg btn-gradient-primary mt-4 w-100" data-crm-new-deal>+ Add a deal</button>' +
      '<div class="mt-4"><div class="border-bottom"><p class="text-secondary">Pipeline stages</p></div>' +
      '<ul class="gradient-bullet-list mt-4">' +
      CRM.ws()
        .stages.filter(function (s) {
          return s.kind === "open";
        })
        .map(function (s) {
          return "<li>" + esc(s.name) + "</li>";
        })
        .join("") +
      "</ul></div></span></li>" +
      "</ul></nav>"
    );
  }

  function footerHtml() {
    return (
      '<footer class="footer"><div class="container-fluid d-flex justify-content-between flex-wrap gap-2">' +
      '<span class="text-muted d-block text-center text-sm-start d-sm-inline-block">' +
      esc(APP_NAME) +
      " · " +
      esc(CRM.ws().workspace.name) +
      "</span>" +
      '<span class="text-muted">Built on the free PurpleAdmin template (MIT)</span>' +
      "</div></footer>"
    );
  }

  function replace(id, html) {
    var el = document.getElementById(id);
    if (el) el.outerHTML = html;
  }

  function mountLayout() {
    replace("crm-navbar", navbarHtml());
    replace("crm-sidebar", sidebarHtml());
    replace("crm-footer", footerHtml());
    document.body.insertAdjacentHTML("beforeend", '<div class="crm-toasts" id="crm-toasts" aria-live="polite"></div>');
    wireNavbar();
    renderNotifications();
    renderWorkspaceMenu();
  }

  // ---------- navbar behaviour ----------

  function wireNavbar() {
    var toggle = document.getElementById("crm-theme-toggle");
    if (toggle)
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        var next = CRM.state.theme === "dark" ? "light" : "dark";
        CRM.setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        toggle.querySelector("i").className = "mdi " + (next === "dark" ? "mdi-weather-sunny" : "mdi-weather-night");
        document.dispatchEvent(new Event("crm:theme"));
      });

    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-crm-new-deal]");
      if (t) {
        e.preventDefault();
        openDealForm(null, { companyId: t.getAttribute("data-company") || "" });
      }
    });

    var input = document.getElementById("crm-search");
    var box = document.getElementById("crm-search-results");
    if (!input) return;
    document.addEventListener("keydown", function (e) {
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) {
        e.preventDefault();
        input.focus();
      }
    });
    input.addEventListener("input", function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) {
        box.classList.remove("show");
        return;
      }
      var w = CRM.ws();
      var hits = [];
      w.companies.forEach(function (c) {
        if ((c.name + " " + c.industry + " " + c.city).toLowerCase().indexOf(q) !== -1)
          hits.push({ icon: "mdi-domain", label: c.name, sub: c.industry, href: "customer.html?id=" + c.id });
      });
      w.contacts.forEach(function (p) {
        if ((p.name + " " + p.email).toLowerCase().indexOf(q) !== -1) {
          var c = CRM.company(p.companyId);
          hits.push({ icon: "mdi-account", label: p.name, sub: c ? c.name : "", href: "customer.html?id=" + p.companyId });
        }
      });
      w.deals.forEach(function (d) {
        var c = CRM.company(d.companyId);
        if ((d.title + " " + (c ? c.name : "")).toLowerCase().indexOf(q) !== -1)
          hits.push({ icon: "mdi-briefcase-check", label: d.title, sub: (c ? c.name : "") + " · " + money(d.value), href: "pipeline.html?deal=" + d.id });
      });
      w.invoices.forEach(function (i) {
        if (i.number.toLowerCase().indexOf(q) !== -1)
          hits.push({ icon: "mdi-file-document-outline", label: i.number, sub: cap(i.status), href: "invoice.html?id=" + i.id });
      });
      box.innerHTML = hits.length
        ? hits
            .slice(0, 8)
            .map(function (h) {
              return (
                '<a class="dropdown-item" href="' +
                h.href +
                '"><i class="mdi ' +
                h.icon +
                ' me-2 text-primary"></i><span>' +
                esc(h.label) +
                '</span><small class="text-muted ms-2">' +
                esc(h.sub) +
                "</small></a>"
              );
            })
            .join("")
        : '<span class="dropdown-item-text text-muted">No matches</span>';
      box.classList.add("show");
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var first = box.querySelector("a");
        if (first) location.href = first.getAttribute("href");
      }
      if (e.key === "Escape") {
        input.blur();
        box.classList.remove("show");
      }
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".crm-search")) box.classList.remove("show");
    });
  }

  function renderNotifications() {
    var el = document.getElementById("crm-notifs");
    if (!el) return;
    var items = [];
    var today = CRM.startOfDay(new Date());
    var tomorrow = CRM.addDays(today, 1);
    CRM.ws().events.forEach(function (e) {
      var s = new Date(e.start);
      if (!e.done && s >= today && s < tomorrow)
        items.push({ icon: "mdi-calendar", tone: "bg-success", title: e.title, sub: "Today at " + time(e.start), href: "schedule.html" });
    });
    CRM.ws().invoices.forEach(function (i) {
      if (i.status === "overdue") {
        var c = CRM.company(i.companyId);
        items.push({ icon: "mdi-alert", tone: "bg-danger", title: i.number + " is overdue", sub: c ? c.name : "", href: "invoice.html?id=" + i.id });
      }
    });
    var stale = CRM.staleDeals();
    if (stale.length)
      items.push({
        icon: "mdi-timer-sand",
        tone: "bg-warning",
        title: stale.length + " deals need attention",
        sub: "Quiet for 2+ weeks or past close date",
        href: "pipeline.html?filter=attention",
      });
    document.getElementById("crm-notif-dot").classList.toggle("d-none", !items.length);
    el.innerHTML =
      '<h6 class="p-3 mb-0">Notifications</h6>' +
      (items.length
        ? items
            .slice(0, 6)
            .map(function (n) {
              return (
                '<div class="dropdown-divider"></div><a class="dropdown-item preview-item" href="' +
                n.href +
                '"><div class="preview-thumbnail"><div class="preview-icon ' +
                n.tone +
                '"><i class="mdi ' +
                n.icon +
                '"></i></div></div><div class="preview-item-content d-flex align-items-start flex-column justify-content-center"><h6 class="preview-subject font-weight-normal mb-1">' +
                esc(n.title) +
                '</h6><p class="text-gray ellipsis mb-0">' +
                esc(n.sub) +
                "</p></div></a>"
              );
            })
            .join("")
        : '<div class="dropdown-divider"></div><p class="p-3 mb-0 text-muted">You\'re all caught up.</p>');
  }

  function renderWorkspaceMenu() {
    var el = document.getElementById("crm-ws-menu");
    if (!el) return;
    var all = CRM.state.workspaces;
    el.innerHTML =
      '<h6 class="dropdown-header">Workspaces</h6>' +
      Object.keys(all)
        .map(function (id) {
          var w = all[id].workspace;
          return (
            '<a class="dropdown-item" href="#" data-ws="' +
            esc(id) +
            '"><i class="mdi ' +
            (id === CRM.state.currentId ? "mdi-check-circle text-success" : "mdi-briefcase-outline text-muted") +
            ' me-2"></i>' +
            esc(w.name) +
            "</a>"
          );
        })
        .join("") +
      '<a class="dropdown-item" href="#" id="crm-new-ws"><i class="mdi mdi-plus me-2 text-primary"></i>New workspace</a>' +
      '<div class="dropdown-divider"></div>' +
      '<a class="dropdown-item" href="settings.html"><i class="mdi mdi-settings me-2 text-primary"></i>Settings</a>' +
      '<a class="dropdown-item" href="login.html"><i class="mdi mdi-logout me-2 text-primary"></i>Sign out</a>';
    el.addEventListener("click", function (e) {
      var a = e.target.closest("[data-ws]");
      if (a) {
        e.preventDefault();
        CRM.switchWorkspace(a.getAttribute("data-ws"));
        location.reload();
      }
      if (e.target.closest("#crm-new-ws")) {
        e.preventDefault();
        openWorkspaceForm();
      }
    });
  }

  // ---------- modal + forms ----------

  // Opens a Bootstrap modal with a form. fields: [{name,label,type,options,value,required,col}]
  function formModal(opts) {
    var old = document.getElementById("crm-modal");
    if (old) old.remove();
    var fields = opts.fields
      .map(function (f) {
        var id = "f-" + f.name;
        var val = f.value == null ? "" : f.value;
        var input;
        if (f.type === "select") {
          input =
            '<select class="form-select" id="' +
            id +
            '" name="' +
            f.name +
            '"' +
            (f.required ? " required" : "") +
            ">" +
            f.options
              .map(function (o) {
                return '<option value="' + esc(o.value) + '"' + (String(o.value) === String(val) ? " selected" : "") + ">" + esc(o.label) + "</option>";
              })
              .join("") +
            "</select>";
        } else if (f.type === "textarea") {
          input = '<textarea class="form-control" rows="3" id="' + id + '" name="' + f.name + '">' + esc(val) + "</textarea>";
        } else {
          input =
            '<input class="form-control" id="' +
            id +
            '" name="' +
            f.name +
            '" type="' +
            (f.type || "text") +
            '" value="' +
            esc(val) +
            '"' +
            (f.step ? ' step="' + f.step + '"' : "") +
            (f.min != null ? ' min="' + f.min + '"' : "") +
            (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : "") +
            (f.required ? " required" : "") +
            ">";
        }
        return '<div class="' + (f.col || "col-12") + ' mb-3"><label class="form-label" for="' + id + '">' + esc(f.label) + "</label>" + input + "</div>";
      })
      .join("");
    var html =
      '<div class="modal fade" id="crm-modal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered' +
      (opts.wide ? " modal-lg" : "") +
      '"><form class="modal-content" novalidate>' +
      '<div class="modal-header"><h5 class="modal-title">' +
      esc(opts.title) +
      '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><div class="row">' +
      fields +
      (opts.extraHtml || "") +
      "</div></div>" +
      '<div class="modal-footer">' +
      (opts.onDelete ? '<button type="button" class="btn btn-outline-danger me-auto" data-delete>Delete</button>' : "") +
      '<button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-gradient-primary">' +
      esc(opts.submit || "Save") +
      "</button></div></form></div></div>";
    document.body.insertAdjacentHTML("beforeend", html);
    var el = document.getElementById("crm-modal");
    var modal = new bootstrap.Modal(el);
    var form = el.querySelector("form");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      var data = {};
      new FormData(form).forEach(function (v, k) {
        data[k] = v;
      });
      if (opts.onSubmit(data, form) !== false) modal.hide();
    });
    var del = el.querySelector("[data-delete]");
    // Two-step delete inside the dialog: the first click asks, the second deletes.
    if (del)
      del.addEventListener("click", function () {
        if (del.getAttribute("data-armed")) {
          opts.onDelete();
          modal.hide();
          return;
        }
        del.setAttribute("data-armed", "1");
        del.classList.replace("btn-outline-danger", "btn-danger");
        del.textContent = "Yes, delete";
        del.title = opts.deleteConfirm || "";
        var hint = document.createElement("span");
        hint.className = "crm-small text-danger me-auto";
        hint.textContent = opts.deleteConfirm || "Delete this?";
        del.classList.remove("me-auto");
        del.insertAdjacentElement("afterend", hint);
      });
    el.addEventListener("shown.bs.modal", function () {
      var first = form.querySelector("input,select,textarea");
      if (first) first.focus();
    });
    el.addEventListener("hidden.bs.modal", function () {
      el.remove();
    });
    if (opts.onMount) opts.onMount(form);
    modal.show();
    return form;
  }

  // In-page confirmation (browser confirm()/prompt() dialogs are blocked in some embeds).
  // opts: { title, message, confirmLabel, typeToConfirm, onConfirm }
  function confirmAction(opts) {
    var old = document.getElementById("crm-confirm");
    if (old) old.remove();
    var html =
      '<div class="modal fade" id="crm-confirm" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-dialog-centered"><form class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title">' +
      esc(opts.title || "Are you sure?") +
      '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
      '<div class="modal-body"><p class="mb-0">' +
      esc(opts.message || "") +
      "</p>" +
      (opts.typeToConfirm
        ? '<label class="form-label mt-3" for="crm-confirm-input">Type <b>' + esc(opts.typeToConfirm) + '</b> to confirm</label><input class="form-control" id="crm-confirm-input" autocomplete="off">'
        : "") +
      '</div><div class="modal-footer"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-danger" id="crm-confirm-yes">' +
      esc(opts.confirmLabel || "Delete") +
      "</button></div></form></div></div>";
    document.body.insertAdjacentHTML("beforeend", html);
    var el = document.getElementById("crm-confirm");
    var modal = new bootstrap.Modal(el);
    var input = document.getElementById("crm-confirm-input");
    var yes = document.getElementById("crm-confirm-yes");
    if (input) {
      yes.disabled = true;
      input.addEventListener("input", function () {
        yes.disabled = input.value.trim() !== opts.typeToConfirm;
      });
    }
    el.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (yes.disabled) return;
      modal.hide();
      opts.onConfirm();
    });
    el.addEventListener("shown.bs.modal", function () {
      (input || yes).focus();
    });
    el.addEventListener("hidden.bs.modal", function () {
      el.remove();
    });
    modal.show();
  }

  function memberOptions() {
    return CRM.ws().members.map(function (m) {
      return { value: m.id, label: m.name };
    });
  }

  function companyOptions() {
    return CRM.ws()
      .companies.slice()
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      })
      .map(function (c) {
        return { value: c.id, label: c.name };
      });
  }

  function openDealForm(deal, defaults) {
    defaults = defaults || {};
    var w = CRM.ws();
    if (!w.companies.length) {
      toast("Add a customer first, then create deals for them.", "warning");
      openCompanyForm();
      return;
    }
    var openStages = w.stages.map(function (s) {
      return { value: s.id, label: s.name };
    });
    formModal({
      title: deal ? "Edit deal" : "New deal",
      submit: deal ? "Save deal" : "Create deal",
      fields: [
        { name: "title", label: "Deal name", required: true, value: deal ? deal.title : "", placeholder: "e.g. Annual subscription" },
        { name: "companyId", label: "Customer", type: "select", options: companyOptions(), value: deal ? deal.companyId : defaults.companyId, col: "col-md-6" },
        { name: "value", label: "Value (" + w.workspace.currency + ")", type: "number", step: "0.001", min: 0, required: true, value: deal ? deal.value : "", col: "col-md-6" },
        { name: "stageId", label: "Stage", type: "select", options: openStages, value: deal ? deal.stageId : defaults.stageId || w.stages[0].id, col: "col-md-6" },
        { name: "ownerId", label: "Owner", type: "select", options: memberOptions(), value: deal ? deal.ownerId : CRM.me().id, col: "col-md-6" },
        { name: "expectedClose", label: "Expected close", type: "date", required: true, value: toInputDate(deal ? deal.expectedClose : CRM.addDays(new Date(), 30)), col: "col-md-6" },
      ],
      onSubmit: function (d) {
        var patch = {
          title: d.title.trim(),
          companyId: d.companyId,
          value: parseFloat(d.value) || 0,
          stageId: d.stageId,
          ownerId: d.ownerId,
          expectedClose: fromInputDate(d.expectedClose),
        };
        if (deal) {
          var moved = deal.stageId !== patch.stageId;
          CRM.updateDeal(deal.id, patch);
          if (moved) CRM.moveDeal(deal.id, patch.stageId, []);
          toast("Deal saved");
        } else {
          var c = CRM.company(patch.companyId);
          var contact = CRM.ws().contacts.filter(function (p) {
            return p.companyId === patch.companyId;
          })[0];
          patch.contactId = contact ? contact.id : null;
          CRM.addDeal(patch);
          toast("Deal created for " + (c ? c.name : "customer"));
        }
        document.dispatchEvent(new Event("crm:data"));
      },
      onDelete: deal
        ? function () {
            CRM.deleteDeal(deal.id);
            toast("Deal deleted");
            document.dispatchEvent(new Event("crm:data"));
          }
        : null,
      deleteConfirm: "Delete this deal?",
    });
  }

  function openCompanyForm(company) {
    formModal({
      title: company ? "Edit customer" : "New customer",
      submit: company ? "Save" : "Add customer",
      wide: true,
      fields: [
        { name: "name", label: "Company name", required: true, value: company ? company.name : "", col: "col-md-6" },
        { name: "industry", label: "Industry", value: company ? company.industry : "", col: "col-md-6" },
        { name: "city", label: "City", value: company ? company.city : "", col: "col-md-4" },
        { name: "website", label: "Website", value: company ? company.website : "", col: "col-md-4" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: [
            { value: "lead", label: "Lead" },
            { value: "active", label: "Active" },
            { value: "churned", label: "Churned" },
          ],
          value: company ? company.status : "lead",
          col: "col-md-4",
        },
        { name: "ownerId", label: "Account owner", type: "select", options: memberOptions(), value: company ? company.ownerId : CRM.me().id, col: "col-md-6" },
        { name: "tags", label: "Tags (comma separated)", value: company ? company.tags.join(", ") : "", col: "col-md-6" },
      ].concat(
        company
          ? []
          : [
              { name: "contactName", label: "Main contact name", col: "col-md-4" },
              { name: "contactEmail", label: "Contact email", type: "email", col: "col-md-4" },
              { name: "contactPhone", label: "Contact phone", col: "col-md-4" },
            ],
      ),
      onSubmit: function (d) {
        var data = {
          name: d.name.trim(),
          industry: d.industry.trim(),
          city: d.city.trim(),
          website: d.website.trim(),
          status: d.status,
          ownerId: d.ownerId,
          tags: d.tags
            .split(",")
            .map(function (t) {
              return t.trim();
            })
            .filter(Boolean),
        };
        if (company) {
          CRM.updateCompany(company.id, data);
          toast("Customer saved");
        } else {
          var id = CRM.addCompany(data, { name: d.contactName.trim(), email: d.contactEmail.trim(), phone: d.contactPhone.trim(), title: "" });
          toast("Customer added");
          document.dispatchEvent(new CustomEvent("crm:company-added", { detail: id }));
        }
        document.dispatchEvent(new Event("crm:data"));
      },
    });
  }

  function openWorkspaceForm() {
    formModal({
      title: "New workspace",
      submit: "Create workspace",
      fields: [
        { name: "name", label: "Business name", required: true, placeholder: "e.g. My Client Co." },
        {
          name: "currency",
          label: "Currency",
          type: "select",
          options: ["KWD", "SAR", "AED", "QAR", "BHD", "OMR", "USD", "EUR", "GBP"].map(function (c) {
            return { value: c, label: c };
          }),
          value: "KWD",
        },
      ],
      onSubmit: function (d) {
        CRM.createWorkspace(d.name.trim());
        CRM.updateWorkspace({ currency: d.currency });
        location.href = "index.html";
      },
    });
  }

  function toast(msg, tone) {
    var box = document.getElementById("crm-toasts");
    if (!box) return;
    var el = document.createElement("div");
    el.className = "crm-toast crm-toast-" + (tone || "success");
    el.innerHTML = '<i class="mdi ' + (tone === "warning" ? "mdi-alert-outline" : "mdi-check-circle-outline") + '"></i><span>' + esc(msg) + "</span>";
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add("out");
      setTimeout(function () {
        el.remove();
      }, 300);
    }, 2600);
  }

  function emptyState(icon, title, text, actionHtml) {
    return (
      '<div class="crm-empty"><i class="mdi ' +
      icon +
      '"></i><h5>' +
      esc(title) +
      "</h5><p>" +
      esc(text) +
      "</p>" +
      (actionHtml || "") +
      "</div>"
    );
  }

  // Chart.js 2 defaults that follow the light/dark theme.
  function chartTheme() {
    var css = getComputedStyle(document.documentElement);
    return {
      text: css.getPropertyValue("--crm-text-2").trim() || "#6c7293",
      grid: css.getPropertyValue("--crm-grid").trim() || "rgba(0,0,0,.06)",
      primary: css.getPropertyValue("--crm-primary").trim() || "#b66dff",
    };
  }

  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  global.UI = {
    APP_NAME: APP_NAME,
    esc: esc,
    money: money,
    date: date,
    time: time,
    ago: ago,
    cap: cap,
    qs: qs,
    initials: initials,
    avatar: avatar,
    companyLogo: companyLogo,
    badge: badge,
    toInputDate: toInputDate,
    fromInputDate: fromInputDate,
    formModal: formModal,
    confirmAction: confirmAction,
    memberOptions: memberOptions,
    companyOptions: companyOptions,
    openDealForm: openDealForm,
    openCompanyForm: openCompanyForm,
    openWorkspaceForm: openWorkspaceForm,
    toast: toast,
    emptyState: emptyState,
    chartTheme: chartTheme,
    downloadFile: downloadFile,
    renderNotifications: renderNotifications,
  };

  mountLayout();
})(window);
