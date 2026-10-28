/* =====================================================================
   charts.js — กราฟทุกแบบ (Chart.js 4.4.1 จาก jsDelivr) + ปฏิทินความถี่ + sparkline SVG
   สีอ่านจากตัวแปร CSS → โหมดมืด/สว่างถูกต้องเสมอ
   ===================================================================== */
'use strict';
var CH = {
  list: [],
  ready: null,
  load: function () {
    if (window.Chart) return Promise.resolve();
    if (!this.ready) this.ready = loadScript(LIB.chart);
    return this.ready;
  },
  destroyAll: function () { this.list.forEach(function (c) { try { c.destroy(); } catch (e) { } }); this.list = []; },
  theme: function () {
    var C = window.Chart; if (!C) return;
    C.defaults.font.family = cssv('--font'); C.defaults.font.size = 12;
    C.defaults.color = cssv('--muted'); C.defaults.borderColor = cssv('--line');
    C.defaults.plugins.legend.labels.boxWidth = 10; C.defaults.plugins.legend.labels.boxHeight = 10; C.defaults.plugins.legend.labels.usePointStyle = true;
    C.defaults.plugins.tooltip.backgroundColor = cssv('--ink'); C.defaults.plugins.tooltip.titleColor = cssv('--bg'); C.defaults.plugins.tooltip.bodyColor = cssv('--bg');
    C.defaults.plugins.tooltip.padding = 10; C.defaults.plugins.tooltip.cornerRadius = 10; C.defaults.plugins.tooltip.boxPadding = 4;
    C.defaults.maintainAspectRatio = false; C.defaults.animation.duration = REDUCED ? 0 : 700;
  },
  make: function (el, cfg) {
    if (!el || !window.Chart) return null;
    var c = new Chart(el.getContext('2d'), cfg); this.list.push(c); return c;
  },
  pal: function () { return ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7', '--c8'].map(cssv); },
  alpha: function (hex, a) { var h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map(function (x) { return x + x; }).join(''); var n = parseInt(h, 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; },
  money: function (ctx) { var v = ctx.parsed && ctx.parsed.y !== undefined && ctx.chart.config.type !== 'doughnut' && ctx.chart.config.type !== 'pie' && ctx.chart.config.type !== 'polarArea' ? (ctx.chart.options.indexAxis === 'y' ? ctx.parsed.x : ctx.parsed.y) : ctx.parsed; if (ctx.chart.config.type === 'polarArea') v = ctx.parsed.r; return ' ' + (ctx.dataset.label ? ctx.dataset.label + ': ' : '') + m(Array.isArray(ctx.raw) ? ctx.raw[1] - ctx.raw[0] : v) + (ctx.chart.$unit || ' บาท'); },
  yMoney: { ticks: { callback: function (v) { return mk(v); } }, grid: { color: function () { return cssv('--line-2'); } }, border: { display: false } },
  xPlain: { grid: { display: false }, border: { display: false } }
};
var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** sparkline SVG (ไม่ต้องรอ Chart.js) */
function sparkSvg(vals, color, h) {
  h = h || 28; var w = 120; if (!vals.length) return '';
  var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), rg = mx - mn || 1;
  var pts = vals.map(function (v, i) { return [i / Math.max(1, vals.length - 1) * w, h - 3 - (v - mn) / rg * (h - 6)]; });
  return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><polyline fill="none" stroke="' + color + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/></svg>';
}

/** ปฏิทินความถี่การใช้จ่าย (แบบ GitHub) ของปี */
function heatmapHtml(year, basis) {
  var r = MODEL.range(year, basis), byDay = {};
  MODEL.rows().forEach(function (x) { if (x.kind === 'out' && x.amount > 0 && x.date >= r[0] && x.date <= r[1]) byDay[x.date] = (byDay[x.date] || 0) + x.amount; });
  var vals = Object.keys(byDay).map(function (k) { return byDay[k]; }).sort(function (a, b) { return a - b; });
  var q = function (p) { return vals.length ? vals[Math.min(vals.length - 1, Math.floor(p * vals.length))] : 0; };
  var cuts = [q(.2), q(.4), q(.6), q(.8)];
  var lvl = function (v) { if (!v) return 0; for (var i = 0; i < 4; i++) if (v <= cuts[i]) return i + 1; return 5; };
  var start = pd(r[0]); start.setDate(start.getDate() - start.getDay());
  var cols = [], d = new Date(start), end = pd(r[1]);
  while (d <= end) { var col = []; for (var i = 0; i < 7; i++) { col.push(ds(d)); d.setDate(d.getDate() + 1); } cols.push(col); }
  var h = '<div class="heat" style="grid-template-columns:auto repeat(' + cols.length + ',minmax(9px,1fr))" role="img" aria-label="ปฏิทินการใช้จ่ายรายวัน ปี ' + year + '">';
  ['อา', '', 'อ', '', 'พฤ', '', 'ส'].forEach(function (lb, row) {
    h += '<span class="dl" style="grid-row:' + (row + 1) + '">' + lb + '</span>';
    cols.forEach(function (c, ci) {
      var day = c[row], v = byDay[day] || 0, out = day < r[0] || day > r[1];
      h += '<i style="grid-row:' + (row + 1) + ';grid-column:' + (ci + 2) + '" class="' + (out ? 'x' : '') + '" data-l="' + lvl(v) + '" data-tip="' + (out ? '' : esc(thDate(day, true) + ' · ' + (v ? 'จ่าย ' + m(v) + ' บาท' : 'ไม่มีรายจ่าย'))) + '"></i>';
    });
  });
  h += '</div><div class="heat-legend">น้อย ' + [0, 1, 2, 3, 4, 5].map(function (l) { return '<i style="background:var(--heat-' + l + ')"></i>'; }).join('') + ' มาก</div>';
  return h;
}
/** tooltip ทั่วไปสำหรับ [data-tip] */
(function () {
  var tip;
  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest && e.target.closest('[data-tip]');
    if (!t || !t.dataset.tip) { if (tip) tip.hidden = true; return; }
    if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.appendChild(tip); }
    tip.textContent = t.dataset.tip; tip.hidden = false;
    var b = t.getBoundingClientRect(); tip.style.left = Math.min(window.innerWidth - 270, Math.max(8, b.left - 20)) + 'px'; tip.style.top = (b.top - 36) + 'px';
  });
})();
