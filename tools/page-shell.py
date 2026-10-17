"""Wraps a page's content in the shared PurpleAdmin shell.

Usage: python3 tools/page-shell.py <name> "<Title>" [chart] [sortable]
Reads the page body from tools/pages/<name>.body.html and writes <name>.html.
Run it again after editing the shell below; page content lives in the .body.html files.
"""
import sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
name, title, *extras = sys.argv[1:]
body = (root / "tools" / "pages" / f"{name}.body.html").read_text()

scripts = ['assets/crm/data.js', 'assets/crm/ui.js', 'assets/vendors/js/vendor.bundle.base.js']
if 'chart' in extras:
    scripts.append('assets/vendors/chart.js/Chart.min.js')
if 'invoiceform' in extras:
    scripts.append('assets/crm/invoice-form.js')
if 'sortable' in extras:
    scripts.append('assets/vendors/sortable/Sortable.min.js')
scripts += ['assets/js/off-canvas.js', 'assets/js/hoverable-collapse.js', 'assets/js/misc.js', f'assets/crm/pages/{name}.js']
tags = "\n".join(f'    <script src="{s}"></script>' for s in scripts)

html = f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>{title} · Purple CRM</title>
    <script src="assets/crm/theme.js"></script>
    <link rel="stylesheet" href="assets/vendors/mdi/css/materialdesignicons.min.css">
    <link rel="stylesheet" href="assets/vendors/css/vendor.bundle.base.css">
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/crm/crm.css">
    <link rel="shortcut icon" href="assets/images/favicon.ico" />
  </head>
  <body>
    <div class="container-scroller">
      <div id="crm-navbar"></div>
      <div class="container-fluid page-body-wrapper">
        <div id="crm-sidebar"></div>
        <div class="main-panel">
          <div class="content-wrapper">
{body.rstrip()}
          </div>
          <div id="crm-footer"></div>
        </div>
      </div>
    </div>
{tags}
  </body>
</html>
"""
(root / f"{name}.html").write_text(html)
print("wrote", name + ".html")
