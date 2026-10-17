(function () {
  "use strict";
  var esc = UI.esc;
  var CURRENCIES = ["KWD", "SAR", "AED", "QAR", "BHD", "OMR", "USD", "EUR", "GBP"];

  function fillWorkspace() {
    var ws = CRM.ws().workspace;
    document.getElementById("ws-name").value = ws.name;
    document.getElementById("ws-currency").innerHTML = CURRENCIES.map(function (c) {
      return '<option value="' + c + '"' + (c === ws.currency ? " selected" : "") + ">" + c + "</option>";
    }).join("");
    document.getElementById("ws-tax").value = Math.round((ws.taxRate || 0) * 10000) / 100;
  }

  function fillTheme() {
    document.querySelectorAll("#theme-seg button").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-t") === (CRM.state.theme || "light"));
    });
  }

  function fillWorkspaces() {
    var all = CRM.state.workspaces;
    document.getElementById("ws-list").innerHTML = Object.keys(all)
      .map(function (id) {
        var d = all[id];
        var current = id === CRM.state.currentId;
        return (
          '<div class="crm-row py-2 border-bottom"><i class="mdi mdi-briefcase-outline text-primary"></i><div class="grow"><div class="fw-bold">' +
          esc(d.workspace.name) +
          (current ? ' <span class="crm-chip">Current</span>' : "") +
          '</div><div class="crm-muted crm-small">' +
          d.companies.length +
          " customers · " +
          d.deals.length +
          " deals · " +
          d.members.length +
          " people</div></div>" +
          (current ? "" : '<button class="btn btn-sm btn-light" data-switch="' + esc(id) + '">Open</button>') +
          (Object.keys(all).length > 1 ? '<button class="btn btn-sm btn-link text-danger" data-del="' + esc(id) + '" aria-label="Delete workspace"><i class="mdi mdi-delete-outline"></i></button>' : "") +
          "</div>"
        );
      })
      .join("");
  }

  function fillStages() {
    var stages = CRM.ws().stages.slice().sort(function (a, b) {
      return a.order - b.order;
    });
    document.getElementById("stages-form").innerHTML =
      '<div class="row g-2 crm-muted crm-small mb-1"><div class="col-7">Name</div><div class="col-5">Chance to close %</div></div>' +
      stages
        .map(function (s) {
          var locked = s.kind !== "open";
          return (
            '<div class="row g-2 mb-2"><div class="col-7"><input class="form-control" name="name-' +
            esc(s.id) +
            '" value="' +
            esc(s.name) +
            '" required aria-label="Stage name"></div><div class="col-5"><input class="form-control" type="number" min="0" max="100" name="prob-' +
            esc(s.id) +
            '" value="' +
            Math.round(s.probability * 100) +
            '"' +
            (locked ? " disabled" : "") +
            ' aria-label="Chance to close"></div></div>'
          );
        })
        .join("") +
      '<button class="btn btn-gradient-primary mt-2">Save stages</button>';
  }

  document.getElementById("ws-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(this);
    var name = String(fd.get("name")).trim();
    if (!name) return;
    CRM.updateWorkspace({ name: name, currency: fd.get("currency"), taxRate: (parseFloat(fd.get("tax")) || 0) / 100 });
    UI.toast("Workspace saved");
    setTimeout(function () {
      location.reload();
    }, 600);
  });

  document.getElementById("stages-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var fd = new FormData(this);
    CRM.ws().stages.forEach(function (s) {
      var n = String(fd.get("name-" + s.id) || "").trim();
      if (n) s.name = n;
      if (s.kind === "open") s.probability = Math.min(100, Math.max(0, parseFloat(fd.get("prob-" + s.id)) || 0)) / 100;
    });
    CRM.updateWorkspace({});
    UI.toast("Stages saved");
  });

  document.getElementById("theme-seg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var t = b.getAttribute("data-t");
    CRM.setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    var icon = document.querySelector("#crm-theme-toggle i");
    if (icon) icon.className = "mdi " + (t === "dark" ? "mdi-weather-sunny" : "mdi-weather-night");
    fillTheme();
  });

  document.getElementById("ws-list").addEventListener("click", function (e) {
    var sw = e.target.closest("[data-switch]");
    if (sw) {
      CRM.switchWorkspace(sw.getAttribute("data-switch"));
      location.reload();
    }
    var del = e.target.closest("[data-del]");
    if (del) {
      var id = del.getAttribute("data-del");
      var name = CRM.state.workspaces[id].workspace.name;
      if (prompt('This deletes "' + name + '" and everything in it. Type the workspace name to confirm.') === name) {
        CRM.deleteWorkspace(id);
        location.reload();
      }
    }
  });
  document.getElementById("ws-new").addEventListener("click", function () {
    UI.openWorkspaceForm();
  });

  document.getElementById("export").addEventListener("click", function () {
    var name = CRM.ws().workspace.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    UI.downloadFile(name + "-backup.json", CRM.exportJson(), "application/json");
  });
  document.getElementById("import").addEventListener("change", function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        CRM.importJson(String(reader.result));
        UI.toast("Backup imported");
        setTimeout(function () {
          location.href = "index.html";
        }, 600);
      } catch (err) {
        UI.toast("That file isn't a CRM backup.", "warning");
      }
    };
    reader.readAsText(file);
  });
  document.getElementById("reset").addEventListener("click", function () {
    if (confirm("Replace the demo workspace with fresh sample data? Other workspaces aren't touched.")) {
      CRM.resetDemo();
      location.href = "index.html";
    }
  });

  fillWorkspace();
  fillTheme();
  fillWorkspaces();
  fillStages();
})();
