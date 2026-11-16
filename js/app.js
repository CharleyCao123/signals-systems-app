/* 信号与系统学习工具 App 主逻辑：路由 / 渲染 / 搜索 / 主题 / 进度 / 字号 */
(function () {
  "use strict";
  var DOC = window.DOC_CONTENT;
  var $ = function (id) { return document.getElementById(id); };

  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("sigApp_" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("sigApp_" + k, JSON.stringify(v)); } catch (e) {} }
  };
  var state = {
    read: LS.get("read", {}),
    theme: LS.get("theme", "light"),
    fontStep: LS.get("fontStep", 1),
    lastHash: LS.get("lastHash", "#/pre")
  };
  var FONT_STEPS = [15, 16.5, 18, 19.5];

  /* ── 工具 ──────────────────────────────────────────── */
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  /* 上下标标记：^{上标}、_{下标} */
  function supsub(s) {
    return escapeHtml(s)
      .replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>")
      .replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");
  }
  function inlineHtml(s) {
    return supsub(s).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function stripMarkup(s) {
    return String(s).replace(/\^\{([^}]*)\}/g, "$1").replace(/_\{([^}]*)\}/g, "$1")
      .replace(/\*\*/g, "").replace(/\{\{|\}\}/g, "");
  }
  function chapterIndex(id) {
    for (var i = 0; i < DOC.chapters.length; i++) if (DOC.chapters[i].id === id) return i;
    return -1;
  }

  /* ── 块渲染 ────────────────────────────────────────── */
  function renderBlocks(blocks, out) {
    blocks.forEach(function (b) { renderBlock(b, out); });
  }
  function renderBlock(b, out) {
    switch (b.t) {
      case "h3":
        out.push('<h3 id="sec-' + out.length + '">' + inlineHtml(b.x) + "</h3>");
        break;
      case "p":
        out.push("<p>" + inlineHtml(b.x) + "</p>");
        break;
      case "f":
        out.push('<div class="formula">' + supsub(b.x) + "</div>");
        break;
      case "kp":
        out.push('<div class="kp-box"><span class="kp-tag">【要点】</span>' + inlineHtml(b.x) + "</div>");
        break;
      case "tbl": {
        var widths = b.widths && b.widths.length === b.head.length ? b.widths : null;
        var h = '<div class="tbl-wrap">';
        if (b.cap) h += '<div class="tbl-cap">' + supsub(b.cap) + "</div>";
        h += '<div class="tbl-scroll"><table><thead><tr>';
        b.head.forEach(function (cell, ci) {
          h += "<th" + (widths ? ' style="width:' + widths[ci] + '%"' : "") + ">" + supsub(cell) + "</th>";
        });
        h += "</tr></thead><tbody>";
        b.rows.forEach(function (row) {
          h += "<tr>";
          row.forEach(function (cell) { h += "<td>" + supsub(cell) + "</td>"; });
          h += "</tr>";
        });
        h += "</tbody></table></div></div>";
        out.push(h);
        break;
      }
      case "ex": {
        var h2 = '<div class="ex-box"><div class="ex-title"><span class="ex-tag">例题</span>' + supsub(b.title) + '</div><div class="ex-problem">';
        b.problem.forEach(function (pb) { h2 += "<p>" + inlineHtml(pb.x) + "</p>"; });
        h2 += '</div><button class="ex-toggle">显示解析 ▾</button><div class="ex-solution">';
        b.solution.forEach(function (sb) {
          if (sb.t === "f") h2 += '<div class="formula">' + supsub(sb.x) + "</div>";
          else h2 += "<p>" + inlineHtml(sb.x) + "</p>";
        });
        h2 += "</div></div>";
        out.push(h2);
        break;
      }
      case "sim": {
        var h3 = '<div class="sim" data-sim="' + b.id + '">';
        h3 += '<div class="sim-head"><span class="sim-icon">📊</span><span class="sim-cap">' + supsub(b.cap || "互动实验") + '</span><span class="sim-live">拖动 / 点击交互</span></div>';
        if (b.note) h3 += '<div class="sim-note">' + supsub(b.note) + "</div>";
        h3 += '<div class="sim-body"></div></div>';
        out.push(h3);
        break;
      }
      case "quiz": {
        var chId = b.ch;
        out.push('<div class="sim"><div class="sim-head"><span class="sim-icon">✎</span><span class="sim-cap">本章知识点自测</span></div><div class="sim-note">做几道小题，检验本章掌握情况（含答案解析）。</div><div class="sim-body"><button class="ex-toggle" data-quiz="' + chId + '">开始自测 ✎</button></div></div>');
        break;
      }
    }
  }

  /* ── 交互实验挂载 ──────────────────────────────────── */
  function mountSims(article) {
    var nodes = article.querySelectorAll(".sim[data-sim]");
    nodes.forEach(function (node) {
      var id = node.getAttribute("data-sim");
      var fn = window.SIG_SIMS && window.SIG_SIMS[id];
      if (typeof fn !== "function") {
        node.querySelector(".sim-body").innerHTML =
          '<div class="sim-note">（该实验模块未加载：' + escapeHtml(id) + "）</div>";
        return;
      }
      try { fn(node.querySelector(".sim-body"), node); }
      catch (e) {
        node.querySelector(".sim-body").innerHTML =
          '<div class="sim-note">实验初始化出错：' + escapeHtml(String(e && e.message)) + "</div>";
      }
    });
  }

  /* ── 章节渲染 ──────────────────────────────────────── */
  function renderChapter(idx) {
    var ch = DOC.chapters[idx];
    var out = ['<div class="chapter-head"><div class="ch-label">SIGNALS AND SYSTEMS · 互动学习</div><h1>' + supsub(ch.label) + "</h1></div>"];
    renderBlocks(ch.blocks, out);

    var prev = idx > 0 ? DOC.chapters[idx - 1] : null;
    var next = idx < DOC.chapters.length - 1 ? DOC.chapters[idx + 1] : null;
    out.push('<nav class="chapter-nav">');
    out.push(prev ? '<a href="#/' + prev.id + '"><span class="cn-label">← 上一章</span>' + supsub(prev.label) + "</a>" : "<span></span>");
    out.push(next ? '<a class="cn-next" href="#/' + next.id + '"><span class="cn-label">下一章 →</span>' + supsub(next.label) + "</a>" : "<span></span>");
    out.push("</nav>");

    var article = $("article");
    article.innerHTML = out.join("");
    bindArticle(article, ch);
    mountSims(article);
    updateNav(ch.id);
    $("main").scrollTop = 0;
    window.scrollTo(0, 0);
    observeBottom();
  }

  function bindArticle(article, ch) {
    article.querySelectorAll(".ex-toggle").forEach(function (btn) {
      if (btn.getAttribute("data-quiz")) return;
      btn.addEventListener("click", function () {
        var sol = btn.nextElementSibling;
        var open = sol.classList.toggle("open");
        btn.textContent = open ? "收起解析 ▴" : "显示解析 ▾";
      });
    });
    article.querySelectorAll("[data-quiz]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        window.SIG_QUIZ.open(btn.getAttribute("data-quiz"));
      });
    });
  }

  /* ── 阅读进度（滚动到底视为读完）───────────────────── */
  var bottomSentinel = null;
  function observeBottom() {
    if (bottomSentinel && bottomSentinel.disconnect) bottomSentinel.disconnect();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.getAttribute("data-ch");
          if (id && !state.read[id]) {
            state.read[id] = true;
            LS.set("read", state.read);
            updateProgress();
            updateNav(id);
          }
        }
      });
    }, { threshold: 0.6 });
    var article = $("article");
    bottomSentinel = document.createElement("div");
    bottomSentinel.style.height = "4px";
    bottomSentinel.setAttribute("data-ch", currentId());
    article.appendChild(bottomSentinel);
    io.observe(bottomSentinel);
    bottomSentinel.disconnect = function () { io.disconnect(); };
  }
  function currentId() {
    var m = location.hash.match(/^#\/([a-z0-9]+)/i);
    return m ? m[1] : DOC.chapters[0].id;
  }
  function updateProgress() {
    var n = 0;
    DOC.chapters.forEach(function (c) { if (state.read[c.id]) n++; });
    var pct = Math.round(n * 100 / DOC.chapters.length);
    $("progressNum").textContent = pct;
    $("progressBar").style.width = pct + "%";
  }

  /* ── 侧边栏 ────────────────────────────────────────── */
  function buildNav() {
    var nav = $("navTree");
    var h = ['<div class="nav-group">'];
    DOC.chapters.forEach(function (c, i) {
      h.push('<a class="nav-item" data-id="' + c.id + '" href="#/' + c.id + '">' +
        '<span class="ni-no">' + (i + 1) + "</span><span class=\"ni-text\">" + supsub(c.label) + "</span>" +
        '<span class="ni-check" style="visibility:' + (state.read[c.id] ? "visible" : "hidden") + '">✔</span></a>');
    });
    h.push("</div>");
    nav.innerHTML = h.join("");
  }
  function updateNav(id) {
    document.querySelectorAll(".nav-tree .nav-item").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-id") === id);
      var chk = a.querySelector(".ni-check");
      if (chk) chk.style.visibility = state.read[a.getAttribute("data-id")] ? "visible" : "hidden";
    });
  }

  /* ── 搜索 ──────────────────────────────────────────── */
  function searchableText(b) {
    if (b.t === "tbl") return (b.cap || "") + " " + b.head.join(" ") + " " + b.rows.map(function (r) { return r.join(" "); }).join(" ");
    if (b.t === "ex") return b.title + " " + b.problem.map(function (x) { return x.x; }).join(" ");
    if (b.t === "sim") return (b.cap || "") + " " + (b.note || "");
    return b.x || "";
  }
  function doSearch(q) {
    q = q.trim().toLowerCase();
    var box = $("searchResults");
    if (!q) { box.hidden = true; return; }
    var hits = [];
    DOC.chapters.forEach(function (c) {
      c.blocks.forEach(function (b) {
        var text = searchableText(b);
        if (text && text.toLowerCase().indexOf(q) >= 0) hits.push({ ch: c, b: b, text: stripMarkup(text) });
      });
    });
    var h = "";
    if (!hits.length) {
      h = '<div class="sr-empty">没有找到相关内容</div>';
    } else {
      hits.slice(0, 14).forEach(function (hit) {
        var pos = hit.text.toLowerCase().indexOf(q);
        var start = Math.max(0, pos - 18);
        var snippet = (start > 0 ? "…" : "") + hit.text.substr(start, 58) + "…";
        h += '<a class="sr-item" href="#/' + hit.ch.id + '"><span class="sr-ch">' + supsub(hit.ch.label) + '</span><span class="sr-snippet">' + escapeHtml(snippet) + "</span></a>";
      });
      if (hits.length > 14) h += '<div class="sr-empty">共 ' + hits.length + " 条结果，仅显示前 14 条</div>";
    }
    box.innerHTML = h;
    box.hidden = false;
  }

  /* ── 路由 ──────────────────────────────────────────── */
  function route() {
    var id = currentId();
    var idx = chapterIndex(id);
    if (idx < 0) { location.hash = "#/pre"; return; }
    renderChapter(idx);
    LS.set("lastHash", location.hash);
    closeSidebar();
  }

  /* ── 侧栏开合（移动端）─────────────────────────────── */
  function closeSidebar() {
    $("sidebar").classList.remove("open");
    $("backdrop").classList.remove("show");
  }

  /* ── 主题 / 字号 ───────────────────────────────────── */
  function applyTheme() {
    document.body.classList.toggle("dark", state.theme === "dark");
    $("btnTheme").textContent = state.theme === "dark" ? "☀️" : "🌙";
    if (window.SIG_SIMS && window.SIG_SIMS.onTheme) window.SIG_SIMS.onTheme();
  }
  function applyFont() {
    document.body.style.setProperty("--article-font", FONT_STEPS[state.fontStep] + "px");
  }

  /* ── 初始化 ────────────────────────────────────────── */
  function init() {
    buildNav();
    updateProgress();
    applyTheme();
    applyFont();

    window.addEventListener("hashchange", route);
    if (!location.hash) location.hash = state.lastHash || "#/pre";
    route();

    $("btnSidebar").addEventListener("click", function () {
      $("sidebar").classList.toggle("open");
      $("backdrop").classList.toggle("show");
    });
    $("backdrop").addEventListener("click", closeSidebar);

    var st = null;
    $("searchInput").addEventListener("input", function (e) {
      clearTimeout(st);
      var v = e.target.value;
      st = setTimeout(function () { doSearch(v); }, 160);
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest(".search-box")) $("searchResults").hidden = true;
    });

    $("btnTheme").addEventListener("click", function () {
      state.theme = state.theme === "dark" ? "light" : "dark";
      LS.set("theme", state.theme);
      applyTheme();
    });
    $("btnFontPlus").addEventListener("click", function () {
      state.fontStep = Math.min(FONT_STEPS.length - 1, state.fontStep + 1);
      LS.set("fontStep", state.fontStep); applyFont();
    });
    $("btnFontMinus").addEventListener("click", function () {
      state.fontStep = Math.max(0, state.fontStep - 1);
      LS.set("fontStep", state.fontStep); applyFont();
    });
    $("btnQuiz").addEventListener("click", function () {
      window.SIG_QUIZ.open("all");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
