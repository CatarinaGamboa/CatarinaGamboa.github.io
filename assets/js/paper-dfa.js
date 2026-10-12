/* Interactive state machine for the paper pages.
   PaperDFA.create(svg, { states, edges }) draws draggable states and edges,
   and returns an API to move a "current state" token and highlight methods.

   states: [{ id, label, x, y, kind?: "start"|"end"|"note" }]
            label lines split on "\n".
   edges:  [{ id, from, to, label, method, bend?, loop?: "below"|"above",
              ghost?, lp?: [x, y], anchor? }]
            label lines split on "\n"; **text** is set in bold. lp places the
            label absolutely (it follows the edge when states are dragged).
*/
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function create(svg, spec) {
    var nodes = {};
    var edges = [];
    var listeners = { hover: [] };
    var current = null;

    var defs = el("defs", {}, svg);
    ["", "hot", "taken"].forEach(function (kind) {
      var m = el("marker", {
        id: svg.id + "-arrow" + (kind ? "-" + kind : ""),
        viewBox: "0 0 10 10", refX: "9", refY: "5",
        markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse",
        "class": kind
      }, defs);
      el("path", { d: "M0,0 L10,5 L0,10 z" }, m);
    });

    var gEdges = el("g", { "class": "edges" }, svg);
    var gNodes = el("g", { "class": "nodes" }, svg);

    var LINE = 32;
    function lines(text, label) {
      label.split("\n").forEach(function (ln, i) {
        var t = el("tspan", { x: 0, dy: i ? LINE : 0 }, text);
        var bold = false;
        ln.split("**").forEach(function (part) {
          if (part) {
            var ts = el("tspan", bold ? { "class": "b" } : {}, t);
            ts.textContent = part;
          }
          bold = !bold;
        });
      });
      return label.split("\n").length;
    }

    spec.states.forEach(function (s) {
      var kind = s.kind || "state";
      var g = el("g", { "class": "node " + kind, "data-state": s.id }, gNodes);
      var n = { id: s.id, x: s.x, y: s.y, w: 18, h: 18, g: g, kind: kind, round: true };
      if (kind === "start") {
        el("circle", { r: 9 }, g);
        g.setAttribute("aria-hidden", "true");
      } else if (kind === "end") {
        el("circle", { r: 12, "class": "outer" }, g);
        el("circle", { r: 7, "class": "inner" }, g);
        n.w = n.h = 24;
        g.setAttribute("aria-hidden", "true");
      } else {
        var rect = kind === "note" ? null : el("rect", { rx: 6, ry: 6 }, g);
        var text = el("text", {}, g);
        n.lines = lines(text, s.label);
        n.rect = rect;
        n.text = text;
        n.round = false;
        el("title", {}, g).textContent = s.label.replace(/\n/g, " ") + (kind === "note" ? "" : " state (drag to move)");
      }
      nodes[s.id] = n;
    });

    spec.edges.forEach(function (e) {
      var g = el("g", { "class": "edge" + (e.ghost ? " ghost" : ""), "data-method": e.method }, gEdges);
      var line = el("path", { "class": "line", "marker-end": "url(#" + svg.id + "-arrow)" }, g);
      var hit = el("path", { "class": "hit" }, g);
      var text = el("text", { "text-anchor": e.anchor || "middle" }, g);
      var nl = e.label ? lines(text, e.label) : 0;
      var edge = Object.assign({ g: g, line: line, hit: hit, text: text, bend: 0, nl: nl }, e);
      edges.push(edge);
      g.addEventListener("pointerenter", function () { emit("hover", edge.method); });
      g.addEventListener("pointerleave", function () { emit("hover", null); });
    });

    function emit(name, arg) { listeners[name].forEach(function (f) { f(arg); }); }

    function measure() {
      Object.keys(nodes).forEach(function (id) {
        var n = nodes[id];
        if (!n.text) return;
        var box = n.text.getBBox();
        var w = Math.ceil(box.width) + (n.rect ? 48 : 0);
        var h = n.lines * LINE + (n.rect ? 22 : 0);
        n.w = w; n.h = h;
        // vertically centre the text block on the node
        n.text.setAttribute("y", -((n.lines - 1) * LINE) / 2 + 9);
        if (n.rect) {
          n.rect.setAttribute("width", w);
          n.rect.setAttribute("height", h);
          n.rect.setAttribute("x", -w / 2);
          n.rect.setAttribute("y", -h / 2);
        }
      });
    }

    function boundary(n, tx, ty, pad) {
      var dx = tx - n.x, dy = ty - n.y;
      if (n.round) {
        var d = Math.hypot(dx, dy) || 1;
        return [n.x + dx / d * (n.w / 2 + pad), n.y + dy / d * (n.w / 2 + pad)];
      }
      var hw = n.w / 2 + pad, hh = n.h / 2 + pad;
      var t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
      return [n.x + dx * t, n.y + dy * t];
    }

    function layoutEdge(e) {
      var a = nodes[e.from], b = nodes[e.to];
      var d, lx, ly;
      if (e.from === e.to) {
        var s = e.loop === "above" ? -1 : 1;
        var y0 = a.y + s * a.h / 2;
        d = "M" + (a.x - 14) + "," + y0 +
            " C" + (a.x - 46) + "," + (y0 + s * 54) + " " + (a.x + 46) + "," + (y0 + s * 54) + " " + (a.x + 14) + "," + (y0 + s * 3);
        lx = a.x; ly = y0 + s * 50;
      } else {
        var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        var vx = b.x - a.x, vy = b.y - a.y, len = Math.hypot(vx, vy) || 1;
        var qx = mx - vy / len * e.bend * 2, qy = my + vx / len * e.bend * 2;
        var p0 = boundary(a, qx, qy, 2), p1 = boundary(b, qx, qy, 3);
        d = "M" + p0[0] + "," + p0[1] + " Q" + qx + "," + qy + " " + p1[0] + "," + p1[1];
        lx = 0.25 * p0[0] + 0.5 * qx + 0.25 * p1[0];
        ly = 0.25 * p0[1] + 0.5 * qy + 0.25 * p1[1];
      }
      e.line.setAttribute("d", d);
      e.hit.setAttribute("d", d);
      if (!e.nl) return;
      var tx, ty;
      if (e.lp) {
        if (!e.mid0) e.mid0 = [lx, ly];
        tx = e.lp[0] + lx - e.mid0[0];
        ty = e.lp[1] + ly - e.mid0[1];
      } else {
        tx = lx; ty = ly - ((e.nl - 1) * LINE) / 2 + 8;
      }
      e.text.setAttribute("x", tx);
      e.text.setAttribute("y", ty);
      e.text.querySelectorAll(":scope > tspan").forEach(function (t) { t.setAttribute("x", tx); });
    }

    function placeNode(n) { n.g.setAttribute("transform", "translate(" + n.x + "," + n.y + ")"); }

    function layout() {
      Object.keys(nodes).forEach(function (id) { placeNode(nodes[id]); });
      edges.forEach(layoutEdge);
    }

    // ---- dragging ----
    var vb = svg.viewBox.baseVal;
    var drag = null;
    function toSvg(evt) {
      var pt = svg.createSVGPoint();
      pt.x = evt.clientX; pt.y = evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    }
    Object.keys(nodes).forEach(function (id) {
      var n = nodes[id];
      n.g.addEventListener("pointerdown", function (evt) {
        var p = toSvg(evt);
        drag = { n: n, dx: n.x - p.x, dy: n.y - p.y, id: evt.pointerId };
        n.g.setPointerCapture(evt.pointerId);
        n.g.classList.add("dragging");
        evt.preventDefault();
      });
      n.g.addEventListener("pointermove", function (evt) {
        if (!drag || drag.n !== n) return;
        var p = toSvg(evt);
        n.x = Math.max(vb.x + n.w / 2, Math.min(vb.x + vb.width - n.w / 2, p.x + drag.dx));
        n.y = Math.max(vb.y + n.h / 2, Math.min(vb.y + vb.height - n.h / 2, p.y + drag.dy));
        placeNode(n);
        edges.forEach(function (e) { if (e.from === id || e.to === id) layoutEdge(e); });
      });
      function end() { if (drag && drag.n === n) { drag = null; n.g.classList.remove("dragging"); } }
      n.g.addEventListener("pointerup", end);
      n.g.addEventListener("pointercancel", end);
    });

    // ---- state + animation ----
    function setMarker(e, kind) {
      e.line.setAttribute("marker-end", "url(#" + svg.id + "-arrow" + (kind ? "-" + kind : "") + ")");
    }

    function animateToken(e, done) {
      if (reduceMotion) { done(); return; }
      var token = el("circle", { r: 6, "class": "token" }, svg);
      var total = e.line.getTotalLength();
      var t0 = null, dur = 520;
      function step(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        var ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        var p = e.line.getPointAtLength(total * ease);
        token.setAttribute("cx", p.x);
        token.setAttribute("cy", p.y);
        if (k < 1) requestAnimationFrame(step);
        else { token.remove(); done(); }
      }
      requestAnimationFrame(step);
    }

    function setCurrent(stateId, viaEdgeId) {
      edges.forEach(function (e) {
        if (e.g.classList.contains("taken")) { e.g.classList.remove("taken"); setMarker(e, e.g.classList.contains("hot") ? "hot" : ""); }
      });
      var via = viaEdgeId && edges.find(function (e) { return e.id === viaEdgeId; });
      function land() {
        Object.keys(nodes).forEach(function (id) { nodes[id].g.classList.toggle("current", id === stateId); });
        current = stateId;
      }
      if (via) {
        via.g.classList.add("taken");
        setMarker(via, "taken");
        animateToken(via, function () {
          land();
          setTimeout(function () {
            via.g.classList.remove("taken");
            setMarker(via, via.g.classList.contains("hot") ? "hot" : "");
          }, 700);
        });
      } else {
        land();
      }
    }

    function flashError(stateId) {
      var n = nodes[stateId || current];
      if (!n) return;
      n.g.classList.remove("error");
      void n.g.getBoundingClientRect();
      n.g.classList.add("error");
      setTimeout(function () { n.g.classList.remove("error"); }, 1400);
    }

    function highlight(method) {
      edges.forEach(function (e) {
        var hot = !!method && e.method === method;
        e.g.classList.toggle("hot", hot);
        if (!e.g.classList.contains("taken")) setMarker(e, hot ? "hot" : "");
      });
    }

    // Draw the machine left to right, in the order a client meets it: each
    // state appears once the transitions leading into it have been drawn.
    // A state's optional `order` overrides its x position for this sequence.
    function intro() {
      if (reduceMotion) return;
      svg.classList.add("intro");
      var key = function (s) { return s.order != null ? s.order : s.x; };
      var order = spec.states.slice().sort(function (a, b) { return key(a) - key(b); });
      var shown = {};
      var t = 150;
      order.forEach(function (s) {
        var incoming = edges.filter(function (e) { return !e.ghost && e.to === s.id && shown[e.from]; });
        incoming.forEach(function (e) { drawEdge(e, t); });
        if (incoming.length) t += 520;
        (function (g, at) { setTimeout(function () { g.classList.add("in"); }, at); })(nodes[s.id].g, t);
        shown[s.id] = true;
        t += 160;
      });
      // Edges whose source appears after their target (none in a left-to-right layout).
      edges.forEach(function (e) { if (!e.ghost && !e.g.classList.contains("queued")) drawEdge(e, t); });
      setTimeout(function () {
        svg.classList.remove("intro");
        edges.forEach(function (e) { e.g.classList.remove("queued"); });
      }, t + 800);
    }

    function drawEdge(e, at) {
      e.g.classList.add("queued");
      var len = e.line.getTotalLength();
      e.line.style.strokeDasharray = len;
      e.line.style.strokeDashoffset = len;
      e.line.setAttribute("marker-end", "none");
      setTimeout(function () {
        e.g.classList.add("in");
        e.line.style.transition = "stroke-dashoffset 500ms ease-in-out";
        e.line.style.strokeDashoffset = 0;
        setTimeout(function () {
          e.line.style.strokeDasharray = "";
          e.line.style.transition = "";
          setMarker(e, "");
        }, 520);
      }, at);
    }

    measure();
    layout();

    // Fonts can change label widths after first paint.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); layout(); });

    return {
      setCurrent: setCurrent,
      flashError: flashError,
      highlight: highlight,
      intro: intro,
      reset: function () { setCurrent(null); highlight(null); },
      edgeFor: function (method, from) {
        var e = edges.find(function (x) { return x.method === method && x.from === from; });
        return e ? e.id : null;
      },
      onHover: function (fn) { listeners.hover.push(fn); }
    };
  }

  window.PaperDFA = { create: create };
})();
