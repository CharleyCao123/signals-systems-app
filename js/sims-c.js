/* 实验组 C：幅度调制 / 理想低通滤波 / s 平面极点 / z 平面极点 */
(function () {
  "use strict";
  var S = window.SIG_SIMS, C = S.colors, Plot = S.Plot;
  function u(t) { return t >= 0 ? 1 : 0; }
  function Sa(x) { return Math.abs(x) < 1e-7 ? 1 : Math.sin(x) / x; }

  /* ══ 9. 幅度调制（AM）与频谱搬移 ═════════════════════ */
  S["am-mod"] = function (body) {
    var cv = S.canvasRow(body, ["时域：已调信号 s(t) = [1 + k·m(t)]·cos(2πf_c t)（橙虚线为包络）", "频谱：载波 f_c 与上、下边带 f_c ± f_m"], 2);
    var FM = 1; /* message 1 Hz */
    var p1 = new Plot(cv[0], { x0: 0, x1: 1, y0: -2.3, y1: 2.3, xLabel: "t / s" });
    var p2 = new Plot(cv[1], { x0: -2, x1: 15, y0: -0.2, y1: 1.4, xLabel: "f / Hz" });
    var ctl = S.makeControls(body, [
      { k: "fc", label: "载频 f_c", min: 3, max: 12, step: 0.5, val: 6, fmt: function (v) { return v.toFixed(1) + "Hz"; }, onChange: draw },
      { k: "k", label: "调幅度 k", min: 0.2, max: 1, step: 0.05, val: 0.6, fmt: function (v) { return v.toFixed(2); }, onChange: draw }
    ]);
    var ro = S.readout(body, "");
    function draw() {
      var fc = ctl.num("fc"), k = ctl.num("k");
      var m = function (t) { return Math.cos(2 * Math.PI * FM * t); };
      var env = function (t) { return 1 + k * m(t); };
      p1.clear(); p1.grid(10, 5); p1.axes();
      p1.fn(function (t) { return env(t); }, C.orange, 1.6, [5, 4]);
      p1.fn(function (t) { return -env(t); }, C.orange, 1.6, [5, 4]);
      p1.fn(function (t) { return env(t) * Math.cos(2 * Math.PI * fc * t); }, C.blue, 1.4);
      p1.fn(m, C.grey, 1.2, [2, 3]);
      p1.text("包络 = ±[1 + k·m(t)]", 0.52, 2.0, C.orange);

      p2.clear(); p2.grid(14, 5); p2.axes();
      function line1(f, h, color) { p2.line(f, 0, f, h, color, 2.4); p2.dot(f, h, color, 2.6); }
      line1(FM, 0.6, C.grey); line1(-FM, 0.6, C.grey);
      line1(fc, 1, C.accent); line1(-fc, 1, C.accent);
      line1(fc + FM, k / 2, C.blue); line1(fc - FM, k / 2, C.blue);
      line1(-fc + FM, k / 2, C.blue); line1(-fc - FM, k / 2, C.blue);
      p2.text("f_m", FM + 0.25, 0.72, C.grey);
      p2.text("f_c", fc + 0.25, 1.12, C.accent);
      p2.text("f_c±f_m", fc + FM + 0.3, k / 2 + 0.16, C.blue);
      p2.line(fc - FM, 1.35, fc + FM, 1.35, C.grey, 1.2, [4, 3]);
      p2.text("带宽 2f_m", fc - 0.6, 1.42, C.grey);
      ro.innerHTML = "频谱分量：载波 <span class='rd'>±f_c = ±" + fc.toFixed(1) + " Hz</span>（幅度 1），上、下边带 <span class='rd'>f_c ± f_m = " +
        (fc - FM).toFixed(1) + " / " + (fc + FM).toFixed(1) + " Hz</span>（幅度 k/2 = " + (k / 2).toFixed(2) + "）。" +
        '<span class="sim-badge ok">调制 = 频谱搬移：基带 1 Hz 被搬到 ±f_c 附近，信号带宽变为 2f_m = 2 Hz</span>' +
        '<br><span style="color:var(--text-2)">接收端再乘一次 cos(2πf_c t)（同步解调），频谱搬回原点，经低通即恢复 m(t)。增大 f_c 观察载波变密、边带远离载频。</span>';
    }
    S._redraws.push(draw);
    draw();
  };

  /* ══ 10. 理想低通滤波器 ══════════════════════════════ */
  S["filter-lp"] = function (body) {
    var cv = S.canvasRow(body, [
      "频率响应 |H(jf)|：截止频率 f_c（竖直虚线为输入信号的三个频率分量）",
      "时域：输入 x(t)（灰）与滤波输出 y(t)（蓝，含时延 t_d）"
    ], 2);
    var FREQS = [0.8, 2.2, 4.0];
    var AMPS = [1, 0.7, 0.5];
    var COLS = [C.green, C.orange, C.purple];
    var TD = 0.12;
    var p1 = new Plot(cv[0], { x0: 0, x1: 5.5, y0: -0.15, y1: 1.35, xLabel: "f / Hz" });
    var p2 = new Plot(cv[1], { x0: 0, x1: 2, y0: -2.6, y1: 2.6, xLabel: "t / s" });
    var ctl = S.makeControls(body, [
      { k: "fc", label: "截止频率 f_c", min: 0.5, max: 5, step: 0.05, val: 1.5, fmt: function (v) { return v.toFixed(2) + "Hz"; }, onChange: draw }
    ]);
    var ro = S.readout(body, "");
    function x(t) {
      var s = 0;
      for (var i = 0; i < 3; i++) s += AMPS[i] * Math.cos(2 * Math.PI * FREQS[i] * t);
      return s;
    }
    function draw() {
      var fc = ctl.num("fc");
      p1.clear(); p1.grid(11, 5); p1.axes();
      p1.area(function (f) { return f <= fc ? 1 : 0; }, 0, Math.min(fc, 5.5), C.accent, 0.14);
      p1.fn(function (f) { return f <= fc ? 1 : 0; }, C.accent, 2.6);
      for (var i = 0; i < 3; i++) {
        var pass = FREQS[i] <= fc;
        p1.line(FREQS[i], -0.15, FREQS[i], 1.28, COLS[i], 1.2, [4, 3]);
        p1.dot(FREQS[i], 1.14, pass ? COLS[i] : C.grey, 4.2);
        p1.text(FREQS[i] + "Hz", FREQS[i] - 0.42, (pass ? 1.24 : -0.03), pass ? COLS[i] : C.grey, "10.5px Consolas, monospace");
      }
      p1.text("f_c = " + fc.toFixed(2), fc + 0.08, 0.45, C.accent);

      p2.clear(); p2.grid(10, 5); p2.axes();
      p2.fn(x, C.grey, 1.6);
      var terms = [];
      for (var j = 0; j < 3; j++) {
        if (FREQS[j] <= fc) terms.push({ f: FREQS[j], A: AMPS[j], col: COLS[j] });
      }
      p2.fn(function (t) {
        var s = 0;
        terms.forEach(function (tm) { s += tm.A * Math.cos(2 * Math.PI * tm.f * (t - TD)); });
        return s;
      }, C.blue, 2.2);
      p2.line(TD, -2.6, TD, 2.6, C.grey, 1, [2, 3]);
      p2.text("t_d", TD + 0.02, 2.3, C.grey);
      var keep = terms.map(function (tm) { return tm.A + "·cos(2π·" + tm.f + "·t)"; }).join(" + ");
      ro.innerHTML = "输入含 <span class='rd'>0.8 / 2.2 / 4.0 Hz</span> 三个分量。当前 f_c = " + fc.toFixed(2) + " Hz，通过分量：<span class='rd'>" +
        (keep || "（无——输出为零）") + "</span>" +
        (terms.length === 0 ? '　<span class="sim-badge bad">全被抑制</span>' :
         terms.length === 3 ? '　<span class="sim-badge bad">f_c 过大，全部通过，滤波失效</span>' :
         '　<span class="sim-badge ok">正确滤除高频、保留低频</span>') +
        '<br><span style="color:var(--text-2)">拖动 f_c 依次跨过 4.0、2.2、0.8 Hz，观察输出波形逐次简化——这正是 |H(jω)| 对各频率分量"加权"的过程。</span>';
    }
    S._redraws.push(draw);
    draw();
  };

  /* ══ 11. s 平面极点与冲激响应 h(t) ═══════════════════ */
  S["s-pole"] = function (body) {
    var cv = S.canvasRow(body, [
      "s 平面：左半平面（绿）稳定；点击或拖动放置极点",
      "对应冲激响应 h(t)"
    ], 2);
    var p1 = new Plot(cv[0], { x0: -4.4, x1: 4.4, y0: -3.4, y1: 3.4, xLabel: "σ", yLabel: "jω" });
    var p2 = new Plot(cv[1], { x0: 0, x1: 6, y0: -3.4, y1: 3.4, xLabel: "t" });
    var mode = "cx"; /* cx 共轭对 / real 两实极点 */
    var cx = { s: -1, w: 3 };
    var real = { p1: -1, p2: -3 };
    var drag = false;

    var ctl = S.makeControls(body, [
      { k: "mode", label: "极点类型", sel: [["cx", "共轭复极点对 σ±jω"], ["real", "两个实极点"]], val: "cx", onChange: function () { mode = ctl.mode.value; draw(); } },
      { btn: "重置位置", onClick: function () { cx = { s: -1, w: 3 }; real = { p1: -1, p2: -3 }; draw(); } }
    ]);
    var ro = S.readout(body, "");

    function hOf() {
      if (mode === "cx") {
        var s = cx.s, w = cx.w;
        if (Math.abs(w) < 0.12) return { f: function (t) { return t * Math.exp(s * t); }, desc: "h(t) = t·exp(σt)·ε(t)（二重实极点）" };
        return { f: function (t) { return Math.exp(s * t) * Math.sin(w * t) / w; }, desc: "h(t) = exp(σt)·sin(ωt)/ω · ε(t)（衰减/增幅振荡）" };
      }
      var a = real.p1, b = real.p2;
      if (Math.abs(a - b) < 0.08) return { f: function (t) { return t * Math.exp(a * t) * u(t); }, desc: "h(t) = t·exp(pt)·ε(t)（二重实极点）" };
      return { f: function (t) { return (Math.exp(a * t) - Math.exp(b * t)) / (a - b) * u(t); }, desc: "h(t) = (exp(p₁t) − exp(p₂t))/(p₁−p₂) · ε(t)" };
    }
    function draw() {
      /* 左图：s 平面 */
      p1.clear(); p1.grid(11, 7); p1.axes();
      var ctx = p1.ctx;
      var x0px = p1.px(0);
      ctx.save();
      ctx.globalAlpha = 0.10; ctx.fillStyle = C.green;
      ctx.fillRect(p1.padL, p1.padT, x0px - p1.padL, p1.H - p1.padT - p1.padB);
      ctx.fillStyle = C.red;
      ctx.fillRect(x0px, p1.padT, p1.W - p1.padR - x0px, p1.H - p1.padT - p1.padB);
      ctx.restore();
      p1.text("稳定区", -4.1, 3.0, C.green, "11.5px Microsoft YaHei");
      p1.text("不稳定区", 2.3, 3.0, C.red, "11.5px Microsoft YaHei");
      function mark(x, y, label) {
        ctx.save();
        ctx.strokeStyle = C.purple; ctx.lineWidth = 2.6;
        var px = p1.px(x), py = p1.py(y), r = 6;
        ctx.beginPath();
        ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
        ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
        ctx.stroke();
        ctx.fillStyle = C.purple; ctx.font = "11.5px Cambria, serif";
        ctx.fillText(label, px + 9, py + 4);
        ctx.restore();
      }
      var poles;
      if (mode === "cx") {
        poles = [[cx.s, cx.w, "σ+jω"], [cx.s, -cx.w, "σ−jω"]];
      } else {
        poles = [[real.p1, 0, "p₁"], [real.p2, 0, "p₂"]];
      }
      poles.forEach(function (pp) { mark(pp[0], pp[1], pp[2]); });

      /* 右图：h(t) */
      p2.clear(); p2.grid(10, 6); p2.axes();
      var h = hOf();
      p2.fn(h.f, C.blue, 2.2);
      if (mode === "cx" && Math.abs(cx.w) >= 0.12) {
        p2.fn(function (t) { return Math.exp(cx.s * t); }, C.grey, 1.1, [4, 4]);
        p2.fn(function (t) { return -Math.exp(cx.s * t); }, C.grey, 1.1, [4, 4]);
        p2.text("包络 ±exp(σt)", 3.4, Math.exp(cx.s * 3.4) + 0.35, C.grey);
      }
      /* 稳定性判定 */
      var maxRe;
      if (mode === "cx") maxRe = cx.s;
      else maxRe = Math.max(real.p1, real.p2);
      var badge;
      if (maxRe < -0.06) badge = '<span class="sim-badge ok">极点在左半平面：h(t) 衰减 → 系统稳定</span>';
      else if (maxRe > 0.06) badge = '<span class="sim-badge bad">极点在右半平面：h(t) 增长 → 系统不稳定</span>';
      else badge = '<span class="sim-badge warn">极点在虚轴上：等幅（或线性增长）→ 临界稳定</span>';
      function term(p) {
        return "(s " + (p < 0 ? "+ " : "− ") + Math.abs(p).toFixed(2) + ")";
      }
      var hs = mode === "cx"
        ? "H(s) = 1 / [" + term(cx.s) + "² + " + (cx.w * cx.w).toFixed(2) + "]"
        : "H(s) = 1 / [" + term(real.p1) + term(real.p2) + "]";
      ro.innerHTML = "<span class='rd'>" + hs + "</span>　" + badge + "<br>" + h.desc +
        '<br><span style="color:var(--text-2)">极点实部决定增幅/衰减快慢，虚部决定振荡频率；把极点拖到右半平面或虚轴上观察 h(t) 的变化。</span>';
    }
    function toPlot(e) {
      var rect = cv[0].getBoundingClientRect();
      var dprW = p1.W / rect.width;
      var px = (e.clientX - rect.left) * dprW;
      var py = (e.clientY - rect.top) * (p1.H / rect.height);
      var pt = p1.fromPixels(px, py);
      return { x: Math.max(-4.2, Math.min(4.2, pt.x)), y: Math.max(-3.3, Math.min(3.3, pt.y)) };
    }
    function apply(pt) {
      if (mode === "cx") { cx.s = pt.x; cx.w = pt.y; }
      else { real.p1 = Math.max(-4.2, Math.min(4.2, pt.x - 0.7)); real.p2 = Math.min(4.2, Math.max(-4.2, pt.x + 0.7)); }
      draw();
    }
    cv[0].addEventListener("pointerdown", function (e) { drag = true; cv[0].setPointerCapture(e.pointerId); apply(toPlot(e)); });
    cv[0].addEventListener("pointermove", function (e) { if (drag) apply(toPlot(e)); });
    cv[0].addEventListener("pointerup", function () { drag = false; });
    S._redraws.push(draw);
    draw();
  };

  /* ══ 12. z 平面极点与单位序列响应 h(k) ═══════════════ */
  S["z-pole"] = function (body) {
    var cv = S.canvasRow(body, [
      "z 平面：单位圆内（绿）稳定；点击或拖动放置极点",
      "对应单位序列响应 h(k)"
    ], 2);
    var p1 = new Plot(cv[0], { x0: -1.8, x1: 1.8, y0: -1.45, y1: 1.45, xLabel: "Re(z)", yLabel: "Im(z)" });
    var p2 = new Plot(cv[1], { x0: 0, x1: 26, y0: -2.4, y1: 2.4, xLabel: "k", intX: true });
    var mode = "cx";
    var cx = { rho: 0.8, beta: Math.PI / 5 };
    var real = { p1: 0.6, p2: -0.4 };
    var drag = false;

    var ctl = S.makeControls(body, [
      { k: "mode", label: "极点类型", sel: [["cx", "共轭复极点对 ρ·exp(±jβ)"], ["real", "两个实极点"]], val: "cx", onChange: function () { mode = ctl.mode.value; draw(); } },
      { btn: "重置位置", onClick: function () { cx = { rho: 0.8, beta: Math.PI / 5 }; real = { p1: 0.6, p2: -0.4 }; draw(); } }
    ]);
    var ro = S.readout(body, "");

    function hOf() {
      if (mode === "cx") {
        var r = cx.rho, b = cx.beta;
        if (b < 0.1) return { f: function (k) { return (k + 1) * Math.pow(r, k); }, desc: "h(k) = (k+1)·ρᵏ·ε(k)（正实轴二重极点）" };
        return { f: function (k) { return Math.pow(r, k) * Math.cos(b * k); }, desc: "h(k) = ρᵏ·cos(βk)·ε(k)（衰减/增幅振荡）" };
      }
      var a = real.p1, b2 = real.p2;
      if (Math.abs(a - b2) < 0.06) return { f: function (k) { return (k + 1) * Math.pow(a, k); }, desc: "h(k) = (k+1)·pᵏ·ε(k)" };
      return { f: function (k) { return (Math.pow(a, k + 1) - Math.pow(b2, k + 1)) / (a - b2); }, desc: "h(k) = (p₁ᵏ⁺¹ − p₂ᵏ⁺¹)/(p₁−p₂) · ε(k)" };
    }
    function draw() {
      p1.clear(); p1.grid(12, 7); p1.axes();
      var ctx = p1.ctx;
      /* 单位圆内外着色 */
      ctx.save();
      var rpx = p1.px(1) - p1.px(0);
      ctx.globalAlpha = 0.10; ctx.fillStyle = C.red;
      ctx.fillRect(p1.padL, p1.padT, p1.W - p1.padL - p1.padR, p1.H - p1.padT - p1.padB);
      ctx.fillStyle = C.green;
      ctx.beginPath();
      ctx.arc(p1.px(0), p1.py(0), rpx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = C.accent; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(p1.px(0), p1.py(0), rpx, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      p1.text("|z| = 1", p1.px2x ? 0 : 0, 0, C.accent, "11px Microsoft YaHei");
      p1.text("稳定区", -1.62, 1.22, C.green, "11.5px Microsoft YaHei");
      p1.text("不稳定区", 0.95, 1.22, C.red, "11.5px Microsoft YaHei");
      function mark(x, y, label) {
        ctx.save();
        ctx.strokeStyle = C.purple; ctx.lineWidth = 2.6;
        var px = p1.px(x), py = p1.py(y), r = 6;
        ctx.beginPath();
        ctx.moveTo(px - r, py - r); ctx.lineTo(px + r, py + r);
        ctx.moveTo(px - r, py + r); ctx.lineTo(px + r, py - r);
        ctx.stroke();
        ctx.fillStyle = C.purple; ctx.font = "11.5px Cambria, serif";
        ctx.fillText(label, px + 9, py + 4);
        ctx.restore();
      }
      var poles;
      if (mode === "cx") {
        poles = [[cx.rho * Math.cos(cx.beta), cx.rho * Math.sin(cx.beta), "ρ·exp(jβ)"],
                 [cx.rho * Math.cos(cx.beta), -cx.rho * Math.sin(cx.beta), "ρ·exp(−jβ)"]];
      } else {
        poles = [[real.p1, 0, "p₁"], [real.p2, 0, "p₂"]];
      }
      poles.forEach(function (pp) { mark(pp[0], pp[1], pp[2]); });

      /* 右图 h(k) */
      p2.clear(); p2.grid(13, 6); p2.axes();
      var h = hOf();
      var pts = [];
      for (var k = 0; k <= 26; k++) pts.push({ x: k, y: h.f(k) });
      p2.stems(pts, C.blue, 3);
      if (mode === "cx" && cx.beta >= 0.1) {
        var env = [];
        for (var k2 = 0; k2 <= 26; k2 += 0.5) env.push({ x: k2, y: Math.pow(cx.rho, k2) });
        p2.fn(function (t) { return Math.pow(cx.rho, t); }, C.grey, 1.1, [4, 4]);
        p2.fn(function (t) { return -Math.pow(cx.rho, t); }, C.grey, 1.1, [4, 4]);
        p2.text("包络 ±ρᵏ", 18, 1.9, C.grey);
      }
      var maxR = mode === "cx" ? cx.rho : Math.max(Math.abs(real.p1), Math.abs(real.p2));
      var badge;
      if (maxR < 0.95) badge = '<span class="sim-badge ok">极点在单位圆内：h(k) 衰减 → 系统稳定</span>';
      else if (maxR > 1.05) badge = '<span class="sim-badge bad">极点在单位圆外：h(k) 增长 → 系统不稳定</span>';
      else badge = '<span class="sim-badge warn">极点在单位圆上：等幅（或线性增长）→ 临界稳定</span>';
      function zterm(p) {
        return "(z " + (p < 0 ? "+ " : "− ") + Math.abs(p).toFixed(2) + ")";
      }
      var hz = mode === "cx"
        ? "H(z) = z² / [z² − " + (2 * cx.rho * Math.cos(cx.beta)).toFixed(2) + "z + " + (cx.rho * cx.rho).toFixed(2) + "]"
        : "H(z) = z² / [" + zterm(real.p1) + zterm(real.p2) + "]";
      ro.innerHTML = "<span class='rd'>" + hz + "</span>　" + badge + "<br>" + h.desc +
        '<br><span style="color:var(--text-2)">极点模 ρ 决定衰减/增长速度，辐角 β 决定振荡频率（周期约 2π/β）；把极点拖出单位圆观察 h(k) 发散。</span>';
    }
    function toPlot(e) {
      var rect = cv[0].getBoundingClientRect();
      var px = (e.clientX - rect.left) * (p1.W / rect.width);
      var py = (e.clientY - rect.top) * (p1.H / rect.height);
      var pt = p1.fromPixels(px, py);
      return { x: Math.max(-1.75, Math.min(1.75, pt.x)), y: Math.max(-1.4, Math.min(1.4, pt.y)) };
    }
    function apply(pt) {
      if (mode === "cx") {
        cx.rho = Math.max(0.1, Math.min(1.7, Math.sqrt(pt.x * pt.x + pt.y * pt.y)));
        var b = Math.atan2(Math.abs(pt.y), Math.abs(pt.x));
        cx.beta = Math.abs(pt.y) < 0.1 ? 0 : Math.max(0.1, b);
      } else {
        real.p1 = Math.max(-1.7, Math.min(1.7, pt.x - 0.45));
        real.p2 = Math.min(1.7, Math.max(-1.7, pt.x + 0.45));
      }
      draw();
    }
    cv[0].addEventListener("pointerdown", function (e) { drag = true; cv[0].setPointerCapture(e.pointerId); apply(toPlot(e)); });
    cv[0].addEventListener("pointermove", function (e) { if (drag) apply(toPlot(e)); });
    cv[0].addEventListener("pointerup", function () { drag = false; });
    S._redraws.push(draw);
    draw();
  };
})();
