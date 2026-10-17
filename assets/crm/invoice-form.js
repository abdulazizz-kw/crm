// Create / edit invoice dialog, shared by the Invoices list and the single invoice page.
(function (global) {
  "use strict";
  var esc = UI.esc;

  function itemRow(it) {
    it = it || { description: "", quantity: 1, unitPrice: "" };
    return (
      '<div class="row g-2 mb-2 inv-item"><div class="col-6"><input class="form-control" data-k="description" placeholder="Description" value="' +
      esc(it.description) +
      '"></div><div class="col-2"><input class="form-control" data-k="quantity" type="number" min="0" step="1" value="' +
      esc(it.quantity) +
      '" aria-label="Quantity"></div><div class="col-3"><input class="form-control" data-k="unitPrice" type="number" min="0" step="0.001" placeholder="Price" value="' +
      esc(it.unitPrice) +
      '" aria-label="Unit price"></div><div class="col-1 d-flex align-items-center"><button type="button" class="btn btn-link text-muted p-0" data-remove-item aria-label="Remove line"><i class="mdi mdi-close"></i></button></div></div>'
    );
  }

  function wonDealsFor(companyId) {
    return CRM.ws().deals.filter(function (d) {
      return d.companyId === companyId && CRM.stageOf(d).kind === "won";
    });
  }

  function open(inv, defaults) {
    defaults = defaults || {};
    var w = CRM.ws();
    if (!w.companies.length) {
      UI.toast("Add a customer before creating invoices.", "warning");
      return;
    }
    var companyId = inv ? inv.companyId : defaults.companyId || UI.companyOptions()[0].value;
    var items = inv ? inv.items : [];
    var extra =
      '<div class="col-12"><label class="form-label">Line items</label><div class="row g-2 mb-1 crm-muted crm-small"><div class="col-6">Description</div><div class="col-2">Qty</div><div class="col-3">Unit price</div></div><div id="inv-items">' +
      (items.length ? items.map(itemRow).join("") : itemRow()) +
      '</div><button type="button" class="btn btn-sm btn-inverse-primary" id="inv-add-item"><i class="mdi mdi-plus"></i> Add line</button><div class="text-end fw-bold mt-2" id="inv-total"></div></div>';

    UI.formModal({
      title: inv ? "Edit " + inv.number : "New invoice",
      submit: inv ? "Save invoice" : "Create invoice",
      wide: true,
      fields: [
        { name: "companyId", label: "Bill to", type: "select", options: UI.companyOptions(), value: companyId, col: "col-md-6" },
        { name: "dealId", label: "From won deal (optional)", type: "select", options: [{ value: "", label: "None" }], value: "", col: "col-md-6" },
        { name: "issuedAt", label: "Issue date", type: "date", required: true, value: UI.toInputDate(inv ? inv.issuedAt : null), col: "col-md-4" },
        { name: "dueAt", label: "Due date", type: "date", required: true, value: UI.toInputDate(inv ? inv.dueAt : CRM.addDays(new Date(), 30)), col: "col-md-4" },
        { name: "taxRate", label: "Tax %", type: "number", step: "0.01", min: 0, value: inv ? Math.round(inv.taxRate * 10000) / 100 : (w.workspace.taxRate || 0) * 100, col: "col-md-4" },
        { name: "notes", label: "Note on invoice", type: "textarea", value: inv ? inv.notes || "" : "Thank you for your business." },
      ],
      extraHtml: extra,
      onMount: function (form) {
        var dealSel = form.querySelector("[name=dealId]");
        var list = form.querySelector("#inv-items");
        function fillDeals() {
          var cid = form.querySelector("[name=companyId]").value;
          dealSel.innerHTML =
            '<option value="">None</option>' +
            wonDealsFor(cid)
              .map(function (d) {
                return '<option value="' + d.id + '"' + (inv && inv.dealId === d.id ? " selected" : "") + ">" + esc(d.title + " · " + UI.money(d.value)) + "</option>";
              })
              .join("");
        }
        function total() {
          var sum = 0;
          list.querySelectorAll(".inv-item").forEach(function (r) {
            sum += (parseFloat(r.querySelector('[data-k="quantity"]').value) || 0) * (parseFloat(r.querySelector('[data-k="unitPrice"]').value) || 0);
          });
          var tax = (parseFloat(form.querySelector("[name=taxRate]").value) || 0) / 100;
          form.querySelector("#inv-total").textContent = "Total " + UI.money(sum * (1 + tax));
        }
        fillDeals();
        total();
        form.querySelector("[name=companyId]").addEventListener("change", fillDeals);
        dealSel.addEventListener("change", function () {
          var d = CRM.deal(dealSel.value);
          if (!d) return;
          list.innerHTML = itemRow({ description: d.title, quantity: 1, unitPrice: d.value });
          total();
        });
        form.addEventListener("input", total);
        form.querySelector("#inv-add-item").addEventListener("click", function () {
          list.insertAdjacentHTML("beforeend", itemRow());
        });
        list.addEventListener("click", function (e) {
          if (e.target.closest("[data-remove-item]") && list.children.length > 1) {
            e.target.closest(".inv-item").remove();
            total();
          }
        });
      },
      onSubmit: function (d, form) {
        var lines = [];
        form.querySelectorAll(".inv-item").forEach(function (r) {
          var desc = r.querySelector('[data-k="description"]').value.trim();
          var price = parseFloat(r.querySelector('[data-k="unitPrice"]').value);
          if (!desc && !price) return;
          lines.push({ description: desc || "Item", quantity: parseFloat(r.querySelector('[data-k="quantity"]').value) || 1, unitPrice: price || 0 });
        });
        if (!lines.length) {
          UI.toast("Add at least one line item.", "warning");
          return false;
        }
        var data = {
          companyId: d.companyId,
          dealId: d.dealId || null,
          issuedAt: UI.fromInputDate(d.issuedAt),
          dueAt: UI.fromInputDate(d.dueAt),
          taxRate: (parseFloat(d.taxRate) || 0) / 100,
          notes: d.notes,
          items: lines,
        };
        if (inv) {
          CRM.updateInvoice(inv.id, data);
          UI.toast("Invoice saved");
          document.dispatchEvent(new Event("crm:data"));
        } else {
          data.status = "draft";
          var id = CRM.addInvoice(data);
          location.href = "invoice.html?id=" + id;
        }
      },
    });
  }

  global.InvoiceForm = { open: open };
})(window);
