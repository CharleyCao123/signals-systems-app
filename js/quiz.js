/* 自测模块：按章测试 / 全部混合测试 */
(function () {
  "use strict";
  var Q = window.QUIZ_DATA;
  var DOC = window.DOC_CONTENT;
  function chapterLabel(id) {
    for (var i = 0; i < DOC.chapters.length; i++) if (DOC.chapters[i].id === id) return DOC.chapters[i].label;
    return id;
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\^\{([^}]*)\}/g, "<sup>$1</sup>").replace(/_\{([^}]*)\}/g, "<sub>$1</sub>");
  }

  function open(ch) {
    var shell = document.getElementById("quizShell");
    var view = document.getElementById("quizView");
    var qs = [];
    if (ch === "all") {
      Object.keys(Q).forEach(function (cid) {
        Q[cid].forEach(function (item) { qs.push({ ch: cid, item: item }); });
      });
      /* 混合模式取每章前 3 题，避免过长 */
      qs = qs.filter(function (_, i) { return true; }).slice(0, 0).concat(
        Object.keys(Q).reduce(function (acc, cid) { return acc.concat(Q[cid].slice(0, 3).map(function (item) { return { ch: cid, item: item }; })); }, [])
      );
    } else {
      (Q[ch] || []).forEach(function (item) { qs.push({ ch: ch, item: item }); });
    }
    if (!qs.length) { shell.innerHTML = '<div class="quiz-card">该章节暂无自测题。</div><button class="ex-toggle" id="quizClose2">返回</button>'; view.hidden = false; bindClose(); return; }

    var answered = 0, correct = 0;
    var h = '<div class="quiz-head"><h2>' + (ch === "all" ? "综合自测（每章 3 题）" : chapterLabel(ch) + " · 自测") +
      '</h2><button class="icon-btn" id="quizClose">✕ 关闭</button></div>';
    qs.forEach(function (entry, qi) {
      var item = entry.item;
      h += '<div class="quiz-card" data-q="' + qi + '"><div class="quiz-q"><span class="q-no">' + (qi + 1) + '.</span>' + escapeHtml(item.q) +
        (ch === "all" ? '　<span style="color:var(--text-2);font-size:12px">[' + chapterLabel(entry.ch) + ']</span>' : "") + "</div>";
      item.opts.forEach(function (op, oi) {
        h += '<button class="quiz-opt" data-qi="' + qi + '" data-oi="' + oi + '">' + String.fromCharCode(65 + oi) + ". " + escapeHtml(op) + "</button>";
      });
      h += '<div class="quiz-exp" id="exp-' + qi + '">✔ ' + escapeHtml(item.exp) + "</div></div>";
    });
    h += '<div class="quiz-card"><div class="quiz-score" id="quizScore">已答 0 / ' + qs.length + '，答对 0</div>' +
      '<div style="color:var(--text-2);font-size:13px">点选项即判分并显示解析。</div></div>';
    shell.innerHTML = h;
    view.hidden = false;
    window.scrollTo(0, 0);

    function bindClose() {
      var b = document.getElementById("quizClose") || document.getElementById("quizClose2");
      if (b) b.addEventListener("click", function () { view.hidden = true; });
    }
    bindClose();

    shell.querySelectorAll(".quiz-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var qi = +btn.getAttribute("data-qi"), oi = +btn.getAttribute("data-oi");
        var card = shell.querySelector('.quiz-card[data-q="' + qi + '"]');
        if (card.getAttribute("data-done")) return;
        card.setAttribute("data-done", "1");
        var ans = qs[qi].item.ans;
        shell.querySelectorAll('.quiz-opt[data-qi="' + qi + '"]').forEach(function (b2) {
          b2.disabled = true;
          var o2 = +b2.getAttribute("data-oi");
          if (o2 === ans) b2.classList.add("correct");
          else if (o2 === oi) b2.classList.add("wrong");
        });
        document.getElementById("exp-" + qi).classList.add("show");
        answered++;
        if (oi === ans) correct++;
        document.getElementById("quizScore").textContent = "已答 " + answered + " / " + qs.length + "，答对 " + correct +
          (answered === qs.length ? "　——　得分 " + Math.round(correct * 100 / qs.length) + " 分" : "");
      });
    });
  }

  window.SIG_QUIZ = { open: open };
})();
