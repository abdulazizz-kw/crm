(function () {
  "use strict";
  var esc = UI.esc;
  var START_HOUR = 8;
  var END_HOUR = 19;
  var ROW = 56; // px per hour, matches .crm-week .slot
  var KIND = {
    call: { label: "Call", bg: "bg-gradient-info" },
    meeting: { label: "Meeting", bg: "bg-gradient-success" },
    demo: { label: "Demo", bg: "bg-gradient-primary" },
    "follow-up": { label: "Follow-up", bg: "bg-gradient-warning" },
  };
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var memberFilter = "";

  // Week starts on Sunday, as in Kuwait.
  function weekStart(d) {
    var x = CRM.startOfDay(d);
    return CRM.addDays(x, -x.getDay());
  }
  var start = weekStart(new Date());

  var sel = document.getElementById("f-member");
  CRM.ws().members.forEach(function (m) {
    sel.insertAdjacentHTML("beforeend", '<option value="' + esc(m.id) + '">' + esc(m.name) + "</option>");
  });

  function eventsIn(from, to) {
    return CRM.ws()
      .events.filter(function (e) {
        var s = new Date(e.start);
        return s >= from && s < to && (!memberFilter || e.memberId === memberFilter);
      })
      .sort(function (a, b) {
        return a.start.localeCompare(b.start);
      });
  }

  function render() {
    var end = CRM.addDays(start, 7);
    var last = CRM.addDays(start, 6);
    document.getElementById("range").textContent = UI.date(start.toISOString(), false) + " – " + UI.date(last.toISOString());
    var todayKey = CRM.startOfDay(new Date()).getTime();
    var html = "<div class=\"head\"></div>";
    for (var d = 0; d < 7; d++) {
      var day = CRM.addDays(start, d);
      html += '<div class="head' + (day.getTime() === todayKey ? " today" : "") + '">' + DAYS[day.getDay()] + "<b>" + day.getDate() + "</b></div>";
    }
    var evs = eventsIn(start, end);
    for (var h = START_HOUR; h < END_HOUR; h++) {
      html += '<div class="hour">' + String(h).padStart(2, "0") + ":00</div>";
      for (var dd = 0; dd < 7; dd++) {
        var slotDay = CRM.addDays(start, dd);
        var inSlot = evs.filter(function (e) {
          var s = new Date(e.start);
          return CRM.startOfDay(s).getTime() === slotDay.getTime() && s.getHours() === h;
        });
        html +=
          '<div class="slot" data-day="' +
          dd +
          '" data-hour="' +
          h +
          '">' +
          inSlot
            .map(function (e, i) {
              var s = new Date(e.start);
              var m = CRM.member(e.memberId);
              var top = (s.getMinutes() / 60) * ROW;
              var height = Math.max(22, (e.durationMin / 60) * ROW - 3);
              return (
                '<div class="crm-event ev-' +
                e.kind +
                (e.done ? " done" : "") +
                '" data-event="' +
                e.id +
                '" style="top:' +
                (top + i * 4) +
                "px;height:" +
                height +
                'px" title="' +
                esc(e.title) +
                '"><b>' +
                esc(e.title) +
                "</b>" +
                UI.time(e.start) +
                " · " +
                esc(m ? m.name.split(" ")[0] : "") +
                "</div>"
              );
            })
            .join("") +
          "</div>";
      }
    }
    document.getElementById("week").innerHTML = html;
    agenda();
    weekStats(evs);
  }

  function agenda() {
    var now = new Date();
    var list = eventsIn(now, CRM.addDays(now, 14))
      .filter(function (e) {
        return !e.done;
      })
      .slice(0, 6);
    document.getElementById("agenda").innerHTML = list.length
      ? list
          .map(function (e) {
            var c = e.companyId ? CRM.company(e.companyId) : null;
            return (
              '<div class="crm-agenda-item" data-event="' +
              e.id +
              '" role="button"><div class="when">' +
              UI.date(e.start, false) +
              "<br>" +
              UI.time(e.start) +
              '</div><div class="kind ' +
              KIND[e.kind].bg +
              '"></div><div class="crm-small" style="min-width:0"><div class="crm-ellipsis">' +
              esc(e.title) +
              '</div><div class="crm-muted crm-ellipsis">' +
              esc(c ? c.name : KIND[e.kind].label) +
              "</div></div></div>"
            );
          })
          .join("")
      : '<p class="crm-muted mb-0">Nothing coming up in the next two weeks.</p>';
  }

  function weekStats(evs) {
    var counts = {};
    Object.keys(KIND).forEach(function (k) {
      counts[k] = 0;
    });
    evs.forEach(function (e) {
      counts[e.kind]++;
    });
    var done = evs.filter(function (e) {
      return e.done;
    }).length;
    document.getElementById("week-stats").innerHTML =
      Object.keys(KIND)
        .map(function (k) {
          return '<div class="d-flex justify-content-between align-items-center mb-2"><span><span class="d-inline-block rounded-circle me-2 ' + KIND[k].bg + '" style="width:10px;height:10px"></span>' + KIND[k].label + "s</span><b>" + counts[k] + "</b></div>";
        })
        .join("") +
      '<div class="crm-progress mt-3"><span style="width:' +
      (evs.length ? Math.round((done / evs.length) * 100) : 0) +
      '%"></span></div><div class="crm-muted crm-small mt-2">' +
      done +
      " of " +
      evs.length +
      " done</div>";
  }

  function openEvent(ev, defaults) {
    defaults = defaults || {};
    var startIso = ev ? ev.start : defaults.start || new Date().toISOString();
    var s = new Date(startIso);
    UI.formModal({
      title: ev ? "Edit schedule item" : "Add to schedule",
      submit: ev ? "Save" : "Add",
      fields: [
        { name: "title", label: "Title", required: true, value: ev ? ev.title : defaults.title || "", placeholder: "e.g. Demo with Falcon Fitness" },
        {
          name: "kind",
          label: "Type",
          type: "select",
          options: Object.keys(KIND).map(function (k) {
            return { value: k, label: KIND[k].label };
          }),
          value: ev ? ev.kind : "call",
          col: "col-md-6",
        },
        { name: "memberId", label: "Who", type: "select", options: UI.memberOptions(), value: ev ? ev.memberId : memberFilter || CRM.me().id, col: "col-md-6" },
        { name: "date", label: "Date", type: "date", required: true, value: UI.toInputDate(startIso), col: "col-md-4" },
        { name: "time", label: "Time", type: "time", required: true, value: String(s.getHours()).padStart(2, "0") + ":" + String(s.getMinutes()).padStart(2, "0"), col: "col-md-4" },
        {
          name: "durationMin",
          label: "Length",
          type: "select",
          options: [15, 30, 45, 60, 90, 120].map(function (n) {
            return { value: n, label: n + " min" };
          }),
          value: ev ? ev.durationMin : 30,
          col: "col-md-4",
        },
        { name: "companyId", label: "Customer (optional)", type: "select", options: [{ value: "", label: "None" }].concat(UI.companyOptions()), value: ev ? ev.companyId || "" : defaults.companyId || "", col: "col-md-6" },
        {
          name: "done",
          label: "Status",
          type: "select",
          options: [
            { value: "0", label: "To do" },
            { value: "1", label: "Done" },
          ],
          value: ev && ev.done ? "1" : "0",
          col: "col-md-6",
        },
      ],
      onSubmit: function (d) {
        var p = d.date.split("-");
        var t = d.time.split(":");
        var startDate = new Date(+p[0], +p[1] - 1, +p[2], +t[0], +t[1]);
        var data = {
          title: d.title.trim(),
          kind: d.kind,
          memberId: d.memberId,
          start: startDate.toISOString(),
          durationMin: +d.durationMin,
          companyId: d.companyId || null,
          done: d.done === "1",
        };
        if (ev) CRM.updateEvent(ev.id, data);
        else CRM.addEvent(data);
        if (data.companyId && !ev) CRM.addActivity("note", "Scheduled: " + data.title, { companyId: data.companyId });
        UI.toast(ev ? "Saved" : "Added to schedule");
        start = weekStart(startDate);
        render();
      },
      onDelete: ev
        ? function () {
            CRM.deleteEvent(ev.id);
            render();
          }
        : null,
      deleteConfirm: "Remove this from the schedule?",
    });
  }

  document.getElementById("week").addEventListener("click", function (e) {
    var evEl = e.target.closest("[data-event]");
    if (evEl) {
      openEvent(CRM.byId(CRM.ws().events, evEl.getAttribute("data-event")));
      return;
    }
    var slot = e.target.closest(".slot");
    if (slot) {
      var day = CRM.addDays(start, +slot.getAttribute("data-day"));
      day.setHours(+slot.getAttribute("data-hour"));
      openEvent(null, { start: day.toISOString() });
    }
  });
  document.getElementById("agenda").addEventListener("click", function (e) {
    var el = e.target.closest("[data-event]");
    if (el) openEvent(CRM.byId(CRM.ws().events, el.getAttribute("data-event")));
  });
  document.getElementById("prev").addEventListener("click", function () {
    start = CRM.addDays(start, -7);
    render();
  });
  document.getElementById("next").addEventListener("click", function () {
    start = CRM.addDays(start, 7);
    render();
  });
  document.getElementById("today").addEventListener("click", function () {
    start = weekStart(new Date());
    render();
  });
  document.getElementById("add-event").addEventListener("click", function () {
    var d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    openEvent(null, { start: d.toISOString() });
  });
  sel.addEventListener("change", function () {
    memberFilter = this.value;
    render();
  });

  render();

  var forCompany = UI.qs("company");
  if (forCompany && CRM.company(forCompany)) {
    var d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    openEvent(null, { start: d.toISOString(), companyId: forCompany, title: "Call with " + CRM.company(forCompany).name });
  }
})();
