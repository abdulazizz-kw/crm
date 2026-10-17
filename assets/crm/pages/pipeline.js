(function () {
  "use strict";
  var esc = UI.esc;
  var STAGE_BAR = ["bg-gradient-info", "bg-gradient-primary", "bg-gradient-warning", "bg-gradient-danger"];
  var filters = { text: "", owner: "", view: UI.qs("filter") === "attention" ? "attention" : "all" };

  var ownerSel = document.getElementById("f-owner");
  CRM.ws().members.forEach(function (m) {
    ownerSel.insertAdjacentHTML("beforeend", '<option value="' + esc(m.id) + '">' + esc(m.name) + "</option>");
  });

  function stageBar(s, i) {
    if (s.kind === "won") return "bg-gradient-success";
    if (s.kind === "lost") return "bg-gradient-secondary";
    return STAGE_BAR[i % STAGE_BAR.length];
  }

  function visible(d, staleIds) {
    var c = CRM.company(d.companyId);
    if (filters.owner && d.ownerId !== filters.owner) return false;
    if (filters.view === "attention" && !staleIds[d.id]) return false;
    if (filters.text) {
      var hay = (d.title + " " + (c ? c.name : "")).toLowerCase();
      if (hay.indexOf(filters.text) === -1) return false;
    }
    return true;
  }

  function card(d, stale) {
    var c = CRM.company(d.companyId);
    var m = CRM.member(d.ownerId);
    var overdue = CRM.stageOf(d).kind === "open" && d.expectedClose < CRM.startOfDay(new Date()).toISOString();
    return (
      '<div class="crm-deal' +
      (stale ? " attention" : "") +
      '" data-id="' +
      d.id +
      '" tabindex="0" role="button" aria-label="' +
      esc(d.title + ", " + (c ? c.name : "")) +
      '"><div class="crm-row">' +
      (c ? UI.companyLogo(c, 30) : "") +
      '<div class="grow"><div class="title crm-ellipsis">' +
      esc(d.title) +
      '</div><div class="company crm-ellipsis">' +
      esc(c ? c.name : "No customer") +
      "</div></div></div>" +
      '<div class="foot"><span class="value">' +
      UI.money(d.value) +
      "</span><span" +
      (overdue ? ' class="text-danger" title="Close date passed"' : "") +
      '><i class="mdi mdi-calendar"></i> ' +
      UI.date(d.expectedClose, false) +
      "</span>" +
      UI.avatar(m, 24) +
      "</div></div>"
    );
  }

  function render() {
    var w = CRM.ws();
    var staleIds = {};
    CRM.staleDeals().forEach(function (d) {
      staleIds[d.id] = true;
    });
    var openTotal = 0;
    var openCount = 0;
    var html = w.stages
      .slice()
      .sort(function (a, b) {
        return a.order - b.order;
      })
      .map(function (s, i) {
        var deals = w.deals
          .filter(function (d) {
            return d.stageId === s.id;
          })
          .sort(function (a, b) {
            return a.position - b.position;
          });
        var shown = deals.filter(function (d) {
          return visible(d, staleIds);
        });
        var sum = shown.reduce(function (a, d) {
          return a + d.value;
        }, 0);
        if (s.kind === "open") {
          openTotal += sum;
          openCount += shown.length;
        }
        return (
          '<section class="crm-col" aria-label="' +
          esc(s.name) +
          '"><div class="crm-col-head"><div class="name">' +
          esc(s.name) +
          ' <span class="count">' +
          shown.length +
          "</span></div><div class=\"sum\">" +
          UI.money(sum) +
          (s.kind === "open" ? " · " + Math.round(s.probability * 100) + "% likely" : "") +
          '</div><div class="bar ' +
          stageBar(s, i) +
          '"></div></div><div class="crm-col-body" data-stage="' +
          s.id +
          '">' +
          shown
            .map(function (d) {
              return card(d, staleIds[d.id]);
            })
            .join("") +
          "</div>" +
          (s.kind === "open" ? '<button class="crm-col-add" data-add="' + s.id + '"><i class="mdi mdi-plus"></i> Add deal</button>' : "") +
          "</section>"
        );
      })
      .join("");
    var board = document.getElementById("board");
    board.innerHTML = html;
    document.getElementById("pipe-total").textContent = UI.money(openTotal) + " open across " + openCount + " deals";
    board.querySelectorAll(".crm-col-body").forEach(function (col) {
      Sortable.create(col, {
        group: "deals",
        animation: 160,
        ghostClass: "sortable-ghost",
        dragClass: "sortable-drag",
        forceFallback: true,
        delay: 120,
        delayOnTouchOnly: true,
        onEnd: function (evt) {
          var id = evt.item.getAttribute("data-id");
          var to = evt.to.getAttribute("data-stage");
          var from = evt.from.getAttribute("data-stage");
          if (to === from && evt.oldIndex === evt.newIndex) return;
          var ids = Array.prototype.map.call(evt.to.querySelectorAll(".crm-deal"), function (el) {
            return el.getAttribute("data-id");
          });
          CRM.moveDeal(id, to, ids);
          var stage = CRM.byId(CRM.ws().stages, to);
          if (to !== from) {
            if (stage.kind === "won") UI.toast("Deal won! Create its invoice from the Invoices page.");
            else UI.toast("Moved to " + stage.name);
          }
          render();
          UI.renderNotifications();
        },
      });
    });
  }

  document.getElementById("board").addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      UI.openDealForm(null, { stageId: add.getAttribute("data-add") });
      return;
    }
    var el = e.target.closest(".crm-deal");
    if (el) openDeal(el.getAttribute("data-id"));
  });
  document.getElementById("board").addEventListener("keydown", function (e) {
    var el = e.target.closest(".crm-deal");
    if (el && e.key === "Enter") openDeal(el.getAttribute("data-id"));
  });

  // Deal detail: edit fields, see its history, log a note.
  function openDeal(id) {
    var d = CRM.deal(id);
    if (!d) return;
    var c = CRM.company(d.companyId);
    var history = CRM.ws()
      .activities.filter(function (a) {
        return a.dealId === id;
      })
      .slice(0, 6);
    var extra =
      '<div class="col-12"><div class="d-flex justify-content-between align-items-center mb-2"><label class="form-label mb-0">History</label>' +
      (c ? '<a class="crm-small" href="customer.html?id=' + c.id + '">Open ' + esc(c.name) + " →</a>" : "") +
      '</div><ul class="crm-timeline">' +
      (history.length
        ? history
            .map(function (a) {
              return '<li><span class="dot bg-gradient-primary"><i class="mdi mdi-history"></i></span><div class="body">' + esc(a.body) + '</div><div class="meta">' + UI.ago(a.at) + "</div></li>";
            })
            .join("")
        : '<li class="crm-muted ps-0">No history yet.</li>') +
      '</ul><div class="input-group mt-2"><input class="form-control" id="deal-note" placeholder="Add a note to this deal"><button class="btn btn-gradient-primary" type="button" id="deal-note-btn">Add</button></div></div>';
    UI.openDealForm(d);
    var body = document.querySelector("#crm-modal .modal-body .row");
    body.insertAdjacentHTML("beforeend", extra);
    document.getElementById("deal-note-btn").addEventListener("click", function () {
      var input = document.getElementById("deal-note");
      if (!input.value.trim()) return;
      CRM.addActivity("note", input.value.trim(), { companyId: d.companyId, dealId: d.id });
      CRM.updateDeal(d.id, {});
      input.value = "";
      UI.toast("Note added");
      bootstrap.Modal.getInstance(document.getElementById("crm-modal")).hide();
      render();
    });
  }

  document.getElementById("f-text").addEventListener("input", function () {
    filters.text = this.value.trim().toLowerCase();
    render();
  });
  ownerSel.addEventListener("change", function () {
    filters.owner = this.value;
    render();
  });
  var seg = document.getElementById("f-view");
  function syncSeg() {
    seg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-v") === filters.view);
    });
  }
  seg.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    filters.view = b.getAttribute("data-v");
    syncSeg();
    render();
  });
  document.addEventListener("crm:data", render);

  syncSeg();
  render();

  var focus = UI.qs("deal");
  if (focus) {
    var el = document.querySelector('.crm-deal[data-id="' + focus + '"]');
    if (el) {
      el.scrollIntoView({ block: "center", inline: "center" });
      el.classList.add("flash");
    }
  }
})();
