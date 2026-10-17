// Loaded in <head> so the saved light/dark theme applies before the page paints.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem("rapport-crm-v1") || "{}");
    if (saved.theme === "dark") document.documentElement.setAttribute("data-theme", "dark");
  } catch (err) {
    /* storage unavailable: stay light */
  }
})();
