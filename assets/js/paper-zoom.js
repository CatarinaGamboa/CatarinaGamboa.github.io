/* Paper pages: open a poster in an in-page viewer. Click or tap to zoom in at that point, drag/scroll to pan, Esc to close. */
(function () {
  "use strict";
  var links = document.querySelectorAll(".poster");
  if (!links.length) return;
  var box = document.createElement("div");
  box.className = "pp-zoom";
  box.hidden = true;
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Poster");
  box.innerHTML = '<div class="pp-zoom-bar"><span class="pp-zoom-hint">Click or tap the poster to zoom in</span>' +
    '<a class="pp-zoom-pdf" target="_blank" rel="noopener"><span class="fa fa-file-pdf-o"></span> PDF</a>' +
    '<button class="pp-zoom-close" aria-label="Close"><span class="fa fa-times"></span></button></div>' +
    '<div class="pp-zoom-stage"><img alt=""></div>';
  document.body.appendChild(box);
  var stage = box.querySelector(".pp-zoom-stage"), img = box.querySelector("img"), hint = box.querySelector(".pp-zoom-hint");
  var pdf = box.querySelector(".pp-zoom-pdf"), closeBtn = box.querySelector(".pp-zoom-close"), opener = null;

  function setZoom(on, x, y) {
    // x, y: click position as a fraction of the image
    box.classList.toggle("zoomed", on);
    hint.textContent = on ? "Drag to move. Click to zoom out" : "Click or tap the poster to zoom in";
    if (on) {
      stage.scrollLeft = x * img.offsetWidth - stage.clientWidth / 2;
      stage.scrollTop = y * img.offsetHeight - stage.clientHeight / 2;
    }
  }
  function open(a) {
    opener = a;
    var src = a.querySelector("img");
    img.src = src.currentSrc || src.src;
    img.alt = src.alt;
    pdf.href = a.dataset.pdf || "";
    pdf.hidden = !a.dataset.pdf;
    box.hidden = false;
    document.documentElement.classList.add("pp-zoom-open");
    setZoom(false);
    closeBtn.focus();
  }
  function close() {
    box.hidden = true;
    document.documentElement.classList.remove("pp-zoom-open");
    if (opener) opener.focus();
  }
  Array.prototype.forEach.call(links, function (a) {
    a.addEventListener("click", function () { open(a); });
  });

  // Click toggles zoom; a drag pans without toggling.
  var drag = null;
  img.addEventListener("pointerdown", function (e) {
    drag = { x: e.clientX, y: e.clientY, sl: stage.scrollLeft, st: stage.scrollTop, moved: false };
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag || !box.classList.contains("zoomed") || e.pointerType === "touch") return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    stage.scrollLeft = drag.sl - dx; stage.scrollTop = drag.st - dy;
  });
  window.addEventListener("pointerup", function () { setTimeout(function () { drag = null; }, 0); });
  img.addEventListener("click", function (e) {
    if (drag && drag.moved) return;
    var r = img.getBoundingClientRect();
    setZoom(!box.classList.contains("zoomed"), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  });
  stage.addEventListener("click", function (e) { if (e.target === stage) close(); });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { // keep focus inside the viewer
      var f = [pdf, closeBtn].filter(function (el) { return !el.hidden; });
      var i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
    }
  });
})();
