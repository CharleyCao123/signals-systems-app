/* 交互实验框架：绘图类 Plot + 控件生成 + 主题适配 */
(function () {
  "use strict";
  window.SIG_SIMS = window.SIG_SIMS || {};
  var SIMS = window.SIG_SIMS;
  SIMS._redraws = []; /* 主题切换时需要重绘的实验 */

  var C = {
    axis: "#8ba0b0", grid: "#e2ecf1", text: "#5a6b78",
    blue: "#1668b3", orange: "#d97a1f", green: "#1f8a4c", red: "#c0392b",
    purple: "#7d3ac1", grey: "#9aa8b2", accent: "#1b6b7a",
    bgLight: "#ffffff", bgDark: "#0e1822",
    darkAxis: "#5f7488", darkGrid: "#1d2c3a", darkText: "#8ba0b0"
  };
  SIMS.colors = C;
  SIMS.isDark = function () { return document.body.classList.contains("dark"); };

  /* ── 控件 ──────────────────────────────────────────── */
  /* makeControls(body, [
     {k:"tau", label:"脉宽 τ", min:.05, max:2, step:.01, val:.5, fmt:v=>v.toFixed(2)},
     {k:"mode", label:"波形", sel:[["sine","正弦"],["rect","矩形"]], val:"sine"},
     {btn:"播放", primary:true, onClick:fn},
     {btn:"重置", onClick:fn}
   ]) → { tau:HTMLInputElement, mode:HTMLSelectElement, root, get(k), num(k) } */
  function makeControls(body, defs) {
    var root = document.createElement("div");
    root.className = "sim-controls";
    body.appendChild(root);
    var refs = {};
    defs.forEach(function (d) {
      if (d.btn) {
        var b = document.createElement("button");
        b.textContent = d.btn;
        if (d.primary) b.className = "primary";
        b.addEventListener("click", d.onClick);
        root.appendChild(b);
        return;
      }
      var lab = document.createElement("label");
      if (d.sel) {
        var sel = document.createElement("select");
        d.sel.forEach(function (op) {
          var o = document.createElement("option");
          o.value = op[0]; o.textContent = op[1];
          sel.appendChild(o);
        });
        sel.value = d.val;
        lab.appendChild(document.createTextNode(d.label + " "));
        lab.appendChild(sel);
        root.appendChild(lab);
        refs[d.k] = sel;
      } else {
        var inp = document.createElement("input");
        inp.type = "range";
        inp.min = d.min; inp.max = d.max; inp.step = d.step; inp.value = d.val;
        var val = document.createElement("span");
        val.className = "val";
        var refresh = function () { val.textContent = d.fmt ? d.fmt(parseFloat(inp.value)) : inp.value; };
        refresh();
        lab.appendChild(document.createTextNode(d.label + " "));
        lab.appendChild(inp);
        lab.appendChild(val);
        root.appendChild(lab);
        refs[d.k] = inp;
        inp._refreshVal = refresh;
        inp.addEventListener("input", function () { refresh(); if (d.onChange) d.onChange(parseFloat(inp.value)); });
      }
    });
    refs.root = root;
    refs.get = function (k) { return refs[k]; };
    refs.num = function (k) { return parseFloat(refs[k].value); };
    return refs;
  }

  function readout(body, html) {
    var div = document.createElement("div");
    div.className = "sim-readout";
    div.innerHTML = html || "";
    body.appendChild(div);
    return div;
  }
  function canvasRow(body, titles, n) {
    var row = document.createElement("div");
    row.className = "sim-canvas-row";
    body.appendChild(row);
    var canvases = [];
    for (var i = 0; i < n; i++) {
      var box = document.createElement("div");
      box.className = "sim-canvas-box";
      if (titles && titles[i]) {
        var t = document.createElement("div");
        t.className = "cv-title";
        t.innerHTML = titles[i];
        box.appendChild(t);
      }
      var cv = document.createElement("canvas");
      cv.height = 0; /* 尺寸在 Plot 里按容器宽度设定 */
      box.appendChild(cv);
      row.appendChild(box);
      canvases.push(cv);
    }
    return canvases;
  }

  /* ── 绘图类 ────────────────────────────────────────── */
  function Plot(canvas, opts) {
    opts = opts || {};
    this.cv = canvas;
    this.ctx = canvas.getContext("2d");
    this.padL = opts.padL !== undefined ? opts.padL : 44;
    this.padR = opts.padR !== undefined ? opts.padR : 14;
    this.padT = opts.padT !== undefined ? opts.padT : 10;
    this.padB = opts.padB !== undefined ? opts.padB : 26;
    this.x0 = opts.x0 !== undefined ? opts.x0 : -1;
    this.x1 = opts.x1 !== undefined ? opts.x1 : 1;
    this.y0 = opts.y0 !== undefined ? opts.y0 : -1;
    this.y1 = opts.y1 !== undefined ? opts.y1 : 1;
    this.xLabel = opts.xLabel || "t";
    this.yLabel = opts.yLabel || "";
    this.intX = opts.intX || false;  /* x 轴按整数刻度 */
    this.resize();
  }
  Plot.prototype.resize = function () {
    var w = this.cv.parentElement.clientWidth || 320;
    var h = Math.max(150, Math.min(240, Math.round(w * 0.52)));
    var dpr = window.devicePixelRatio || 1;
    this.cv.width = Math.round(w * dpr);
    this.cv.height = Math.round(h * dpr);
    this.cv.style.height = h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
  };
  Plot.prototype.setX = function (a, b) { this.x0 = a; this.x1 = b; };
  Plot.prototype.setY = function (a, b) { this.y0 = a; this.y1 = b; };
  Plot.prototype.px = function (x) { return this.padL + (x - this.x0) / (this.x1 - this.x0) * (this.W - this.padL - this.padR); };
  Plot.prototype.py = function (y) {
    var mid = (this.y0 + this.y1) / 2, half = Math.max(1e-9, (this.y1 - this.y0) / 2);
    var clamped = Math.max(mid - half * 40, Math.min(mid + half * 40, y)); /* 限幅防溢出 */
    return this.H - this.padB - (clamped - this.y0) / (this.y1 - this.y0) * (this.H - this.padT - this.padB);
  };
  Plot.prototype.clear = function () {
    var dark = SIMS.isDark();
    this.ctx.fillStyle = dark ? C.bgDark : C.bgLight;
    this.ctx.fillRect(0, 0, this.W, this.H);
    this.col = {
      axis: dark ? C.darkAxis : C.axis,
      grid: dark ? C.darkGrid : C.grid,
      text: dark ? C.darkText : C.text
    };
  };
  Plot.prototype.grid = function (nx, ny) {
    var ctx = this.ctx, i;
    ctx.strokeStyle = this.col.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    for (i = 1; i < nx; i++) {
      var x = this.padL + i * (this.W - this.padL - this.padR) / nx;
      ctx.moveTo(x, this.padT); ctx.lineTo(x, this.H - this.padB);
    }
    for (i = 1; i < ny; i++) {
      var y = this.padT + i * (this.H - this.padT - this.padB) / ny;
      ctx.moveTo(this.padL, y); ctx.lineTo(this.W - this.padR, y);
    }
    ctx.stroke();
  };
  Plot.prototype.axes = function () {
    var ctx = this.ctx;
    ctx.strokeStyle = this.col.axis; ctx.lineWidth = 1.2;
    ctx.beginPath();
    var yZero = Math.max(this.padT, Math.min(this.H - this.padB, this.py(0)));
    var xZero = Math.max(this.padL, Math.min(this.W - this.padR, this.px(0)));
    ctx.moveTo(this.padL, yZero); ctx.lineTo(this.W - this.padR, yZero);
    ctx.moveTo(xZero, this.padT); ctx.lineTo(xZero, this.H - this.padB);
    ctx.stroke();
    /* 刻度与标签 */
    ctx.fillStyle = this.col.text;
    ctx.font = "10.5px Consolas, monospace";
    var i, step;
    if (this.intX) {
      step = Math.max(1, Math.ceil((this.x1 - this.x0) / 12));
      for (i = Math.ceil(this.x0 / step) * step; i <= this.x1; i += step) {
        var x = this.px(i);
        ctx.beginPath(); ctx.moveTo(x, yZero - 3); ctx.lineTo(x, yZero + 3);
        ctx.strokeStyle = this.col.axis; ctx.stroke();
        if (i !== 0) ctx.fillText(String(i), x - 4, yZero + 14);
      }
    } else {
      /* 1-2-5 优良刻度，避免取整后标签重复 */
      var span = this.x1 - this.x0;
      var rawStep = span / 6;
      var mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
      var nrm = rawStep / mag;
      var nice = nrm < 1.5 ? 1 : nrm < 3.5 ? 2 : nrm < 7.5 ? 5 : 10;
      step = nice * mag;
      var dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
      var v0 = Math.ceil(this.x0 / step - 1e-9) * step;
      for (var v = v0; v <= this.x1 + 1e-9; v += step) {
        ctx.fillText(v.toFixed(dec), this.px(v) - 7, yZero + 14);
      }
    }
    if (this.xLabel) {
      ctx.fillText(this.xLabel, this.W - this.padR - ctx.measureText(this.xLabel).width - 2, yZero - 5);
    }
    if (this.yLabel) {
      ctx.save(); ctx.translate(10, this.padT + 10); ctx.fillText(this.yLabel, 0, 0); ctx.restore();
    }
  };
  /* 按函数绘制曲线: fn(x) → y；xRange=[a,b]，步长自动 */
  Plot.prototype.fn = function (fn, color, width, dash) {
    var ctx = this.ctx, n = Math.round((this.W - this.padL - this.padR) * 1.5);
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width || 2;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    var started = false;
    for (var i = 0; i <= n; i++) {
      var x = this.x0 + i * (this.x1 - this.x0) / n;
      var y = fn(x);
      if (!isFinite(y)) { started = false; continue; }
      var px = this.px(x), py = this.py(y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
  };
  /* 填充 fn 与 x 轴之间区域 (x from a to b) */
  Plot.prototype.area = function (fn, a, b, color, alpha) {
    var ctx = this.ctx, n = Math.round((this.W - this.padL - this.padR));
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 0.28 : alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(this.px(a), this.py(0));
    for (var i = 0; i <= n; i++) {
      var x = a + i * (b - a) / n;
      var y = fn(x);
      if (isFinite(y)) ctx.lineTo(this.px(x), this.py(y));
    }
    ctx.lineTo(this.px(b), this.py(0));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  Plot.prototype.line = function (x0, y0, x1, y1, color, width, dash) {
    var ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = width || 1.2;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(this.px(x0), this.py(y0));
    ctx.lineTo(this.px(x1), this.py(y1));
    ctx.stroke();
    ctx.restore();
  };
  Plot.prototype.dot = function (x, y, color, r) {
    var ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.px(x), this.py(y), r || 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  /* 离散序列茎状图 pts=[{x,y}] */
  Plot.prototype.stems = function (pts, color, r) {
    var ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1.6;
    pts.forEach(function (p) {
      var x = this.px(p.x), y0 = this.py(0), y = this.py(p.y);
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r || 3, 0, Math.PI * 2); ctx.fill();
    }, this);
    ctx.restore();
  };
  Plot.prototype.text = function (s, x, y, color, font) {
    var ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = color || this.col.text;
    ctx.font = font || "12px Microsoft YaHei, sans-serif";
    ctx.fillText(s, this.px(x), this.py(y));
    ctx.restore();
  };
  Plot.prototype.pixels = function (x, y) { return { x: this.px(x), y: this.py(y) }; };
  Plot.prototype.fromPixels = function (px, py) {
    return {
      x: this.x0 + (px - this.padL) / (this.W - this.padL - this.padR) * (this.x1 - this.x0),
      y: this.y0 + (this.H - this.padB - py) / (this.H - this.padT - this.padB) * (this.y1 - this.y0)
    };
  };

  /* ── 导出 ──────────────────────────────────────────── */
  SIMS.makeControls = makeControls;
  SIMS.readout = readout;
  SIMS.canvasRow = canvasRow;
  SIMS.Plot = Plot;
  SIMS.onTheme = function () { SIMS._redraws.forEach(function (fn) { try { fn(); } catch (e) {} }); };
})();
