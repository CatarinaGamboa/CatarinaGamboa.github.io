/* barista.html: Socket protocol lab, pipeline walkthrough, result charts. */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ======================= Socket state machine ======================= */

  // Layout follows Figure 2 of the paper (viewBox 1660 x 340).
  var STATES = [
    { id: "start", kind: "start", x: 40, y: 25 },
    { id: "unconnected", label: "Unconnected", x: 156, y: 120 },
    { id: "bound", label: "Bound", x: 490, y: 288 },
    { id: "connected", label: "Connected", x: 833, y: 133 },
    { id: "outputshutdown", label: "Output\nShutdown", x: 1242, y: 52 },
    { id: "inputshutdown", label: "Input\nShutdown", x: 1250, y: 202 },
    { id: "bothshutdown", label: "Both\nShutdown", x: 1500, y: 135 },
    { id: "allstates", kind: "note", label: "(all states) ...", x: 1010, y: 296, order: 1540 },
    { id: "closed", label: "Closed", x: 1400, y: 292, order: 1550 },
    { id: "end", kind: "end", x: 1612, y: 292 }
  ];

  var EDGES = [
    { id: "c0", from: "start", to: "unconnected", label: "**Socket**()", method: "ctor0", bend: 8, lp: [150, 70] },
    { id: "c1", from: "start", to: "connected", label: "**Socket**([InetAddress a],\n      [int port])", method: "ctor1", bend: -34, lp: [300, 48], anchor: "start" },
    { id: "con0", from: "unconnected", to: "connected", label: "**connect**([SocketAddress e],\n         [int timeout])", method: "connect", bend: 25, lp: [286, 112], anchor: "start" },
    { id: "bind", from: "unconnected", to: "bound", label: "**bind**([SocketAddress b])", method: "bind", bend: 55, lp: [70, 214], anchor: "start" },
    { id: "con1", from: "bound", to: "connected", label: "**connect**(\n[SocketAddress e],\n[int timeout])", method: "connect", bend: -28, lp: [612, 206], anchor: "start" },
    { id: "urg", from: "connected", to: "connected", label: "**sendUrgentData**(int)", method: "sendUrgentData", loop: "below", ghost: true },
    { id: "so1", from: "connected", to: "outputshutdown", label: "**shutdown**\n**Output()**", method: "shutdownOutput", bend: -10, lp: [966, 80], anchor: "start" },
    { id: "si1", from: "connected", to: "inputshutdown", label: "**shutdown**\n**Input()**", method: "shutdownInput", bend: 10, lp: [972, 168], anchor: "start" },
    { id: "si2", from: "outputshutdown", to: "bothshutdown", label: "**shutdown**\n**Input()**", method: "shutdownInput", bend: -16, lp: [1380, 30], anchor: "start" },
    { id: "so2", from: "inputshutdown", to: "bothshutdown", label: "**shutdown**\n**Output()**", method: "shutdownOutput", bend: 10, lp: [1410, 196], anchor: "start" },
    { id: "cl", from: "allstates", to: "closed", label: "**close**()", method: "close", lp: [1196, 300] },
    { id: "fin", from: "closed", to: "end", label: "", method: "" }
  ];
  // close() is legal from every state; Figure 2 abbreviates this as "(all states)".
  // These edges only appear while close is highlighted or taken.
  [["unconnected", -60], ["bound", -18], ["connected", -24], ["inputshutdown", 12], ["outputshutdown", -30], ["bothshutdown", 0]]
    .forEach(function (p) {
      EDGES.push({ id: "close-" + p[0], from: p[0], to: "closed", label: "", method: "close", ghost: true, bend: p[1] });
    });

  var METHODS = {
    bind: { call: "s.bind(local);", t: { unconnected: "bound" } },
    connect: { call: "s.connect(server, 5000);", t: { unconnected: "connected", bound: "connected" } },
    sendUrgentData: { call: "s.sendUrgentData(1);", t: { connected: "connected" } },
    shutdownInput: { call: "s.shutdownInput();", t: { connected: "inputshutdown", outputshutdown: "bothshutdown" } },
    shutdownOutput: { call: "s.shutdownOutput();", t: { connected: "outputshutdown", inputshutdown: "bothshutdown" } },
    close: { call: "s.close();", any: "closed" }
  };
  var LABEL = {};
  STATES.forEach(function (s) { if (s.label) LABEL[s.id] = s.label.replace("\n", " "); });

  var dfa = PaperDFA.create($("#socket-dfa"), { states: STATES, edges: EDGES });

  var methodRow = $("#methods");
  Object.keys(METHODS).forEach(function (m) {
    var b = document.createElement("button");
    b.className = "call";
    b.dataset.method = m;
    b.textContent = m + "()";
    b.disabled = true;
    methodRow.appendChild(b);
  });

  var programEl = $("#program");
  var verdictEl = $("#verdict");
  var state = null;
  var lines = [];

  function allowedFrom(m, s) {
    var spec = METHODS[m];
    return spec.any ? spec.any : spec.t[s];
  }

  function refreshButtons() {
    $$(".call[data-method]").forEach(function (b) {
      b.disabled = state === null;
      var ok = state !== null && !!allowedFrom(b.dataset.method, state);
      b.classList.toggle("allowed", ok);
      b.setAttribute("aria-label", b.dataset.method + "()" + (state === null ? "" : ok ? ", allowed now" : ", not allowed now"));
    });
  }

  function renderProgram() {
    programEl.innerHTML = "";
    if (!lines.length) {
      programEl.innerHTML = '<li class="empty">Create a socket to start.</li>';
      return;
    }
    lines.forEach(function (l, i) {
      var li = document.createElement("li");
      if (l.error) li.className = "bad";
      if (i === lines.length - 1) li.classList.add("new");
      var code = document.createElement("span");
      code.textContent = l.code;
      var st = document.createElement("span");
      st.className = "st";
      st.textContent = l.error ? "✗ error" : "→ " + LABEL[l.state];
      li.appendChild(code);
      li.appendChild(st);
      programEl.appendChild(li);
    });
  }

  function renderVerdict() {
    var errs = lines.map(function (l, i) { return { l: l, n: i + 1 }; }).filter(function (x) { return x.l.error; });
    if (!lines.length) { verdictEl.innerHTML = '<div class="idle">No program yet.</div>'; return; }
    if (!errs.length) {
      verdictEl.innerHTML = '<div class="ok">✓ LiquidJava accepts this program.</div>';
      return;
    }
    verdictEl.innerHTML = "";
    errs.slice(-2).forEach(function (x) {
      var d = document.createElement("div");
      d.className = "err";
      var b = document.createElement("b");
      b.textContent = x.l.error.kind + " on line " + x.n;
      var msg = document.createElement("div");
      msg.textContent = x.l.error.msg;
      d.appendChild(b);
      d.appendChild(msg);
      verdictEl.appendChild(d);
    });
  }

  function construct(kind) {
    lines = [];
    if (kind === "ctor0") {
      lines.push({ code: "Socket s = new Socket();", state: "unconnected" });
      state = "unconnected";
      dfa.setCurrent(state, "c0");
    } else {
      var raw = $("#port").value.trim();
      var port = raw === "" ? NaN : Number(raw);
      var code = "Socket s = new Socket(addr, " + (raw === "" ? "?" : raw) + ");";
      if (!Number.isInteger(port) || port < 0 || port > 65535) {
        lines.push({
          code: code, error: {
            kind: "Refinement Error",
            msg: "port == " + (raw === "" ? "?" : raw) + " is not a subtype of ValidPort(port), which requires port >= 0 && port <= 65535"
          }
        });
        state = null;
        dfa.setCurrent(null);
      } else {
        lines.push({ code: code, state: "connected" });
        state = "connected";
        dfa.setCurrent(state, "c1");
      }
    }
    renderProgram(); renderVerdict(); refreshButtons();
  }

  function callMethod(m) {
    if (state === null) return;
    var to = allowedFrom(m, state);
    if (!to) {
      var expected = Object.keys(METHODS[m].t).map(function (s) { return s + "(s)"; }).join(" || ");
      lines.push({
        code: METHODS[m].call, error: {
          kind: "State Refinement Error",
          msg: "found " + state + "(s) but expected " + expected
        }
      });
      dfa.flashError(state);
    } else {
      var via = dfa.edgeFor(m, state);
      lines.push({ code: METHODS[m].call, state: to });
      dfa.setCurrent(to, via);
      state = to;
    }
    renderProgram(); renderVerdict(); refreshButtons();
  }

  $$(".call[data-ctor]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      if (e.target.tagName === "INPUT") return;
      construct(b.dataset.ctor);
    });
  });
  $("#port").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); construct("ctor1"); } });
  $("#port").addEventListener("keyup", function (e) { if (e.key === " ") e.preventDefault(); });
  $("#port").addEventListener("click", function (e) { e.stopPropagation(); });
  $$(".call[data-method]").forEach(function (b) {
    b.addEventListener("click", function () { callMethod(b.dataset.method); });
  });

  var SCENARIOS = {
    "after-close": [["port", "8080"], ["ctor", "ctor1"], ["m", "sendUrgentData"], ["m", "close"], ["m", "sendUrgentData"]],
    "bind-twice": [["ctor", "ctor0"], ["m", "bind"], ["m", "bind"]],
    "bad-port": [["port", "70000"], ["ctor", "ctor1"]]
  };
  var scenarioTimer = null;
  $$(".scenario").forEach(function (b) {
    b.addEventListener("click", function () {
      clearTimeout(scenarioTimer);
      var steps = SCENARIOS[b.dataset.scenario].slice();
      (function next() {
        var s = steps.shift();
        if (!s) return;
        if (s[0] === "port") $("#port").value = s[1];
        else if (s[0] === "ctor") construct(s[1]);
        else callMethod(s[1]);
        scenarioTimer = setTimeout(next, s[0] === "port" ? 0 : reduceMotion ? 150 : 750);
      })();
    });
  });

  /* ---- linked highlighting: DFA edges, buttons, docs, spec ---- */
  var tabs = { doc: $("#tab-doc"), spec: $("#tab-spec") };
  var panels = { doc: $("#panel-doc"), spec: $("#panel-spec") };
  function selectTab(name, focus) {
    Object.keys(tabs).forEach(function (k) {
      var on = k === name;
      tabs[k].setAttribute("aria-selected", on);
      tabs[k].tabIndex = on ? 0 : -1;
      panels[k].hidden = !on;
    });
    if (focus) tabs[name].focus();
  }
  tabs.doc.addEventListener("click", function () { selectTab("doc"); });
  tabs.spec.addEventListener("click", function () { selectTab("spec"); });
  $(".tabs").addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") selectTab(tabs.doc.getAttribute("aria-selected") === "true" ? "spec" : "doc", true);
  });

  function scrollIntoPanel(node, panel) {
    if (!node || panel.hidden) return;
    var top = node.offsetTop - panel.offsetTop;
    if (top < panel.scrollTop || top + node.offsetHeight > panel.scrollTop + panel.clientHeight) {
      panel.scrollTo({ top: top - 44, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  function highlightMethod(m) {
    dfa.highlight(m);
    $$("[data-method].doc-entry, .spec .blk[data-method]").forEach(function (n) {
      n.classList.toggle("is-hot", !!m && n.dataset.method === m);
    });
    if (m) {
      scrollIntoPanel($('.doc-entry[data-method="' + m + '"]'), panels.doc);
      scrollIntoPanel($('.spec .blk[data-method="' + m + '"]'), panels.spec);
    }
  }
  dfa.onHover(highlightMethod);
  $$(".call, .doc-entry, .spec .blk[data-method]").forEach(function (n) {
    var m = function () { return n.dataset.method || n.dataset.ctor; };
    n.addEventListener("pointerenter", function () { highlightMethod(m()); });
    n.addEventListener("pointerleave", function () { highlightMethod(null); });
    n.addEventListener("focus", function () { highlightMethod(m()); });
    n.addEventListener("blur", function () { highlightMethod(null); });
  });

  refreshButtons();

  // One orchestrated moment: draw the machine when it scrolls into view.
  var svg = $("#socket-dfa");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); dfa.intro(); }
    }, { threshold: 0.35 });
    io.observe(svg);
  }

  /* ============================ Pipeline ============================ */

  var TURNS = [
    { agent: "Orchestrator", share: 14 },
    { agent: "Protocol analyzer", share: 8 },
    { agent: "Spec writer", share: 8 },
    { agent: "Test completer", share: 48 },
    { agent: "Verifier", share: 22 }
  ];

  var STEPS = {
    1: {
      title: "Model the protocol as a state machine",
      agent: "Protocol analyzer", median: 5,
      text: "The agent reads the class description, method signatures and Javadoc, and writes the protocol as a Mermaid state machine. A guide on typestate, with common protocol patterns, tells it what to look for.",
      check: "An MCP tool checks that every public method appears, every state is reachable and the machine is deterministic. The agent revises until all three pass.",
      label: "State machine for Socket (excerpt)",
      plain: true,
      code: "stateDiagram-v2\n  [*] --> unconnected : Socket()\n  [*] --> connected : Socket(addr, port)\n  unconnected --> bound : bind(b)\n  unconnected --> connected : connect(e, timeout)\n  bound --> connected : connect(e, timeout)\n  connected --> inputshutdown : shutdownInput()\n  connected --> outputshutdown : shutdownOutput()\n  inputshutdown --> bothshutdown : shutdownOutput()\n  outputshutdown --> bothshutdown : shutdownInput()"
    },
    2: {
      title: "Write valid and invalid usage tests",
      agent: "Test completer", median: 24,
      text: "An MCP tool walks the state machine depth-first to list call sequences that should be accepted and ones that should be rejected, then ranks them by how many states and transitions they cover. The agent fills in the placeholder arguments.",
      check: "The agent compiles the tests and fixes them until they compile. They only need to type-check in Java, since LiquidJava will check them statically.",
      label: "A test template from the paper, and one way to complete it",
      code: "// template: should be accepted\nSocket s = new Socket([InetAddress addr, int port]);\ns.close();\n\n// completed by the agent\nSocket s = new Socket(InetAddress.getLoopbackAddress(), 8080);\ns.close();"
    },
    3: {
      title: "Write the LiquidJava specification",
      agent: "Spec writer", median: 6,
      text: "An MCP tool translates the state machine mechanically: states become a @StateSet and transitions become @StateRefinement annotations. The agent then reads the docs for constraints on arguments and return values, and factors repeated ones into aliases.",
      check: null,
      label: "Argument refinement found in the Javadoc",
      code: "@RefinementAlias(\"ValidPort(int p) {p >= 0 && p <= 65535}\")\n...\n@StateRefinement(to = \"connected(this)\")\npublic void Socket(InetAddress address,\n    @Refinement(\"ValidPort(_)\") int port);"
    },
    4: {
      title: "Verify the specification against the tests",
      agent: "Verifier", median: 13,
      text: "LiquidJava checks every test against the specification. Valid tests must pass and invalid ones must be rejected.",
      check: "When a test lands on the wrong side, the agent edits the specification using LiquidJava's error message, up to a fixed number of iterations. Vague messages hurt here: in one class the agent deleted a correct refinement to silence an error it couldn't interpret.",
      label: "Example: LiquidJava feedback on an invalid test",
      code: "Socket s = new Socket();\ns.sendUrgentData(1);\n\nState Refinement Error\nfound unconnected(s) but expected connected(s)\n\n// expected: rejected   result: rejected  ✓"
    }
  };
  STEPS.final = {
    title: "The result: an annotated class",
    text: "The output is a LiquidJava specification for the class, with its states, the transitions of every method and the constraints on arguments. Client code that uses the class is then checked at compile time.",
    check: "For Socket, this is the specification you tried in the section above.",
    label: "Part of the specification for Socket",
    code: "@StateSet({\"unconnected\", \"bound\", \"connected\", ...})\n@RefinementAlias(\"ValidPort(int p) {p >= 0 && p <= 65535}\")\n@ExternalRefinementsFor(\"java.net.Socket\")\npublic interface SocketRefinements {\n  @StateRefinement(from = \"unconnected(this)\", to = \"bound(this)\")\n  public void bind(SocketAddress bindpoint);\n  ...\n}"
  };
  var AGENT_INDEX = { "Protocol analyzer": 1, "Spec writer": 2, "Test completer": 3, "Verifier": 4 };

  var wf = BaristaWorkflow.draw($("#workflow"));
  var detail = $("#detail");
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Small Java highlighter for the code samples: comments, strings,
  // annotations, keywords and LiquidJava error headers.
  function highlight(src) {
    var re = /(\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*")|(@[A-Za-z]+)|\b(public|void|interface|new|int|long|boolean|class|throws|return|import|static|final)\b|(State Refinement Error|Refinement Error)/g;
    var out = "", last = 0, m;
    while ((m = re.exec(src))) {
      var cls = m[1] ? "cm" : m[2] ? "str" : m[3] ? "an" : m[4] ? "kw" : "err";
      out += esc(src.slice(last, m.index)) + '<span class="' + cls + '">' + esc(m[0]) + "</span>";
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function showStep(n) {
    var key = String(n);
    Object.keys(wf.steps).forEach(function (k) {
      wf.steps[k].classList.toggle("selected", k === key);
      wf.steps[k].setAttribute("aria-pressed", k === key);
    });
    wf.final.classList.toggle("selected", key === "final");
    var s = STEPS[n];
    var turns = "";
    if (s.agent) {
      var share = TURNS[AGENT_INDEX[s.agent]].share;
      var bar = TURNS.map(function (t) {
        return '<span style="flex:' + t.share + '" class="' + (t.agent === s.agent ? "on" : "") + '" title="' + t.agent + ": " + t.share + '%"></span>';
      }).join("");
      turns = '<div class="turns">' + esc(s.agent) + " agent: " + share + "% of all agent turns, median " + s.median + " per run" +
        '<div class="turns-bar" aria-hidden="true">' + bar + "</div>" +
        '<span class="small muted">Share of turns across the five agents, including the orchestrator.</span></div>';
    }
    detail.innerHTML =
      "<div><h4>" + (s.agent ? n + ". " : "") + esc(s.title) + "</h4><p>" + esc(s.text) + "</p>" +
      (s.check ? "<p>" + esc(s.check) + "</p>" : "") + turns + "</div>" +
      '<div><p class="art-label">' + esc(s.label) + "</p><pre><code>" + (s.plain ? esc(s.code) : highlight(s.code)) + "</code></pre></div>";
  }
  function onActivate(g, key) {
    g.addEventListener("click", function () { stopPlay(); showStep(key); });
    g.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stopPlay(); showStep(key); }
    });
  }
  Object.keys(wf.steps).forEach(function (k) { onActivate(wf.steps[k], Number(k)); });
  onActivate(wf.final, "final");
  showStep(1);

  // Playback order: input, step 1, its DFA, tests, refinements, verification, result.
  var SEQUENCE = [
    { lit: ["input"], show: 1 },
    { lit: ["1"], show: 1 },
    { lit: ["dfa"], glow: ["dfa"], show: 1 },
    { lit: ["dfa", "to2", "2"], show: 2 },
    { lit: ["dfa", "to3", "3"], show: 3 },
    { lit: ["to4", "4", "final"], show: 4 },
    { lit: ["final"], glow: ["final"], show: "final" }
  ];
  var playTimers = [];
  var playBtn = $("#play");
  var played = false;
  function setPlayLabel(playing) {
    playBtn.innerHTML = playing ? '<span class="fa fa-stop"></span> Stop'
      : '<span class="fa fa-' + (played ? "repeat" : "play") + '"></span> ' + (played ? "Replay the workflow" : "Play the workflow");
  }
  function stopPlay() {
    playTimers.forEach(clearTimeout);
    playTimers = [];
    wf.light(null);
    setPlayLabel(false);
  }
  function play() {
    stopPlay();
    played = true;
    setPlayLabel(true);
    var d = reduceMotion ? 900 : 1700;
    SEQUENCE.forEach(function (stage, i) {
      playTimers.push(setTimeout(function () { wf.light(stage.lit, stage.glow); showStep(stage.show); }, i * d));
    });
    // End on a still frame: the result stays highlighted until the reader clicks something.
    playTimers.push(setTimeout(function () {
      playTimers = [];
      wf.light(null);
      showStep("final");
      setPlayLabel(false);
    }, SEQUENCE.length * d));
  }
  playBtn.addEventListener("click", function () { if (playTimers.length) stopPlay(); else play(); });

  // Play once, the first time the workflow scrolls into view.
  if ("IntersectionObserver" in window && !reduceMotion) {
    var wio = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { wio.disconnect(); if (!played) play(); }
    }, { threshold: 0.6 });
    wio.observe($("#workflow"));
  }

  /* ============================ Charts ============================ */

  var tip = $("#pp-tooltip");
  function showTip(evt, html) {
    tip.innerHTML = html;
    tip.classList.add("show");
    var r = evt.target.getBoundingClientRect();
    var x = evt.clientX || r.left + r.width / 2;
    var y = evt.clientY || r.top;
    var w = tip.offsetWidth;
    tip.style.left = Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2)) + "px";
    tip.style.top = (y - tip.offsetHeight - 12) + "px";
  }
  function hideTip() { tip.classList.remove("show"); }

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

  var VARIANTS = [
    { key: "baseline", name: "Baseline", color: "var(--s-baseline)", v: [69.1, 50.7, 58.5] },
    { key: "dfa", name: "State machine only", color: "var(--s-dfa)", v: [85.2, 47.3, 60.9] },
    { key: "barista", name: "Barista (full)", color: "var(--s-barista)", v: [87.0, 68.3, 76.5] }
  ];
  var METRICS = ["Precision", "Recall", "F1"];
  var LENSES = {
    all: { focus: ["baseline", "dfa", "barista"], labels: ["barista"],
      gap: { metric: 2, from: "baseline", to: "barista", text: "+18.0 pts, δ = 0.41 (medium) **" },
      note: "Each component pulls a different lever. The state machine mainly lifts precision; the tests mainly lift recall. Together they give the best F1 (Cliff's δ = 0.41 over the baseline, medium effect)." },
    dfa: { focus: ["baseline", "dfa"], labels: ["baseline", "dfa"],
      gap: { metric: 0, from: "baseline", to: "dfa", text: "+16.1 pts, δ = 0.51 (large) **" },
      note: "Generating through a state machine first raises precision from 69.1% to 85.2% (Cliff's δ = 0.51, large effect). Recall barely moves: the specification gets stricter in the right places, not broader." },
    tests: { focus: ["dfa", "barista"], labels: ["dfa", "barista"],
      gap: { metric: 1, from: "dfa", to: "barista", text: "+21.0 pts, δ = 0.23 (small) **" },
      note: "Checking the specification against synthesized tests raises recall from 47.3% to 68.3% (Cliff's δ = 0.23, small effect) while precision holds at 87%." }
  };

  var ab = $("#ablation");
  var W = 640, H = 310, M = { l: 36, r: 8, t: 50, b: 34 };
  var ph = H - M.t - M.b, pw = W - M.l - M.r;
  var y = function (v) { return M.t + ph - v / 100 * ph; };
  var grid = sv("g", { "class": "grid" }, ab);
  var axis = sv("g", { "class": "axis" }, ab);
  [0, 25, 50, 75, 100].forEach(function (t) {
    sv("line", { x1: M.l, x2: W - M.r, y1: y(t), y2: y(t) }, grid);
    sv("text", { x: M.l - 8, y: y(t), "text-anchor": "end", "dominant-baseline": "central" }, axis).textContent = t + "%";
  });
  var groupW = pw / 3, bw = 40, gap = 2;
  var bars = [];
  var labels = [];
  var geo = {};
  METRICS.forEach(function (metric, mi) {
    var cx = M.l + groupW * mi + groupW / 2;
    var x0 = cx - (bw * 3 + gap * 2) / 2;
    sv("text", { x: cx, y: H - 10, "text-anchor": "middle", "class": "cat" }, ab).textContent = metric;
    VARIANTS.forEach(function (v, vi) {
      var val = v.v[mi];
      var x = x0 + vi * (bw + gap);
      var p = sv("path", {
        d: barPath(x, y(val), bw, y(0) - y(val), 4), fill: v.color, "class": "bar", tabindex: "0",
        role: "img", "aria-label": v.name + ", " + metric.toLowerCase() + ": " + val + "%"
      }, ab);
      p.dataset.variant = v.key;
      geo[v.key + mi] = { x: x, w: bw, v: val };
      var html = "<b>" + v.name + "</b><br>" + metric + ": " + val.toFixed(1) + "%";
      p.addEventListener("pointerenter", function (e) { showTip(e, html); });
      p.addEventListener("pointermove", function (e) { showTip(e, html); });
      p.addEventListener("pointerleave", hideTip);
      p.addEventListener("focus", function (e) { showTip(e, html); });
      p.addEventListener("blur", hideTip);
      bars.push(p);
      var t = sv("text", { x: x + bw / 2, y: y(val) - 7, "text-anchor": "middle", "class": "val" }, ab);
      t.textContent = val.toFixed(1);
      t.dataset.variant = v.key;
      labels.push(t);
    });
  });
  var defs = sv("defs", {}, ab);
  var pat = sv("pattern", { id: "gain-hatch", patternUnits: "userSpaceOnUse", width: 6, height: 6, patternTransform: "rotate(45)" }, defs);
  sv("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "#fff", "stroke-width": 2.2, "stroke-opacity": 0.75 }, pat);
  var gapLayer = sv("g", { "class": "gap-layer" }, ab);

  // Show the gap between two variants: a dashed line at the lower value,
  // the gained part of the higher bar hatched, and a bracket with the effect size.
  function drawGap(g) {
    gapLayer.innerHTML = "";
    if (!g) return;
    var a = geo[g.from + g.metric], b = geo[g.to + g.metric];
    var lo = Math.min(a.v, b.v), hi = Math.max(a.v, b.v);
    var x0 = Math.min(a.x, b.x), x1 = Math.max(a.x + a.w, b.x + b.w);
    sv("rect", { x: b.x, y: y(hi), width: b.w, height: y(lo) - y(hi), fill: "url(#gain-hatch)" }, gapLayer);
    sv("line", { x1: x0 - 4, x2: x1 + 4, y1: y(lo), y2: y(lo), "class": "gap-ref" }, gapLayer);
    var top = y(hi) - 26;
    var ca = a.x + a.w / 2, cb = b.x + b.w / 2;
    sv("path", { d: "M" + ca + "," + (y(a.v) - 20) + " V" + top + " H" + cb + " V" + (y(b.v) - 20), "class": "gap-bracket" }, gapLayer);
    var t = sv("text", { x: (ca + cb) / 2, y: top - 8, "text-anchor": "middle", "class": "gap-text" }, gapLayer);
    t.textContent = g.text;
    var bb = t.getBBox();
    if (bb.x + bb.width > W - 2) { t.setAttribute("text-anchor", "end"); t.setAttribute("x", W - 2); }
  }

  function setLens(name) {
    var lens = LENSES[name];
    drawGap(lens.gap);
    bars.forEach(function (b) { b.classList.toggle("dim", lens.focus.indexOf(b.dataset.variant) < 0); });
    labels.forEach(function (t) { t.style.display = lens.labels.indexOf(t.dataset.variant) < 0 ? "none" : ""; });
    $$(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.lens === name); });
    $("#lens-note").textContent = lens.note;
  }
  $$(".seg button").forEach(function (b) { b.addEventListener("click", function () { setLens(b.dataset.lens); }); });
  setLens("all");

  /* ---- root causes ---- */
  var CAUSES = [
    ["Parameter-conditional transitions", 7, "m", "A transition depends on an argument's value, e.g. ChoiceCallback starts in a single- or multiple-selection state depending on a boolean."],
    ["Getter under-restriction", 6, "m", "A method that needs a state is left callable everywhere, e.g. DatagramSocket.getRemoteSocketAddress."],
    ["Beyond-doc extrapolation", 5, "m", ""],
    ["Ambiguous documentation", 5, "i", ""],
    ["State collapse", 5, "m", ""],
    ["Protected method annotation", 4, "m", ""],
    ["Orthogonal state dimensions", 2, "m", "Independent properties are flattened into one machine, e.g. 9 states for ImageWriteParam instead of two sets of 3."],
    ["Source code dependency", 2, "i", "Experts needed the source code, not just the docs, to see the protocol."],
    ["Cross-class contract opacity", 2, "i", "The protocol depends on another class, e.g. RequiredModelMBean."],
    ["Getter over-restriction", 1, "m", ""],
    ["Static factory methods", 1, "m", ""]
  ];
  var causes = $("#causes");
  CAUSES.forEach(function (c) {
    var name = document.createElement("span");
    name.textContent = c[0];
    name.setAttribute("role", "listitem");
    var track = document.createElement("span");
    var bar = document.createElement("span");
    bar.className = "bar";
    bar.style.display = "block";
    bar.style.width = (c[1] / 7 * 100) + "%";
    bar.style.background = c[2] === "m" ? "var(--s-dfa)" : "var(--s-baseline)";
    track.appendChild(bar);
    var v = document.createElement("span");
    v.className = "v";
    v.textContent = c[1];
    name.setAttribute("aria-label", c[0] + ": " + c[1] + " classes, " + (c[2] === "m" ? "modeling gap" : "information gap"));
    var html = "<b>" + c[0] + "</b> (" + (c[2] === "m" ? "modeling gap" : "information gap") + ")<br>" + c[1] + (c[1] === 1 ? " class" : " classes") + (c[3] ? ". " + c[3] : ".");
    [name, bar].forEach(function (n) {
      n.addEventListener("pointerenter", function (e) { showTip(e, html); });
      n.addEventListener("pointermove", function (e) { showTip(e, html); });
      n.addEventListener("pointerleave", hideTip);
    });
    causes.appendChild(name);
    causes.appendChild(track);
    causes.appendChild(v);
  });

  /* ============================ Benchmark ============================ */

  var JD = "https://docs.oracle.com/en/java/javase/17/docs/api/";
  var DOMAINS = [
    ["Graphics", "5–89 methods", [
      ["AbstractUndoableEdit", "java.desktop/javax/swing/undo"], ["Clipboard", "java.desktop/java/awt/datatransfer"],
      ["DefaultMutableTreeNode", "java.desktop/javax/swing/tree"], ["DragSourceContext", "java.desktop/java/awt/dnd"],
      ["DropTarget", "java.desktop/java/awt/dnd"], ["FlatteningPathIterator", "java.desktop/java/awt/geom"],
      ["ImageReadParam", "java.desktop/javax/imageio"], ["ImageWriteParam", "java.desktop/javax/imageio"],
      ["PopupMenu", "java.desktop/java/awt"], ["UndoManager", "java.desktop/javax/swing/undo"], ["Window", "java.desktop/java/awt"]]],
    ["I/O", "7–14 methods", [
      ["BufferedInputStream", "java.base/java/io"], ["BufferedReader", "java.base/java/io"],
      ["DeflaterOutputStream", "java.base/java/util/zip"], ["PipedOutputStream", "java.base/java/io"],
      ["PipedWriter", "java.base/java/io"], ["ZipFile", "java.base/java/util/zip"], ["ZipOutputStream", "java.base/java/util/zip"]]],
    ["System", "15–53 methods", [
      ["MLet", "java.management/javax/management/loading"], ["RequiredModelMBean", "java.management/javax/management/modelmbean"],
      ["ThreadGroup", "java.base/java/lang"], ["Throwable", "java.base/java/lang"], ["UUID", "java.base/java/util"], ["Vector", "java.base/java/util"]]],
    ["Network", "13–54 methods", [
      ["DatagramSocket", "java.base/java/net"], ["RMIConnector", "java.management.rmi/javax/management/remote/rmi"],
      ["ServerSocket", "java.base/java/net"], ["Socket", "java.base/java/net"]]],
    ["Security", "8–26 methods", [
      ["ChoiceCallback", "java.base/javax/security/auth/callback"], ["KerberosKey", "java.security.jgss/javax/security/auth/kerberos"],
      ["KerberosTicket", "java.security.jgss/javax/security/auth/kerberos"], ["LoginContext", "java.base/javax/security/auth/login"]]],
    ["Data", "13–35 methods", [
      ["SQLException", "java.sql/java/sql"], ["TransformerException", "java.xml/javax/xml/transform"],
      ["XMLFilterImpl", "java.xml/org/xml/sax/helpers"]]]
  ];
  var domainsEl = $("#domains");
  DOMAINS.forEach(function (d) {
    var wrap = document.createElement("div");
    wrap.className = "domain";
    var h = document.createElement("h3");
    h.innerHTML = esc(d[0]) + " <span>" + d[2].length + " classes, " + d[1] + "</span>";
    var chips = document.createElement("div");
    chips.className = "chips";
    d[2].forEach(function (c) {
      var a = document.createElement("a");
      a.href = JD + c[1] + "/" + c[0] + ".html";
      a.textContent = c[0];
      if (c[0] === "Socket") { a.className = "feature"; a.title = "The running example above"; }
      chips.appendChild(a);
    });
    wrap.appendChild(h);
    wrap.appendChild(chips);
    domainsEl.appendChild(wrap);
  });

  /* ============================ BibTeX ============================ */
  $("#copy-bib").addEventListener("click", function () {
    var b = $("#copy-bib");
    var text = $("#bibtex").textContent;
    var done = function () { b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy"; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });
})();
