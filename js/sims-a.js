/* 实验组 A：信号运算 / 冲激信号形成 / 系统性质判定 / 卷积积分 */
(function () {
  "use strict";
  var S = window.SIG_SIMS, C = S.colors, Plot = S.Plot;
  function u(t) { return t >= 0 ? 1 : 0; }
  function Sa(x) { return Math.abs(x) < 1e-7 ? 1 : Math.sin(x) / x; }

  /* ══ 1. 信号的平移 / 反转 / 尺度变换 ══════════════════ */
  S["signal-ops"] = function (body) {
    var cv = S.canvasRow(body, ["原信号 f(t)", "变换后 f(a·t + b)"], 2);
    var base = {
      sine: { name: "正弦 sin t", f: function (t) { return Math.sin(t); }, yr: 1.4 },
      rect: { name: "矩形脉冲 g₃(t)", f: function (t) { return Math.abs(t) <= 1.5 ? 1 : 0; }, yr: 1.4 },
      tri: { name: "三角形脉冲", f: function (t) { return Math.abs(t) < 1.5 ? 1 - Math.abs(t) / 1.5 : 0; }, yr: 1.4 },
      exp: { name: "双边指数 exp(−|t|)", f: function (t) { return Math.exp(-Math.abs(t)); }, yr: 1.4 }
    };
    var p1 = new Plot(cv[0], { x0: -6, x1: 6, y0: -1.5, y1: 1.5, xLabel: "t" });
    var p2 = new Plot(cv[1], { x0: -6, x1: 6, y0: -1.5, y1: 1.5, xLabel: "t" });

    var ctl = S.makeControls(body, [
      { k: "sig", label: "信号", sel: [["sine", "正弦"], ["rect", "矩形"], ["tri", "三角"], ["exp", "指数"]], val: "rect" },
      { k: "a", label: "尺度 a", min: 0.2, max: 3, step: 0.1, val: 1, fmt: function (v) { return v.toFixed(1); } },
      { k: "b", label: "平移 b", min: -4, max: 4, step: 0.5, val: 0, fmt: function (v) { return v.toFixed(1); } },
      { btn: "左右反转", onClick: function () { flip(); } },
      { btn: "重置", onClick: function () {
          ctl.a.value = 1; ctl.a._refreshVal();
          ctl.b.value = 0; ctl.b._refreshVal();
          reverted = false; draw();
      } }
    ]);
    var reverted = false;
    function flip() { reverted = !reverted; draw(); }

    var ro = S.readout(body, "");
    function aVal() { var a = ctl.num("a"); return reverted ? -a : a; }
    function draw() {
      var f = base[ctl.sig.value].f;
      p1.clear(); p1.grid(12, 6); p1.axes();
      p1.fn(f, C.grey, 2);
      var a = aVal(), b = ctl.num("b");
      p2.clear(); p2.grid(12, 6); p2.axes();
      p2.fn(function (t) { return f(a * t + b); }, C.blue, 2.4);
      ro.innerHTML = '当前变换：<span class="rd">f(' + (a === 1 ? "" : a === -1 ? "−" : a.toFixed(1) + "·") +
        "t" + (b === 0 ? "" : (b > 0 ? " + " : " − ") + Math.abs(b).toFixed(1)) + ")</span>" +
        '　·　a ' + (a < 0 ? "＜0：先反转" : "＞0：不反转") +
        (Math.abs(Math.abs(a) - 1) > 1e-9 ? ("，|" + (Math.abs(a) < 1 ? "a|＜1 波形展宽为 " + (1 / Math.abs(a)).toFixed(1) + " 倍" : "a|＞1 波形压缩为 " + Math.abs(a).toFixed(1) + " 倍")) : "") +
        (b !== 0 ? ("，b" + (a > 0 ? (b > 0 ? "＞0 实际左移" : "＜0 实际右移") : (b > 0 ? "＞0 实际右移" : "＜0 实际左移")) + " " + Math.abs(b / a).toFixed(1)) : "");
    }
    ["sig", "a", "b"].forEach(function (k) {
      ctl[k].addEventListener(ctl[k].tagName === "SELECT" ? "change" : "input", draw);
    });
    S._redraws.push(draw);
    draw();
  };

  /* ══ 2. 冲激信号 δ(t) 的形成（矩形脉冲极限）═══════════ */
  S["delta-limit"] = function (body) {
    var cv = S.canvasRow(body, ["矩形脉冲 p_τ(t)：宽 τ、高 1/τ", "脉冲宽度趋零 → 单位冲激 δ(t)"], 2);
    var p1 = new Plot(cv[0], { x0: -3, x1: 3, y0: -0.6, y1: 11, xLabel: "t" });
    var p2 = new Plot(cv[1], { x0: -3, x1: 3, y0: -0.6, y1: 3.2, xLabel: "t" });
    var ctl = S.makeControls(body, [
      { k: "tau", label: "脉宽 τ", min: 0.04, max: 2, step: 0.01, val: 1, fmt: function (v) { return v.toFixed(2); } },
      { btn: "▶ τ → 0 动画", primary: true, onClick: play },
      { btn: "重置", onClick: function () { ctl.tau.value = 1; ctl.tau._refreshVal(); draw(); } }
    ]);
    var ro = S.readout(body, "");
    var playing = false;
    function pulse(t, tau) { return Math.abs(t) < tau / 2 ? 1 / tau : 0; }
    function draw() {
      var tau = ctl.num("tau");
      p1.clear(); p1.grid(12, 6); p1.axes();
      p1.area(function (t) { return pulse(t, tau); }, -tau / 2, tau / 2, C.blue);
      p1.fn(function (t) { return pulse(t, tau); }, C.blue, 2.4);
      p1.text("高 = 1/τ = " + (1 / tau).toFixed(2), 0.15, 1 / tau - 0.7, C.text);
      /* 第二块画布：极限示意 */
      p2.clear(); p2.grid(12, 6); p2.axes();
      var ctx = p2.ctx;
      if (tau < 0.12) {
        /* 已接近 δ：画冲激箭头 */
        ctx.save();
        ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 3;
        var x0 = p2.px(0), y0 = p2.py(0), y1 = p2.py(2.4);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x0 - 6, y1 + 9); ctx.lineTo(x0, y1); ctx.lineTo(x0 + 6, y1 + 9); ctx.closePath(); ctx.fill();
        ctx.font = "13px Cambria, serif";
        ctx.fillText("(1)", x0 + 9, y1 + 16);
        ctx.restore();
        p2.text("δ(t)：t≠0 处为 0，强度（面积）为 1", 0.35, 2.6, C.orange);
      } else {
        p2.area(function (t) { return pulse(t, tau); }, -tau / 2, tau / 2, C.orange);
        p2.fn(function (t) { return pulse(t, tau); }, C.orange, 2.4);
        p2.text("继续减小 τ…", 0.3, 2.6, C.text);
      }
      ro.innerHTML = "当前：宽 <span class='rd'>τ = " + tau.toFixed(2) + "</span>，高 <span class='rd'>1/τ = " + (1 / tau).toFixed(2) +
        "</span>，脉冲面积 <span class='rd'>S = τ × 1/τ = 1（恒定不变）</span>" +
        (tau < 0.12 ? '　<span class="sim-badge ok">已可视作 δ(t)</span>' : "");
    }
    function play() {
      if (playing) { playing = false; return; }
      playing = true;
      (function step() {
        if (!playing || !cv[0].isConnected) { playing = false; return; }
        var tau = parseFloat(ctl.tau.value);
        tau = Math.max(0.04, tau * 0.93);
        ctl.tau.value = tau; ctl.tau._refreshVal();
        draw();
        if (tau > 0.045) requestAnimationFrame(step);
        else playing = false;
      })();
    }
    ctl.tau.addEventListener("input", draw);
    S._redraws.push(draw);
    draw();
  };

  /* ══ 3. 系统性质判定实验 ═════════════════════════════ */
  S["system-props"] = function (body) {
    var cv = S.canvasRow(body, ["输入 x(t)", "输出 y(t)"], 2);
    var p1 = new Plot(cv[0], { x0: -6, x1: 6, y0: -1.6, y1: 1.9, xLabel: "t" });
    var p2 = new Plot(cv[1], { x0: -6, x1: 6, y0: -3.2, y1: 3.4, xLabel: "t" });

    var inputs = {
      sine: { name: "sin 2t", f: function (t) { return Math.sin(2 * t); } },
      step: { name: "ε(t)", f: function (t) { return u(t); } },
      square: { name: "对称方波", f: function (t) { return Math.sin(t) >= 0 ? 1 : -1; } },
      decay: { name: "exp(−t)·ε(t)", f: function (t) { return t >= 0 ? Math.exp(-t) : 0; } }
    };
    var systems = {
      "2x+1": {
        name: "y = 2x(t) + 1",
        props: { linear: "增量线性", ti: true, causal: true, stable: true },
        why: "不满足零输入线性（x=0 时 y=1≠0），但满足增量线性；参数恒定 → 时不变。",
        y: function (x, t) { return 2 * x(t) + 1; }
      },
      "x2": {
        name: "y = x²(t)",
        props: { linear: false, ti: true, causal: true, stable: false },
        why: "叠加性不成立：T[x₁+x₂] = (x₁+x₂)² ≠ x₁²+x₂²；方波输入时输出恒为 1（有界），但一般不保证有界（如 x=1/(1−t)）。通常按非线性处理。",
        y: function (x, t) { var v = x(t); return v * v; }
      },
      "tx": {
        name: "y = t·x(t)",
        props: { linear: true, ti: false, causal: true, stable: false },
        why: "含时变系数 t → 时变（输入延迟 1s，输出并非延迟 1s）；线性成立；t 无界增长导致不稳定。",
        y: function (x, t) { return t * x(t); }
      },
      "x2t": {
        name: "y = x(2t)",
        props: { linear: true, ti: false, causal: false, stable: true },
        why: "时间尺度压缩 → 时变；y(t) 在 t>0 时用到 x(2t)（未来的输入）→ 非因果。",
        y: function (x, t) { return x(2 * t); }
      },
      "delay": {
        name: "y = x(t − 1)",
        props: { linear: true, ti: true, causal: true, stable: true },
        why: "延迟系统：线性、时不变、因果、稳定的标准例子。",
        y: function (x, t) { return x(t - 1); }
      },
      "integ": {
        name: "y = ∫x dτ",
        props: { linear: true, ti: true, causal: true, stable: false },
        why: "积分器：线性、时不变、因果；但 ε(t) 输入时输出无界增长 → BIBO 不稳定。",
        y: function (x, t) {
          var s = 0, a = -8, n = 200, h = (t - a) / n;
          for (var i = 0; i < n; i++) s += x(a + (i + 0.5) * h) * h;
          return s;
        }
      }
    };
    var ctl = S.makeControls(body, [
      { k: "in", label: "输入", sel: [["sine", "sin 2t"], ["step", "ε(t)"], ["square", "方波"], ["decay", "exp(−t)·ε(t)"]], val: "sine" },
      { k: "sys", label: "系统", sel: Object.keys(systems).map(function (k) { return [k, systems[k].name]; }), val: "2x+1" }
    ]);
    var ro = S.readout(body, "");
    function badge(ok, label, txt) {
      var cls = ok === true ? "ok" : ok === false ? "bad" : "warn";
      return '<span class="sim-badge ' + cls + '">' + label + "：" + txt + "</span>";
    }
    function draw() {
      var x = inputs[ctl.in.value].f;
      var sys = systems[ctl.sys.value];
      var y = function (t) { return sys.y(x, t); };
      p1.clear(); p1.grid(12, 6); p1.axes(); p1.fn(x, C.blue, 2.2);
      p2.clear(); p2.grid(12, 6); p2.axes(); p2.fn(y, C.orange, 2.2);
      var pr = sys.props;
      ro.innerHTML =
        badge(pr.linear === true, "线性", pr.linear === true ? "满足" : (pr.linear === "增量线性" ? "增量线性" : "不满足")) +
        badge(pr.ti === true, "时不变", pr.ti ? "满足" : "不满足") +
        badge(pr.causal === true, "因果", pr.causal ? "满足" : "不满足") +
        badge(pr.stable === true, "稳定", pr.stable ? "满足" : "不满足") +
        "<br>判定理由：" + sys.why;
    }
    ctl.in.addEventListener("change", draw);
    ctl.sys.addEventListener("change", draw);
    S._redraws.push(draw);
    draw();
  };

  /* ══ 4. 卷积积分动态演示 ═════════════════════════════ */
  S["conv-demo"] = function (body) {
    var cv = S.canvasRow(body, [
      "翻转—平移：f₁(τ) 与 f₂(t−τ)，绿色为乘积 f₁(τ)·f₂(t−τ)",
      "卷积结果 y(t) = (f₁ * f₂)(t)，随 t 增长"
    ], 2);
    var sigs = {
      u: { name: "ε(t)", f: u },
      e1: { name: "exp(−t)·ε(t)", f: function (t) { return t >= 0 ? Math.exp(-t) : 0; } },
      e2: { name: "exp(−2t)·ε(t)", f: function (t) { return t >= 0 ? Math.exp(-2 * t) : 0; } },
      g1: { name: "g₁(t)（宽1矩形）", f: function (t) { return t >= 0 && t <= 1 ? 1 : 0; } },
      tri: { name: "三角(0~2)", f: function (t) { return t >= 0 && t <= 1 ? t : (t > 1 && t <= 2 ? 2 - t : 0); } },
      cos: { name: "cos(2t)ε(t)", f: function (t) { return t >= 0 ? Math.cos(2 * t) : 0; } }
    };
    var TMAX = 8;
    var p1 = new Plot(cv[0], { x0: -1, x1: TMAX + 1, y0: -1.4, y1: 1.6, xLabel: "τ" });
    var p2 = new Plot(cv[1], { x0: -1, x1: TMAX + 1, y0: -0.4, y1: 2.2, xLabel: "t" });

    var f1 = sigs.u.f, f2 = sigs.e1.f;
    var yFull = [];
    function computeAll() {
      yFull = [];
      var tStep = 0.02, tauStep = 0.004;
      for (var t = 0; t <= TMAX + 0.001; t += tStep) {
        var s = 0;
        for (var tau = 0; tau <= t + 1e-9; tau += tauStep) s += f1(tau) * f2(t - tau);
        yFull.push(s * tauStep);
      }
    }
    var ctl = S.makeControls(body, [
      { k: "s1", label: "f₁", sel: Object.keys(sigs).map(function (k) { return [k, sigs[k].name]; }), val: "u", onChange: recompute },
      { k: "s2", label: "f₂", sel: Object.keys(sigs).map(function (k) { return [k, sigs[k].name]; }), val: "e1", onChange: recompute },
      { k: "t", label: "t", min: 0, max: TMAX, step: 0.02, val: 2, fmt: function (v) { return v.toFixed(2); }, onChange: function () { playing = false; draw(); } },
      { btn: "▶ 播放", primary: true, onClick: togglePlay },
      { btn: "⏸ 暂停", onClick: function () { playing = false; } }
    ]);
    var ro = S.readout(body, "");
    var playing = false;
    function recompute() {
      f1 = sigs[ctl.s1.value].f;
      f2 = sigs[ctl.s2.value].f;
      computeAll();
      draw();
    }
    function yAt(t) {
      var i = t / 0.02;
      var i0 = Math.floor(i), i1 = Math.min(yFull.length - 1, i0 + 1);
      if (i0 < 0) return 0;
      if (i0 >= yFull.length) return yFull[yFull.length - 1];
      return yFull[i0] + (yFull[i1] - yFull[i0]) * (i - i0);
    }
    function draw() {
      var t = ctl.num("t");
      p1.clear(); p1.grid(12, 6); p1.axes();
      p1.fn(f1, C.blue, 2);
      p1.fn(function (tau) { return f2(t - tau); }, C.orange, 2);
      var prod = function (tau) { return f1(tau) * f2(t - tau); };
      p1.area(prod, Math.max(-1, 0), Math.min(TMAX + 1, t), C.green);
      p1.fn(prod, C.green, 1.4);
      p1.line(t, -1.4, t, 1.6, C.grey, 1, [4, 4]);
      p1.text("t = " + t.toFixed(2), Math.min(t + 0.1, TMAX - 1), -1.05, C.grey);

      p2.clear(); p2.grid(12, 6); p2.axes();
      p2.fn(function (x) { return yAt(x); }, C.grey, 1.4, [5, 4]);
      if (t > 0) {
        p2.fn(function (x) { return x <= t ? yAt(x) : NaN; }, C.accent, 2.6);
      }
      p2.dot(t, yAt(t), C.accent, 4);
      ro.innerHTML = "重叠区间内乘积曲线下的面积即卷积值：<span class='rd'>t = " + t.toFixed(2) +
        "</span>　→　<span class='rd'>y(t) = " + yAt(t).toFixed(4) + "</span>" +
        '<br><span style="color:var(--text-2)">绿色面积从 t=0 开始累积，形成下方 y(t) 曲线——这就是"翻转、平移、相乘、积分"四步。</span>';
    }
    function togglePlay() {
      if (playing) { playing = false; return; }
      playing = true;
      (function step() {
        if (!playing || !cv[0].isConnected) { playing = false; return; }
        var t = parseFloat(ctl.t.value) + 0.035;
        if (t >= TMAX) t = 0;
        ctl.t.value = t; ctl.t._refreshVal();
        draw();
        requestAnimationFrame(step);
      })();
    }
    ctl.t.addEventListener("input", function () { playing = false; draw(); });
    S._redraws.push(function () { computeAll(); draw(); });
    recompute();
  };
})();
