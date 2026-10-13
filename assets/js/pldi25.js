/* papers/pldi25: barriers map, study tracks, annotated error message. */
(function () {
  "use strict";
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- barriers (Figure 2, Section 4) ---------------- */
  var CATS = [
    { id: "ver", name: "Verification" },
    { id: "dx", name: "Developer experience" },
    { id: "sc", name: "Scalability" }
  ];
  // Text uses *phrase* to highlight key words.
  var B = [
    { cat: "ver", sec: "4.2", icon: "fa-random", name: "Unclear divide between Haskell and LiquidHaskell", n: 11, e: 5,
      sum: "Developers reason about the *program and its proof at once*, and end up *rewriting Haskell to suit the verifier*.",
      pts: ["12 participants changed how they write Haskell to fit verification, for example splitting functions to prove each branch.",
            "Reusing off-the-shelf modules got harder; one participant shadowed the list and map modules.",
            "Lowercase names can be type variables or program variables, which confused several newcomers."],
      q: [["I found myself writing code in certain ways, or I found the code being written in certain ways to convince the proof assistant of things that were not necessarily the most intuitive.", "NC2"],
          ["I think that liquid types have, like, its own way to program.", "CR1"]] },
    { cat: "ver", sec: "4.3", icon: "fa-question-circle", name: "Confusing verification features", n: 11, e: 4,
      sum: "*Measures*, *type aliases with value parameters*, and *what the solver actually checks* were hard to reason about.",
      pts: ["It was unclear which Haskell functions can be lifted into specifications as measures.",
            "Value parameters in type aliases cannot relate an input to an output.",
            "When verification failed, participants wanted to know which conditions were checked."],
      q: [["You have to know [when to] promote that function and, for me, it was not trivial (...) And it feels a little like luck that you have [tried it out].", "CR1"],
          ["Having thought through how constraints are sent to an SMT solver and how that failure would work itself out into an error could have been helpful from the start.", "NC1"]] },
    { cat: "ver", sec: "4.4", icon: "fa-wrench", name: "Unfamiliarity with proof engineering", n: 7, e: 5,
      sum: "Choosing *what to prove* and *how strong each predicate must be* takes experience with proofs.",
      pts: ["In pilot sessions, one invariant exercise took more than 30 minutes, so it was removed.",
            "Several newcomers wrote postconditions weaker than needed, such as \"smaller than\" instead of \"exactly one less\".",
            "A passing check can still mean the specification is too permissive."],
      q: [["I think that if I had to come up with the type of rotate by myself, trying to figure out what these invariants should be might be quite difficult.", "NC6"],
          ["Let's say, sometimes you have to prove things that you don't really know how to prove or what to use to prove, obviously automation helps in those things but, you can never automate everything.", "FM2"]] },
    { cat: "dx", sec: "4.7", icon: "fa-exclamation-triangle", name: "Unhelpful error messages", n: 9, e: 4,
      sum: "Messages show *internal names*, point to the *wrong line*, and make a *typo look like a failed proof*.",
      pts: ["Parentheses instead of curly brackets produced \"Cannot parse specification: unexpected \\\"-\\\" expecting bareTyArgP\".",
            "All seven experienced users struggled with error messages, which grow into screens of failed Horn clauses."],
      q: [["Well, tell me what the type error is. No, you get a message like \"5 is not less than 4\". I mean, sure, I know that. But what does it mean?", "FM1"],
          ["Sometimes [the error message] is useful, sometimes is noise that you see (...) a whole screen of [predicates] (...) that doesn't mean anything to you in that context.", "CR1"]],
      link: "#error" },
    { cat: "dx", sec: "4.8", icon: "fa-code", name: "Limited IDE support", n: 10, e: 4,
      sum: "No *suggestions* for functions and aliases, no *highlighting inside predicates*, no view of the *solver's reasoning*.",
      pts: ["Three newcomers did not know which built-in functions were available in specifications.",
            "Five found it hard to remember which type aliases were already defined.",
            "Writing liquid types in comments made one participant feel that what they wrote was \"fake\"."],
      q: [] },
    { cat: "dx", sec: "4.9", icon: "fa-book", name: "Insufficient learning and reference resources", n: 0, e: 4,
      sum: "Beyond the tutorial there are *few examples*, so developers turn to *GitHub issues, source code, or the authors*.",
      pts: ["Searching the web rarely found answers.",
            "Examples in papers are \"quite easy, because it's always for beginners\" (FM3)."],
      q: [["[It would have helped] If I knew the trick with the assumptions earlier, as well as assertions.", "FM3"]] },
    { cat: "dx", sec: "4.10", icon: "fa-download", name: "Complex installation and setup", n: 0, e: 3,
      sum: "*cabal or stack*, *matching dependency versions*, and *installing Z3 separately* made the first step hard.",
      pts: ["Installation has improved, but still lags behind the tools developers are used to."],
      q: [["I want to open a Haskell project, tick a box and say, yes, I want liquid types there, and the whole thing needs to be managed for me, and the only thing I want to do is say okay.", "FM2"],
          ["I mean, I tried to install LiquidHaskell (...) before with this interview today, and I failed miserably.", "NC17"]] },
    { cat: "sc", sec: "4.5", icon: "fa-cogs", name: "Limitations of automation and manual proof flexibility", n: 0, e: 7,
      sum: "When the solver gives up, it is unclear *when and how to write proofs by hand*, and there are *few tools to help*.",
      pts: ["All seven experienced users ran into this.",
            "Unlike interactive provers, there are no tactics or hammers, so some prefer to switch tools."],
      q: [["But the moment we need actually manually written proof terms, I could not quite get it (...) there's no hint given by the type checker to say, you know, you probably [need to add a] proof term manually.", "FM1"],
          ["You have to get to a point where you can automate the proof, and getting to that point is [the challenge].", "CR1"]] },
    { cat: "sc", sec: "4.6", icon: "fa-tachometer", name: "Scalability and solver limitations", n: 0, e: 6,
      sum: "Verification *slows down as code grows*, and the solver can *fail in ways the developer cannot see*.",
      pts: ["Some participants commented out slow proofs and re-enabled them only when needed.",
            "Z3 can loop forever, and non-linear functions cannot be translated to SMT-LIB directly."],
      q: [["So, I think if you ran the whole proof in the end, it took like, like, I don't know. 5h or so, maybe longer for the thing to verify.", "FM4"],
          ["Z3 also can break down and fail. For example, it can enter an infinite loop and never type check.", "FM2"]] }
  ];
  function hl(s) { return esc(s).replace(/\*([^*]+)\*/g, '<mark class="k">$1</mark>'); }

  var who = "all", selected = 0;
  function dots(count, total, cls) {
    var h = '<span class="dots ' + cls + '" aria-hidden="true">';
    for (var i = 0; i < total; i++) h += '<i class="' + (i < count ? "on" : "") + '"></i>';
    return h + "</span>";
  }
  function drawMap() {
    var map = $("#bmap");
    map.innerHTML = "";
    CATS.forEach(function (c) {
      var col = document.createElement("div");
      col.className = "bcat bcat-" + c.id;
      col.innerHTML = '<h3 class="bcat-h">' + c.name + "</h3>";
      B.forEach(function (b, k) {
        if (b.cat !== c.id) return;
        var btn = document.createElement("button");
        btn.className = "bcard";
        btn.dataset.k = k;
        btn.setAttribute("aria-pressed", k === selected);
        var counts = "";
        if (who !== "exp") counts += '<span class="cnt cnt-new">' + dots(b.n, 12, "new") + "<em>" + (b.n ? b.n + " of 12 new" : "none of the new users") + "</em></span>";
        if (who !== "new") counts += '<span class="cnt cnt-exp">' + dots(b.e, 7, "exp") + "<em>" + b.e + " of 7 experienced</em></span>";
        btn.innerHTML = '<span class="bname"><span class="fa ' + b.icon + '" aria-hidden="true"></span>' + esc(b.name) + '</span><span class="bcounts">' + counts + "</span>";
        var dim = (who === "new" && !b.n) || (who === "exp" && !b.e);
        btn.classList.toggle("dim", dim);
        btn.setAttribute("aria-label", b.name + ": " + b.n + " of 12 new users, " + b.e + " of 7 experienced users");
        btn.addEventListener("click", function () { selected = k; quoteIx = 0; drawMap(); drawDetail(); });
        col.appendChild(btn);
      });
      map.appendChild(col);
    });
  }
  var quoteIx = 0;
  function drawDetail() {
    var b = B[selected];
    var cat = CATS.filter(function (c) { return c.id === b.cat; })[0].name;
    var html = '<div class="bd-main"><p class="bd-cat"><span class="fa ' + b.icon + '" aria-hidden="true"></span> ' + cat + ", Section " + b.sec + "</p><h3>" + esc(b.name) + '</h3><p class="bd-sum">' + hl(b.sum) + "</p>" +
      '<details class="bd-more"><summary>More from the paper</summary><ul>' + b.pts.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></details>" +
      (b.link ? '<p class="bd-link"><a href="' + b.link + '"><span class="fa fa-arrow-down"></span> See this error message below</a></p>' : "") + "</div>";
    html += '<div class="bd-quotes">';
    if (b.q.length) {
      var q = b.q[quoteIx % b.q.length];
      html += '<blockquote><span class="fa fa-quote-left" aria-hidden="true"></span>' + esc(q[0]) + "<cite>" + q[1] + "</cite></blockquote>";
      if (b.q.length > 1) html += '<button class="linkish" id="next-quote">Next quote (' + (quoteIx % b.q.length + 1) + " of " + b.q.length + ")</button>";
    } else html += '<p class="muted small">No direct quote for this barrier in the paper.</p>';
    $("#bdetail").innerHTML = html + "</div>";
    var nq = $("#next-quote");
    if (nq) nq.addEventListener("click", function () { quoteIx++; drawDetail(); $("#next-quote").focus(); });
  }
  $$("#who button").forEach(function (b) {
    b.addEventListener("click", function () {
      who = b.dataset.who;
      $$("#who button").forEach(function (o) { o.setAttribute("aria-pressed", o === b); });
      drawMap();
    });
  });
  drawMap();
  drawDetail();

  /* ---------------- study tracks (Figure 1) ---------------- */
  var STEPS = {
    new: [
      { name: "Sign-up form", icon: "fa-pencil-square-o", text: "Background questions and *two basic Haskell exercises*. Experience decided the protocol." },
      { name: "Short tutorial", icon: "fa-book", text: "A *condensed LiquidHaskell tutorial* with exercises and quizzes. Core concepts in *30 minutes*." },
      { name: "Final exercise", icon: "fa-code", text: "*Okasaki's lazy queues*, solved while *thinking aloud*: write, fix and read liquid types, and add measures and aliases." },
      { name: "Interview", icon: "fa-comments-o", text: "A *semi-structured interview* about the challenges they faced. Sessions lasted *up to 2 hours*." }
    ],
    exp: [
      { name: "Sign-up form", icon: "fa-pencil-square-o", text: "Recruited through the *LiquidHaskell Slack*, mailing lists, and *authors of LiquidHaskell papers*." },
      { name: "Interview", icon: "fa-comments-o", text: "How they *learned and adopted* liquid types and, for former users, *why they stopped*." },
      { name: "Project showcase", icon: "fa-github", text: "A walk-through of *their own LiquidHaskell project*: data structures, information flow, or PL theory." },
      { name: "Work or retrospective", icon: "fa-history", text: "Ongoing projects: we *watched them work* for about 30 minutes. Finished ones: a *retrospective* on the codebase." }
    ]
  };
  var tracks = {};
  Object.keys(STEPS).forEach(function (t) {
    var box = $('.track[data-track="' + t + '"] .track-steps');
    tracks[t] = STEPS[t].map(function (s, i) {
      var b = document.createElement("button");
      b.className = "tstep";
      b.innerHTML = '<span class="fa ' + s.icon + '" aria-hidden="true"></span><span>' + esc(s.name) + "</span>";
      b.addEventListener("click", function () { stopPlay(); showStep(t, i); });
      box.appendChild(b);
      return b;
    });
  });
  function showStep(t, i) {
    Object.keys(tracks).forEach(function (k) { tracks[k].forEach(function (b, j) { b.setAttribute("aria-pressed", k === t && j === i); }); });
    var s = STEPS[t][i];
    $("#sdetail").innerHTML = "<div><h4>" + (t === "new" ? "New users" : "Experienced users") + ": " + esc(s.name) + "</h4><p>" + hl(s.text) + "</p></div>";
  }
  showStep("new", 2);

  var timers = [], played = false, playBtn = $("#play");
  function label(playing) {
    playBtn.innerHTML = playing ? '<span class="fa fa-stop"></span> Stop'
      : '<span class="fa fa-' + (played ? "repeat" : "play") + '"></span> ' + (played ? "Replay the study" : "Play the study");
  }
  function stopPlay() {
    timers.forEach(clearTimeout); timers = [];
    $("#tracks").classList.remove("playing");
    $$(".tstep").forEach(function (b) { b.classList.remove("lit"); });
    label(false);
  }
  function play() {
    stopPlay(); played = true; label(true);
    $("#tracks").classList.add("playing");
    var d = reduceMotion ? 700 : 1300;
    for (var i = 0; i < 4; i++) (function (i) {
      timers.push(setTimeout(function () {
        ["new", "exp"].forEach(function (t) { tracks[t].forEach(function (b, j) { b.classList.toggle("lit", j <= i); }); });
        showStep(i % 2 ? "exp" : "new", i);
      }, i * d));
    })(i);
    timers.push(setTimeout(function () { timers = []; $("#tracks").classList.remove("playing"); $$(".tstep").forEach(function (b) { b.classList.remove("lit"); }); showStep("new", 2); label(false); }, 4 * d + 400));
  }
  playBtn.addEventListener("click", function () { if (timers.length) stopPlay(); else play(); });
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); if (!played) play(); } }, { threshold: 0.6 });
    io.observe($("#tracks"));
  }

  /* ---------------- why experienced users chose liquid types ---------------- */
  var WHY = [
    ["You can do the same as dependent types but with less code [...] and you are constantly being support by the SMT solver.", "CR1"],
    ["You are verifying properties in the language that you're developing in. So I think it's more approachable for developers. And you are actually verifying the code that you want to run.", "FM4"],
    ["If there were liquid types for Dart - I would be using them. For Kotlin as well.", "CR1"]
  ];
  function showWhy(i) {
    $$(".why-chip").forEach(function (c) { c.setAttribute("aria-pressed", +c.dataset.q === i); });
    $("#why-q").innerHTML = '<blockquote><span class="fa fa-quote-left" aria-hidden="true"></span>' + esc(WHY[i][0]) + "<cite>" + WHY[i][1] + "</cite></blockquote>";
  }
  $$(".why-chip").forEach(function (c) { c.addEventListener("click", function () { showWhy(+c.dataset.q); }); });
  showWhy(0);

  /* ---------------- annotated error message (Figure 3) ---------------- */
  var PROBS = {
    loc: "The mistake is on *line 6*, but the editor flags *line 8*.",
    int: "*VV##0*, *a##a2cb* and *func(0, [...])* are internal names that appear nowhere in the code.",
    kind: "It's a *missing argument*, but it reads like a *failed verification*."
  };
  var errdemo = $(".errdemo"), note = $("#prob-note");
  $$(".err-chips button").forEach(function (b) {
    b.addEventListener("click", function () {
      var on = b.getAttribute("aria-pressed") !== "true";
      $$(".err-chips button").forEach(function (o) { o.setAttribute("aria-pressed", on && o === b); });
      errdemo.dataset.prob = on ? b.dataset.prob : "";
      errdemo.classList.remove("fixed");
      $("#hs-err").hidden = false; $("#hs-ok").hidden = true;
      note.innerHTML = on ? hl(PROBS[b.dataset.prob]) + ' <button class="linkish" id="fix-btn">Apply the fix</button>' : 'Select a problem above, or <button class="linkish" id="fix-btn">apply the fix</button>.';
      bindFix();
    });
  });
  function bindFix() {
    var f = $("#fix-btn");
    if (!f) return;
    f.addEventListener("click", function () {
      var fixed = !errdemo.classList.contains("fixed");
      errdemo.classList.toggle("fixed", fixed);
      errdemo.dataset.prob = "";
      $$(".err-chips button").forEach(function (o) { o.setAttribute("aria-pressed", false); });
      $("#hs-err").hidden = fixed; $("#hs-ok").hidden = !fixed;
      note.innerHTML = fixed ? 'Line 6 now reads <code>qsize v = N</code>. <button class="linkish" id="fix-btn">Undo the fix</button>'
        : 'Select a problem above, or <button class="linkish" id="fix-btn">apply the fix</button>.';
      bindFix();
    });
  }
  bindFix();

  /* ---------------- BibTeX ---------------- */
  $("#copy-bib").addEventListener("click", function () {
    var b = $("#copy-bib");
    var done = function () { b.innerHTML = '<span class="fa fa-check"></span>  Copied'; setTimeout(function () { b.innerHTML = '<span class="fa fa-clipboard"></span>  Copy'; }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText($("#bibtex").textContent).then(done, function () { b.textContent = "Select and copy"; });
    else b.textContent = "Select and copy";
  });
})();
