# Purple CRM

A sales CRM dashboard built on the free [PurpleAdmin](https://github.com/BootstrapDash/PurpleAdmin-Free-Admin-Template) Bootstrap template, with the page set and features of the Rapport CRM template: a drag-and-drop pipeline, customer profiles, a team schedule and invoices.

It runs as plain HTML, CSS and JavaScript. There's no build step.

## Run it

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

It starts with demo data (a fictional Kuwaiti sales team). **Settings → Reset demo data** brings it back. **Create account** sets up an empty workspace for a new business.

## Pages

| Page | File | What it does |
|---|---|---|
| Overview | `index.html` | Revenue, open pipeline, win rate, unpaid invoices, revenue chart, weighted forecast, deals needing attention, activity, team progress, today's schedule |
| Pipeline | `pipeline.html` | Kanban board. Drag deals between stages, filter by owner or "needs attention", add a note to a deal |
| Customers | `customers.html` | Searchable, sortable customer list with CSV export |
| Customer profile | `customer.html?id=` | Details, contacts, deals, activity log, upcoming schedule, invoices |
| Schedule | `schedule.html` | Team week calendar (Sunday start). Click a slot to book, click an item to edit |
| Invoices | `invoices.html` | Totals by status and an invoice list. Create invoices from won deals |
| Invoice | `invoice.html?id=` | Printable invoice (Print / Save as PDF), mark sent or paid |
| Team | `team.html` | Teammates, roles, targets and 90-day performance |
| Settings | `settings.html` | Workspace name, currency, tax, pipeline stages, light/dark theme, backup export/import |
| Sign in / Create account | `login.html`, `register.html` | Demo-only for now |

Other things that work across the app:

- Global search in the top bar (press `/`).
- Notifications for today's schedule, overdue invoices and stalled deals.
- Multiple workspaces, one per business, switched from the top-right menu.
- KWD (3 decimals) by default, plus other Gulf currencies, USD, EUR and GBP.
- A light theme (PurpleAdmin) and a dark theme (Rapport-style).

## How it's put together

```
assets/crm/data.js        all data + the demo seed; saves to localStorage, one store per workspace
assets/crm/ui.js          navbar, sidebar, footer, search, notifications, forms, formatting
assets/crm/crm.css        CRM components + dark theme on top of PurpleAdmin's style.css
assets/crm/pages/*.js     one script per page
assets/crm/invoice-form.js  shared new/edit invoice dialog
assets/css, js, vendors   PurpleAdmin (Bootstrap 5.1, jQuery, Chart.js 2, MDI icons) + SortableJS
tools/pages/*.body.html   each page's content; tools/page-shell.py wraps it in the shared layout
supabase/schema.sql       database plan for real accounts (not used yet)
```

To change a page's layout, edit `tools/pages/<page>.body.html` and run:

```sh
python3 tools/page-shell.py <page> "<Title>" [chart] [sortable] [invoiceform]
```

The extra words add Chart.js, SortableJS or the invoice dialog to that page (see the existing pages for which use what).

## What's next

Data is stored in the browser, so each computer has its own copy. Before selling it, the next step is a real backend: accounts, a shared database and access per workspace. `supabase/schema.sql` is the plan for that. Only `assets/crm/data.js` needs to change.

## Licence

PurpleAdmin is MIT licensed by BootstrapDash (see `LICENSE-PurpleAdmin`).
