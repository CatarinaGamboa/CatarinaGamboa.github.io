/* papers/llm4code: codegen-multi replay, leakage signals, familiarity heatmap, NLL ratios. */
(function () {
  "use strict";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function press(group, btn) { $$(group + " button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn); }); }

  /* ---------------- Figure 1: codegen-multi on Defects4J Lang bug 39 ---------------- */
  var FIG1 = [
    ["// no search strings found, we are done", "p"],
    ["if (textIndex == -1) {", "p"],
    ["  return text;", "p"],
    ["}", "p"],
    ["int start = 0;", "p"],
    ["// get a good guess on the size of the result buffer so", "p"],
    ["// it doesnt have to double if it goes over a bit", "p"],
    ["int increase = 0;", "p"],
    ["// count the replacement text elements that are larger", "p"],
    ["// than their corresponding text being replaced", "p"],
    ["for (int i = 0; i < searchList.length; i++) {", "g"],
    ["  if (searchList[i]==null || replacementList[i]==null) {", "g patch"],
    ["    continue;", "g patch"],
    ["  }", "g patch"],
    ["  int greater = replacementList[i].length() -", "g"],
    ["                searchList[i].length();", "g"],
    ["  if (greater > 0) {", "g"],
    ["    increase += 3 * greater; // assume 3 matches", "g"],
    ["  }", "g"],
    ["}", "g"],
    ["//have upper-bound at 20% increase, then let Java take...", "g"]
  ];
  var list = $("#code-lines");
  function javaHl(s) {
    var i = s.indexOf("//");
    var code = i >= 0 ? s.slice(0, i) : s, cm = i >= 0 ? s.slice(i) : "";
    code = esc(code).replace(/\b(if|for|int|return|continue|null)\b/g, '<span class="kw">$1</span>');
    return code + (cm ? '<span class="cm">' + esc(cm) + "</span>" : "");
  }
  function line(text, cls, num) {
    var li = document.createElement("li");
    li.className = cls;
    li.setAttribute("data-n", num);
    li.innerHTML = '<span class="src">' + (text === null ? '<span class="omit">… omitted for brevity …</span>' : javaHl(text)) + "</span>";
    return li;
  }
  list.appendChild(line(null, "omitted", 1));
  FIG1.forEach(function (l, i) { if (l[1] === "p") list.appendChild(line(l[0], l[1], i + 2)); });
  var gen = FIG1.map(function (l, i) { return [l, i + 2]; }).filter(function (x) { return x[0][1] !== "p"; });
  var shown = false, timer = null, btn = $("#continue");
  function finish() {
    timer = null;
    $(".replay").classList.add("done");
    $("#replay-result").innerHTML = '<span class="fa fa-check-circle"></span> Every generated line matches the <b>Defects4J solution</b>, comments included, <b>token for token</b>.';
    btn.innerHTML = '<span class="fa fa-undo"></span>  Reset';
    btn.disabled = false;
  }
  btn.addEventListener("click", function () {
    if (timer) return;
    if (shown) {
      $$("#code-lines li.g").forEach(function (li) { li.remove(); });
      $(".replay").classList.remove("done");
      $("#replay-result").innerHTML = "";
      btn.innerHTML = '<span class="fa fa-play"></span>  Let codegen-multi continue';
      shown = false;
      return;
    }
    shown = true;
    btn.disabled = true;
    $("#replay-result").innerHTML = '<span class="muted">Generating…</span>';
    if (reduceMotion) { gen.forEach(function (g) { list.appendChild(line(g[0][0], g[0][1], g[1])); }); finish(); return; }
    var k = 0;
    (function next() {
      if (k >= gen.length) { finish(); return; }
      var li = line(gen[k][0][0], gen[k][0][1] + " new", gen[k][1]);
      list.appendChild(li);
      k++;
      timer = setTimeout(next, 170);
    })();
  });

  /* ---------------- Membership (Table III) ---------------- */
  var MEM = [
    ["GitBug-Java", [61.1, 42.6, 38.9]],
    ["BugsInPy", [94.1, 64.7, 64.7]],
    ["BugsC++", [60.9, 60.9, 65.2]],
    ["Defects4J", [80.0, 80.0, 80.0]],
    ["SWEBench-Lite", [83.3, 91.7, 83.3]]
  ];
  var VERS = ["v1.0", "v2.0", "v2.1"];
  var memBox = $("#mem-bars");
  memBox.innerHTML = MEM.map(function (m) {
    return '<div class="hb"><span class="hb-l' + (m[0] === "Defects4J" ? " d4j" : "") + '">' + m[0] + '</span><span class="hb-track"><span class="hb-fill"></span></span><span class="hb-v"></span></div>';
  }).join("");
  function drawMem(v) {
    $$(".hb", memBox).forEach(function (row, i) {
      $(".hb-fill", row).style.width = MEM[i][1][v] + "%";
      $(".hb-v", row).textContent = MEM[i][1][v].toFixed(1) + "%";
      row.setAttribute("aria-label", MEM[i][0] + ": " + MEM[i][1][v] + "% of repositories in TheStack " + VERS[v]);
    });
  }
  $("#mem-table").innerHTML = "<table><tr><th>Benchmark</th>" + VERS.map(function (v) { return "<th>" + v + " (%)</th>"; }).join("") + "</tr>" +
    MEM.map(function (m) { return "<tr><td>" + m[0] + "</td>" + m[1].map(function (x) { return "<td>" + x.toFixed(1) + "</td>"; }).join("") + "</tr>"; }).join("") + "</table>";
  $$("#stack-ver button").forEach(function (b) { b.addEventListener("click", function () { press("#stack-ver", b); drawMem(+b.dataset.v); }); });
  drawMem(0);

  /* ---------------- tabs ---------------- */
  var tabs = $$(".sig .tabs [role=tab]");
  function selectTab(t) {
    tabs.forEach(function (o) {
      var on = o === t;
      o.setAttribute("aria-selected", on);
      o.tabIndex = on ? 0 : -1;
      $("#" + o.getAttribute("aria-controls")).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { selectTab(t); });
    t.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  /* NLL toy example from Figure 2 */
  var NLL_TXT = {
    paren: '<span class="nll-meter low"><i></i></span> <b>Not surprised.</b> <code>(</code> is what almost always follows <code>int main</code>, so the NLL is <b>low</b>.',
    sky: '<span class="nll-meter high"><i></i></span> <b>Very surprised.</b> <code>SKY</code> almost never follows <code>int main</code>, so the NLL is <b>high</b>.'
  };
  $$(".nll-demo .tok").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".nll-demo .tok").forEach(function (o) { o.setAttribute("aria-pressed", o === b); });
      $("#nll-out").innerHTML = NLL_TXT[b.dataset.t];
    });
  });

  /* ---------------- Tables V and VI: familiarity heatmap ---------------- */
  var DS = ["Defects4J", "BugsInPy", "BugsC++", "GitBug-Java", "SWEBench-Lite", "New Java", "New Python"];
  // Columns in DS order. nll: Table V; ng: Table VI; ratio: first row of each NLL-ratio heatmap (Figures 4 and 9).
  var M = [
    { name: "codegen-multi 6B", info: "1T training tokens, cutoff 2022",
      nll: [0.15, 0.38, 0.48, 0.58, 0.38, 0.85, 0.73], ng: [0.82, 0.66, 0.60, 0.55, 0.65, 0.48, 0.42], ratio: [1.00, 2.55, 3.18, 3.83, 2.51, 5.63, 4.86] },
    { name: "CodeLlama 7B", info: "2.5T training tokens, cutoff 2023",
      nll: [0.44, 0.57, 0.42, 0.48, 0.57, 0.77, 0.58], ng: [0.64, 0.54, 0.62, 0.58, 0.53, 0.53, 0.54], ratio: [1.00, 1.30, 0.95, 1.11, 1.30, 1.77, 1.33] },
    { name: "StarCoder 2 7B", info: "3.5T training tokens, cutoff 2024",
      nll: [0.58, 0.72, 0.56, 0.66, 0.74, 0.85, 0.68], ng: [0.51, 0.47, 0.51, 0.47, 0.43, 0.47, 0.47], ratio: [1.00, 1.24, 0.96, 1.14, 1.27, 1.46, 1.16] },
    { name: "CodeGemma 7B", info: "6.5T training tokens, cutoff 2024",
      nll: [0.54, 0.66, 0.57, 0.62, 0.67, 0.85, 0.53], ng: [0.56, 0.48, 0.51, 0.50, 0.48, 0.48, 0.54], ratio: [1.00, 1.22, 1.04, 1.14, 1.23, 1.57, 0.98] },
    { name: "Mistral 7B", info: "training data not disclosed",
      nll: [0.58, 0.74, 0.55, 0.61, 0.74, 0.76, 0.66], ng: [0.56, 0.46, 0.56, 0.52, 0.44, 0.51, 0.50], ratio: [1.00, 1.28, 0.95, 1.04, 1.27, 1.31, 1.13] },
    { name: "Gemma 2 2B", info: "cutoff 2024",
      nll: [0.66, 0.92, 0.70, 0.74, 0.91, 0.92, 0.80], ng: [0.48, 0.39, 0.46, 0.47, 0.37, 0.47, 0.44], ratio: [1.00, 1.40, 1.06, 1.13, 1.38, 1.40, 1.21] },
    { name: "Gemma 2 27B", info: "cutoff 2024",
      nll: [0.38, 0.58, 0.48, 0.56, 0.58, 0.90, 0.59], ng: [0.64, 0.52, 0.56, 0.53, 0.51, 0.50, 0.53], ratio: [1.00, 1.53, 1.25, 1.47, 1.51, 2.36, 1.53] },
    { name: "LLaMa 3.1 8B", info: "15T training tokens, cutoff 2024",
      nll: [0.68, 0.85, 0.75, 0.79, 0.85, 1.08, 0.73], ng: [0.44, 0.38, 0.42, 0.38, 0.34, 0.38, 0.41], ratio: [1.00, 1.26, 1.11, 1.16, 1.25, 1.59, 1.08] },
    { name: "LLaMa 3.1 70B", info: "15T training tokens, cutoff 2024",
      nll: [0.53, 0.65, 0.77, 0.67, 0.63, 1.03, 0.68], ng: [0.51, 0.47, 0.45, 0.45, 0.46, 0.41, 0.44], ratio: [1.00, 1.22, 1.45, 1.27, 1.18, 1.95, 1.28] }
  ];
  var metric = "ng", sel = [0, 0];
  // familiarity in [0, 1] within a model's row: high 5-gram or low NLL = familiar
  function fam(m, j) {
    var a = M[m][metric], lo = Math.min.apply(null, a), hi = Math.max.apply(null, a);
    var t = hi === lo ? 0 : (a[j] - lo) / (hi - lo);
    return metric === "ng" ? t : 1 - t;
  }
  function best(m) { var a = M[m][metric]; var v = metric === "ng" ? Math.max.apply(null, a) : Math.min.apply(null, a); return a.map(function (x) { return x === v; }); }
  function shade(t) {
    // from very light rose to the site's crimson
    var a = [253, 240, 244], b = [176, 12, 66];
    return "rgb(" + a.map(function (x, i) { return Math.round(x + (b[i] - x) * t); }).join(",") + ")";
  }
  var heat = $("#heat");
  function drawHeat() {
    var h = '<div class="hrow hhead" role="row"><span class="hm" role="columnheader">Model</span>' + DS.map(function (d, j) { return '<span class="hc-h' + (j === 0 ? " d4j" : "") + (j >= 5 ? " new" : "") + '" role="columnheader">' + d + "</span>"; }).join("") + "</div>";
    M.forEach(function (m, i) {
      var b = best(i);
      h += '<div class="hrow" role="row"><span class="hm" role="rowheader">' + m.name + "</span>";
      m[metric].forEach(function (v, j) {
        var t = fam(i, j);
        h += '<button role="gridcell" class="hc' + (b[j] ? " best" : "") + (sel[0] === i && sel[1] === j ? " sel" : "") + '" data-i="' + i + '" data-j="' + j + '" style="background:' + shade(t) + ";color:" + (t > 0.55 ? "#fff" : "#1A1D2D") + '" aria-label="' + m.name + ", " + DS[j] + ": " + (metric === "ng" ? "5-gram accuracy " : "NLL ") + v.toFixed(2) + (b[j] ? ", most familiar for this model" : "") + '">' + v.toFixed(2) + "</button>";
      });
      h += "</div>";
    });
    heat.innerHTML = h;
    var d4j = M.filter(function (m, i) { return best(i)[0]; }).length;
    $("#heat-note").innerHTML = (metric === "ng"
      ? "Share of 5-token continuations reproduced exactly. "
      : "Lower NLL means less surprised. NLL is only comparable <b>within a model</b>, so shading is per row. ") +
      '<span class="ring-key"></span> marks each model\'s most familiar dataset: <b>Defects4J for ' + d4j + " of 9</b>" + (metric === "nll" ? " (others: BugsC++ or New Python)." : ".");
    drawCell();
  }
  function drawCell() {
    var m = M[sel[0]], j = sel[1];
    var r = m.ratio[j];
    var cmp = j === 0 ? "This is the reference for the ratios below." :
      "NLL is <b>" + r.toFixed(2) + "×</b> that of Defects4J " + (r >= 1 ? "(Defects4J is more familiar)." : "(this dataset is slightly more familiar).");
    $("#cell-detail").innerHTML = "<b>" + m.name + "</b> on <b>" + DS[j] + "</b>: 5-gram accuracy <b>" + Math.round(m.ng[j] * 100) + "%</b>, NLL <b>" + m.nll[j].toFixed(2) + "</b>. " + cmp;
  }
  heat.addEventListener("click", function (e) {
    var c = e.target.closest(".hc");
    if (!c) return;
    sel = [+c.dataset.i, +c.dataset.j];
    $$(".hc", heat).forEach(function (o) { o.classList.toggle("sel", o === c); });
    drawCell();
  });
  $$("#metric button").forEach(function (b) { b.addEventListener("click", function () { press("#metric", b); metric = b.dataset.m; drawHeat(); }); });
  $("#heat-table").innerHTML = "<table><tr><th>Model</th><th>Metric</th>" + DS.map(function (d) { return "<th>" + d + "</th>"; }).join("") + "</tr>" +
    M.map(function (m) {
      return "<tr><td>" + m.name + "</td><td>NLL</td>" + m.nll.map(function (v) { return "<td>" + v.toFixed(2) + "</td>"; }).join("") + "</tr>" +
        "<tr><td></td><td>5-gram</td>" + m.ng.map(function (v) { return "<td>" + v.toFixed(2) + "</td>"; }).join("") + "</tr>";
    }).join("") + "</table>";
  drawHeat();

  /* ---------------- NLL ratios (Figure 4) ---------------- */
  var MAXR = 6, cur = 0;
  var ratio = $("#ratio");
  ratio.innerHTML = '<div class="rb-axis"><span style="left:' + (100 / MAXR) + '%">1×</span></div>' + DS.slice(1).map(function (d, k) {
    return '<div class="rb"><span class="rb-l">' + d + '</span><span class="rb-track"><span class="rb-one" style="left:' + (100 / MAXR) + '%"></span><span class="rb-fill"></span></span><span class="rb-v"></span></div>';
  }).join("");
  var NOTES = {
    0: "codegen-multi, the oldest model, finds new Java code <b>5.63×</b> more surprising than Defects4J. It has likely <mark class=\"k\">memorized</mark> much of the benchmark.",
    8: "LLaMa 3.1 70B, trained on <b>15T tokens</b>, sees Defects4J as only <b>1.27×</b> more predictable than GitBug-Java."
  };
  function drawRatio(i) {
    cur = i;
    var m = M[i];
    $$(".rb", ratio).forEach(function (row, k) {
      var r = m.ratio[k + 1];
      $(".rb-fill", row).style.width = (Math.min(r, MAXR) / MAXR * 100) + "%";
      $(".rb-fill", row).classList.toggle("under", r < 1);
      $(".rb-v", row).textContent = r.toFixed(2) + "×";
      row.setAttribute("aria-label", DS[k + 1] + ": " + r.toFixed(2) + " times the NLL of Defects4J");
    });
    $("#ratio-note").innerHTML = '<span class="muted">' + esc(m.name) + ": " + esc(m.info) + ".</span> " +
      (NOTES[i] || "New Java code is <b>" + m.ratio[5].toFixed(2) + "×</b> more surprising than Defects4J, against <b>5.63×</b> for codegen-multi.");
  }
  var pick = $("#model-pick");
  pick.innerHTML = M.map(function (m, i) { return '<button class="btn-theme6 btn" aria-pressed="' + (i === 0) + '" data-i="' + i + '">' + m.name + "</button>"; }).join("");
  $$("#model-pick button").forEach(function (b) { b.addEventListener("click", function () { press("#model-pick", b); drawRatio(+b.dataset.i); }); });
  drawRatio(0);

  /* ---------------- Figure 6: LLaMa 3.1 8B vs 70B on fastapi bug 12 ---------------- */
  // Segments: [text, cls] with cls "" (match), "x" (generated, not in the fix), "m" (in the fix, not generated).
  var NL = ["\\n", "x"];
  var FIG6 = {
    "8b": [
      [["    if scheme.lower() != \"bearer\":", ""]],
      [["        if self.auto_error:", ""]],
      [["            raise HTTPException(", ""]],
      [["                status_code=HTTP_403_FORBIDDEN,", ""]],
      [["                detail=\"Invalid authentication", ""]],
      [["                    ", ""], ["credentials", "m"], ["scheme", "x"], ["\")", ""]],
      [["        else:", ""]],
      [["            return None", ""]],
      [["    return ", ""], ["HTTPAuthorizationCredentials(scheme=scheme,", "m"]],
      [["credentials=credentials)", "m"], ["self.model.parse(credentials)", "x"]],
      [["", ""]],
      [["class HTTP", ""], ["Digest(HTTPBase)", "m"], ["BearerModel(BaseModel):", "x"], [":", ""]],
      [["    def __init__(self, *, ", ""], ["bearerFormat: str = None", "x"], [",", ""]]
    ],
    "70b": [
      [["    if scheme.lower() != \"bearer\":", ""]],
      [["        if self.auto_error:", ""]],
      [["            raise HTTPException(", ""]],
      [["                status_code=HTTP_403_FORBIDDEN,", ""], NL],
      [["                detail=\"Invalid authentication credentials\"", ""], NL],
      [["            )", ""]],
      [["        else:", ""]],
      [["            return None", ""]],
      [["    return HTTPAuthorizationCredentials(scheme=scheme,", ""]],
      [["                                        credentials=credentials)", ""]],
      [["", ""]],
      [["class HTTPDigest(HTTPBase):", ""]],
      [["    def __init__(", ""], NL, ["self,", ""], NL, ["*,", ""], NL, ["qop: str = None ", ""], NL, [",", ""]]
    ]
  };
  var FIG6_NOTE = {
    "8b": "The 8B model gets most of the patch, then <mark class=\"k\">drifts</mark> into a <code>BearerModel</code> class that is not in the file.",
    "70b": "The 70B model reproduces the patch <mark class=\"k\">and the next class</mark>, down to the <code>qop</code> parameter. Only its line breaks differ, which is exactly what breaks the 5-gram match."
  };
  // one pass, so the string rule never sees the markup added by the keyword rule
  function pyHl(s) {
    return s.replace(/("[^"]*"?)|\b(if|else|return|raise|class|def|None|self)\b|([^"]+?)(?=\b(?:if|else|return|raise|class|def|None|self)\b|"|$)/g, function (m, str, kw, rest) {
      if (str) return '<span class="str">' + esc(str) + "</span>";
      if (kw) return '<span class="kw">' + kw + "</span>";
      return esc(m);
    });
  }
  function drawFig6(k) {
    var rows = FIG6[k];
    var h = '<ol><li class="omitted" data-n="1"><span class="src"><span class="omit">… omitted for brevity …</span></span></li>';
    rows.forEach(function (segs, i) {
      var n = i + 2;
      var cls = (n === 2 ? "p" : "") + (n >= 3 && n <= 9 ? " patch" : "");
      h += '<li class="' + cls + '" data-n="' + n + '"><span class="src">' + segs.map(function (s) {
        return s[1] ? '<span class="seg-' + s[1] + '">' + esc(s[0]) + "</span>" : pyHl(s[0]);
      }).join("") + "</span></li>";
    });
    $("#fig6").innerHTML = h + "</ol>";
    $("#fig6-note").innerHTML = FIG6_NOTE[k];
  }
  $$("#llama-pick button").forEach(function (b) { b.addEventListener("click", function () { press("#llama-pick", b); drawFig6(b.dataset.k); }); });
  drawFig6("70b");

  /* ---------------- BibTeX ---------------- */
  $("#copy-bib").addEventListener("click", function () {
    var b = $("#copy-bib");
    var done = function () { b.innerHTML = '<span class="fa fa-check"></span>  Copied'; setTimeout(function () { b.innerHTML = '<span class="fa fa-clipboard"></span>  Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText($("#bibtex").textContent).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });
})();
