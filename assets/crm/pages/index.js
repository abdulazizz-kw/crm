(function () {
  "use strict";
  var esc = UI.esc;
  var KIND_ICON = { call: "mdi-phone", email: "mdi-email-outline", meeting: "mdi-account-group", note: "mdi-note-text", stage: "mdi-swap-horizontal" };
  var KIND_BG = { call: "bg-gradient-info", email: "bg-gradient-primary", meeting: "bg-gradient-success", note: "bg-gradient-warning", stage: "bg-gradient-danger" };
  var months = 6;
  var chart;

  function monthKey(d) {
    return d.getFullYear() + "-" + d.getMonth();
  }

  function wonByMonth(n) {
    var w = CRM.ws();
    var now = new Date();
    var buckets = [];
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: d.toLocaleString("en", { month: "short" }), total: 0 });
    }
    w.deals.forEach(function (deal) {
      var s = CRM.stageOf(deal);
      if (!s || s.kind !== "won") return;
      var k = monthKey(new Date(deal.expectedClose));
      buckets.forEach(function (b) {
        if (b.key === k) b.total += deal.value;
      });
    });
    return buckets;
  }

  function pctChange(a, b) {
    if (!b) return a ? "New this month" : "No change";
    var p = Math.round(((a - b) / b) * 100);
    return (p >= 0 ? "Up " : "Down ") + Math.abs(p) + "% on last month";
  }

  function statCards() {
    var w = CRM.ws();
    var m = wonByMonth(2);
    var open = w.deals.filter(function (d) {
      return CRM.stageOf(d).kind === "open";
    });
    var openValue = open.reduce(function (s, d) {
      return s + d.value;
    }, 0);
    var since = CRM.addDays(new Date(), -90).toISOString();
    var closed = w.deals.filter(function (d) {
      var k = CRM.stageOf(d).kind;
      return k !== "open" && d.expectedClose >= since;
    });
    var won = closed.filter(function (d) {
      return CRM.stageOf(d).kind === "won";
    });
    var winRate = closed.length ? Math.round((won.length / closed.length) * 100) : 0;
    var unpaid = w.invoices.filter(function (i) {
      return i.status === "sent" || i.status === "overdue";
    });
    var unpaidTotal = unpaid.reduce(function (s, i) {
      return s + CRM.invoiceTotal(i).total;
    }, 0);
    var overdue = unpaid.filter(function (i) {
      return i.status === "overdue";
    }).length;

    var cards = [
      { tone: "bg-gradient-danger", icon: "mdi-chart-line", label: "Won this month", value: UI.money(m[1].total, { whole: true }), sub: pctChange(m[1].total, m[0].total) },
      { tone: "bg-gradient-info", icon: "mdi-briefcase-outline", label: "Open pipeline", value: UI.money(openValue, { whole: true }), sub: open.length + " open deals" },
      { tone: "bg-gradient-success", icon: "mdi-trophy-outline", label: "Win rate", value: winRate + "%", sub: won.length + " of " + closed.length + " closed in 90 days" },
      { tone: "bg-gradient-primary", icon: "mdi-cash-multiple", label: "Awaiting payment", value: UI.money(unpaidTotal, { whole: true }), sub: overdue ? overdue + " invoice" + (overdue > 1 ? "s" : "") + " overdue" : "Nothing overdue" },
    ];
    document.getElementById("stat-cards").innerHTML = cards
      .map(function (c) {
        return (
          '<div class="col-xl-3 col-md-6 stretch-card grid-margin"><div class="card crm-stat ' +
          c.tone +
          ' card-img-holder text-white"><div class="card-body"><img src="assets/images/dashboard/circle.svg" class="card-img-absolute" alt="" />' +
          '<h4 class="font-weight-normal mb-3">' +
          c.label +
          ' <i class="mdi ' +
          c.icon +
          ' mdi-24px float-end"></i></h4><h2 class="mb-5">' +
          esc(c.value) +
          '</h2><h6 class="card-text">' +
          esc(c.sub) +
          "</h6></div></div></div>"
        );
      })
      .join("");
  }

  function revenueChart() {
    var data = wonByMonth(months);
    var total = data.reduce(function (s, b) {
      return s + b.total;
    }, 0);
    document.getElementById("revenue-sub").textContent = UI.money(total) + " won in the last " + months + " months";
    var t = UI.chartTheme();
    var canvas = document.getElementById("revenue-chart");
    var ctx = canvas.getContext("2d");
    var grad = ctx.createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(218, 140, 255, 1)");
    grad.addColorStop(1, "rgba(154, 85, 255, 1)");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map(function (b) {
          return b.label;
        }),
        datasets: [{ label: "Revenue won", data: data.map(function (b) { return b.total; }), backgroundColor: grad, hoverBackgroundColor: grad, borderWidth: 0 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        legend: { display: false },
        tooltips: {
          callbacks: {
            label: function (item) {
              return " " + UI.money(item.yLabel);
            },
          },
        },
        scales: {
          xAxes: [{ gridLines: { display: false }, ticks: { fontColor: t.text }, barPercentage: 0.5, categoryPercentage: 0.7 }],
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

  function stageBars() {
    var w = CRM.ws();
    var rows = w.stages
      .filter(function (s) {
        return s.kind === "open";
      })
      .map(function (s) {
        var deals = w.deals.filter(function (d) {
          return d.stageId === s.id;
        });
        var total = deals.reduce(function (a, d) {
          return a + d.value;
        }, 0);
        return { stage: s, count: deals.length, total: total, weighted: total * s.probability };
      });
    var max = Math.max.apply(
      null,
      rows.map(function (r) {
        return r.total;
      }).concat([1]),
    );
    var forecast = rows.reduce(function (a, r) {
      return a + r.weighted;
    }, 0);
    document.getElementById("forecast-sub").textContent = "Weighted forecast: " + UI.money(forecast);
    document.getElementById("stage-bars").innerHTML = rows
      .map(function (r) {
        return (
          '<div class="mb-4"><div class="d-flex justify-content-between crm-small mb-2"><a class="crm-link" href="pipeline.html"><b>' +
          esc(r.stage.name) +
          '</b> <span class="crm-muted">· ' +
          r.count +
          " deals · " +
          Math.round(r.stage.probability * 100) +
          '% likely</span></a><span>' +
          UI.money(r.total) +
          '</span></div><div class="crm-progress"><span style="width:' +
          Math.max(2, (r.total / max) * 100) +
          '%"></span></div></div>'
        );
      })
      .join("");
  }

  function attention() {
    var list = CRM.staleDeals()
      .sort(function (a, b) {
        return b.value - a.value;
      })
      .slice(0, 6);
    var el = document.getElementById("attention");
    if (!list.length) {
      el.innerHTML = UI.emptyState("mdi-check-circle-outline", "All deals are moving", "Nothing has gone quiet. Nice work.");
      return;
    }
    var today = CRM.startOfDay(new Date()).toISOString();
    el.innerHTML =
      '<table class="table"><thead><tr><th>Deal</th><th>Owner</th><th>Stage</th><th class="text-end">Value</th><th>Why</th></tr></thead><tbody>' +
      list
        .map(function (d) {
          var c = CRM.company(d.companyId);
          var reason = d.expectedClose < today ? "Close date passed " + UI.ago(d.expectedClose) : "No update for " + UI.ago(d.updatedAt).replace(" ago", "");
          return (
            '<tr data-href="pipeline.html?deal=' +
            d.id +
            '"><td><div class="crm-row">' +
            UI.companyLogo(c, 32) +
            '<div class="grow"><div class="crm-ellipsis">' +
            esc(d.title) +
            '</div><div class="crm-muted crm-small crm-ellipsis">' +
            esc(c.name) +
            "</div></div></div></td><td>" +
            UI.avatar(CRM.member(d.ownerId), 28) +
            "</td><td>" +
            UI.badge("open", CRM.stageOf(d).name) +
            '</td><td class="text-end">' +
            UI.money(d.value) +
            '</td><td class="crm-small crm-muted">' +
            esc(reason) +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table>";
  }

  function activity() {
    var list = CRM.ws().activities.slice(0, 7);
    var el = document.getElementById("activity");
    if (!list.length) {
      el.innerHTML = '<li class="crm-muted">No activity yet. Add a customer or a deal to get started.</li>';
      return;
    }
    el.innerHTML = list
      .map(function (a) {
        var m = CRM.member(a.memberId);
        var c = a.companyId ? CRM.company(a.companyId) : null;
        return (
          '<li><span class="dot ' +
          KIND_BG[a.kind] +
          '"><i class="mdi ' +
          KIND_ICON[a.kind] +
          '"></i></span><div class="body">' +
          esc(a.body) +
          '</div><div class="meta">' +
          esc(m ? m.name : "Someone") +
          (c ? ' · <a class="crm-link" href="customer.html?id=' + c.id + '">' + esc(c.name) + "</a>" : "") +
          " · " +
          UI.ago(a.at) +
          "</div></li>"
        );
      })
      .join("");
  }

  function leaderboard() {
    var w = CRM.ws();
    // Rolling 90 days, compared with each person's quarterly target.
    var qStart = CRM.addDays(new Date(), -90).toISOString();
    var rows = w.members
      .map(function (m) {
        var won = w.deals.filter(function (d) {
          return d.ownerId === m.id && CRM.stageOf(d).kind === "won" && d.expectedClose >= qStart;
        });
        var total = won.reduce(function (s, d) {
          return s + d.value;
        }, 0);
        return { m: m, total: total, count: won.length };
      })
      .sort(function (a, b) {
        return b.total - a.total;
      });
    document.getElementById("leaderboard").innerHTML = rows
      .map(function (r) {
        var pct = r.m.target ? Math.min(100, Math.round((r.total / r.m.target) * 100)) : 0;
        return (
          '<div class="crm-row mb-4">' +
          UI.avatar(r.m, 38) +
          '<div class="grow"><div class="d-flex justify-content-between"><span>' +
          esc(r.m.name) +
          '</span><span class="crm-small">' +
          UI.money(r.total) +
          ' <span class="crm-muted">/ ' +
          UI.money(r.m.target, { compact: true }) +
          '</span></span></div><div class="crm-progress mt-2"><span style="width:' +
          pct +
          '%"></span></div><div class="crm-muted crm-small mt-1">' +
          r.count +
          " won · " +
          pct +
          "% of target</div></div></div>"
        );
      })
      .join("");
  }

  function today() {
    var start = CRM.startOfDay(new Date());
    var end = CRM.addDays(start, 1);
    var list = CRM.ws()
      .events.filter(function (e) {
        var s = new Date(e.start);
        return s >= start && s < end;
      })
      .sort(function (a, b) {
        return a.start.localeCompare(b.start);
      });
    document.getElementById("today").innerHTML = list.length
      ? list
          .map(function (e) {
            var m = CRM.member(e.memberId);
            return (
              '<div class="d-flex align-items-center gap-3 mb-3' +
              (e.done ? " opacity-50" : "") +
              '"><div style="width:48px" class="fw-bold">' +
              UI.time(e.start) +
              '</div><div class="flex-grow-1"><div>' +
              esc(e.title) +
              '</div><div class="crm-small" style="opacity:.8">' +
              e.durationMin +
              " min · " +
              esc(m ? m.name : "") +
              "</div></div>" +
              (e.done ? '<i class="mdi mdi-check-circle"></i>' : "") +
              "</div>"
            );
          })
          .join("")
      : '<p class="mb-0" style="opacity:.85">Nothing booked today.</p>';
  }

  function gettingStarted() {
    var w = CRM.ws();
    var el = document.getElementById("getting-started");
    if (w.companies.length && w.deals.length) {
      el.innerHTML = "";
      return;
    }
    el.innerHTML =
      '<div class="card mb-4"><div class="card-body"><h4 class="card-title mb-1">Welcome to ' +
      esc(w.workspace.name) +
      '</h4><p class="crm-muted mb-4">Three quick steps and your dashboard fills itself in.</p><div class="crm-start">' +
      '<div class="step"><b>1. Add a customer</b><span class="crm-muted crm-small">A company you sell to, with its main contact.</span><div class="mt-2"><a class="btn btn-sm btn-gradient-primary" href="customers.html">Add customer</a></div></div>' +
      '<div class="step"><b>2. Create a deal</b><span class="crm-muted crm-small">Track it through your pipeline stages.</span><div class="mt-2"><button class="btn btn-sm btn-gradient-primary" data-crm-new-deal>New deal</button></div></div>' +
      '<div class="step"><b>3. Invite your team</b><span class="crm-muted crm-small">Give each rep a target to see progress.</span><div class="mt-2"><a class="btn btn-sm btn-gradient-primary" href="team.html">Add teammate</a></div></div>' +
      "</div></div></div>";
  }

  function render() {
    gettingStarted();
    statCards();
    revenueChart();
    stageBars();
    attention();
    activity();
    leaderboard();
    today();
  }

  document.getElementById("revenue-range").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    months = +b.getAttribute("data-months");
    this.querySelectorAll("button").forEach(function (x) {
      x.classList.toggle("active", x === b);
    });
    revenueChart();
  });
  document.addEventListener("click", function (e) {
    var tr = e.target.closest("tr[data-href]");
    if (tr && !e.target.closest("a")) location.href = tr.getAttribute("data-href");
  });
  document.addEventListener("crm:data", render);
  document.addEventListener("crm:theme", revenueChart);
  render();
})();
