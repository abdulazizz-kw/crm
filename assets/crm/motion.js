/*
 * Motion layer, loaded last on every page.
 * - Page enter: cards rise in with a soft blur, one after another.
 * - Page leave: content blurs out before following an in-app link.
 * - Sidebar: the active highlight slides from the previous page's item.
 * - Numbers marked with data-count count up; progress bars fill from zero.
 * Everything is skipped when the viewer prefers reduced motion.
 */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  if (reduce) {
    root.classList.add("crm-still");
    return;
  }

  // ---------- page enter ----------

  function stagger() {
    var items = document.querySelectorAll(
      ".content-wrapper > .page-header, .content-wrapper .grid-margin, .content-wrapper .crm-col, .content-wrapper > .card, .content-wrapper .col-lg-4 > .card, .content-wrapper .col-lg-8 > .card, .content-wrapper .crm-invoice",
    );
    Array.prototype.forEach.call(items, function (el, i) {
      el.style.setProperty("--d", Math.min(i, 14) * 45 + "ms");
      el.classList.add("crm-enter");
    });
    // Table rows and kanban cards cascade in after their container.
    Array.prototype.forEach.call(document.querySelectorAll(".content-wrapper tbody"), function (tb) {
      Array.prototype.forEach.call(tb.children, function (tr, i) {
        if (i > 18) return;
        tr.style.setProperty("--d", 120 + i * 28 + "ms");
        tr.classList.add("crm-enter-row");
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".crm-col-body"), function (col, c) {
      Array.prototype.forEach.call(col.children, function (card, i) {
        card.style.setProperty("--d", 120 + c * 60 + i * 50 + "ms");
        card.classList.add("crm-enter-row");
      });
    });
  }

  // ---------- page leave ----------

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || a.target === "_blank" || /^(mailto:|tel:|https?:)/.test(href) || a.hasAttribute("download")) return;
    e.preventDefault();
    leave(href);
  });

  // Rows and cards that navigate by data-href use this too.
  function leave(href) {
    root.classList.add("crm-leaving");
    setTimeout(function () {
      location.href = href;
    }, 170);
  }
  window.CRMMotion = { leave: leave };

  // Back/forward cache restores the faded page; undo that.
  window.addEventListener("pageshow", function (e) {
    if (e.persisted) root.classList.remove("crm-leaving");
  });

  // ---------- sidebar highlight ----------

  function slideSidebar() {
    var nav = document.querySelector("#sidebar > .nav");
    var active = nav && nav.querySelector(":scope > .nav-item.active");
    if (!active) return;
    var items = Array.prototype.slice.call(nav.querySelectorAll(":scope > .nav-item:not(.nav-profile):not(.sidebar-actions)"));
    var index = items.indexOf(active);
    var prev = null;
    try {
      prev = sessionStorage.getItem("crm-nav-index");
      sessionStorage.setItem("crm-nav-index", String(index));
    } catch (err) {
      /* ignore */
    }
    var pill = document.createElement("span");
    pill.className = "crm-nav-pill";
    nav.style.position = "relative";
    nav.insertBefore(pill, nav.firstChild);
    var to = active.offsetTop;
    pill.style.top = to + "px";
    pill.style.height = active.offsetHeight + "px";
    if (prev !== null && +prev !== index && items[+prev]) {
      var from = items[+prev].offsetTop;
      pill.animate([{ transform: "translateY(" + (from - to) + "px)" }, { transform: "none" }], {
        duration: 420,
        easing: "cubic-bezier(.3,.9,.3,1)",
      });
    }
  }

  // ---------- numbers and bars ----------

  // While counting, money shows whole units so the decimals don't flicker; the final text is restored after.
  function formatCount(v, fmt) {
    if (fmt === "pct") return Math.round(v) + "%";
    if (fmt === "int") return String(Math.round(v));
    return UI.money(v, { whole: true });
  }

  function countUp(el) {
    if (el.__counted) return;
    el.__counted = true;
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var fmt = el.getAttribute("data-format");
    var final = el.textContent;
    var start = performance.now();
    var dur = 900;
    function tick(now) {
      var t = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = t < 1 ? formatCount(target * eased, fmt) : final;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function fillBar(span) {
    if (span.__filled) return;
    span.__filled = true;
    var w = span.style.width;
    span.style.width = "0%";
    span.getBoundingClientRect();
    span.style.transition = "width 900ms cubic-bezier(.2,.8,.2,1)";
    requestAnimationFrame(function () {
      span.style.width = w;
    });
  }

  function animateIn(scope) {
    Array.prototype.forEach.call(scope.querySelectorAll("[data-count]"), countUp);
    Array.prototype.forEach.call(scope.querySelectorAll(".crm-progress > span"), fillBar);
  }

  // Numbers and bars animate on first load and when a section is first filled in;
  // later re-renders after edits show the new values straight away.
  var observing = true;
  var mo = new MutationObserver(function (records) {
    if (!observing) return;
    records.forEach(function (r) {
      Array.prototype.forEach.call(r.addedNodes, function (n) {
        if (n.nodeType === 1) animateIn(n);
      });
    });
  });

  stagger();
  slideSidebar();
  animateIn(document);
  mo.observe(document.querySelector(".content-wrapper") || document.body, { childList: true, subtree: true });
  setTimeout(function () {
    observing = false;
    mo.disconnect();
  }, 1500);
})();
