/* papers/lgtm: auto-merge definition, auto-merge distributions (Figures 1 and 3), PR size (Figure 2), Table 1. */
(function () {
  "use strict";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function hl(s) { return esc(s).replace(/\*([^*]+)\*/g, "<b>$1</b>"); }
  var tip = $("#pp-tooltip");
  function showTip(e, html) { tip.innerHTML = html; tip.classList.add("show"); moveTip(e); }
  function moveTip(e) {
    var x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px"; tip.style.top = (e.clientY + 16) + "px";
  }
  function hideTip() { tip.classList.remove("show"); }
  function bindTip(el, html) {
    el.addEventListener("mouseenter", function (e) { showTip(e, html); });
    el.addEventListener("mousemove", moveTip);
    el.addEventListener("mouseleave", hideTip);
  }

  /* ---------------- what counts as an auto-merge (Section 2) ---------------- */
  var EVENTS = [
    { icon: "fa-code-fork", text: "Agent opens the PR", sub: "Codex can act under the user's account", fixed: true },
    { icon: "fa-code", text: "Agent pushes more commits", sub: "Devin commits as it goes", on: true },
    { icon: "fa-cog", text: "A bot comments", sub: "For example Dependabot or a CI bot", on: true },
    { icon: "fa-comment-o", text: "The author comments", sub: "The person who launched the agent", on: false },
    { icon: "fa-thumbs-o-up", text: "A maintainer approves: “LGTM”", sub: "Even a one-word approval is a review", on: false, blocks: true, why: "A maintainer's approval" },
    { icon: "fa-comments-o", text: "Someone else comments", sub: "Any human other than the author", on: false, blocks: true, why: "A comment from someone else" },
    { icon: "fa-check", text: "Merged", fixed: true, merge: true }
  ];
  var tl = $("#am-timeline");
  EVENTS.forEach(function (ev, i) {
    var li = document.createElement("li");
    li.className = "am-ev" + (ev.fixed ? " fixed on" : "") + (ev.merge ? " merge" : "") + (ev.blocks ? " blocks" : " ok");
    li.innerHTML = '<span class="am-ico"><span class="fa ' + ev.icon + '" aria-hidden="true"></span></span>' +
      '<span class="am-txt">' + esc(ev.text) + (ev.sub ? "<small>" + esc(ev.sub) + "</small>" : "") + "</span>" +
      (ev.fixed ? "<span></span>" : '<button class="switch" role="switch" aria-checked="' + !!ev.on + '" aria-label="' + esc(ev.text) + '"></button>');
    tl.appendChild(li);
    ev.el = li;
    var sw = $(".switch", li);
    if (sw) sw.addEventListener("click", function () { ev.on = !ev.on; sw.setAttribute("aria-checked", ev.on); drawVerdict(); });
  });
  function drawVerdict() {
    var blockers = [];
    EVENTS.forEach(function (ev) {
      if (ev.fixed) return;
      ev.el.classList.toggle("on", !!ev.on);
      ev.el.classList.toggle("off", !ev.on);
      if (ev.on && ev.blocks) blockers.push(ev.why);
    });
    var v = $("#am-verdict");
    v.classList.toggle("no", blockers.length > 0);
    v.innerHTML = blockers.length
      ? '<h4><span class="fa fa-user" aria-hidden="true"></span>Merged with interaction</h4><p>' + esc(blockers[0]) + " counts as a human looking at it, so it is <b>not</b> an auto-merge.</p>"
      : '<h4><span class="fa fa-bolt" aria-hidden="true"></span>Auto-merged</h4><p>Only the author, the agent and bots touched it before the merge.</p>';
  }
  drawVerdict();

  /* ---------------- distributions (Figures 1 and 3) ----------------
     Repositories per auto-merge band: 0%, 1-25%, 26-50%, 51-75%, 76-99%, 100%.
     Counts read from the vector bars of the paper's figures. */
  var BANDS = ["0%", "1–25%", "26–50%", "51–75%", "76–99%", "100%"];
  var TASKS = [
    { id: "test", sig: "***", a: [54, 6, 4, 1, 6, 94], h: [43, 1, 1, 1, 1, 13] },
    { id: "fix", sig: "***", a: [161, 21, 38, 36, 21, 168], h: [100, 15, 28, 10, 4, 29] },
    { id: "docs", sig: "***", a: [111, 9, 17, 15, 5, 137], h: [58, 4, 13, 3, 2, 16] },
    { id: "feat", sig: "**", a: [158, 28, 52, 28, 23, 119], h: [95, 21, 31, 11, 3, 21] },
    { id: "ci", sig: "*", a: [31, 0, 2, 1, 0, 39], h: [29, 0, 3, 0, 0, 15] },
    { id: "refactor", sig: "***", a: [104, 5, 17, 7, 5, 100], h: [62, 2, 7, 5, 0, 18] },
    { id: "build", sig: "*", a: [48, 1, 4, 1, 1, 52], h: [63, 4, 3, 2, 2, 29] },
    { id: "chore", sig: "**", a: [58, 3, 11, 2, 2, 52], h: [62, 6, 15, 6, 3, 23] }
  ];
  var TASK_NOTES = {
    test: "Tests are the *most trusted* task.",
    ci: "CI changes are *developer-facing* and low-risk.",
    build: "Builds come close behind tests and CI.",
    feat: "Features reach users, carry more risk, and are the *least trusted*."
  };
  var AGENTS = [
    { id: "OpenAI Codex", kind: "agent", sig: "***", a: [26, 30, 25, 19, 42, 121], h: [12, 14, 23, 14, 10, 7],
      note: "The only agent whose auto-merge rates differ *significantly* from humans in the same repositories (p < 0.001)." },
    { id: "Claude Code", kind: "agent", a: [3, 2, 0, 0, 1, 6], h: [0, 2, 1, 1, 1, 0],
      note: "Half of its repositories auto-merge every PR, but it had less time to be adopted: only *12* repositories." },
    { id: "Cursor", kind: "assistant", a: [14, 6, 7, 5, 8, 6], h: [4, 4, 4, 0, 0, 0],
      note: "An editor built around the developer's workflow. Rates spread across all bands; no significant difference from humans." },
    { id: "Devin", kind: "agent", a: [23, 14, 9, 14, 12, 3], h: [7, 13, 11, 3, 4, 1],
      note: "Marketed as a “junior engineer”, and still reviewed: only *3* of *75* repositories auto-merge all its PRs." },
    { id: "Copilot", kind: "assistant", a: [73, 15, 11, 4, 2, 1], h: [20, 12, 3, 1, 1, 1],
      note: "An assistant inside the developer's workflow, and the *least* auto-merged." }
  ];
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function pct(v, n) { return Math.round(100 * v / n); }
  function three(a) { return [a[0], a[1] + a[2] + a[3] + a[4], a[5]]; }
  var GROUPS = [
    { cls: "s-never", name: "Never", sub: "0% auto-merged" },
    { cls: "s-some", name: "Sometimes", sub: "1–99%" },
    { cls: "s-always", name: "Always", sub: "100% auto-merged" }
  ];
  function legend(el) {
    el.innerHTML = GROUPS.map(function (g) {
      return '<li><i class="' + g.cls + '" style="background:var(--am-' + g.cls.slice(2) + ')"></i>' + g.name + ' <span class="muted small">(' + g.sub + ")</span></li>";
    }).join("") + '<li class="muted small">Thick bar: agentic PRs. Thin bar: human PRs.</li>';
  }
  function barHtml(counts, who, label) {
    var n = sum(counts), t = three(counts);
    var segs = t.map(function (v, k) {
      if (!v) return "";
      var p = 100 * v / n;
      return '<span class="' + GROUPS[k].cls + '" style="flex:' + p + ' 1 0" data-k="' + k + '">' + (p >= 9 ? pct(v, n) + "%" : "") + "</span>";
    }).join("");
    return '<div class="dist-bar ' + who + '" data-who="' + who + '"><span class="who">' + label + '</span><div class="stackbar">' + segs + '</div><span class="n">n=' + n + "</span></div>";
  }
  function distChart(opts) {
    var box = $(opts.chart), sel = opts.start;
    legend($(opts.legend));
    box.innerHTML = opts.rows.map(function (r, i) {
      return '<button class="dist-row" data-i="' + i + '" aria-pressed="false"><span class="dist-name">' + opts.name(r) + '</span><span class="dist-bars">' +
        barHtml(r.a, "agent", "Agents") + barHtml(r.h, "human", "Humans") + "</span></button>";
    }).join("");
    $$(".dist-row", box).forEach(function (row) {
      var r = opts.rows[+row.dataset.i];
      row.addEventListener("click", function () { sel = +row.dataset.i; draw(); });
      $$(".dist-bar", row).forEach(function (bar) {
        var c = bar.dataset.who === "agent" ? r.a : r.h, n = sum(c), t = three(c);
        $$(".stackbar span", bar).forEach(function (s) {
          var k = +s.dataset.k;
          bindTip(s, "<b>" + (bar.dataset.who === "agent" ? "Agentic" : "Human") + " PRs, " + GROUPS[k].name.toLowerCase() + "</b><br>" + t[k] + " of " + n + " repositories (" + pct(t[k], n) + "%)");
        });
      });
    });
    function draw() {
      $$(".dist-row", box).forEach(function (row, i) { row.setAttribute("aria-pressed", i === sel); });
      $(opts.note).innerHTML = opts.note_of(opts.rows[sel]);
    }
    draw();
    $(opts.table).innerHTML = "<table><thead><tr><th></th><th></th>" + BANDS.map(function (b) { return "<th>" + b + "</th>"; }).join("") + "<th>n</th></tr></thead><tbody>" +
      opts.rows.map(function (r) {
        var nm = r.id;
        return [["Agents", r.a], ["Humans", r.h]].map(function (w, j) {
          return "<tr><td>" + (j ? "" : esc(nm)) + "</td><td>" + w[0] + "</td>" + w[1].map(function (v) { return "<td>" + v + "</td>"; }).join("") + "<td>" + sum(w[1]) + "</td></tr>";
        }).join("");
      }).join("") + "</tbody></table><p class=\"small\">Repositories per auto-merge band.</p>";
  }
  function summary(r) {
    var ta = three(r.a), th = three(r.h), na = sum(r.a), nh = sum(r.h);
    return "Agents: <b>" + pct(ta[2], na) + "%</b> of " + na + " repositories always auto-merge, <b>" + pct(ta[0], na) + "%</b> never do. " +
      "Humans in the same projects: <b>" + pct(th[2], nh) + "%</b> always, <b>" + pct(th[0], nh) + "%</b> never.";
  }
  distChart({
    chart: "#tasks-chart", legend: "#tasks-legend", note: "#tasks-note", table: "#tasks-table", rows: TASKS, start: 0,
    name: function (r) { return "<code>" + r.id + '</code><span class="sig" title="Agents vs humans">' + r.sig + "</span>"; },
    note_of: function (r) { return '<span class="tag">' + r.id + "</span>" + (TASK_NOTES[r.id] ? hl(TASK_NOTES[r.id]) + " " : "") + summary(r); }
  });
  distChart({
    chart: "#agents-chart", legend: "#agents-legend", note: "#agents-note", table: "#agents-table", rows: AGENTS, start: 0,
    name: function (r) { return esc(r.id) + (r.sig ? '<span class="sig" title="Agent vs humans">' + r.sig + "</span>" : "") + "<small>" + (r.kind === "agent" ? "autonomous agent" : "assistant / editor") + "</small>"; },
    note_of: function (r) { return '<span class="tag">' + esc(r.id) + "</span>" + hl(r.note) + " " + summary(r); }
  });

  /* ---------------- PR size (Figure 2) ----------------
     One value per repository (its median PR), capped at the 95th percentile as in the paper.
     Positions read from the dots of Figure 2. */
  var DOTS = {"lines_am":{"b":[24,24,25,25,25,25,25,25,26,26,27,27,28,28,28,28,29,29,29,29,30,31,31,31,31,32,32,32,33,34,34,35,35,35,36,38,39,39,40,41,41,41,43,43,46,46,46,48,49,49,49,49,49,50,50,51,51,51,51,52,52,52,56,61,62,62,62,62,63,64,65,65,66,67,67,68,69,71,72,74,76,76,77,77,87,89,90,95,95,96,96,98,103,103,107,108,113,113,115,118,118,123,123,129,131,131,131,134,136,137,139,139,139,142,142,144,144,144,146,146,148,157,161,163,169,170,172,177,178,178,189,189,196,196,205,207,210,210,212,215,219,224,230,231,233,234,235,257,264,275,280,285,304,314,330,339,352,356,357,361,366,373,387,428,431,434,439,454,469,471,493,499,520,562,566,598,614,618,631,633,684,688,691,712,725,735,781,784,824,829,847,872,910,979,997,1010,1035,1092,1132,1295,1321,1443,1495,1636,1705,1707,1748,1794,2483,2630,3149,3809,3980,4003,4858,5019,5585,6269,6846,7192,8509,8969,8969,8969,8969,8969,8969,8969,8969,8969,8969,8969,8969],"r":[24,25,27,27,28,29,30,33,33,33,35,40,40,41,43,44,44,47,49,52,52,53,54,55,55,56,57,59,63,63,63,64,66,69,80,81,83,85,87,91,96,97,98,101,103,104,108,109,110,110,111,111,113,115,116,118,122,127,131,135,140,142,143,145,146,149,151,154,171,178,192,198,201,206,209,212,214,222,229,238,245,247,248,265,270,278,281,305,305,306,307,311,323,324,328,356,361,362,366,369,370,387,388,391,391,394,411,452,456,480,494,497,513,513,522,556,558,567,593,613,630,635,636,662,679,710,718,723,731,741,794,809,818,830,845,873,948,980,1005,1007,1038,1043,1043,1045,1053,1118,1183,1186,1198,1246,1416,1466,1469,1476,1481,1488,1525,1540,1553,1555,1575,1619,1631,1707,1726,1737,1741,1755,1774,1992,2030,2035,2054,2123,2217,2377,2406,2537,2678,2786,2923,3096,3114,3321,3405,3872,4108,4147,4204,4417,4536,4596,5318,5977,6125,6290,6906,7088,7156,7711,8148,9151,9305,9486,9939,10174,11208,12022,12182,12202,12227,13090,15066,16646,21386,25992,31421,33798,41523,42176,47136,48096,48096,48096,48096,48096,48096,48096,48096,48096,48096,48096,48096]},"files_am":{"b":[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.5,2.5,2.5,2.5,2.5,2.5,2.5,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.5,3.5,3.5,3.5,3.5,3.5,3.5,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.5,4.5,4.5,4.5,4.5,4.5,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,6.0,6.0,6.0,6.0,6.0,6.5,6.5,6.5,6.5,7.0,7.0,7.0,7.5,8.0,8.0,8.0,8.0,8.0,8.0,8.5,8.5,9.0,9.0,9.5,10.5,11.0,11.0,12.0,12.5,12.5,13.0,13.0,13.5,14.9,14.9,14.9,14.9,14.9,14.9,14.9,14.9,14.9,14.9,14.9,14.9],"r":[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.5,1.5,1.5,1.5,1.5,1.5,1.5,1.5,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.0,2.5,2.5,2.5,2.5,2.5,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.0,3.5,3.5,3.5,3.5,3.5,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.0,4.5,4.5,4.5,4.5,4.5,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.0,5.5,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.0,6.5,6.5,6.5,6.5,6.5,6.5,7.0,7.0,7.0,7.0,7.0,7.5,8.0,8.0,8.0,8.0,8.0,8.0,8.0,8.0,8.5,8.5,9.0,9.0,9.0,9.0,9.0,9.5,9.5,10.0,10.0,10.0,10.0,10.5,10.5,11.0,11.5,11.5,11.5,12.0,12.0,12.0,12.0,12.0,12.0,13.0,14.0,14.0,14.0,15.0,15.5,15.5,15.5,17.0,18.0,19.0,19.5,21.0,21.0,23.5,24.0,24.0,25.0,25.5,26.0,27.0,28.0,28.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0,29.0]},"del_ah":{"b":[0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.3,0.8,0.8,0.8,0.8,0.8,0.8,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8,1.8,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.8,2.8,2.8,2.8,2.8,2.8,2.8,2.8,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.3,3.8,3.8,3.8,3.8,3.8,3.8,3.8,3.8,3.8,3.8,3.8,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.3,4.8,4.8,4.8,4.8,4.8,5.3,5.3,5.3,5.3,5.3,5.3,5.3,5.3,5.8,5.8,5.8,5.8,5.8,5.8,6.3,6.3,6.3,6.3,6.3,6.8,6.8,6.8,7.3,7.3,7.3,7.3,7.3,7.3,7.3,7.8,7.8,7.8,8.3,8.3,8.8,8.8,8.8,8.8,8.8,9.3,9.3,9.3,9.3,9.3,9.3,9.3,9.3,9.8,9.8,10.3,10.3,10.8,11.3,11.3,12.3,12.3,12.3,12.3,12.3,12.3,12.3,12.8,13.3,13.3,14.3,14.8,15.3,16.3,16.8,17.3,18.3,19.3,19.3,20.3,20.3,23.8,24.3,26.3,27.8,27.8,28.3,28.3,29.8,29.8,31.3,32.8,33.3,35.8,38.3,40.3,42.8,42.8,43.3,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7,44.7],"r":[0.3,0.3,0.3,0.8,0.8,0.8,0.8,0.8,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.3,1.8,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.3,2.8,2.8,3.3,3.3,3.3,3.3,3.3,4.3,4.3,4.3,4.3,4.3,4.8,5.3,5.3,5.3,5.3,5.3,5.3,5.8,6.3,6.3,6.3,6.8,7.3,8.3,8.3,8.3,8.3,8.3,8.3,8.3,8.8,9.3,9.3,9.3,10.3,10.3,10.3,10.8,10.8,11.3,12.3,12.3,13.3,13.3,13.3,13.3,13.8,14.3,14.3,14.3,16.3,16.3,18.8,19.3,19.3,23.3,23.3,34.3,35.3,36.3,38.3,38.8,39.3,39.3,39.3,40.3,44.3,44.3,51.3,54.3,56.3,57.8,58.3,59.3,71.3,74.3,75.7,81.2,86.2,102.2,111.2,113.2,135.2,136.2,142.2,156.2,194.7,243.2,246.2,277.2,277.7,321.1,331.1,369.1,376.1,376.1,376.1,376.1,376.1,376.1,376.1]},"lines_ah":{"b":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,4,4,4,5,5,5,5,5,5,5,5,5,5,6,6,6,6,7,7,7,7,7,7,7,7,7,7,7,8,8,9,9,9,9,9,9,10,10,10,10,10,10,11,11,11,11,11,12,12,12,12,12,13,13,13,13,14,14,14,14,14,14,15,15,15,15,16,16,16,16,16,17,17,17,18,18,18,18,19,19,19,19,19,19,19,19,20,20,20,20,20,21,21,21,22,22,22,22,22,22,22,23,23,24,24,24,24,25,25,25,25,25,25,26,26,26,27,27,27,27,27,28,28,28,28,29,29,30,31,32,32,33,33,33,33,33,34,35,35,35,35,35,35,35,36,36,37,37,37,38,38,38,38,38,39,39,39,39,40,40,40,41,42,43,43,43,44,44,45,46,46,47,49,49,50,50,50,50,51,51,51,51,53,53,54,54,55,55,56,56,56,56,58,58,58,59,59,60,61,61,62,62,62,64,66,66,67,67,67,68,69,69,69,71,71,71,73,76,78,78,79,79,81,82,85,85,85,88,89,89,93,93,94,95,96,96,96,97,103,104,105,108,110,110,114,116,117,117,120,120,124,125,125,126,126,131,135,135,136,136,140,142,146,147,156,160,160,162,166,168,169,172,178,185,188,189,194,196,199,230,240,241,254,258,258,258,258,258,258,258,258,258,258,258,258,258,258,258,258,258,258],"r":[3,3,3,3,3,3,3,3,3,4,4,4,5,5,5,5,5,6,6,6,6,6,7,7,8,8,9,9,9,9,9,10,10,10,12,13,14,14,15,16,17,18,18,18,20,20,20,21,22,22,23,24,25,26,29,30,30,30,31,32,32,32,34,34,37,38,40,42,44,47,48,49,50,51,57,60,63,63,67,67,69,70,71,73,76,77,82,83,84,86,89,90,91,91,109,126,134,149,151,152,153,159,167,172,173,182,219,227,241,250,251,276,297,298,303,308,312,334,365,373,375,379,392,449,467,500,532,561,737,1178,1431,1464,1498,1499,1499,1499,1499,1499,1499,1499]}};
  var CMP = [
    { key: "lines_am", label: "Lines changed", part: "Auto-merged vs merged", g: ["Auto-merged", "Merged with interaction"], p: "7.76e-11", stars: "***",
      cap: "Agentic PRs merged with no review change *fewer lines* than agentic PRs that were reviewed." },
    { key: "files_am", label: "Files changed", part: "Auto-merged vs merged", g: ["Auto-merged", "Merged with interaction"], p: "4.03e-10", stars: "***",
      cap: "They also touch *fewer files*: auto-merge works for small, focused changes." },
    { key: "del_ah", label: "Lines deleted", part: "Agents vs humans", g: ["Agents", "Humans"], p: "7.78e-14", stars: "***",
      cap: "Among auto-merged PRs, human PRs *delete more code* than agentic ones. Agentic PRs that delete code are auto-merged less often." },
    { key: "lines_ah", label: "Lines changed", part: "Agents vs humans", g: ["Agents", "Humans"], p: "1.01e-03", stars: "**",
      cap: "Auto-merged agentic PRs are also *smaller overall* than auto-merged human PRs." }
  ];
  var seg = $("#size-seg"), cur = 0;
  seg.innerHTML = CMP.map(function (c, i) {
    return '<button class="btn-theme6 btn" aria-pressed="' + (i === 0) + '" data-i="' + i + '">' + c.label + ' <span class="small">· ' + c.part + "</span></button>";
  }).join("");
  $$("button", seg).forEach(function (b) {
    b.addEventListener("click", function () { cur = +b.dataset.i; $$("button", seg).forEach(function (o) { o.setAttribute("aria-pressed", o === b); }); drawStrip(); });
  });
  function niceMax(v) {
    var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
    var steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (m <= steps[i]) return steps[i] * e;
    return 10 * e;
  }
  function jitter(i) { var x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) - 0.5; }
  function fmt(v) { return v >= 1000 ? (v / 1000) + "k" : String(v); }
  function drawStrip() {
    var c = CMP[cur], d = DOTS[c.key], groups = [d.b, d.r];
    var svg = $("#strip"), W = Math.max(320, Math.min(640, svg.parentNode.clientWidth || 640)), H = W < 480 ? 300 : 340, L = 56, R = 16, T = W < 480 ? 50 : 34, B = 40, narrow = W < 480;
    var max = niceMax(Math.max.apply(null, d.r.concat(d.b)));
    var y = function (v) { return T + (H - T - B) * (1 - v / max); };
    var colW = (W - L - R) / 2;
    var s = "";
    for (var k = 0; k <= 4; k++) {
      var v = max * k / 4;
      s += '<g class="grid"><line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/></g><g class="axis"><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v) + "</text></g>";
    }
    groups.forEach(function (vals, gi) {
      var cx = L + colW * gi + colW / 2;
      s += '<g class="grp" data-g="' + gi + '"><rect x="' + (cx - colW / 2 + 6) + '" y="' + T + '" width="' + (colW - 12) + '" height="' + (H - T - B) + '" fill="transparent"/>';
      vals.forEach(function (v, i) {
        s += '<circle class="dot g' + gi + (c.key.slice(-2) === "am" ? " merged" : "") + '" r="3.6" cx="' + (cx + jitter(i + gi * 977) * colW * 0.55).toFixed(1) + '" cy="' + y(v).toFixed(1) + '"/>';
      });
      s += '</g><text class="cat" x="' + cx + '" y="' + (H - B + 22) + '" text-anchor="middle">' + esc(c.g[gi]) + "</text>";
    });
    s += '<text class="p-lab" x="' + (narrow ? L : W - R) + '" y="' + (narrow ? 34 : 16) + '" text-anchor="' + (narrow ? "start" : "end") + '">p = ' + c.p + " " + c.stars + "</text>";
    s += '<text class="axis" x="' + L + '" y="16" style="font-family:Hind,sans-serif;font-size:12px;fill:var(--pp-muted)">' + c.label + " per PR (repository median)</text>";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.innerHTML = s;
    $$(".grp", svg).forEach(function (g) {
      var gi = +g.dataset.g;
      bindTip(g, "<b>" + esc(c.g[gi]) + "</b><br>" + groups[gi].length + " repositories");
    });
    $("#strip-cap").innerHTML = hl(c.cap) + ' <span class="muted small">Redrawn from Figure 2; values above the 95th percentile sit on the top line.</span>';
  }
  drawStrip();
  var lastW = 0, rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { var w = $(".strip-wrap").clientWidth; if (Math.abs(w - lastW) > 40) { lastW = w; drawStrip(); } }, 150); });

  /* ---------------- repositories (Table 1) ---------------- */
  var REPO = [
    { icon: "fa-star-o", name: "Stars", auto: 440, none: 983 },
    { icon: "fa-code-fork", name: "Forks", auto: 81, none: 264 },
    { icon: "fa-heartbeat", name: "Health score", auto: 50, none: 75 },
    { icon: "fa-check-square-o", name: "Check runs", auto: 4, none: 10 }
  ];
  $("#repo-cmp").innerHTML = REPO.map(function (r) {
    var m = Math.max(r.auto, r.none);
    return '<div class="rc"><h4><span class="fa ' + r.icon + '" aria-hidden="true"></span>' + r.name + "</h4>" +
      '<div class="rc-row auto"><span>Auto-merge</span><span class="bar" style="width:' + (100 * r.auto / m) + '%"></span><span class="v">' + r.auto + "</span></div>" +
      '<div class="rc-row none"><span>No auto-merge</span><span class="bar" style="width:' + (100 * r.none / m) + '%"></span><span class="v">' + r.none + "</span></div></div>";
  }).join("");

  /* ---------------- BibTeX ---------------- */
  $("#copy-bib").addEventListener("click", function () {
    var b = $("#copy-bib");
    var done = function () { b.innerHTML = '<span class="fa fa-check"></span>  Copied'; setTimeout(function () { b.innerHTML = '<span class="fa fa-clipboard"></span>  Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText($("#bibtex").textContent).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });
})();
