(function () {
  "use strict";
  var esc = UI.esc;
  var ROLES = [
    { value: "owner", label: "Owner" },
    { value: "admin", label: "Admin" },
    { value: "rep", label: "Sales rep" },
  ];
  var chart;

  // Performance looks at a rolling 90 days, compared with each person's quarterly target.
  function windowStart() {
    return CRM.addDays(new Date(), -90).toISOString();
  }

  function statsFor(m) {
    var w = CRM.ws();
    var q = windowStart();
    var won = 0,
      open = 0,
      openCount = 0;
    w.deals.forEach(function (d) {
      if (d.ownerId !== m.id) return;
      var k = CRM.stageOf(d).kind;
      if (k === "won" && d.expectedClose >= q) won += d.value;
      if (k === "open") {
        open += d.value;
        openCount++;
      }
    });
    var acts = w.activities.filter(function (a) {
      return a.memberId === m.id && a.at >= q;
    }).length;
    var customers = w.companies.filter(function (c) {
      return c.ownerId === m.id;
    }).length;
    return { won: won, open: open, openCount: openCount, acts: acts, customers: customers };
  }

  function render() {
    var w = CRM.ws();
    document.getElementById("members").innerHTML = w.members
      .map(function (m) {
        var s = statsFor(m);
        var pct = m.target ? Math.min(100, Math.round((s.won / m.target) * 100)) : 0;
        return (
          '<div class="col-xl-4 col-md-6 grid-margin stretch-card"><div class="card"><div class="card-body">' +
          '<div class="crm-row mb-4">' +
          UI.avatar(m, 52) +
          '<div class="grow"><h5 class="mb-1">' +
          esc(m.name) +
          '</h5><div class="crm-muted crm-small">' +
          esc(m.title) +
          " · " +
          esc(ROLES.filter(function (r) { return r.value === m.role; })[0].label) +
          '</div><div class="crm-small crm-ellipsis"><a href="mailto:' +
          esc(m.email) +
          '">' +
          esc(m.email) +
          '</a></div></div><button class="btn btn-sm btn-light" data-edit="' +
          m.id +
          '" aria-label="Edit ' +
          esc(m.name) +
          '"><i class="mdi mdi-pencil"></i></button></div>' +
          '<div class="d-flex justify-content-between crm-small mb-2"><span>Won (90 days)</span><span><b>' +
          UI.money(s.won, { whole: true }) +
          '</b> <span class="crm-muted">/ ' +
          UI.money(m.target, { compact: true }) +
          "</span></span></div>" +
          '<div class="crm-progress mb-4"><span style="width:' +
          pct +
          '%"></span></div>' +
          '<div class="d-flex justify-content-around text-center">' +
          [
            [s.openCount, "Open deals"],
            [s.customers, "Customers"],
            [s.acts, "Activities"],
          ]
            .map(function (x) {
              return '<div><div class="fs-5 fw-bold">' + x[0] + '</div><div class="crm-muted crm-small text-nowrap">' + x[1] + "</div></div>";
            })
            .join("") +
          "</div></div></div></div>"
        );
      })
      .join("");
    drawChart();
  }

  function drawChart() {
    var w = CRM.ws();
    var t = UI.chartTheme();
    var ctx = document.getElementById("team-chart").getContext("2d");
    var grad = ctx.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, "rgba(218, 140, 255, 1)");
    grad.addColorStop(1, "rgba(154, 85, 255, 1)");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: w.members.map(function (m) {
          return m.name.split(" ")[0];
        }),
        datasets: [
          {
            label: "Won in last 90 days",
            data: w.members.map(function (m) {
              return statsFor(m).won;
            }),
            backgroundColor: grad,
            hoverBackgroundColor: grad,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: { display: false },
        tooltips: {
          callbacks: {
            label: function (item) {
              var m = w.members[item.index];
              return " " + UI.money(item.yLabel) + " of " + UI.money(m.target, { compact: true }) + " target";
            },
          },
        },
        scales: {
          xAxes: [{ gridLines: { display: false }, ticks: { fontColor: t.text }, barPercentage: 0.45 }],
          yAxes: [
            {
              gridLines: { color: t.grid, zeroLineColor: t.grid, drawBorder: false },
              ticks: {
                fontColor: t.text,
                beginAtZero: true,
                maxTicksLimit: 5,
                callback: function (v) {
                  return UI.money(v, { compact: true });
                },
              },
            },
          ],
        },
      },
    });
  }

  function openMember(m) {
    UI.formModal({
      title: m ? "Edit teammate" : "Add teammate",
      submit: m ? "Save" : "Add",
      fields: [
        { name: "name", label: "Name", required: true, value: m ? m.name : "", col: "col-md-6" },
        { name: "email", label: "Email", type: "email", required: true, value: m ? m.email : "", col: "col-md-6" },
        { name: "title", label: "Job title", value: m ? m.title : "Account Executive", col: "col-md-6" },
        { name: "role", label: "Access", type: "select", options: m && m.role === "owner" ? ROLES : ROLES.slice(1), value: m ? m.role : "rep", col: "col-md-6" },
        { name: "target", label: "Quarterly target (" + CRM.ws().workspace.currency + ")", type: "number", min: 0, step: "1", value: m ? m.target : 15000 },
      ],
      onSubmit: function (d) {
        var data = { name: d.name.trim(), email: d.email.trim(), title: d.title.trim(), role: d.role, target: parseFloat(d.target) || 0 };
        if (m) CRM.updateMember(m.id, data);
        else CRM.addMember(data);
        UI.toast(m ? "Saved" : "Teammate added");
        render();
      },
      onDelete:
        m && m.role !== "owner"
          ? function () {
              CRM.removeMember(m.id);
              render();
            }
          : null,
      deleteConfirm: "Remove this teammate? Their deals and customers stay in the CRM.",
    });
  }

  document.getElementById("members").addEventListener("click", function (e) {
    var b = e.target.closest("[data-edit]");
    if (b) openMember(CRM.member(b.getAttribute("data-edit")));
  });
  document.getElementById("add-member").addEventListener("click", function () {
    openMember(null);
  });
  document.addEventListener("crm:theme", drawChart);
  render();
})();
