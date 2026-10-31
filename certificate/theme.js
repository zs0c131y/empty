/* Light/dark toggle. Follows the system setting until the visitor picks one. */
(function () {
  "use strict";
  var root = document.documentElement;
  var btn = document.getElementById("theme-toggle");
  var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function current() {
    var t = root.getAttribute("data-theme");
    return t || (mq && mq.matches ? "dark" : "light");
  }
  function sync() {
    btn.setAttribute("aria-label", current() === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }
  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("fts-theme", next); } catch (e) { /* private mode: still works for this visit */ }
    sync();
  });
  if (mq && mq.addEventListener) mq.addEventListener("change", sync);
  sync();
})();
