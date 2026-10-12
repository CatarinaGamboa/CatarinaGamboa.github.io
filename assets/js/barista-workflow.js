/* Redraws Figure 1 of the Barista paper (the agentic workflow) as an
   interactive SVG. Each numbered step is a clickable region.
   BaristaWorkflow.draw(svg) -> { steps: {1: g, 2: g, 3: g, 4: g}, arrows: {...}, loops: {...} } */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(p, x, y, s, cls, anchor) {
    var t = sv("text", { x: x, y: y, "class": cls || "", "text-anchor": anchor || "start" }, p);
    t.textContent = s;
    return t;
  }

  var C = {
    doc: "#4a6b8a", json: "#ef7d1a", green: "#6aa84f", greenTag: "#d9ead3", greenInk: "#3d8b2f",
    red: "#cc1f1f", redTag: "#f6d0d0", redInk: "#cc1f1f", teal: "#1fb5c9", tealTag: "#d3f1f6", tealInk: "#1aa3b6",
    sticky: "#fdf0c2", stickyTop: "#f2c84b", paper: "#f3c7b2", paperLine: "#e39d80"
  };

  function stripes(p, x, y, w, n, color, gap) {
    for (var i = 0; i < n; i++) sv("line", { x1: x, x2: x + w, y1: y + i * gap, y2: y + i * gap, stroke: color, "stroke-width": 3 }, p);
  }

  function win(p, x, y, w, h, bar, o) {
    o = o || {};
    sv("rect", { x: x + 5, y: y + 5, width: w, height: h, fill: "#d5d5d5" }, p);
    sv("rect", { x: x, y: y, width: w, height: h, fill: "#fff", stroke: "#cfcfcf", "stroke-width": 1.5 }, p);
    sv("rect", { x: x, y: y, width: w, height: 13, fill: bar }, p);
    for (var i = 0; i < 3; i++) sv("circle", { cx: x + w - 26 + i * 8, cy: y + 6.5, r: 2.2, fill: "#fff" }, p);
    sv("rect", { x: x, y: y + 13, width: 13, height: h - 13, fill: "#e6e6e6" }, p);
    for (var j = 0; j < Math.floor((h - 20) / 14); j++) sv("rect", { x: x + 4, y: y + 20 + j * 14, width: 5, height: 5, fill: "#b9b9b9" }, p);
    var ty = y + 22;
    (o.rows || []).forEach(function (r) {
      if (r.tag) {
        sv("polygon", { points: [x + 30, ty + 30, x + 36, ty, x + w - 12, ty, x + w - 18, ty + 30].join(" "), fill: r.bg }, p);
        stripes(p, x + w - 70, ty + 8, 48, 3, "#fff", 7);
        txt(p, x + 38, ty + 23, r.tag, "wf-mono wf-b", "start").setAttribute("fill", r.ink);
        ty += 40;
      } else {
        var t = txt(p, x + 30, ty + 18, "", "wf-mono");
        (Array.isArray(r) ? r : [r]).forEach(function (seg) {
          var s = sv("tspan", typeof seg === "string" ? {} : { "class": seg.c }, t);
          s.textContent = typeof seg === "string" ? seg : seg.t;
        });
        ty += 24;
      }
    });
  }

  function sticky(p, x, y, w, h, label) {
    sv("rect", { x: x, y: y, width: w, height: h, fill: C.sticky, stroke: "#e4c45c", "stroke-width": 1.5 }, p);
    sv("rect", { x: x, y: y, width: w, height: 7, fill: C.stickyTop }, p);
    sv("polygon", { points: [x + w - 16, y, x + w, y + 16, x + w, y].join(" "), fill: "#d9a92b" }, p);
    txt(p, x + w / 2, y + h / 2 + 12, label, "wf-label", "middle");
  }

  function badge(p, x, y, label) {
    sv("circle", { cx: x, cy: y, r: 19, fill: "#111" }, p);
    txt(p, x, y + 7, label, "wf-badge", "middle");
  }

  function robot(p, x, y) {
    var g = sv("g", { "class": "wf-robot", transform: "translate(" + x + "," + y + ")" }, p);
    sv("line", { x1: 0, y1: -24, x2: 0, y2: -34, stroke: "#333", "stroke-width": 2 }, g);
    sv("circle", { cx: 0, cy: -36, r: 3.5, fill: "#3fb950" }, g);
    sv("rect", { x: -22, y: -24, width: 44, height: 30, rx: 6, fill: "#f2f2f2", stroke: "#333", "stroke-width": 2 }, g);
    sv("circle", { cx: -9, cy: -9, r: 6, fill: "#fff", stroke: "#333", "stroke-width": 2 }, g);
    sv("circle", { cx: 9, cy: -9, r: 6, fill: "#fff", stroke: "#333", "stroke-width": 2 }, g);
    sv("circle", { cx: -9, cy: -9, r: 2.4, fill: "#111" }, g);
    sv("circle", { cx: 9, cy: -9, r: 2.4, fill: "#111" }, g);
    sv("rect", { x: -12, y: 6, width: 24, height: 16, rx: 3, fill: "#f2f2f2", stroke: "#333", "stroke-width": 2 }, g);
    sv("line", { x1: -6, y1: 22, x2: -6, y2: 30, stroke: "#333", "stroke-width": 2 }, g);
    sv("line", { x1: 6, y1: 22, x2: 6, y2: 30, stroke: "#333", "stroke-width": 2 }, g);
  }

  function header(p, x, y, n, label) {
    var w = label.length * 14.2 + 110;
    sv("rect", { x: x - 30, y: y - 30, width: w, height: 44, fill: "#fff" }, p);
    robot(p, x, y);
    badge(p, x + 44, y, n);
    txt(p, x + 74, y + 10, label, "wf-title");
  }

  function sparkle(p, x, y) {
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 6;
      sv("line", { x1: x - Math.cos(a) * 16, y1: y - Math.sin(a) * 16, x2: x + Math.cos(a) * 16, y2: y + Math.sin(a) * 16, stroke: "#e8603c", "stroke-width": 2.5 }, p);
    }
  }

  function dfaIcon(p, x, y, s) {
    var g = sv("g", { transform: "translate(" + x + "," + y + ") scale(" + s + ")" }, p);
    sv("polygon", { points: "50,0 140,0 120,105 30,105", fill: C.paper }, g);
    for (var i = 0; i < 8; i++) {
      var yy = 12 + i * 12;
      sv("line", { x1: 50 - yy * 0.19 + 8, x2: 140 - yy * 0.19 - 10, y1: yy, y2: yy, stroke: C.paperLine, "stroke-width": 4 }, g);
    }
    sv("line", { x1: 48, y1: 32, x2: 22, y2: 80, stroke: "#555", "stroke-width": 2.5 }, g);
    sv("line", { x1: 48, y1: 32, x2: 72, y2: 80, stroke: "#555", "stroke-width": 2.5 }, g);
    [[48, 32], [20, 82], [72, 82]].forEach(function (c) {
      sv("circle", { cx: c[0], cy: c[1], r: 16, fill: "#bdbdbd", stroke: "#555", "stroke-width": 2.5 }, g);
    });
  }

  function arrow(p, pts, id, head) {
    var d = "M" + pts.map(function (q) { return q.join(","); }).join(" L");
    var a = sv("path", { d: d, "class": "wf-arrow", "data-arrow": id }, p);
    if (head !== false) a.setAttribute("marker-end", "url(#wf-head)");
    return a;
  }

  function loop(p, cx, cy, id) {
    var g = sv("g", { "class": "wf-loop", "data-loop": id }, p);
    g.style.transformOrigin = cx + "px " + cy + "px";
    sv("path", { d: "M" + (cx - 14) + "," + (cy - 26) + " A30,30 0 0 0 " + (cx - 18) + "," + (cy + 22), "class": "wf-arc", "marker-end": "url(#wf-head-s)" }, g);
    sv("path", { d: "M" + (cx + 14) + "," + (cy + 26) + " A30,30 0 0 0 " + (cx + 18) + "," + (cy - 22), "class": "wf-arc", "marker-end": "url(#wf-head-s)" }, g);
    return g;
  }

  function draw(svg) {
    var defs = sv("defs", {}, svg);
    var m = sv("marker", { id: "wf-head", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "3.2", markerHeight: "3.2", orient: "auto" }, defs);
    sv("path", { d: "M0,0 L10,5 L0,10 z" }, m);
    var mh = sv("marker", { id: "wf-head-hot", viewBox: "0 0 10 10", refX: "6", refY: "5", markerWidth: "3.2", markerHeight: "3.2", orient: "auto" }, defs);
    sv("path", { d: "M0,0 L10,5 L0,10 z" }, mh);
    var ms = sv("marker", { id: "wf-head-s", viewBox: "0 0 10 10", refX: "5", refY: "5", markerWidth: "4", markerHeight: "4", orient: "auto" }, defs);
    sv("path", { d: "M0,0 L10,5 L0,10 z" }, ms);

    // Every drawn part carries data-play so the playback can light it up.
    function part(key) { return sv("g", { "data-play": key }, svg); }
    var gIn = part("input");
    var steps = {};
    function step(n, label) {
      var g = sv("g", { "class": "wf-step", "data-step": n, "data-play": String(n), tabindex: "0", role: "button", "aria-label": "Step " + n + ": " + label }, svg);
      steps[n] = g;
      return g;
    }

    // ---- input: class documentation -> JSON ----
    win(gIn, 22, 42, 178, 192, C.doc, {});
    sv("polygon", { points: "62,72 192,72 184,108 54,108", fill: "#c9dbeb" }, gIn);
    stripes(gIn, 70, 80, 110, 4, "#fff", 7);
    txt(gIn, 60, 136, "class A", "wf-mono");
    sv("polygon", { points: "62,152 192,152 184,188 54,188", fill: "#c9dbeb" }, gIn);
    stripes(gIn, 70, 160, 110, 4, "#fff", 7);
    txt(gIn, 66, 216, "met0", "wf-mono");
    win(gIn, 232, 98, 132, 112, C.json, {});
    txt(gIn, 302, 152, "{;}", "wf-json", "middle");
    txt(gIn, 302, 192, "JSON", "wf-json wf-b", "middle");
    arrow(gIn, [[200, 170], [232, 170]], "in", false);
    arrow(gIn, [[292, 214], [292, 244]], "in");

    // ---- step 1: generate DFA ----
    var s1 = step(1, "Generate DFA");
    sv("rect", { x: 40, y: 312, width: 346, height: 295, rx: 42, "class": "wf-region" }, s1);
    header(s1, 90, 300, "1", "Generate DFA");
    sticky(s1, 64, 347, 132, 62, "typestate");
    sticky(s1, 224, 345, 132, 60, "DFA");
    dfaIcon(s1, 52, 460, 0.62);
    loop(s1, 188, 497, "1b");
    badge(s1, 188, 497, "1b");
    sv("rect", { x: 222, y: 463, width: 158, height: 70, rx: 9, fill: "#f2f2f2", stroke: "#333", "stroke-width": 2 }, s1);
    sv("path", { d: "M236,480 l10,14 l18,-26", fill: "none", stroke: "#4a6b8a", "stroke-width": 5, "stroke-linecap": "round" }, s1);
    txt(s1, 318, 490, "static", "wf-label", "middle");
    txt(s1, 304, 524, "checks", "wf-label", "middle");
    badge(s1, 98, 569, "1a");

    // ---- DFA output ----
    var gDfa = part("dfa");
    arrow(gDfa, [[388, 460], [420, 460]], "a1");
    sv("rect", { x: 410, y: 356, width: 172, height: 172, rx: 18, "class": "wf-glow" }, gDfa);
    txt(gDfa, 492, 392, "DFA", "wf-title", "middle");
    dfaIcon(gDfa, 422, 410, 1);
    arrow(part("to2"), [[572, 352], [612, 300]], "a2");
    arrow(part("to3"), [[570, 462], [612, 506]], "a3");

    // ---- step 2: synthesize tests ----
    var s2 = step(2, "Synthesize Tests");
    sv("rect", { x: 618, y: 63, width: 920, height: 235, rx: 42, "class": "wf-region" }, s2);
    header(s2, 944, 58, "2", "Synthesize Tests");
    win(s2, 638, 102, 172, 140, C.green, {});
    win(s2, 658, 120, 176, 136, C.green, { rows: [{ tag: "@Test", bg: C.greenTag, ink: C.greenInk }, "open([?])", "read([?])", "close([?])"] });
    txt(s2, 846, 212, "+", "wf-title wf-b", "middle");
    win(s2, 856, 102, 176, 140, C.red, {});
    win(s2, 876, 120, 178, 136, C.red, { rows: [{ tag: "@Test", bg: C.redTag, ink: C.redInk }, "open([?])", "close([?])", "read([?])"] });
    sv("path", { d: "M906,253 q4,-4 8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0 t8,0", fill: "none", stroke: C.red, "stroke-width": 1.6 }, s2);
    badge(s2, 853, 276, "2a");
    arrow(s2, [[1060, 198], [1100, 198]], "a5");
    sparkle(s2, 1178, 130);
    var r1 = txt(s2, 1124, 183, "read([?])", "wf-mono wf-big");
    var r2 = txt(s2, 1124, 217, "", "wf-mono wf-big");
    sv("tspan", {}, r2).textContent = "read(";
    sv("tspan", { fill: C.json }, r2).textContent = "foo";
    sv("tspan", {}, r2).textContent = ")";
    badge(s2, 1185, 276, "2b");
    arrow(s2, [[1280, 198], [1336, 198]], "a6");
    sv("rect", { x: 1358, y: 96, width: 140, height: 40, rx: 8, fill: "#f2f2f2", stroke: "#333", "stroke-width": 2 }, s2);
    txt(s2, 1428, 126, "compile", "wf-label", "middle");
    loop(s2, 1428, 176, "2c");
    badge(s2, 1428, 176, "2c");
    sv("rect", { x: 1360, y: 208, width: 137, height: 66, rx: 8, fill: "#f2f2f2", stroke: "#333", "stroke-width": 2 }, s2);
    txt(s2, 1428, 236, "change", "wf-label", "middle");
    txt(s2, 1410, 266, "tests", "wf-label", "middle");

    // ---- step 3: synthesize refinements ----
    var s3 = step(3, "Synthesize Refinements");
    sv("rect", { x: 632, y: 384, width: 414, height: 320, rx: 42, "class": "wf-region" }, s3);
    win(s3, 643, 433, 175, 105, C.teal, { rows: [{ tag: "@State", bg: C.tealTag, ink: C.tealInk }, "class A"] });
    txt(s3, 834, 500, "+", "wf-title wf-b", "middle");
    win(s3, 847, 433, 175, 105, C.teal, { rows: [{ tag: "@Ref", bg: C.tealTag, ink: C.tealInk }, "met0"] });
    sparkle(s3, 1018, 534);
    badge(s3, 728, 571, "3a");
    sticky(s3, 852, 556, 150, 60, "LiquidJava");
    badge(s3, 944, 652, "3b");
    header(s3, 654, 718, "3", "Synthesize Refinements");
    arrow(part("to4"), [[1048, 568], [1076, 568]], "a4");

    // ---- step 4: LiquidJava iteration ----
    var s4 = step(4, "LiquidJava iteration");
    sv("rect", { x: 1120, y: 384, width: 438, height: 318, rx: 42, "class": "wf-region" }, s4);
    arrow(s4, [[1406, 298], [1406, 322]], "a7");
    win(s4, 1298, 328, 176, 98, C.red, {});
    win(s4, 1320, 344, 178, 92, C.green, { rows: [{ tag: "@Test", bg: C.greenTag, ink: C.greenInk }] });
    stripes(s4, 1345, 400, 140, 3, "#c9c9c9", 8);
    arrow(s4, [[1280, 483], [1406, 483], [1406, 508]], "a8");
    arrow(s4, [[1406, 438], [1406, 470]], "a9", false);
    sv("rect", { x: 1341, y: 517, width: 212, height: 107, rx: 10, fill: "#fff", stroke: "#111", "stroke-width": 2 }, s4);
    sv("path", { d: "M1378,540 q-8,10 0,18 q8,8 0,18", fill: "none", stroke: "#d33", "stroke-width": 3 }, s4);
    sv("path", { d: "M1360,590 q18,10 36,0 M1362,600 q16,8 32,0 M1366,610 q12,6 24,0", fill: "none", stroke: "#3a7bd5", "stroke-width": 3 }, s4);
    txt(s4, 1400, 563, "LiquidJava", "wf-label");
    txt(s4, 1400, 598, "MCP", "wf-label");
    badge(s4, 1313, 572, "4a");
    sv("path", { d: "M1372,630 Q1340,690 1290,656", "class": "wf-arrow wf-thin", "marker-end": "url(#wf-head)", "data-arrow": "a10" }, s4);
    header(s4, 1182, 708, "4", "LiquidJava iteration");

    // The output: the annotated class. Drawn on top of step 4 so it can be lit on its own.
    var fin = sv("g", { "class": "wf-final", "data-play": "final", tabindex: "0", role: "button", "aria-label": "The result: the annotated class" }, svg);
    sv("rect", { x: 1070, y: 461, width: 222, height: 216, rx: 10, "class": "wf-glow" }, fin);
    win(fin, 1083, 474, 196, 190, C.teal, { rows: [{ tag: "@State", bg: C.tealTag, ink: C.tealInk }, "class A", { tag: "@Ref", bg: C.tealTag, ink: C.tealInk }, "met0"] });

    // keys: parts shown at full strength; glow: parts outlined in crimson.
    function light(keys, glow) {
      svg.classList.toggle("playing", !!keys);
      svg.querySelectorAll("[data-play]").forEach(function (g) {
        var k = g.getAttribute("data-play");
        g.classList.toggle("lit", !!keys && keys.indexOf(k) >= 0);
        g.classList.toggle("glow", !!glow && glow.indexOf(k) >= 0);
      });
    }

    return { steps: steps, final: fin, light: light };
  }

  window.BaristaWorkflow = { draw: draw };
})();
