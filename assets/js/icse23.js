/* papers/icse23: refinement quiz, syntax survey, Socket protocol, study results. */
(function () {
  "use strict";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  /* ---------------- tooltip ---------------- */
  var tip = $("#pp-tooltip");
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.classList.add("show");
    var r = evt.currentTarget.getBoundingClientRect();
    var x = evt.clientX || r.left + r.width / 2, y = evt.clientY || r.top;
    var w = tip.offsetWidth;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + "px";
    tip.style.top = (y - tip.offsetHeight - 12) + "px";
  }
  function hideTip() { tip.classList.remove("show"); }
  function withTip(el, html) {
    el.addEventListener("pointerenter", function (e) { showTip(e, html); });
    el.addEventListener("pointermove", function (e) { showTip(e, html); });
    el.addEventListener("pointerleave", hideTip);
    el.addEventListener("focus", function (e) { showTip(e, html); });
    el.addEventListener("blur", hideTip);
  }

  /* ---------------- tiny arithmetic parser (no eval) ---------------- */
  // Accepts numbers, + - * / and parentheses. Returns a number or throws.
  function evaluate(src) {
    var s = src.replace(/\s+/g, ""), i = 0;
    if (!s) throw new Error("empty");
    function num() {
      var m = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (!m) throw new Error("number");
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function factor() {
      if (s[i] === "-") { i++; return -factor(); }
      if (s[i] === "+") { i++; return factor(); }
      if (s[i] === "(") { i++; var v = expr(); if (s[i] !== ")") throw new Error(")"); i++; return v; }
      return num();
    }
    function term() {
      var v = factor();
      while (s[i] === "*" || s[i] === "/") { var op = s[i++]; var r = factor(); v = op === "*" ? v * r : v / r; }
      return v;
    }
    function expr() {
      var v = term();
      while (s[i] === "+" || s[i] === "-") { var op = s[i++]; var r = term(); v = op === "+" ? v + r : v - r; }
      return v;
    }
    var v = expr();
    if (i !== s.length || !isFinite(v)) throw new Error("trailing");
    return v;
  }

  function verdictOk(el, text) { el.innerHTML = '<div class="ok">✓ ' + esc(text) + "</div>"; }
  function verdictErr(el, kind, lines) {
    el.innerHTML = '<div class="err"><b>' + esc(kind) + "</b><div>" + lines.map(esc).join("<br>") + "</div></div>";
  }
  function verdictIdle(el, text) { el.innerHTML = '<div class="idle">' + esc(text) + "</div>"; }
  function markGoal(list, goal) {
    var li = $('[data-goal="' + goal + '"]', list);
    if (li && !li.classList.contains("done")) li.classList.add("done");
  }

  /* ---------------- quiz tabs ---------------- */
  var qtabs = $$(".quiz .tabs [role=tab]");
  function selectQuiz(tab, focus) {
    qtabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  qtabs.forEach(function (t, k) {
    t.addEventListener("click", function () { selectQuiz(t); });
    t.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") selectQuiz(qtabs[(k + 1) % qtabs.length], true);
      if (e.key === "ArrowLeft") selectQuiz(qtabs[(k + qtabs.length - 1) % qtabs.length], true);
    });
  });

  /* ---------------- 1: variable ---------------- */
  var varIn = $("#var-x"), varOut = $("#var-out");
  function checkVar(initial) {
    var src = varIn.value.trim();
    var v;
    try { v = evaluate(src); } catch (e) { verdictIdle(varOut, "Type a number or an arithmetic expression, like 50 - 10."); return; }
    if (v >= -25 && v <= 45) { verdictOk(varOut, "LiquidJava accepts this assignment."); if (!initial) markGoal($("#var-goals"), "ok"); }
    else {
      verdictErr(varOut, "Refinement Type Error", ["Type expected: (-25 <= x && x <= 45)", "Refinement found: (x == " + src + ")"]);
      markGoal($("#var-goals"), "bad");
    }
  }
  varIn.addEventListener("input", function () { checkVar(false); });
  checkVar(true);

  /* ---------------- 2: method ---------------- */
  var fnA = $("#fn-a"), fnB = $("#fn-b"), fnOut = $("#fn-out");
  function checkFn(initial) {
    var a, b, sa = fnA.value.trim(), sb = fnB.value.trim();
    try { a = evaluate(sa); b = evaluate(sb); } catch (e) { verdictIdle(fnOut, "Type a number for each argument."); return; }
    if (a < 0) {
      verdictErr(fnOut, "Refinement Type Error", ["Type expected: (a >= 0)", "Refinement found: (a == " + sa + ")"]);
      markGoal($("#fn-goals"), "bad");
    } else if (b < a) {
      verdictErr(fnOut, "Refinement Type Error", ["Type expected: (b >= a)", "Refinement found: (b == " + sb + ") && (a == " + sa + ")"]);
      markGoal($("#fn-goals"), "bad");
    } else {
      verdictOk(fnOut, "LiquidJava accepts this call, and the result " + +((a + b) / 2).toFixed(4) + " satisfies _ >= 0.");
      if (!initial) markGoal($("#fn-goals"), "ok");
    }
  }
  fnA.addEventListener("input", function () { checkFn(false); });
  fnB.addEventListener("input", function () { checkFn(false); });
  checkFn(true);

  /* ---------------- protocol player (used for MyObj and Socket) ---------------- */
  // opts: { calls, program, out, ctor: {code, to}, methods: {name: {code, t: {from: to}}},
  //         onLine(lines), dfa (optional, lazily provided), objName }
  function protocolPlayer(opts) {
    var state = null, lines = [];
    var row = opts.calls;
    Object.keys(opts.methods).forEach(function (m) {
      var b = document.createElement("button");
      b.className = "call";
      b.dataset.method = m;
      b.textContent = m + "()";
      b.disabled = true;
      row.appendChild(b);
      b.addEventListener("click", function () { call(m); });
    });
    $("[data-ctor]", row).addEventListener("click", construct);

    function dfa() { return opts.dfa ? opts.dfa() : null; }
    function refresh() {
      $$("[data-method]", row).forEach(function (b) {
        b.disabled = state === null;
        var ok = state !== null && opts.methods[b.dataset.method].t[state] !== undefined;
        b.classList.toggle("allowed", ok);
        b.setAttribute("aria-label", b.dataset.method + "()" + (state === null ? "" : ok ? ", allowed now" : ", not allowed now"));
      });
    }
    function render() {
      opts.program.innerHTML = "";
      lines.forEach(function (l, i) {
        var li = document.createElement("li");
        if (l.error) li.className = "bad";
        if (i === lines.length - 1) li.classList.add("new");
        var c = document.createElement("span"); c.textContent = l.code;
        var st = document.createElement("span"); st.className = "st";
        st.textContent = l.error ? "✗ error" : "→ " + l.state;
        li.appendChild(c); li.appendChild(st);
        opts.program.appendChild(li);
      });
      var errs = lines.filter(function (l) { return l.error; });
      if (!errs.length) verdictOk(opts.out, "LiquidJava accepts this program.");
      else { var e = errs[errs.length - 1]; verdictErr(opts.out, "State Refinement Error on line " + (lines.indexOf(e) + 1), [e.error]); }
      refresh();
      if (opts.onLine) opts.onLine(lines);
    }
    function construct() {
      lines = [{ code: opts.ctor.code, state: opts.ctor.to }];
      state = opts.ctor.to;
      var d = dfa(); if (d) d.setCurrent(state, "ctor");
      render();
    }
    function call(m) {
      if (state === null) return;
      var spec = opts.methods[m], to = spec.t[state];
      if (to === undefined) {
        var exp = Object.keys(spec.t).map(function (s) { return s + "(" + opts.objName + ")"; }).join(" || ");
        lines.push({ code: spec.code, error: "found " + state + "(" + opts.objName + ") but expected " + exp });
        var d0 = dfa(); if (d0) d0.flashError(state);
      } else {
        var d1 = dfa();
        if (d1) d1.setCurrent(to, d1.edgeFor(m, state));
        lines.push({ code: spec.code, state: to });
        state = to;
      }
      render();
    }
    refresh();
    return { refresh: refresh };
  }

  /* ---------------- 3: class protocol (MyObj) ---------------- */
  var myobjDfa = null;
  function getMyobjDfa() {
    if (myobjDfa || $("#cls-reveal").hidden) return myobjDfa;
    myobjDfa = PaperDFA.create($("#myobj-dfa"), {
      states: [
        { id: "start", kind: "start", x: 24, y: 120 },
        { id: "sY", label: "sY", x: 210, y: 120 },
        { id: "sX", label: "sX", x: 420, y: 120 },
        { id: "sZ", label: "sZ", x: 630, y: 120 }
      ],
      edges: [
        { id: "ctor", from: "start", to: "sY", label: "MyObj()", method: "ctor", lp: [100, 100] },
        { id: "sel", from: "sY", to: "sX", label: "select", method: "select", bend: -26 },
        { id: "show1", from: "sY", to: "sX", label: "show", method: "show", bend: 26 },
        { id: "pay", from: "sX", to: "sZ", label: "pay", method: "pay", bend: -26 },
        { id: "show2", from: "sZ", to: "sX", label: "show", method: "show", bend: -26 }
      ]
    });
    return myobjDfa;
  }
  // The DFA edge for "show" from sY is a different edge from the one from sZ; edgeFor picks by source.
  protocolPlayer({
    calls: $("#cls-calls"), program: $("#cls-program"), out: $("#cls-out"), objName: "o",
    ctor: { code: "MyObj o = new MyObj();", to: "sY" },
    methods: {
      select: { code: "o.select(1);", t: { sY: "sX" } },
      pay: { code: "o.pay(1);", t: { sX: "sZ" } },
      show: { code: "o.show();", t: { sY: "sX", sZ: "sX" } }
    },
    dfa: getMyobjDfa,
    onLine: function (lines) {
      var bad = lines.some(function (l) { return l.error; });
      if (bad) markGoal($("#cls-goals"), "bad");
      else if (lines.length >= 4) markGoal($("#cls-goals"), "ok");
    }
  });

  /* ---------------- reveals ---------------- */
  var R = ["var(--r-correct)", "var(--r-incorrect)", "var(--r-blank)"];
  $$(".mini-stack").forEach(function (el) {
    var vals = el.dataset.values.split(",").map(Number);
    var names = ["Correct", "Incorrect", "Unanswered"];
    vals.forEach(function (v, k) {
      if (!v) return;
      var s = document.createElement("span");
      s.style.flex = v;
      s.style.backgroundColor = R[k];
      if (k === 1) s.className = "hatch";
      s.tabIndex = 0;
      withTip(s, "<b>" + names[k] + "</b><br>" + v + "% of 30 participants");
      el.appendChild(s);
    });
  });
  $$(".reveal-btn").forEach(function (b) {
    b.addEventListener("click", function () {
      var r = $("#" + b.dataset.reveal);
      r.hidden = !r.hidden;
      b.innerHTML = r.hidden ? "Show how participants did" : "Hide";
      if (!r.hidden && b.dataset.reveal === "cls-reveal") getMyobjDfa();
    });
  });

  /* ---------------- chart helpers ---------------- */
  var NS = "http://www.w3.org/2000/svg";
  function sv(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function barPath(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return "M" + x + "," + (y + h) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y +
      "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
  }

  /* ---------------- syntax survey ---------------- */
  var SURVEY = { A: [5, 21, 24], B: [13, 18, 19] };
  var LEVELS = ["Not acceptable", "Acceptable", "Preferable"];
  var LCOL = ["var(--o-3)", "var(--o-2)", "var(--o-1)"];
  (function drawSurvey() {
    var svg = $("#survey-chart"), W = 640, H = 230, M = { l: 34, r: 8, t: 22, b: 34 };
    var ph = H - M.t - M.b, y = function (v) { return M.t + ph - v / 25 * ph; };
    var g = sv("g", { "class": "grid" }, svg), ax = sv("g", { "class": "axis" }, svg);
    [0, 5, 10, 15, 20, 25].forEach(function (t) {
      sv("line", { x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) }, g);
      sv("text", { x: M.l - 8, y: y(t), "text-anchor": "end", "dominant-baseline": "central" }, ax).textContent = t;
    });
    var gw = (W - M.l - M.r) / 2, bw = 56, gap = 2;
    ["A", "B"].forEach(function (opt, gi) {
      var cx = M.l + gw * gi + gw / 2, x0 = cx - (bw * 3 + gap * 2) / 2;
      sv("text", { x: cx, y: H - 10, "text-anchor": "middle", "class": "cat" }, svg).textContent = "Option " + opt;
      SURVEY[opt].forEach(function (v, k) {
        var x = x0 + k * (bw + gap);
        var p = sv("path", { d: barPath(x, y(v), bw, y(0) - y(v), 4), fill: LCOL[k], "class": "bar", tabindex: "0", role: "img",
          "aria-label": "Option " + opt + ", " + LEVELS[k] + ": " + v + " of 50" }, svg);
        withTip(p, "<b>Option " + opt + "</b><br>" + LEVELS[k] + ": " + v + " of 50");
        sv("text", { x: x + bw / 2, y: y(v) - 7, "text-anchor": "middle", "class": "val" }, svg).textContent = v;
      });
    });
  })();
  $$(".syn").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".syn").forEach(function (o) { o.setAttribute("aria-pressed", o === b); });
      $("#survey").hidden = false;
      var o = b.dataset.opt;
      $("#survey-pick").innerHTML = o === "A"
        ? "<b>You picked Option A, the one LiquidJava uses.</b> Each respondent rated both options; here is how they did."
        : "<b>You picked Option B.</b> Most respondents leaned the other way. Each respondent rated both options; here is how they did.";
    });
  });

  /* ---------------- Socket (Listing 3, Figure 4) ---------------- */
  var sockDfa = PaperDFA.create($("#socket-dfa"), {
    states: [
      { id: "start", kind: "start", x: 60, y: 200 },
      { id: "unconnected", label: "unconnected", x: 330, y: 200 },
      { id: "bound", label: "bound", x: 740, y: 200 },
      { id: "connected", label: "connected", x: 1110, y: 200 },
      { id: "closed", label: "closed", x: 1500, y: 200 }
    ],
    edges: [
      { id: "ctor", from: "start", to: "unconnected", label: "**Socket**()", method: "ctor", lp: [110, 182], anchor: "start" },
      { id: "bind", from: "unconnected", to: "bound", label: "**bind**", method: "bind", lp: [540, 182] },
      { id: "connect", from: "bound", to: "connected", label: "**connect**", method: "connect", lp: [925, 182] },
      { id: "urgent", from: "connected", to: "connected", label: "**sendUrgentData**", method: "sendUrgentData", loop: "above" },
      { id: "c-conn", from: "connected", to: "closed", label: "**close**", method: "close", lp: [1305, 182] },
      { id: "c-bound", from: "bound", to: "closed", label: "**close**", method: "close", bend: 46 },
      { id: "c-unc", from: "unconnected", to: "closed", label: "**close**", method: "close", bend: 64 }
    ]
  });
  protocolPlayer({
    calls: $("#sock-calls"), program: $("#sock-program"), out: $("#sock-out"), objName: "s",
    ctor: { code: "Socket s = new Socket();", to: "unconnected" },
    methods: {
      bind: { code: "s.bind(local);", t: { unconnected: "bound" } },
      connect: { code: "s.connect(server, 5000);", t: { bound: "connected" } },
      sendUrgentData: { code: "s.sendUrgentData(1);", t: { connected: "connected" } },
      close: { code: "s.close();", t: { unconnected: "closed", bound: "closed", connected: "closed" } }
    },
    dfa: function () { return sockDfa; }
  });
  // close() is written as from="!closed(this)" in the specification.
  function hot(m) {
    sockDfa.highlight(m);
    $$("#socket .spec .blk[data-method]").forEach(function (n) { n.classList.toggle("is-hot", !!m && n.dataset.method === m); });
  }
  sockDfa.onHover(hot);
  $$("#sock-calls .call, #socket .spec .blk[data-method]").forEach(function (n) {
    var m = function () { return n.dataset.method || (n.dataset.ctor ? "ctor" : null); };
    n.addEventListener("pointerenter", function () { hot(m()); });
    n.addEventListener("pointerleave", function () { hot(null); });
    n.addEventListener("focus", function () { hot(m()); });
    n.addEventListener("blur", function () { hot(null); });
  });
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); sockDfa.intro(); } }, { threshold: 0.4 });
    io.observe($("#socket-dfa"));
  }

  /* ---------------- Figure 9: finding and fixing bugs ---------------- */
  var CATS = [
    { name: "Correct", color: "var(--r-correct)" },
    { name: "Compiler correct", color: "var(--r-cc)" },
    { name: "Incorrect", color: "var(--r-incorrect)", hatch: true },
    { name: "Unanswered", color: "var(--r-blank)", dark: true }
  ];
  var EX = {
    Fibonacci: {
      java: { find: [73.3, 0, 13.3, 13.3], fix: [66.7, 0, 20.0, 13.3], time: "2 min 52 s" },
      lj: { find: [100, 0, 0, 0], fix: [100, 0, 0, 0], time: "3 min 22 s" },
      note: "Everyone fixed it with LiquidJava (66.7% in Java). Plain Java was faster here; most people know Fibonacci by heart."
    },
    Sum: {
      java: { find: [93.3, 0, 6.7, 0], fix: [86.7, 6.7, 6.7, 0], time: "4 min 30 s" },
      lj: { find: [100, 0, 0, 0], fix: [46.7, 46.7, 6.7, 0], time: "3 min 32 s" },
      note: "Everyone found the bug, but 7 of 15 silenced the error instead of fixing it."
    },
    ArrayDeque: {
      java: { find: [100, 0, 0, 0], fix: [100, 0, 0, 0], time: "3 min 41 s" },
      lj: { find: [100, 0, 0, 0], fix: [100, 0, 0, 0], time: "2 min 56 s" },
      note: "Everyone fixed it in both; LiquidJava was 45 s faster on average."
    },
    Socket: {
      java: { find: [6.7, 0, 53.3, 40.0], fix: [0, 0, 53.3, 46.7], time: "5 min 35 s" },
      lj: { find: [100, 0, 0, 0], fix: [100, 0, 0, 0], time: "4 min 42 s" },
      note: "No one fixed it in plain Java. With LiquidJava, everyone did, 52 s faster on average."
    }
  };
  function stackBar(vals, label, ctx) {
    var row = document.createElement("div");
    row.className = "sb-row";
    var l = document.createElement("span"); l.className = "sb-l"; l.textContent = label;
    var bar = document.createElement("div"); bar.className = "sb";
    bar.setAttribute("role", "img");
    bar.setAttribute("aria-label", ctx + ", " + label.toLowerCase() + ": " + vals.map(function (v, k) { return v ? CATS[k].name + " " + v + "%" : null; }).filter(Boolean).join(", "));
    vals.forEach(function (v, k) {
      if (!v) return;
      var s = document.createElement("span");
      s.style.flex = v;
      s.style.backgroundColor = CATS[k].color;
      if (CATS[k].hatch) s.className = "hatch";
      if (CATS[k].dark) s.classList.add("light");
      if (v >= 12) s.textContent = (Math.round(v * 10) / 10) + "%";
      withTip(s, "<b>" + ctx + "</b><br>" + label + ": " + CATS[k].name + " " + v + "%");
      bar.appendChild(s);
    });
    row.appendChild(l); row.appendChild(bar);
    return row;
  }
  function showEx(name) {
    var d = EX[name], grid = $("#ex-grid");
    grid.innerHTML = "";
    [["Plain Java", d.java], ["LiquidJava", d.lj]].forEach(function (p) {
      var col = document.createElement("div");
      col.className = "ex-col";
      var h = document.createElement("h4"); h.textContent = p[0];
      col.appendChild(h);
      col.appendChild(stackBar(p[1].find, "To find", name + ", " + p[0]));
      col.appendChild(stackBar(p[1].fix, "To fix", name + ", " + p[0]));
      var t = document.createElement("p"); t.className = "ex-time";
      t.innerHTML = '<span class="fa fa-clock-o"></span> Average time: <b>' + p[1].time + "</b>";
      col.appendChild(t);
      grid.appendChild(col);
    });
    $("#ex-note").textContent = d.note;
    $$("#ex-seg button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.ex === name); });
  }
  $$("#ex-seg button").forEach(function (b) { b.addEventListener("click", function () { showEx(b.dataset.ex); }); });
  showEx("Socket");

  /* ---------------- Figure 10: annotation results ---------------- */
  [["Variables", [100, 0, 0, 0]], ["Methods", [80, 20, 0, 0]], ["Class protocol", [100, 0, 0, 0]], ["Class fields", [43.3, 0, 0, 56.7]]]
    .forEach(function (r) { $("#ann").appendChild(stackBar(r[1], r[0], "Annotating")); });

  /* ---------------- Figure 12: likes and dislikes ---------------- */
  var LIKED = [
    ["Error reporting", 12, "Helps to define the program's logic and avoid future errors"],
    ["State refinements", 11, "[...] because enforcing correct state transitions in the implementations is tedious and error-prone"],
    ["Syntax", 6, "Very intuitive syntax"],
    ["Plugin", 5, "Very well assisted by the custom vs code extension"],
    ["Understandability", 5, "Easy to understand in terms of semantics"],
    ["Useful", 4, "helped me a lot to understand which values/methods are correct when I'm coding"],
    ["Resources", 3, "The examples and the video were very elucidative"],
    ["Flexibility", 2, "+1 to the diverse set of refinements that can be written in different parts of the code"]
  ];
  var DISLIKED = [
    ["Nothing", 8, "Nothing, it is quite straighforward to be used"],
    ["Syntax", 6, "using _ for the return value"],
    ["Plugin features", 4, "Improve the usability of the plugin (...) -use auto-complete inside the refinements"],
    ["Not intuitive", 3, "Hard to understand without access to documentation, mainly DFA protocols"],
    ["Error messages", 3, "Some error messages are not straight to the point"],
    ["Verbose", 3, "Makes Java more verbose"],
    ["Other", 2, "The installation process was not very user friendly"]
  ];
  function likeList(el, data, color) {
    data.forEach(function (d) {
      var row = document.createElement("button");
      row.className = "lk-row";
      row.setAttribute("aria-expanded", "false");
      row.addEventListener("click", function () {
        var open = row.getAttribute("aria-expanded") === "true";
        $$(".lk-row", el).forEach(function (r) { r.setAttribute("aria-expanded", "false"); });
        row.setAttribute("aria-expanded", open ? "false" : "true");
      });
      row.innerHTML = '<span class="lk-l">' + esc(d[0]) + '</span><span class="lk-bar"><span style="width:' + (d[1] / 12 * 100) + "%;background:" + color +
        '"></span></span><span class="lk-n">' + d[1] + '</span><q class="lk-q">' + esc(d[2]) + "</q>";
      el.appendChild(row);
    });
  }
  likeList($("#liked"), LIKED, "var(--r-correct)");
  likeList($("#disliked"), DISLIKED, "var(--pp-theme)");
  $$(".lk").forEach(function (l) { l.firstChild.setAttribute("aria-expanded", "true"); });

  /* ---------------- editor showcase ---------------- */
  // Each scene: lines of code (pre-highlighted HTML), the line with the error,
  // the text to underline on it, and the hover message LiquidJava shows.
  var SCENES = {
    values: {
      caption: "<b>Refined variables.</b> A percentage must stay between 0 and 100.",
      lines: [
        '<span class="t-an">@Refinement</span>(<span class="t-str">"0 &lt;= _ &amp;&amp; _ &lt;= 100"</span>)',
        '<span class="t-kw">int</span> percent = <span class="t-num">75</span>;   <span class="t-cm">// ok</span>',
        '',
        'percent = <u>percent + <span class="t-num">30</span></u>;'
      ],
      err: 3,
      title: "Refinement Type Error",
      msg: ["Type expected: (0 &lt;= percent &amp;&amp; percent &lt;= 100)", "Refinement found: (percent == 75 + 30)"]
    },
    methods: {
      caption: "<b>Method contracts.</b> Parameters and return values carry their own refinements.",
      lines: [
        '<span class="t-an">@Refinement</span>(<span class="t-str">"_ &gt;= 0"</span>)',
        '<span class="t-kw">static int</span> <span class="t-fn">absDiv</span>(<span class="t-kw">int</span> a,',
        '    <span class="t-an">@Refinement</span>(<span class="t-str">"b != 0"</span>) <span class="t-kw">int</span> b) {',
        '  <span class="t-kw">int</span> r = a / b;',
        '  <span class="t-kw">return</span> r &gt;= <span class="t-num">0</span> ? r : -r;',
        '}',
        '',
        '<span class="t-fn">absDiv</span>(<span class="t-num">10</span>, <u><span class="t-num">0</span></u>);'
      ],
      err: 7,
      title: "Refinement Type Error",
      msg: ["Type expected: (b != 0)", "Refinement found: (b == 0)"]
    },
    protocols: {
      caption: "<b>Object protocols.</b> A socket must be connected before it sends data.",
      lines: [
        '<span class="t-ty">Socket</span> s = <span class="t-kw">new</span> <span class="t-ty">Socket</span>();',
        's.<span class="t-fn">bind</span>(addr);',
        '<u>s.<span class="t-fn">sendUrgentData</span>(<span class="t-num">90</span>)</u>;',
        's.<span class="t-fn">close</span>();'
      ],
      err: 2,
      title: "State Refinement Error",
      msg: ["found bound(s) but expected connected(s)"]
    }
  };
  var ide = $("#ide"), ideCode = $("#ide-code"), ideTimers = [];
  if (ide) {
    var scene = "values";
    var render = function (name, upto, showErr) {
      var s = SCENES[name];
      var html = s.lines.slice(0, upto).map(function (l, i) {
        var cls = "ide-ln" + (showErr && i === s.err ? " bad" : "");
        var line = '<span class="' + cls + '"><span class="ide-no">' + (i + 1) + "</span>" + (l || " ");
        if (showErr && i === s.err) {
          line += '<span class="ide-hover" role="note"><b><span class="fa fa-times-circle"></span> ' + s.title + "</b>" +
            s.msg.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "<em>LiquidJava</em></span>";
        }
        return line + "</span>";
      }).join("");
      ideCode.innerHTML = html;
      $("#ide-problems").classList.toggle("on", !!showErr);
      $("#ide-caption").innerHTML = s.caption;
    };
    var play = function (name) {
      ideTimers.forEach(clearTimeout); ideTimers = [];
      scene = name;
      var s = SCENES[name];
      if (reduceMotion) { render(name, s.lines.length, true); return; }
      // Code stays put; only the error (squiggle + popup) appears after a beat.
      render(name, s.lines.length, false);
      ideTimers.push(setTimeout(function () { render(name, s.lines.length, true); }, 900));
    };
    $$(".ide-tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".ide-tabs button").forEach(function (o) { o.setAttribute("aria-selected", o === b ? "true" : "false"); o.tabIndex = o === b ? 0 : -1; });
        play(b.dataset.scene);
      });
    });
    $("#ide-replay").addEventListener("click", function () { play(scene); });
    render(scene, SCENES[scene].lines.length, true);
    if ("IntersectionObserver" in window && !reduceMotion) {
      var ideIo = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { ideIo.disconnect(); play(scene); } }, { threshold: 0.5 });
      ideIo.observe(ide);
    }
  }

  /* ---------------- BibTeX ---------------- */
  $("#copy-bib").addEventListener("click", function () {
    var b = $("#copy-bib");
    var done = function () { b.innerHTML = '<span class="fa fa-check"></span>  Copied'; setTimeout(function () { b.innerHTML = '<span class="fa fa-clipboard"></span>  Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText($("#bibtex").textContent).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });
})();
