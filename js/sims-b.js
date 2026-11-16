/* 实验组 B：卷积和 / 傅里叶级数合成 / 时频对偶 / 抽样定理 */
(function () {
  "use strict";
  var S = window.SIG_SIMS, C = S.colors, Plot = S.Plot;
  function u(k) { return k >= 0 ? 1 : 0; }
  function Sa(x) { return Math.abs(x) < 1e-7 ? 1 : Math.sin(x) / x; }

  /* ══ 5. 卷积和（离散卷积）════════════════════════════ */
  S["conv-sum"] = function (body) {
    var cv = S.canvasRow(body, ["对位相乘：f₁(i)（蓝）与 f₂(k−i)（橙），绿色为乘积", "卷积和结果 y(k) = Σ f₁(i)·f₂(k−i)"], 2);
    var KMAX = 12;
    var seqs = {
      u: { name: "ε(k)", f: function (k) { return u(k); } },
      a8: { name: "0.8ᵏε(k)", f: function (k) { return k >= 0 ? Math.pow(0.8, k) : 0; } },
      g3: { name: "ε(k)−ε(k−3)", f: function (k) { return k >= 0 && k < 3 ? 1 : 0; } },
      imp3: { name: "δ(k)+2δ(k−1)+δ(k−2)", f: function (k) { return k === 0 ? 1 : k === 1 ? 2 : k === 2 ? 1 : 0; } },
      a5r: { name: "0.5ᵏε(k)", f: function (k) { return k >= 0 ? Math.pow(0.5, k) : 0; } }
    };
    var p1 = new Plot(cv[0], { x0: -2, x1: KMAX + 2, y0: -1.3, y1: 2.6, xLabel: "i", intX: true });
    var p2 = new Plot(cv[1], { x0: -2, x1: KMAX + 2, y0: -1.3, y1: 4.6, xLabel: "k", intX: true });
    var f1 = seqs.u.f, f2 = seqs.a8.f;

    var ctl = S.makeControls(body, [
      { k: "s1", label: "f₁", sel: Object.keys(seqs).map(function (k) { return [k, seqs[k].name]; }), val: "u", onChange: setSeqs },
      { k: "s2", label: "f₂", sel: Object.keys(seqs).map(function (k) { return [k, seqs[k].name]; }), val: "a8", onChange: setSeqs },
      { k: "k", label: "k", min: 0, max: KMAX, step: 1, val: 4, fmt: function (v) { return String(Math.round(v)); }, onChange: function () { playing = false; draw(); } },
      { btn: "▶ 播放", primary: true, onClick: togglePlay }
    ]);
    var ro = S.readout(body, "");
    var playing = false;
    function yOf(k) {
      var s = 0;
      for (var i = -6; i <= k + 6; i++) s += f1(i) * f2(k - i);
      return s;
    }
    function setSeqs() {
      f1 = seqs[ctl.s1.value].f;
      f2 = seqs[ctl.s2.value].f;
      draw();
    }
    function draw() {
      var k = Math.round(ctl.num("k"));
      p1.clear(); p1.grid(14, 6); p1.axes();
      var a = [], b = [], pr = [];
      for (var i = -2; i <= KMAX + 2; i++) {
        if (i >= 0) a.push({ x: i, y: f1(i) });
        var vi = k - i;
        if (vi >= 0 && i >= -2 && i <= KMAX + 2) b.push({ x: i, y: f2(vi) });
        if (i >= 0 && vi >= 0) {
          var pv = f1(i) * f2(vi);
          if (pv !== 0) pr.push({ x: i, y: pv });
        }
      }
      p1.stems(a, C.blue, 3);
      p1.stems(b, C.orange, 3);
      p1.stems(pr, C.green, 3.4);
      p1.line(k, -1.3, k, 2.6, C.grey, 1, [4, 4]);

      p2.clear(); p2.grid(14, 6); p2.axes();
      var full = [], part = [];
      for (var m = 0; m <= KMAX; m++) full.push({ x: m, y: yOf(m) });
      for (var m2 = 0; m2 <= k; m2++) part.push({ x: m2, y: yOf(m2) });
      p2.stems(full, C.grey, 2);
      p2.stems(part, C.accent, 3.6);

      var terms = [];
      for (var i2 = 0; i2 <= k; i2++) {
        var v = f1(i2) * f2(k - i2);
        if (Math.abs(v) > 1e-9) terms.push(f1(i2).toFixed(2).replace(/\.?0+$/, "") + "×" + f2(k - i2).toFixed(2).replace(/\.?0+$/, ""));
      }
      ro.innerHTML = "当前 <span class='rd'>k = " + k + "</span>：y(" + k + ") = " +
        (terms.length ? terms.join(" + ") : "0") +
        " = <span class='rd'>" + yOf(k).toFixed(4) + "</span>" +
        '<br><span style="color:var(--text-2)">橙色序列是 f₂ 反转后再右移 k 得到的 f₂(k−i)；两列茎线重叠处的乘积（绿色）求和即得 y(k)。</span>';
    }
    function togglePlay() {
      if (playing) { playing = false; return; }
      playing = true;
      (function step() {
        if (!playing || !cv[0].isConnected) { playing = false; return; }
        var k = Math.round(parseFloat(ctl.k.value)) + 1;
        if (k > KMAX) k = 0;
        ctl.k.value = k; ctl.k._refreshVal();
        draw();
        setTimeout(step, 420);
      })();
    }
    ctl.k.addEventListener("input", function () { playing = false; draw(); });
    S._redraws.push(draw);
    setSeqs();
  };

  /* ══ 6. 傅里叶级数谐波合成（吉布斯现象）══════════════ */
  S["fs-synth"] = function (body) {
    var cv = S.canvasRow(body, ["谐波合成：灰色为目标周期信号，蓝色为部分和 sₙ(t)", "幅度谱 |cₙ|：蓝色为当前参与合成的谐波分量"], 2);
    var modes = {
      square: {
        name: "对称方波",
        target: function (t) { var r = ((t + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return r >= 0 ? 1 : -1; },
        c: function (n) { return n % 2 === 1 ? 4 / (Math.PI * n) : 0; }
      },
      saw: {
        name: "锯齿波",
        target: function (t) { var r = ((t + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return -r / (Math.PI / 2); },
        c: function (n) { return 2 / (Math.PI * n) * (n % 2 === 1 ? 1 : -1); }
      },
      tri: {
        name: "三角波",
        target: function (t) {
          var r = ((t + Math.PI / 2) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI / 2;
          var a = Math.abs(r);
          return a <= Math.PI / 2 ? a / (Math.PI / 4) : (Math.PI - a) / (Math.PI / 4);
        },
        c: function (n) { return n % 2 === 1 ? 8 / (Math.PI * Math.PI * n * n) * (n % 4 === 1 ? 1 : -1) : 0; }
      }
    };
    var p1 = new Plot(cv[0], { x0: -Math.PI, x1: 3 * Math.PI, y0: -1.9, y1: 1.9, xLabel: "t" });
    var p2 = new Plot(cv[1], { x0: 0, x1: 16.5, y0: -0.12, y1: 1.45, xLabel: "n（谐波次数）", intX: true });
    var ctl = S.makeControls(body, [
      { k: "mode", label: "目标波形", sel: [["square", "对称方波"], ["saw", "锯齿波"], ["tri", "三角波"]], val: "square", onChange: draw },
      { k: "N", label: "谐波数 N", min: 1, max: 60, step: 1, val: 3, fmt: function (v) { return String(Math.round(v)); }, onChange: function () { playing = false; draw(); } },
      { btn: "▶ 逐个叠加谐波", primary: true, onClick: togglePlay }
    ]);
    var ro = S.readout(body, "");
    var playing = false;
    function partial(t, mode, N) {
      var s = 0;
      for (var n = 1; n <= N; n++) s += modes[mode].c(n) * Math.sin(n * t);
      return s;
    }
    function draw() {
      var mode = ctl.mode.value, N = Math.round(ctl.num("N"));
      p1.clear(); p1.grid(14, 6); p1.axes();
      p1.fn(function (t) { return modes[mode].target(t); }, C.grey, 1.6, [6, 4]);
      p1.fn(function (t) { return partial(t, mode, N); }, C.blue, 2.2);
      p2.clear(); p2.grid(14, 6); p2.axes();
      var bars = [];
      for (var n = 1; n <= 15; n++) if (modes[mode].c(n) !== 0) bars.push({ x: n, y: modes[mode].c(n) });
      p2.stems(bars.map(function (b2) { return { x: b2.x, y: 0 }; }), "transparent", 0.1);
      bars.forEach(function (b3) {
        var col = b3.x <= N ? C.blue : C.grey;
        p2.line(b3.x, 0, b3.x, b3.y, col, 3);
        p2.dot(b3.x, b3.y, col, 3.6);
      });
      ro.innerHTML = "当前叠加到第 <span class='rd'>N = " + N + "</span> 次谐波。" +
        (mode === "square" && N >= 10 ? '　<span class="sim-badge warn">吉布斯现象：跳变边沿仍有 ≈9% 的过冲，不随 N 增大而消失</span>' : "") +
        (mode === "tri" && N >= 3 ? '　<span class="sim-badge ok">三角波谱按 1/n² 衰减，3~5 次谐波已非常接近</span>' : "") +
        '<br><span style="color:var(--text-2)">频谱特点是离散（只含基频整数倍）、谐波幅度总趋势收敛——N 越大合成波形越接近目标。</span>';
    }
    function togglePlay() {
      if (playing) { playing = false; return; }
      playing = true;
      (function step() {
        if (!playing || !cv[0].isConnected) { playing = false; return; }
        var N = Math.round(parseFloat(ctl.N.value)) + 1;
        if (N > 60) N = 1;
        ctl.N.value = N; ctl.N._refreshVal();
        draw();
        setTimeout(step, 330);
      })();
    }
    ctl.N.addEventListener("input", function () { playing = false; draw(); });
    S._redraws.push(draw);
    draw();
  };

  /* ══ 7. 时频对偶：脉宽与带宽成反比 ═══════════════════ */
  S["ft-duality"] = function (body) {
    var cv = S.canvasRow(body, ["时域波形", "频谱 |F(jω)|"], 2);
    var p1 = new Plot(cv[0], { x0: -5, x1: 5, y0: -0.5, y1: 1.8, xLabel: "t" });
    var p2 = new Plot(cv[1], { x0: -25, x1: 25, y0: -0.5, y1: 3.2, xLabel: "ω" });
    var ctl = S.makeControls(body, [
      { k: "mode", label: "信号", sel: [["rect", "矩形脉冲 g_τ(t)"], ["sinc", "抽样函数 Sa(ω_c·t)"]], val: "rect", onChange: function () { playing = false; draw(); } },
      { k: "w", label: "τ / ω_c", min: 0.5, max: 6, step: 0.1, val: 3, fmt: function (v) { return v.toFixed(1); }, onChange: function () { playing = false; draw(); } }
    ]);
    var ro = S.readout(body, "");
    function draw() {
      var w = ctl.num("w");
      if (ctl.mode.value === "rect") {
        p1.clear(); p1.grid(12, 5); p1.axes();
        p1.area(function (t) { return Math.abs(t) <= w / 2 ? 1 : 0; }, -w / 2, w / 2, C.blue);
        p1.fn(function (t) { return Math.abs(t) <= w / 2 ? 1 : 0; }, C.blue, 2.4);
        p1.text("τ = " + w.toFixed(1), 0.3, 1.25, C.text);
        p2.clear(); p2.grid(12, 5); p2.axes();
        p2.fn(function (om) { return w * Sa(om * w / 2); }, C.orange, 2.2);
        var zc = 2 * Math.PI / w;
        [-zc, zc].forEach(function (z) { p2.line(z, -0.5, z, 3.2, C.grey, 1.2, [4, 4]); });
        p2.text("±2π/τ", zc + 0.4, 2.7, C.grey);
        ro.innerHTML = "时域：宽 <span class='rd'>τ = " + w.toFixed(1) + "</span>　→　频谱 <span class='rd'>τ·Sa(ωτ/2)</span>，第一零点（主瓣边界）<span class='rd'>2π/τ = " + (2 * Math.PI / w).toFixed(2) + " rad/s</span>。" +
          '<span class="sim-badge ok">时宽 × 带宽 ≈ 常数：τ 减小 → 频谱展宽（反比关系）</span>';
      } else {
        p1.clear(); p1.grid(12, 5); p1.axes();
        p1.fn(function (t) { return Sa(w * t); }, C.blue, 2.4);
        p1.text("主瓣半宽 π/ω_c = " + (Math.PI / w).toFixed(2), 0.4, 1.25, C.text);
        p2.clear(); p2.grid(12, 5); p2.axes();
        var h = Math.PI / w;
        p2.area(function (om) { return Math.abs(om) <= w ? h : 0; }, -w, w, C.orange);
        p2.fn(function (om) { return Math.abs(om) <= w ? h : 0; }, C.orange, 2.4);
        p2.text("高 π/ω_c = " + h.toFixed(2), w / 2 + 0.5, h * 0.85, C.text);
        p2.line(-w, -0.5, -w, h, C.grey, 1.2, [4, 4]);
        p2.line(w, -0.5, w, h, C.grey, 1.2, [4, 4]);
        ro.innerHTML = "对偶情形：时域 <span class='rd'>Sa(ω_c t)</span>（主瓣宽 2π/ω_c）　↔　频域为宽 <span class='rd'>2ω_c = " + (2 * w).toFixed(1) + "</span> 的矩形谱（理想低通）。" +
          '<span class="sim-badge ok">时域越窄 ↔ 频域越宽，两个域不能同时变窄</span>';
      }
    }
    S._redraws.push(draw);
    draw();
  };

  /* ══ 8. 抽样定理与混叠 ═══════════════════════════════ */
  S["sampling"] = function (body) {
    var cv = S.canvasRow(body, [
      "时域：x(t)（灰）、样值（红点）、内插恢复 x_r(t)（蓝）",
      "频域：基带频谱与以 f_s 为间隔的周期延拓副本（红区为混叠区）"
    ], 2);
    var FM = 2; /* 最高频率 2 Hz */
    function x(t) { return Math.cos(2 * Math.PI * t) + 0.5 * Math.cos(4 * Math.PI * t); }
    var p1 = new Plot(cv[0], { x0: 0, x1: 2, y0: -2.1, y1: 2.3, xLabel: "t / s" });
    var p2 = new Plot(cv[1], { x0: -14, x1: 14, y0: -0.25, y1: 1.7, xLabel: "f / Hz" });
    var ctl = S.makeControls(body, [
      { k: "fs", label: "抽样频率 f_s", min: 2.5, max: 12, step: 0.1, val: 8, fmt: function (v) { return v.toFixed(1) + "Hz"; }, onChange: draw },
      { btn: "▶ fs 动画（由高到低）", primary: true, onClick: play }
    ]);
    var ro = S.readout(body, "");
    var playing = false;
    function recon(t, fs) {
      var T = 1 / fs, s = 0;
      for (var n = -30; n <= 40; n++) s += x(n * T) * Sa(Math.PI * (t - n * T) / T);
      return s;
    }
    function specLine(f, h, color, alpha) {
      p2.line(f, 0, f, h, color, 2.4);
      p2.dot(f, h, color, 2.6);
    }
    function draw() {
      var fs = ctl.num("fs");
      p1.clear(); p1.grid(10, 5); p1.axes();
      p1.fn(x, C.grey, 1.6);
      var T = 1 / fs, samples = [];
      for (var t = 0; t <= 2 + 1e-9; t += T) {
        samples.push({ x: t, y: x(t) });
        p1.line(t, 0, t, x(t), C.red, 1.4);
        p1.dot(t, x(t), C.red, 3.2);
      }
      p1.fn(function (t) { return recon(t, fs); }, C.blue, 2);
      var err = 0;
      for (var e = 0; e <= 2; e += 0.01) err = Math.max(err, Math.abs(x(e) - recon(e, fs)));

      p2.clear(); p2.grid(14, 5); p2.axes();
      /* 混叠区 */
      if (fs < 2 * FM) {
        p2.area(function () { return 1.7; }, fs - FM, FM, C.red, 0.25);
        p2.area(function () { return 1.7; }, -FM, -(fs - FM), C.red, 0.25);
      }
      for (var k = -2; k <= 2; k++) {
        var base = k * fs;
        if (Math.abs(base) > 13.5) continue;
        var col = k === 0 ? C.accent : C.grey;
        specLine(base + 1, 1, col);
        specLine(base - 1, 1, col);
        specLine(base + FM, 0.5, col);
        specLine(base - FM, 0.5, col);
      }
      p2.line(2 * FM, -0.25, 2 * FM, 1.7, C.orange, 1.2, [4, 3]);
      p2.text("2f_m", 2 * FM + 0.3, 1.5, C.orange);
      var ok = fs >= 2 * FM;
      ro.innerHTML = (ok
        ? '<span class="sim-badge ok">f_s = ' + fs.toFixed(1) + ' Hz ≥ 2f_m = 4 Hz：满足抽样定理，恢复曲线与原信号重合（误差 ' + err.toFixed(3) + '）</span>'
        : '<span class="sim-badge bad">f_s = ' + fs.toFixed(1) + ' Hz ＜ 2f_m = 4 Hz：发生混叠！恢复信号失真（误差 ' + err.toFixed(3) + '）</span>') +
        '<br><span style="color:var(--text-2)">下方频谱中，抽样使基带频谱以 f_s 为间隔复制；当副本与基带重叠（红区）时无法用低通滤波分离，即混叠。降低 f_s 观察恢复曲线的畸变。</span>';
    }
    function play() {
      if (playing) { playing = false; return; }
      playing = true;
      (function step() {
        if (!playing || !cv[0].isConnected) { playing = false; return; }
        var fs = parseFloat(ctl.fs.value) - 0.15;
        if (fs < 2.5) { playing = false; return; }
        ctl.fs.value = fs; ctl.fs._refreshVal();
        draw();
        setTimeout(step, 120);
      })();
    }
    ctl.fs.addEventListener("input", draw);
    S._redraws.push(draw);
    draw();
  };
})();
