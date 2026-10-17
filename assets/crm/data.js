/*
 * CRM data layer.
 *
 * Everything lives in the browser (localStorage) for now, grouped by workspace so
 * each business that uses the CRM keeps its own customers, deals and team.
 * The record shapes match supabase/schema.sql, so this file is the only thing
 * that changes when the app moves to a real database.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "rapport-crm-v1";
  var MEMBER_COLORS = ["#b66dff", "#fe7096", "#07cdae", "#047edf", "#f6b44b"];

  // ---------- small helpers ----------

  function uid(prefix) {
    return (prefix || "") + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  function startOfDay(d) {
    var x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function addMinutes(d, n) {
    return new Date(new Date(d).getTime() + n * 60000);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ---------- seed data ----------

  function defaultStages(wsId) {
    return [
      ["lead", "Lead", 0.1, "open"],
      ["qualified", "Qualified", 0.25, "open"],
      ["proposal", "Proposal", 0.5, "open"],
      ["negotiation", "Negotiation", 0.75, "open"],
      ["won", "Won", 1, "won"],
      ["lost", "Lost", 0, "lost"],
    ].map(function (s, i) {
      return { id: wsId + "-" + s[0], workspaceId: wsId, name: s[1], order: i, probability: s[2], kind: s[3] };
    });
  }

  var COMPANIES = [
    ["Gulf Pearl Logistics", "Logistics", "Shuwaikh"],
    ["Sahara Tech Solutions", "Software", "Kuwait City"],
    ["Al Noor Clinics", "Healthcare", "Salmiya"],
    ["Desert Rose Hospitality", "Hospitality", "Fintas"],
    ["Blue Dhow Trading", "Retail", "Hawalli"],
    ["Mirqab Engineering", "Construction", "Mirqab"],
    ["Falcon Fitness", "Fitness", "Jabriya"],
    ["Qurain Foods", "Food & Beverage", "Qurain"],
    ["Sharq Capital", "Finance", "Sharq"],
    ["Ahmadi Energy Services", "Energy", "Ahmadi"],
    ["Bneid Al Gar Studios", "Media", "Bneid Al Gar"],
    ["Mishref Academy", "Education", "Mishref"],
    ["Coral Reef Interiors", "Design", "Salmiya"],
    ["Jahra Auto Parts", "Automotive", "Jahra"],
    ["Mangaf Marine", "Marine", "Mangaf"],
    ["Rawda Pharmacy Group", "Healthcare", "Rawda"],
  ];
  var FIRST = ["Ahmad", "Fatima", "Yousef", "Noura", "Khaled", "Mariam", "Omar", "Sara", "Hamad", "Dana", "Faisal", "Lulwa"];
  var LAST = ["Al-Sabah", "Al-Mutairi", "Al-Ajmi", "Al-Enezi", "Al-Rashidi", "Al-Kandari", "Al-Hajri", "Al-Shammari"];
  var TITLES = ["CEO", "Operations Manager", "Head of Procurement", "IT Director", "Marketing Lead", "CFO"];
  var DEAL_KINDS = [
    "Annual subscription",
    "Fleet tracking rollout",
    "Website redesign",
    "POS system upgrade",
    "Staff training program",
    "Support contract",
    "Mobile app build",
    "Analytics package",
  ];
  var NOTES = [
    "Discussed pricing tiers, they want a 12-month plan.",
    "Sent the updated proposal with onboarding included.",
    "Demo went well, decision maker joins next call.",
    "Asked for references from similar clients.",
    "Budget approved for Q1, waiting on legal review.",
    "Follow-up call booked to walk through the contract.",
  ];

  function emptyWorkspace(id, name, owner) {
    return {
      workspace: { id: id, name: name, currency: "KWD", taxRate: 0, createdAt: nowIso() },
      members: [
        {
          id: id + "-m0",
          workspaceId: id,
          name: owner.name,
          email: owner.email,
          role: "owner",
          title: "Owner",
          color: MEMBER_COLORS[0],
          target: 25000,
        },
      ],
      companies: [],
      contacts: [],
      stages: defaultStages(id),
      deals: [],
      activities: [],
      events: [],
      invoices: [],
    };
  }

  function demoWorkspace() {
    var id = "ws-demo";
    var r = rng(42);
    function pick(xs) {
      return xs[Math.floor(r() * xs.length)];
    }
    var now = new Date();
    var today = startOfDay(now);
    function iso(d) {
      return d.toISOString();
    }

    var members = [
      ["Azzy", "azzy@example.com", "owner", "Founder", 30000],
      ["Reem Al-Ali", "reem@example.com", "admin", "Sales Manager", 25000],
      ["Bader Hussain", "bader@example.com", "rep", "Account Executive", 20000],
      ["Hessa Saleh", "hessa@example.com", "rep", "Account Executive", 20000],
      ["Tariq Mansour", "tariq@example.com", "rep", "Sales Rep", 12000],
    ].map(function (m, i) {
      return {
        id: id + "-m" + i,
        workspaceId: id,
        name: m[0],
        email: m[1],
        role: m[2],
        title: m[3],
        color: MEMBER_COLORS[i],
        target: m[4],
      };
    });

    var stages = defaultStages(id);

    var companies = COMPANIES.map(function (c, i) {
      return {
        id: id + "-c" + i,
        workspaceId: id,
        name: c[0],
        industry: c[1],
        city: c[2],
        website: c[0].toLowerCase().replace(/[^a-z]+/g, "") + ".com.kw",
        status: i < 11 ? "active" : i < 15 ? "lead" : "churned",
        ownerId: members[i % members.length].id,
        tags: [pick(["VIP", "SMB", "Enterprise", "Referral", "Inbound"])],
        createdAt: iso(addDays(today, -(20 + Math.floor(r() * 300)))),
      };
    });

    var contacts = [];
    companies.forEach(function (c, i) {
      for (var j = 0; j < 1 + (i % 2); j++) {
        var name = pick(FIRST) + " " + pick(LAST);
        contacts.push({
          id: c.id + "-p" + j,
          workspaceId: id,
          companyId: c.id,
          name: name,
          title: pick(TITLES),
          email: name.split(" ")[0].toLowerCase() + "@" + c.website,
          phone: "+965 " + (5 + Math.floor(r() * 5)) + Math.floor(1000000 + r() * 8999999),
        });
      }
    });

    var deals = [];
    var perStage = [5, 5, 4, 3, 11, 4];
    var n = 0;
    stages.forEach(function (s, si) {
      for (var k = 0; k < perStage[si]; k++) {
        var company = companies[(n * 7) % companies.length];
        var closed = s.kind !== "open";
        // Closed deals are spread across the last ~6 months so the charts have history.
        var close = closed ? addDays(today, -(k * 16 + Math.floor(r() * 12))) : addDays(today, Math.floor(r() * 75) + 3);
        var contact = contacts.filter(function (p) {
          return p.companyId === company.id;
        })[0];
        deals.push({
          id: id + "-d" + n,
          workspaceId: id,
          title: pick(DEAL_KINDS),
          companyId: company.id,
          contactId: contact ? contact.id : null,
          ownerId: company.ownerId,
          stageId: s.id,
          value: Math.round((800 + r() * 14000) / 50) * 50,
          expectedClose: iso(close),
          createdAt: iso(addDays(today, -(Math.floor(r() * 170) + 5))),
          updatedAt: iso(addDays(today, -Math.floor(r() * (closed ? 160 : 21)))),
          position: k,
        });
        n++;
      }
    });

    var activities = [];
    for (var i = 0; i < 40; i++) {
      var d = deals[i % deals.length];
      activities.push({
        id: id + "-a" + i,
        workspaceId: id,
        kind: pick(["call", "email", "meeting", "note"]),
        body: pick(NOTES),
        companyId: d.companyId,
        dealId: d.id,
        memberId: d.ownerId,
        at: iso(addMinutes(addDays(now, -Math.floor(i / 3)), -Math.floor(r() * 600))),
      });
    }
    activities.sort(function (a, b) {
      return b.at.localeCompare(a.at);
    });

    var events = [];
    for (var e = 0; e < 34; e++) {
      var c = companies[e % companies.length];
      var kind = pick(["call", "meeting", "demo", "follow-up"]);
      var start = addMinutes(addDays(today, Math.floor(e / 2.4) - 5), (9 + Math.floor(r() * 8)) * 60 + (r() > 0.5 ? 30 : 0));
      events.push({
        id: id + "-e" + e,
        workspaceId: id,
        title: kind.charAt(0).toUpperCase() + kind.slice(1) + " with " + c.name,
        kind: kind,
        start: iso(start),
        durationMin: pick([30, 45, 60]),
        memberId: c.ownerId,
        companyId: c.id,
        done: start < now,
      });
    }

    var invoices = deals
      .filter(function (d) {
        return d.stageId === id + "-won";
      })
      .map(function (d, i) {
        var status = i < 4 ? "paid" : i === 4 ? "overdue" : i < 7 ? "sent" : "draft";
        // Sent invoices were issued recently so they're still within terms; drafts are today's.
        var issued = status === "sent" ? addDays(today, -(4 + i)) : status === "draft" ? today : new Date(d.expectedClose);
        return {
          id: id + "-i" + i,
          workspaceId: id,
          number: "INV-" + (1001 + i),
          companyId: d.companyId,
          dealId: d.id,
          status: status,
          issuedAt: iso(issued),
          dueAt: iso(status === "overdue" ? addDays(today, -6) : addDays(issued, 30)),
          items: [
            { description: d.title, quantity: 1, unitPrice: Math.round(d.value * 0.8) },
            { description: "Onboarding & setup", quantity: 1, unitPrice: Math.round(d.value * 0.2) },
          ],
          taxRate: 0,
          notes: "Thank you for your business.",
        };
      });

    return {
      workspace: { id: id, name: "Azzy Sales Co.", currency: "KWD", taxRate: 0, createdAt: iso(addDays(today, -365)) },
      members: members,
      companies: companies,
      contacts: contacts,
      stages: stages,
      deals: deals,
      activities: activities,
      events: events,
      invoices: invoices,
    };
  }

  // ---------- persistence ----------

  function freshState() {
    var demo = demoWorkspace();
    var ws = {};
    ws[demo.workspace.id] = demo;
    return { workspaces: ws, currentId: demo.workspace.id, theme: "light" };
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.workspaces && parsed.workspaces[parsed.currentId]) return parsed;
      }
    } catch (err) {
      /* storage blocked or corrupt: fall back to demo data */
    }
    var fresh = freshState();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch (err) {
      /* ignore */
    }
    return fresh;
  }

  var state = load();
  var listeners = [];

  // Sent invoices past their due date become overdue.
  (function markOverdue() {
    var today = startOfDay(new Date()).toISOString();
    Object.keys(state.workspaces).forEach(function (k) {
      state.workspaces[k].invoices.forEach(function (inv) {
        if (inv.status === "sent" && inv.dueAt < today) inv.status = "overdue";
      });
    });
  })();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      /* ignore quota / private mode */
    }
    listeners.forEach(function (fn) {
      fn();
    });
  }

  function ws() {
    return state.workspaces[state.currentId];
  }

  function me() {
    return ws().members[0];
  }

  function log(kind, body, refs) {
    ws().activities.unshift({
      id: uid("a-"),
      workspaceId: ws().workspace.id,
      kind: kind,
      body: body,
      companyId: refs && refs.companyId,
      dealId: refs && refs.dealId,
      memberId: me().id,
      at: nowIso(),
    });
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // ---------- derived numbers ----------

  function stageOf(deal) {
    return byId(ws().stages, deal.stageId);
  }

  function invoiceTotal(inv) {
    var sub = inv.items.reduce(function (s, it) {
      return s + it.quantity * it.unitPrice;
    }, 0);
    return { subtotal: sub, tax: sub * (inv.taxRate || 0), total: sub * (1 + (inv.taxRate || 0)) };
  }

  // Deals the CRM thinks need attention: open, and untouched for 14+ days or past their close date.
  function staleDeals() {
    var cutoff = addDays(new Date(), -14).toISOString();
    var today = startOfDay(new Date()).toISOString();
    return ws().deals.filter(function (d) {
      var s = stageOf(d);
      return s && s.kind === "open" && (d.updatedAt < cutoff || d.expectedClose < today);
    });
  }

  // ---------- public API ----------

  var CRM = {
    uid: uid,
    addDays: addDays,
    startOfDay: startOfDay,
    MEMBER_COLORS: MEMBER_COLORS,

    get state() {
      return state;
    },
    ws: ws,
    me: me,
    byId: byId,
    stageOf: stageOf,
    invoiceTotal: invoiceTotal,
    staleDeals: staleDeals,
    onChange: function (fn) {
      listeners.push(fn);
    },

    company: function (id) {
      return byId(ws().companies, id);
    },
    member: function (id) {
      return byId(ws().members, id);
    },
    contact: function (id) {
      return byId(ws().contacts, id);
    },
    deal: function (id) {
      return byId(ws().deals, id);
    },

    // theme + workspaces
    setTheme: function (t) {
      state.theme = t;
      save();
    },
    switchWorkspace: function (id) {
      if (state.workspaces[id]) {
        state.currentId = id;
        save();
      }
    },
    createWorkspace: function (name, owner) {
      var id = uid("ws-");
      state.workspaces[id] = emptyWorkspace(id, name, owner || { name: me().name, email: me().email });
      state.currentId = id;
      save();
      return id;
    },
    deleteWorkspace: function (id) {
      if (Object.keys(state.workspaces).length < 2) return false;
      delete state.workspaces[id];
      if (state.currentId === id) state.currentId = Object.keys(state.workspaces)[0];
      save();
      return true;
    },
    updateWorkspace: function (patch) {
      Object.assign(ws().workspace, patch);
      save();
    },
    resetDemo: function () {
      var demo = demoWorkspace();
      state.workspaces[demo.workspace.id] = demo;
      state.currentId = demo.workspace.id;
      save();
    },
    exportJson: function () {
      return JSON.stringify(ws(), null, 2);
    },
    importJson: function (text) {
      var data = JSON.parse(text);
      if (!data || !data.workspace || !Array.isArray(data.deals)) throw new Error("Not a CRM export file");
      state.workspaces[data.workspace.id] = data;
      state.currentId = data.workspace.id;
      save();
    },

    // companies & contacts
    addCompany: function (c, contact) {
      var id = uid("c-");
      ws().companies.unshift(
        Object.assign({ id: id, workspaceId: ws().workspace.id, createdAt: nowIso(), tags: [], status: "lead" }, c),
      );
      if (contact && contact.name) {
        ws().contacts.push(Object.assign({ id: uid("p-"), workspaceId: ws().workspace.id, companyId: id }, contact));
      }
      log("note", "Added customer " + c.name, { companyId: id });
      save();
      return id;
    },
    updateCompany: function (id, patch) {
      Object.assign(byId(ws().companies, id), patch);
      save();
    },
    deleteCompany: function (id) {
      var w = ws();
      w.companies = w.companies.filter(function (c) {
        return c.id !== id;
      });
      w.contacts = w.contacts.filter(function (c) {
        return c.companyId !== id;
      });
      w.deals = w.deals.filter(function (d) {
        return d.companyId !== id;
      });
      save();
    },
    addContact: function (c) {
      ws().contacts.push(Object.assign({ id: uid("p-"), workspaceId: ws().workspace.id }, c));
      save();
    },
    deleteContact: function (id) {
      ws().contacts = ws().contacts.filter(function (c) {
        return c.id !== id;
      });
      save();
    },

    // deals
    addDeal: function (d) {
      var deal = Object.assign(
        { id: uid("d-"), workspaceId: ws().workspace.id, createdAt: nowIso(), updatedAt: nowIso(), position: -1 },
        d,
      );
      ws().deals.unshift(deal);
      log("note", 'Created deal "' + deal.title + '"', { companyId: deal.companyId, dealId: deal.id });
      save();
      return deal.id;
    },
    updateDeal: function (id, patch) {
      Object.assign(byId(ws().deals, id), patch, { updatedAt: nowIso() });
      save();
    },
    deleteDeal: function (id) {
      ws().deals = ws().deals.filter(function (d) {
        return d.id !== id;
      });
      save();
    },
    // Puts a deal into a stage at a position; orderedIds is the column's new order.
    moveDeal: function (id, stageId, orderedIds) {
      var deal = byId(ws().deals, id);
      if (!deal) return;
      var changed = deal.stageId !== stageId;
      deal.stageId = stageId;
      if (changed) {
        deal.updatedAt = nowIso();
        log("stage", 'Moved "' + deal.title + '" to ' + byId(ws().stages, stageId).name, {
          companyId: deal.companyId,
          dealId: deal.id,
        });
      }
      orderedIds.forEach(function (dealId, i) {
        var d = byId(ws().deals, dealId);
        if (d) d.position = i;
      });
      save();
    },

    // activity
    addActivity: function (kind, body, refs) {
      log(kind, body, refs);
      save();
    },

    // schedule
    addEvent: function (e) {
      ws().events.push(Object.assign({ id: uid("e-"), workspaceId: ws().workspace.id, done: false }, e));
      save();
    },
    updateEvent: function (id, patch) {
      Object.assign(byId(ws().events, id), patch);
      save();
    },
    deleteEvent: function (id) {
      ws().events = ws().events.filter(function (e) {
        return e.id !== id;
      });
      save();
    },

    // invoices
    addInvoice: function (inv) {
      var max = ws().invoices.reduce(function (m, x) {
        return Math.max(m, parseInt(x.number.replace(/\D/g, ""), 10) || 1000);
      }, 1000);
      var id = uid("i-");
      ws().invoices.unshift(
        Object.assign({ id: id, workspaceId: ws().workspace.id, number: "INV-" + (max + 1), notes: "" }, inv),
      );
      save();
      return id;
    },
    updateInvoice: function (id, patch) {
      Object.assign(byId(ws().invoices, id), patch);
      save();
    },
    deleteInvoice: function (id) {
      ws().invoices = ws().invoices.filter(function (x) {
        return x.id !== id;
      });
      save();
    },

    // team
    addMember: function (m) {
      ws().members.push(
        Object.assign(
          { id: uid("m-"), workspaceId: ws().workspace.id, color: MEMBER_COLORS[ws().members.length % MEMBER_COLORS.length] },
          m,
        ),
      );
      save();
    },
    updateMember: function (id, patch) {
      Object.assign(byId(ws().members, id), patch);
      save();
    },
    removeMember: function (id) {
      ws().members = ws().members.filter(function (m) {
        return m.id !== id || m.role === "owner";
      });
      save();
    },
  };

  global.CRM = CRM;
})(window);
