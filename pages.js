/* =====================================================================
   pages.js — แดชบอร์ด · รายการเงิน · ฟอร์มบันทึก · รายละเอียดรายการ
   ===================================================================== */
'use strict';
var UI = { basis: store('basis') || 'CY', year: null, dashTab: 'flow', lf: { q: '', period: 'year', type: '', acc: '', cat: '', proj: '', who: '', from: '', to: '' }, lfShow: 100 };
function yearCtl(id) {
  var ys = MODEL.years(UI.basis); if (!UI.year || ys.indexOf(UI.year) < 0) UI.year = MODEL.curYear(UI.basis);
  return '<div class="seg" role="group" aria-label="ฐานปี"><button data-basis="CY" aria-pressed="' + (UI.basis === 'CY') + '">ปีปฏิทิน</button><button data-basis="FY" aria-pressed="' + (UI.basis === 'FY') + '">ปีงบประมาณ</button></div>' +
    '<select data-year aria-label="เลือกปี" style="width:auto">' + ys.slice().reverse().map(function (y) { return '<option value="' + y + '"' + (y === UI.year ? ' selected' : '') + '>' + (UI.basis === 'FY' ? 'ปีงบ ' : 'ปี ') + y + '</option>'; }).join('') + '</select>';
}
function bindYearCtl(root, rerender) {
  $$('[data-basis]', root).forEach(function (b) { b.onclick = function () { var cy = UI.year; UI.basis = b.dataset.basis; store('basis', UI.basis); UI.year = cy; rerender(); }; });
  var s = $('[data-year]', root); if (s) s.onchange = function () { UI.year = +s.value; rerender(); };
}
function yearLabel() { return (UI.basis === 'FY' ? 'ปีงบประมาณ ' : 'ปี ') + UI.year; }
function txIcon(t) { var ty = TYPES[t.type] || TYPES.IN; return '<span class="tx-ic ' + ty.cls + '">' + IC[ty.ic] + '</span>'; }
function txSigned(t, acc) {
  if (t.type === 'TRANSFER' && !acc) return { v: t.amount, cls: 'move', s: '⇄ ' + m(t.amount) };
  var v = acc ? MODEL.effect(t, acc) : (TYPES[t.type].sign * t.amount);
  return { v: v, cls: v >= 0 ? 'in' : 'out', s: (v >= 0 ? '+' : '−') + m(Math.abs(v)) };
}
function txSub(t) {
  var bits = [];
  if (t.type === 'TRANSFER') bits.push(MODEL.accName(t.account, true) + ' → ' + MODEL.accName(t.toAccount, true));
  else bits.push(MODEL.accName(t.account, true));
  if (t.category) bits.push(MODEL.catName(t.category));
  var p = MODEL.payeeOf(t); if (p) bits.push(p);
  if (t.project) bits.push('📁 ' + MODEL.projName(t.project));
  if (t.files && t.files.length) bits.push('📎' + t.files.length);
  return bits.join(' · ');
}

/* =====================================================================
   แดชบอร์ด
   ===================================================================== */
PAGES.dash = { title: 'แดชบอร์ด', render: function (el) {
  var D = S.D, M = MODEL, bal = M.balances(), y = (UI.year = UI.year || M.curYear(UI.basis)), r = M.range(y, UI.basis);
  var to = M.today() < r[1] ? M.today() : r[1];
  var inc = M.sumRows(r[0], r[1], 'in'), exp = M.sumRows(r[0], r[1], 'out');
  var cm = M.today().slice(0, 7), cmS = M.sumRows(cm + '-01', cm + '-31', 'in'), cmE = M.sumRows(cm + '-01', cm + '-31', 'out');
  var loansA = M.openLoans('ADV'), loansB = M.openLoans('BOR');
  var lA = r2(sum(loansA, function (s) { return s.outstanding; })), lB = r2(sum(loansB, function (s) { return s.outstanding; }));
  var dsum = M.duesSummary(cm);
  var bds = M.upcomingBirthdays(30);
  var bs = M.balanceSeries(), last12 = bs.filter(function (p) { return p.date >= addDays(M.today(), -365); });
  var hello = D.me.name ? shortName(D.me.user, D.me.name) : '';
  el.innerHTML =
    pageHead('แดชบอร์ด · อัปเดต ' + thDate(M.today(), true, true), 'สวัสดี ' + hello, 'ภาพรวมเงินฝ่ายทรัพยากรบุคคล · ' + yearLabel(), yearCtl()) +
    '<section class="hero rise d1" aria-label="ยอดเงินคงเหลือ"><div><div class="lbl">ยอดเงินคงเหลือทั้งหมด <span class="chip">ณ ' + thDate(M.today()) + '</span></div>' +
    '<div class="big tnum">' + m2(bal._total) + '<small>บาท</small></div><div class="accs">' +
    M.activeAccounts().map(function (a) { return '<div class="acc"><div class="n"><i style="background:' + esc(a.color) + '"></i>' + esc(a.name) + '</div><div class="v">' + m2(bal[a.id] || 0) + '</div></div>'; }).join('') + '</div>' +
    '<div class="mini-kv"><div><span>เดือนนี้ รับ</span><b>' + (cmS ? '+' : '') + m(cmS) + '</b></div><div><span>เดือนนี้ จ่าย</span><b>' + (cmE ? '−' : '') + m(cmE) + '</b></div>' + (lA ? '<div><span>รอรับคืน</span><b>' + m(lA) + '</b></div>' : '') + '</div></div>' +
    '<div class="spark"><canvas id="cHero" aria-label="กราฟยอดคงเหลือ 12 เดือน"></canvas></div></section>' +
    '<div class="stats rise d2">' +
    statCard('in', IC.in, 'รายรับ ' + yearLabel(), '+' + m(inc), 'ไม่รวมเงินยืม/โอน', 'ledger', { type: 'IN' }) +
    statCard('out', IC.out, 'รายจ่ายสุทธิ ' + yearLabel(), '−' + m(exp), 'หักเงินคืน/เงินเหลือแล้ว', 'ledger', { type: 'OUT' }) +
    statCard(inc - exp >= 0 ? 'in' : 'out', IC.trend, 'สุทธิ ' + yearLabel(), (inc - exp >= 0 ? '+' : '−') + m(Math.abs(inc - exp)), inc - exp >= 0 ? 'รับมากกว่าจ่าย' : 'จ่ายมากกว่ารับ') +
    statCard('loan', IC.loan, 'เงินยืมรอรับคืน', m(lA), loansA.length + ' รายการ' + (lB ? ' · ฝ่ายยืมค้างคืน ' + m(lB) : ''), 'loans') +
    statCard('', IC.coins, 'เงินฝ่าย ' + thMonth(cm, true), m(dsum.collected) + '<small>/ ' + m(dsum.expected) + '</small>', 'จ่ายแล้ว ' + dsum.paid + ' · ค้าง ' + dsum.due + ' คน', 'dues') +
    statCard('', IC.cake, 'วันเกิดใน 30 วัน', bds.length + '<small>คน</small>', bds.slice(0, 3).map(function (b) { return 'คุณ' + b.m.fname + ' ' + ddmm(b.date); }).join(' · ') || '—', 'welfare') +
    '</div>' +
    '<div class="card rise d3"><div class="card-h"><h3><span class="ic">' + IC.dash + '</span>กระแสเงิน</h3><div class="seg" role="tablist">' +
    [['flow', 'รับ–จ่ายรายเดือน'], ['bal', 'ยอดคงเหลือสะสม'], ['yoy', 'เทียบปีต่อปี'], ['wf', 'ต้นปี → ปลายปี']].map(function (x) { return '<button data-dt="' + x[0] + '" aria-pressed="' + (UI.dashTab === x[0]) + '">' + x[1] + '</button>'; }).join('') +
    '</div></div><div class="card-b"><div class="chart tall"><canvas id="cMain"></canvas></div><p class="xs muted" id="cMainNote" style="margin-top:6px"></p></div></div>' +
    '<div class="grid-2"><div class="card rise d3"><div class="card-h"><h3><span class="ic">' + IC.out + '</span>รายจ่ายตามหมวด</h3><span class="hint">' + yearLabel() + '</span></div><div class="card-b"><div class="chart"><canvas id="cCatOut"></canvas></div><div id="catOutList"></div></div></div>' +
    '<div class="card rise d4"><div class="card-h"><h3><span class="ic">' + IC.in + '</span>รายรับตามแหล่งที่มา</h3><span class="hint">' + yearLabel() + '</span></div><div class="card-b"><div class="chart"><canvas id="cCatIn"></canvas></div><div id="catInList"></div></div></div></div>' +
    '<div class="grid-2"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.flag + '</span>โครงการ/กิจกรรมที่ใช้เงินมากสุด</h3><span class="hint">' + yearLabel() + '</span></div><div class="card-b"><div class="chart"><canvas id="cProj"></canvas></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.trend + '</span>หมวดรายจ่าย: ปีนี้ vs ปีก่อน</h3><span class="hint">กราฟใยแมงมุม</span></div><div class="card-b"><div class="chart"><canvas id="cRadar"></canvas></div></div></div></div>' +
    '<div class="grid-2"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.cal + '</span>รายจ่ายแต่ละหมวด รายเดือน</h3><span class="hint">แท่งซ้อน</span></div><div class="card-b"><div class="chart"><canvas id="cStack"></canvas></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.coins + '</span>จำนวนครั้งที่จ่ายต่อหมวด</h3><span class="hint">Polar area</span></div><div class="card-b"><div class="chart"><canvas id="cPolar"></canvas></div></div></div></div>' +
    '<div class="grid-2"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.out + '</span>ขนาดรายจ่ายแต่ละครั้ง</h3><span class="hint">จุด = 1 รายการ</span></div><div class="card-b"><div class="chart"><canvas id="cScatter"></canvas></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.bank + '</span>สัดส่วนเงินแต่ละบัญชี</h3><span class="hint">ณ วันนี้</span></div><div class="card-b"><div class="chart"><canvas id="cAcc"></canvas></div></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.cal + '</span>ปฏิทินการใช้จ่าย ' + yearLabel() + '</h3><span class="hint">สีเข้ม = จ่ายมาก · ชี้เพื่อดูยอด</span></div><div class="card-b">' + heatmapHtml(y, UI.basis) + '</div></div>' +
    '<div class="grid-2"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.list + '</span>รายการล่าสุด</h3><button class="btn btn-sm btn-ghost" data-go2="ledger">ดูทั้งหมด ' + IC.next + '</button></div><div class="txlist" id="recent"></div></div>' +
    '<div class="col"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.cake + '</span>วันเกิดที่กำลังจะถึง</h3><button class="btn btn-sm btn-ghost" data-go2="welfare">สวัสดิการ ' + IC.next + '</button></div><div class="card-b"><div class="bdlist">' + (bds.slice(0, 4).map(bdRow).join('') || '<div class="empty">ไม่มีวันเกิดใน 30 วันข้างหน้า</div>') + '</div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.loan + '</span>เงินยืมรอรับคืน</h3><button class="btn btn-sm btn-ghost" data-go2="loans">ทั้งหมด ' + IC.next + '</button></div><div class="txlist">' +
    (loansA.concat(loansB).slice(0, 5).map(function (s) { return '<div class="tx" data-loan="' + s.loan.id + '"><span class="tx-ic loan">' + IC.loan + '</span><div class="t"><b>' + esc(s.loan.title) + '</b><span>' + esc(s.loan.direction === 'BOR' ? 'ฝ่ายยืมจาก ' : 'ผู้ยืม ') + esc(MODEL.memName(s.loan.party) || s.loan.party) + ' · ' + daysBetween(s.date, M.today()) + ' วัน</span></div><div class="r"><span class="amt loan">' + m(s.outstanding) + '</span></div></div>'; }).join('') || '<div class="empty">ไม่มีเงินยืมค้าง 🎉</div>') + '</div></div></div></div>';

  bindYearCtl(el, function () { render(); });
  $$('[data-go2]', el).forEach(function (b) { b.onclick = function () { go(b.dataset.go2); }; });
  $$('[data-stat]', el).forEach(function (b) { b.onclick = function () { var p = JSON.parse(b.dataset.p || '{}'); if (b.dataset.stat === 'ledger') { UI.lf = Object.assign({ q: '', period: 'year', type: '', acc: '', cat: '', proj: '', who: '' }, p); } go(b.dataset.stat); }; });
  $$('[data-loan]', el).forEach(function (b) { b.onclick = function () { loanDetail(b.dataset.loan); }; });
  bindBdRows(el);
  var rec = M.tx.slice().reverse().filter(function (t) { return t.type !== 'OPEN'; }).slice(0, 8);
  $('#recent').innerHTML = rec.map(txRow).join('');
  $$('#recent .tx').forEach(function (r) { r.onclick = function () { txDetail(r.dataset.id); }; });
  $$('[data-dt]', el).forEach(function (b) { b.onclick = function () { UI.dashTab = b.dataset.dt; $$('[data-dt]', el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); drawMain(); }; });

  var catOut = M.byCat(r[0], r[1], 'out').filter(function (x) { return x.amount > 0; }), catIn = M.byCat(r[0], r[1], 'in');
  $('#catOutList').innerHTML = catList(catOut, exp);
  $('#catInList').innerHTML = catList(catIn, inc);

  CH.load().then(function () {
    if (S.page !== 'dash') return;
    CH.theme();
    var brand = cssv('--brand'), inC = cssv('--in'), outC = cssv('--out'), pal = CH.pal();
    // hero sparkline (สีขาวบนพื้นแดง)
    CH.make($('#cHero'), { type: 'line', data: { labels: last12.map(function (p) { return thDate(p.date); }), datasets: [{ data: last12.map(function (p) { return p.total; }), borderColor: '#fff', borderWidth: 2.2, pointRadius: 0, tension: .35, fill: true, backgroundColor: 'rgba(255,255,255,.14)' }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: { display: false }, y: { display: false } }, interaction: { intersect: false, mode: 'index' } } });
    drawMain();
    CH.make($('#cCatOut'), { type: 'doughnut', data: { labels: catOut.map(function (x) { return M.catName(x.cat); }), datasets: [{ data: catOut.map(function (x) { return x.amount; }), backgroundColor: catOut.map(function (x) { return M.catColor(x.cat); }), borderColor: cssv('--surface'), borderWidth: 2 }] },
      options: { cutout: '62%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } } } });
    CH.make($('#cCatIn'), { type: 'pie', data: { labels: catIn.map(function (x) { return M.catName(x.cat); }), datasets: [{ data: catIn.map(function (x) { return x.amount; }), backgroundColor: catIn.map(function (x) { return M.catColor(x.cat); }), borderColor: cssv('--surface'), borderWidth: 2 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } } } });
    // โครงการ (แท่งแนวนอน)
    var pj = {}; M.rows().forEach(function (x) { if (x.kind === 'out' && x.project && x.date >= r[0] && x.date <= r[1]) pj[x.project] = (pj[x.project] || 0) + x.amount; });
    var pjl = Object.keys(pj).map(function (k) { return { k: k, v: r2(pj[k]) }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 8);
    if (!pjl.length) $('#cProj').parentNode.innerHTML = '<div class="empty">' + IC.flag + 'ยังไม่มีรายจ่ายที่ผูกโครงการใน' + yearLabel() + '</div>';
    else CH.make($('#cProj'), { type: 'bar', data: { labels: pjl.map(function (x) { return M.projName(x.k); }), datasets: [{ label: 'ใช้จริง', data: pjl.map(function (x) { return x.v; }), backgroundColor: CH.alpha(brand, .85), borderRadius: 6 },
      { label: 'งบที่ตั้ง', data: pjl.map(function (x) { var p = M.proj[x.k]; return p && p.budget ? p.budget : null; }), backgroundColor: CH.alpha(cssv('--muted'), .25), borderRadius: 6 }] },
      options: { indexAxis: 'y', plugins: { tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.yMoney, y: { grid: { display: false }, ticks: { autoSkip: false } } } } });
    // radar ปีนี้ vs ปีก่อน
    var prev = M.range(y - 1, UI.basis), cats = M.cats('OUT').map(function (c) { return c.id; });
    var a1 = cats.map(function (c) { return Math.max(0, M.sumRows(r[0], r[1], 'out', function (x) { return x.cat === c; })); });
    var a0 = cats.map(function (c) { return Math.max(0, M.sumRows(prev[0], prev[1], 'out', function (x) { return x.cat === c; })); });
    var keep = cats.map(function (c, i) { return a1[i] || a0[i]; });
    CH.make($('#cRadar'), { type: 'radar', data: { labels: cats.filter(function (c, i) { return keep[i]; }).map(function (c) { return M.catName(c).split('/')[0]; }),
      datasets: [{ label: yearLabel(), data: a1.filter(function (v, i) { return keep[i]; }), borderColor: brand, backgroundColor: CH.alpha(brand, .18), pointRadius: 2 },
        { label: (UI.basis === 'FY' ? 'ปีงบ ' : 'ปี ') + (y - 1), data: a0.filter(function (v, i) { return keep[i]; }), borderColor: cssv('--c1'), backgroundColor: CH.alpha(cssv('--c1'), .12), pointRadius: 2 }] },
      options: { plugins: { tooltip: { callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + m(c.parsed.r) + ' บาท'; } } } }, scales: { r: { ticks: { display: false }, grid: { color: cssv('--line') }, angleLines: { color: cssv('--line') }, pointLabels: { font: { size: 11 } } } } } });
    // แท่งซ้อนรายเดือน
    var ms = M.monthsOf(y, UI.basis), top = catOut.slice(0, 7).map(function (x) { return x.cat; });
    var dsets = top.map(function (c) { return { label: M.catName(c), data: ms.map(function (ym) { return Math.max(0, M.sumRows(ym + '-01', ym + '-31', 'out', function (x) { return x.cat === c; })); }), backgroundColor: M.catColor(c), borderRadius: 3, stack: 's' }; });
    var rest = ms.map(function (ym) { return Math.max(0, M.sumRows(ym + '-01', ym + '-31', 'out', function (x) { return top.indexOf(x.cat) < 0; })); });
    if (sum(rest)) dsets.push({ label: 'อื่น ๆ', data: rest, backgroundColor: cssv('--idle'), borderRadius: 3, stack: 's' });
    CH.make($('#cStack'), { type: 'bar', data: { labels: ms.map(function (x) { return thMonth(x, true).split(' ')[0]; }), datasets: dsets },
      options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: Object.assign({ stacked: true }, CH.xPlain), y: Object.assign({ stacked: true }, CH.yMoney) } } });
    // polar: จำนวนครั้ง
    var cnt = {}; M.rows().forEach(function (x) { if (x.kind === 'out' && x.t && x.t.type === 'OUT' && x.date >= r[0] && x.date <= r[1]) cnt[x.cat] = (cnt[x.cat] || 0) + 1; });
    var ck = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    var pc = CH.make($('#cPolar'), { type: 'polarArea', data: { labels: ck.map(function (c) { return M.catName(c); }), datasets: [{ data: ck.map(function (c) { return cnt[c]; }), backgroundColor: ck.map(function (c) { return CH.alpha(M.catColor(c), .7); }), borderColor: cssv('--surface') }] },
      options: { plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: function (c) { return ' ' + c.parsed.r + ' ครั้ง'; } } } }, scales: { r: { ticks: { display: false }, grid: { color: cssv('--line') } } } } });
    // scatter รายจ่ายแต่ละครั้ง
    var pts = M.rows().filter(function (x) { return x.kind === 'out' && x.t && x.t.type === 'OUT' && x.date >= r[0] && x.date <= r[1]; });
    CH.make($('#cScatter'), { type: 'bubble', data: { datasets: [{ label: 'รายจ่าย', data: pts.map(function (x) { return { x: pd(x.date).getTime(), y: x.amount, r: Math.max(4, Math.min(18, Math.sqrt(x.amount) / 6)), t: x.t }; }), backgroundColor: pts.map(function (x) { return CH.alpha(M.catColor(x.cat), .6); }), borderColor: pts.map(function (x) { return M.catColor(x.cat); }) }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { var t = c.raw.t; return ' ' + thDate(t.date) + ' · ' + t.desc.slice(0, 40) + ' · ' + m(t.amount) + ' บาท'; } } } },
        scales: { x: { type: 'linear', ticks: { callback: function (v) { var d = new Date(v); return TH_M[d.getMonth()]; }, maxTicksLimit: 12 }, grid: { display: false } }, y: CH.yMoney },
        onClick: function (e, els) { if (els[0]) txDetail(pts[els[0].index].t.id); } } });
    // บัญชี
    var acs = M.activeAccounts().filter(function (a) { return (bal[a.id] || 0) > 0; });
    CH.make($('#cAcc'), { type: 'doughnut', data: { labels: acs.map(function (a) { return a.name; }), datasets: [{ data: acs.map(function (a) { return bal[a.id]; }), backgroundColor: acs.map(function (a) { return a.color; }), borderColor: cssv('--surface'), borderWidth: 3 }] },
      options: { cutout: '70%', rotation: -90, circumference: 180, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } } } });
  }).catch(function (e) { $$('.chart', el).forEach(function (c) { c.innerHTML = '<div class="empty">' + IC.warn + esc(e.message) + '</div>'; }); });

  function drawMain() {
    var cv = $('#cMain'); if (!cv || !window.Chart) return;
    CH.list = CH.list.filter(function (c) { if (c.canvas === cv) { c.destroy(); return false; } return true; });
    var inC = cssv('--in'), outC = cssv('--out'), note = $('#cMainNote');
    if (UI.dashTab === 'flow') {
      var bm = M.byMonth(y, UI.basis);
      note.textContent = 'แท่งเขียว = รายรับ · แท่งแดง = รายจ่ายสุทธิ · เส้น = สุทธิสะสมในปี (ไม่นับเงินยืมและการโอน)';
      var cum = 0;
      CH.make(cv, { type: 'bar', data: { labels: bm.map(function (x) { return thMonth(x.ym, true); }), datasets: [
        { label: 'รายรับ', data: bm.map(function (x) { return x.in; }), backgroundColor: CH.alpha(inC, .85), borderRadius: 6, order: 2 },
        { label: 'รายจ่าย', data: bm.map(function (x) { return x.out; }), backgroundColor: CH.alpha(outC, .85), borderRadius: 6, order: 2 },
        { label: 'สุทธิสะสม', type: 'line', data: bm.map(function (x) { cum += x.net; return x.ym <= M.today().slice(0, 7) ? r2(cum) : null; }), borderColor: cssv('--ink-2'), backgroundColor: cssv('--ink-2'), tension: .3, pointRadius: 3, order: 1 }] },
        options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.xPlain, y: CH.yMoney }, interaction: { mode: 'index', intersect: false } } });
    } else if (UI.dashTab === 'bal') {
      var pts = M.balanceSeries();
      note.textContent = 'ยอดคงเหลือแต่ละบัญชีซ้อนกัน (ตั้งแต่เริ่มบันทึก) · เส้นบน = ยอดรวม';
      CH.make(cv, { type: 'line', data: { labels: pts.map(function (p) { return thDate(p.date); }), datasets: M.activeAccounts().map(function (a) { return { label: a.name, data: pts.map(function (p) { return p.acc[a.id]; }), borderColor: a.color, backgroundColor: CH.alpha(a.color, .25), fill: true, pointRadius: 0, tension: .2, stepped: false }; }) },
        options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: { stacked: true, ticks: { maxTicksLimit: 10 }, grid: { display: false } }, y: Object.assign({ stacked: true }, CH.yMoney) }, interaction: { mode: 'index', intersect: false } } });
    } else if (UI.dashTab === 'yoy') {
      var ys = M.years(UI.basis).slice(-4), pal = CH.pal();
      note.textContent = 'รายจ่ายสุทธิสะสมรายเดือน แต่ละปีเทียบกัน — ใช้ดูว่าปีนี้ใช้เร็ว/ช้ากว่าปีก่อน';
      CH.make(cv, { type: 'line', data: { labels: M.monthsOf(y, UI.basis).map(function (x) { return TH_M[+x.slice(5) - 1]; }), datasets: ys.map(function (yy, i) {
        var c = 0, bm = M.byMonth(yy, UI.basis); return { label: (UI.basis === 'FY' ? 'ปีงบ ' : 'ปี ') + yy, data: bm.map(function (x) { c += x.out; return x.ym <= M.today().slice(0, 7) ? r2(c) : null; }), borderColor: yy === y ? cssv('--brand') : pal[i % 8], backgroundColor: 'transparent', borderWidth: yy === y ? 3 : 1.6, pointRadius: yy === y ? 3 : 0, tension: .3 }; }) },
        options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.xPlain, y: CH.yMoney }, interaction: { mode: 'index', intersect: false } } });
    } else {
      var open = M.balances(addDays(r[0], -1))._total, close = M.balances(to)._total;
      var ci = M.byCat(r[0], r[1], 'in'), co = M.byCat(r[0], r[1], 'out').filter(function (x) { return x.amount > 0; }).slice(0, 7);
      var restOut = r2(M.sumRows(r[0], r[1], 'out') - sum(co, function (x) { return x.amount; }));
      var labels = ['ยอดต้นปี'], data = [], colors = [], run = open;
      data.push([0, open]); colors.push(cssv('--move'));
      var inTot = r2(sum(ci, function (x) { return x.amount; }));
      labels.push('รายรับรวม'); data.push([run, run + inTot]); colors.push(inC); run += inTot;
      co.forEach(function (x) { labels.push(M.catName(x.cat).split('/')[0]); data.push([run - x.amount, run]); colors.push(outC); run -= x.amount; });
      if (Math.abs(restOut) > .5) { labels.push('จ่ายอื่น ๆ'); data.push([run - restOut, run]); colors.push(CH.alpha(outC, .6)); run -= restOut; }
      var other = r2(close - run); if (Math.abs(other) > .5) { labels.push('เงินยืม/คืน'); data.push([run, run + other].sort(function (a, b) { return a - b; })); colors.push(cssv('--loan')); run += other; }
      labels.push(M.today() < r[1] ? 'ยอดวันนี้' : 'ยอดปลายปี'); data.push([0, close]); colors.push(cssv('--move'));
      note.textContent = 'น้ำตก: ยอดต้น' + yearLabel() + ' ' + m(open) + ' → ' + m(close) + ' บาท · เขียว = เงินเข้า · แดง = จ่ายตามหมวด';
      CH.make(cv, { type: 'bar', data: { labels: labels, datasets: [{ label: 'จำนวน', data: data, backgroundColor: colors, borderRadius: 4 }] },
        options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.xPlain, y: Object.assign({ beginAtZero: false }, CH.yMoney) } } });
    }
  }
} };
function statCard(cls, ic, lb, v, d, goto, params) {
  var tag = goto ? 'button' : 'div';
  return '<' + tag + ' class="stat ' + cls + '"' + (goto ? ' data-stat="' + goto + '" data-p=\'' + esc(JSON.stringify(params || {})) + '\'' : '') + '><span class="lb">' + ic + esc(lb) + '</span><span class="v">' + v + '</span><span class="d ell">' + esc(d || '') + '</span></' + tag + '>';
}
function catList(list, total) {
  if (!list.length) return '<div class="empty">ยังไม่มีข้อมูล</div>';
  return '<table class="tbl" style="margin-top:8px"><tbody>' + list.map(function (x) {
    return '<tr><td><span class="row" style="gap:7px;flex-wrap:nowrap"><i class="dot" style="background:' + esc(MODEL.catColor(x.cat)) + '"></i>' + esc(MODEL.catName(x.cat)) + '</span></td><td class="num">' + m(x.amount) + '</td><td class="num muted" style="width:56px">' + (total ? Math.round(x.amount / total * 100) : 0) + '%</td></tr>';
  }).join('') + '</tbody></table>';
}
function txRow(t, acc) {
  var s = txSigned(t, acc);
  return '<div class="tx" data-id="' + esc(t.id) + '">' + txIcon(t) + '<div class="t"><b>' + esc(t.desc) + '</b><span>' + esc(thDate(t.date)) + ' · ' + esc(txSub(t)) + '</span></div><div class="r"><span class="amt ' + s.cls + '">' + s.s + '</span><small>' + esc(TYPES[t.type].name) + '</small></div></div>';
}

/* =====================================================================
   รายการเงิน
   ===================================================================== */
PAGES.ledger = { title: 'รายการเงิน', render: function (el) {
  var M = MODEL, F = UI.lf, me = isAdmin();
  var yr = M.curYear('CY');
  el.innerHTML = pageHead('รายการเงิน', 'รายการรับ–จ่ายทั้งหมด', 'ค้นหา กรอง และส่งออก Excel ได้ · กดที่รายการเพื่อดูหลักฐาน', (me ? '<button class="btn btn-brand" data-add2>' + IC.plus + 'บันทึกรายการ</button>' : '') + '<button class="btn" data-xls>' + IC.xls + 'Excel</button>') +
    '<div class="card rise d1"><div class="card-b" style="padding-top:16px"><div class="filters">' +
    '<input type="search" data-f="q" placeholder="ค้นหา รายละเอียด ชื่อ หมายเหตุ…" value="' + esc(F.q) + '" aria-label="ค้นหา">' +
    '<select data-f="period" aria-label="ช่วงเวลา">' + [['month', 'เดือนนี้'], ['year', 'ปีนี้ (' + (yr) + ')'], ['last', 'ปีที่แล้ว'], ['all', 'ทั้งหมด'], ['custom', 'กำหนดช่วงเอง']].map(function (x) { return '<option value="' + x[0] + '"' + (F.period === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select>' +
    (F.period === 'custom' ? '<input type="date" data-f="from" value="' + esc(F.from) + '" aria-label="ตั้งแต่"><input type="date" data-f="to" value="' + esc(F.to) + '" aria-label="ถึง">' : '') +
    '<select data-f="type" aria-label="ประเภท"><option value="">ทุกประเภท</option>' + Object.keys(TYPES).map(function (k) { return '<option value="' + k + '"' + (F.type === k ? ' selected' : '') + '>' + TYPES[k].name + '</option>'; }).join('') + '</select>' +
    '<select data-f="acc" aria-label="บัญชี"><option value="">ทุกบัญชี</option>' + S.D.accounts.map(function (a) { return '<option value="' + a.id + '"' + (F.acc === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select>' +
    '<select data-f="cat" aria-label="หมวด"><option value="">ทุกหมวด</option><optgroup label="รายจ่าย">' + M.cats('OUT', true).map(function (c) { return '<option value="' + c.id + '"' + (F.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</optgroup><optgroup label="รายรับ">' + M.cats('IN', true).map(function (c) { return '<option value="' + c.id + '"' + (F.cat === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</optgroup></select>' +
    '<select data-f="proj" aria-label="โครงการ"><option value="">ทุกโครงการ</option>' + S.D.projects.slice().sort(function (a, b) { return b.year - a.year || (a.name < b.name ? -1 : 1); }).map(function (p) { return '<option value="' + p.id + '"' + (F.proj === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>' +
    '<select data-f="who" aria-label="สมาชิก"><option value="">ทุกคน</option>' + S.D.members.map(function (x) { return '<option value="' + x.empCode + '"' + (F.who === x.empCode ? ' selected' : '') + '>' + esc(x.fname + ' ' + x.lname) + '</option>'; }).join('') + '</select>' +
    '<button class="btn btn-ghost btn-sm" data-clear>ล้างตัวกรอง</button></div></div>' +
    '<div class="txlist" id="txl"></div><div id="more" style="padding:0 18px 12px"></div><div class="sumbar" id="sumbar"></div></div>';
  var list = ledgerFiltered();
  var shown = list.slice().reverse().slice(0, UI.lfShow), h = '', lastD = '';
  var dayNet = groupBy(list, function (t) { return t.date; });
  shown.forEach(function (t) {
    if (t.date !== lastD) { lastD = t.date; var net = sum(dayNet[t.date], function (x) { return F.acc ? MODEL.effect(x, F.acc) : (x.type === 'TRANSFER' ? 0 : TYPES[x.type].sign * x.amount); }); h += '<div class="dayhead"><span>' + esc(thDate(t.date, true, true)) + '</span><span class="tnum">' + (net ? (net > 0 ? '+' : '−') + m(Math.abs(net)) : '') + '</span></div>'; }
    h += txRow(t, F.acc);
  });
  $('#txl').innerHTML = h || '<div class="empty">' + IC.inbox + 'ไม่พบรายการตามเงื่อนไข</div>';
  $('#more').innerHTML = list.length > UI.lfShow ? '<button class="btn btn-block" data-more>แสดงเพิ่ม (' + (list.length - UI.lfShow) + ' รายการ)</button>' : '';
  var fin = 0, fout = 0;
  list.forEach(function (t) { if (F.acc) { var e = MODEL.effect(t, F.acc); if (e > 0) fin += e; else fout -= e; } else if (FLOW_IN[t.type]) fin += t.amount; else if (FLOW_OUT[t.type]) fout += t.amount; });
  $('#sumbar').innerHTML = '<span>' + list.length + ' รายการ</span><span>เงินเข้า <b class="in">+' + m(fin) + '</b></span><span>เงินออก <b class="out">−' + m(fout) + '</b></span><span>สุทธิ <b>' + sgn(r2(fin - fout)) + '</b></span>' + (F.acc ? '' : '<span class="muted xs">ไม่นับการโอนระหว่างบัญชี</span>');
  $$('#txl .tx').forEach(function (r) { r.onclick = function () { txDetail(r.dataset.id); }; });
  var rr = function () { UI.lfShow = 100; PAGES.ledger.render(el); };
  $$('[data-f]', el).forEach(function (i) { i[i.tagName === 'INPUT' && i.type === 'search' ? 'oninput' : 'onchange'] = i.type === 'search' ? debounce(function () { F.q = i.value; rr(); setTimeout(function () { var s = $('[data-f=q]'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } }, 0); }, 300) : function () { F[i.dataset.f] = i.value; rr(); }; });
  $('[data-clear]', el).onclick = function () { UI.lf = { q: '', period: 'all', type: '', acc: '', cat: '', proj: '', who: '', from: '', to: '' }; rr(); };
  var mo = $('[data-more]', el); if (mo) mo.onclick = function () { UI.lfShow += 200; PAGES.ledger.render(el); };
  var a2 = $('[data-add2]', el); if (a2) a2.onclick = function () { openTxnForm(); };
  $('[data-xls]', el).onclick = function () { exportLedger(list, this); };
} };
function ledgerFiltered() {
  var F = UI.lf, M = MODEL, t0 = M.today(), from = '', to = '';
  if (F.period === 'month') { from = t0.slice(0, 7) + '-01'; to = t0.slice(0, 7) + '-31'; }
  else if (F.period === 'year') { from = t0.slice(0, 4) + '-01-01'; to = t0.slice(0, 4) + '-12-31'; }
  else if (F.period === 'last') { var ly = +t0.slice(0, 4) - 1; from = ly + '-01-01'; to = ly + '-12-31'; }
  else if (F.period === 'custom') { from = F.from; to = F.to; }
  var q = String(F.q || '').trim().toLowerCase();
  return M.tx.filter(function (t) {
    if (from && t.date < from) return false; if (to && t.date > to) return false;
    if (F.type && t.type !== F.type) return false;
    if (F.acc && t.account !== F.acc && t.toAccount !== F.acc) return false;
    if (F.cat && t.category !== F.cat) return false;
    if (F.proj && t.project !== F.proj) return false;
    if (F.who && t.payee !== F.who && t.recorder !== F.who && !S.D.welfare.some(function (w) { return w.txnId === t.id && w.empCode === F.who; }) && !S.D.dues.some(function (d) { return d.txnId === t.id && d.empCode === F.who; })) return false;
    if (q && (t.desc + ' ' + t.note + ' ' + M.payeeOf(t) + ' ' + M.catName(t.category) + ' ' + M.projName(t.project) + ' ' + t.amount).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function exportLedger(list, btn) {
  busy(btn, loadScript(LIB.xlsx)).then(function () {
    var M = MODEL, rows = list.map(function (t) {
      var s = TYPES[t.type].sign;
      return { 'วันที่': t.date, 'ประเภท': TYPES[t.type].name, 'บัญชี': M.accName(t.account), 'ไปบัญชี': t.toAccount ? M.accName(t.toAccount) : '', 'หมวด': M.catName(t.category), 'รายละเอียด': t.desc,
        'เงินเข้า': t.type === 'TRANSFER' ? '' : (s > 0 ? t.amount : ''), 'เงินออก': t.type === 'TRANSFER' ? '' : (s < 0 ? t.amount : ''), 'ยอดโอน': t.type === 'TRANSFER' ? t.amount : '',
        'ผู้ดำเนินการ': M.payeeOf(t), 'โครงการ': M.projName(t.project), 'เงินยืม': t.loanId ? (M.loan[t.loanId] || {}).title || t.loanId : '', 'หมายเหตุ': t.note, 'หลักฐาน': (t.files || []).map(function (f) { return f.url || f.name; }).join(' | '),
        'บันทึกโดย': M.memName(t.createdBy) || t.createdBy, 'เวลาบันทึก': t.createdAt, 'รหัสรายการ': t.id };
    });
    var ws = XLSX.utils.json_to_sheet(rows), wb = XLSX.utils.book_new();
    ws['!cols'] = [{ wch: 11 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 42 }, { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 14 }, { wch: 20 }, { wch: 22 }, { wch: 50 }, { wch: 30 }, { wch: 14 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, 'รายการเงิน');
    var bal = M.balances(), s2 = XLSX.utils.json_to_sheet(S.D.accounts.map(function (a) { return { 'บัญชี': a.name, 'ยอดคงเหลือ': bal[a.id] || 0 }; }).concat([{ 'บัญชี': 'รวม', 'ยอดคงเหลือ': bal._total }]));
    XLSX.utils.book_append_sheet(wb, s2, 'ยอดคงเหลือ');
    XLSX.writeFile(wb, 'HR-Fund-รายการเงิน-' + M.today() + '.xlsx');
  }).catch(fail);
}

/* =====================================================================
   รายละเอียดรายการ
   ===================================================================== */
function txDetail(id) {
  var M = MODEL, t = M.txById[id]; if (!t) return toast('ไม่พบรายการ (อาจถูกลบแล้ว)', true);
  var s = txSigned(t), ty = TYPES[t.type], wf = S.D.welfare.filter(function (w) { return w.txnId === t.id; }), du = S.D.dues.filter(function (d) { return d.txnId === t.id; });
  var ln = t.loanId ? M.loanState(t.loanId) : null;
  var body = '<div class="row"><span class="tx-ic ' + ty.cls + '" style="width:44px;height:44px;border-radius:13px">' + IC[ty.ic] + '</span><div class="grow"><span class="chip ' + ty.cls + '">' + esc(ty.name) + '</span><div class="amt ' + s.cls + '" style="font-size:1.9rem">' + s.s + ' <small class="muted" style="font-size:.9rem">บาท</small></div></div></div>' +
    '<h3 style="font-size:1.1rem">' + esc(t.desc) + '</h3><dl class="kv">' +
    '<dt>วันที่</dt><dd>' + esc(thDate(t.date, true, true)) + '</dd>' +
    '<dt>บัญชี</dt><dd>' + esc(M.accName(t.account)) + (t.type === 'TRANSFER' ? ' → ' + esc(M.accName(t.toAccount)) : '') + '</dd>' +
    (t.category ? '<dt>หมวด</dt><dd><span class="row" style="gap:6px"><i class="dot" style="background:' + esc(M.catColor(t.category)) + '"></i>' + esc(M.catName(t.category)) + '</span></dd>' : '') +
    (M.payeeOf(t) ? '<dt>ผู้ดำเนินการ</dt><dd>' + esc(t.payee ? M.memName(t.payee, true) : t.payeeName) + '</dd>' : '') +
    (t.project ? '<dt>โครงการ</dt><dd>' + esc(M.projName(t.project)) + '</dd>' : '') +
    (ln ? '<dt>เงินยืม</dt><dd><a href="#" data-loan="' + esc(t.loanId) + '">' + esc(ln.loan ? ln.loan.title : t.loanId) + '</a> · ค้าง ' + m(ln.outstanding) + '</dd>' : '') +
    (wf.length ? '<dt>ผู้ใช้สิทธิ</dt><dd>' + wf.map(function (w) { return esc(M.memName(w.empCode)) + ' (' + (w.type === 'BDAY' ? 'วันเกิด' : 'เยี่ยมไข้') + ' ' + w.year + ')'; }).join(', ') + '</dd>' : '') +
    (du.length ? '<dt>เงินฝ่ายของ</dt><dd>' + du.map(function (d) { return esc(M.memName(d.empCode)) + ' ' + thMonth(d.ym, true); }).join(', ') + '</dd>' : '') +
    (t.reportLabel ? '<dt>ข้อความรายงาน</dt><dd>' + esc(t.reportLabel) + '</dd>' : '') +
    (t.note ? '<dt>หมายเหตุ</dt><dd style="white-space:pre-wrap">' + esc(t.note) + '</dd>' : '') +
    '<dt>หลักฐาน</dt><dd>' + ((t.files || []).length ? '<div class="files">' + t.files.map(fileLink).join('') + '</div>' : '<span class="muted">ไม่มี</span>') + '</dd>' +
    '<dt>บันทึกโดย</dt><dd class="small">' + esc(M.memName(t.createdBy) || t.createdBy) + ' · ' + esc(stampTh(t.createdAt)) + (t.updatedAt ? '<br>แก้ไขล่าสุด ' + esc(M.memName(t.updatedBy) || t.updatedBy) + ' · ' + esc(stampTh(t.updatedAt)) : '') + (t.source === 'sheet' ? '<br><span class="chip idle">นำเข้าจากชีทเดิม</span>' : '') + '</dd>' +
    '<dt>รหัสรายการ</dt><dd class="xs muted">' + esc(t.id) + '</dd></dl>';
  var foot = isAdmin() && t.type !== 'OPEN' ? '<button class="btn btn-danger" data-del>' + IC.trash + 'ลบ</button><span class="grow"></span><button class="btn" data-dup>' + IC.dup + 'ทำซ้ำ</button>' + (t.source === 'dues' ? '' : '<button class="btn btn-brand" data-edit>' + IC.edit + 'แก้ไข</button>') : '';
  var md = modal({ title: 'รายละเอียดรายการ', body: body, foot: foot, drawer: true });
  var lk = $('[data-loan]', md.el); if (lk) lk.onclick = function (e) { e.preventDefault(); md.close(); loanDetail(t.loanId); };
  if (!foot) return;
  var ed = $('[data-edit]', md.el); if (ed) ed.onclick = function () { md.close(); openTxnForm(Object.assign({}, t, { beneficiaries: wf.map(function (w) { return w.empCode; }) }), true); };
  $('[data-dup]', md.el).onclick = function () { md.close(); var c = Object.assign({}, t); delete c.id; c.files = []; c.date = MODEL.today(); c.loanId = (t.type === 'ADVR' || t.type === 'BORR') ? t.loanId : ''; openTxnForm(c); };
  $('[data-del]', md.el).onclick = function () {
    var btn = this;
    confirmBox('ลบรายการ "' + t.desc + '" จำนวน ' + m(t.amount) + ' บาท?' + (du.length ? '\nช่องเงินฝ่ายรายเดือนที่ผูกไว้ ' + du.length + ' ช่องจะกลับเป็น "ค้าง"' : '') + (wf.length ? '\nสิทธิสวัสดิการที่ผูกไว้จะถูกคืน' : ''), 'ลบรายการ', true).then(function (y) {
      if (!y) return;
      busy(btn, api('deleteTxn', { id: t.id })).then(function () {
        S.D.txns = S.D.txns.filter(function (x) { return x.id !== t.id; });
        S.D.dues = S.D.dues.filter(function (d) { return d.txnId !== t.id; });
        S.D.welfare = S.D.welfare.filter(function (w) { return w.txnId !== t.id; });
        if (t.loanId && (t.type === 'ADV' || t.type === 'BOR')) S.D.loans = S.D.loans.filter(function (l) { return l.id !== t.loanId; });
        MODEL.build(S.D); md.close(); render(); toast('ลบรายการแล้ว');
        if (t.loanId) reload(true);
      }).catch(fail);
    });
  };
}
function fileLink(f) {
  var isPdf = /\.pdf$/i.test(f.name || ''), ic = isPdf ? IC.doc : IC.img;
  return f.url ? '<a class="file" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + ic + '<span>' + esc(f.name || 'ไฟล์แนบ') + '</span></a>' : '<span class="file" title="ไฟล์จากชีทเดิม (ไม่มีลิงก์)">' + ic + '<span>' + esc(f.name || 'ไฟล์แนบ') + '</span></span>';
}

/* =====================================================================
   ฟอร์มบันทึกรายการ
   ===================================================================== */
function lineLabel(t, wf) {
  var M = MODEL;
  if (t.reportLabel) return t.reportLabel;
  wf = wf || S.D.welfare.filter(function (w) { return w.txnId === t.id; });
  if (t.category === 'BDAY' && wf.length) return 'HBD ' + wf.map(function (w) { var x = M.mem[w.empCode]; return (x && x.bd ? x.bd.split('-').reverse().join('/') + ' ' : '') + 'คุณ' + M.memName(w.empCode); }).join(', ');
  var who = M.payeeOf(t);
  if (t.type === 'ADVR') return 'รับคืน ' + ((M.loan[t.loanId] || {}).title || t.desc);
  if (t.type === 'BORR') return 'คืนเงินยืม ' + ((M.loan[t.loanId] || {}).title || t.desc);
  return t.desc + (who && t.category !== 'DUES' && t.desc.indexOf(who) < 0 ? ' คุณ' + who : '') + (t.type === 'ADV' ? ' รอเบิกคืนฝ่าย' : '');
}
function openTxnForm(pre, isEdit) {
  if (!isAdmin()) return toast('เฉพาะแอดมินบันทึกรายการได้', true);
  var D = S.D, M = MODEL, st = D.settings;
  var f = Object.assign({ type: 'OUT', date: M.today(), amount: '', account: M.activeAccounts().length > 1 ? 'CASH' : (M.activeAccounts()[0] || {}).id, toAccount: '', category: '', desc: '', reportLabel: '', payee: '', payeeName: '', project: '', projectName: '', loanId: '', dueDate: '', note: '', files: [], uploads: [], noFile: false, noFileReason: '', beneficiaries: [], allowDupWelfare: false }, pre || {});
  if (!M.acc[f.account]) f.account = M.activeAccounts()[0].id;
  if (pre && pre.amount) f.amount = String(pre.amount);
  var amtTouched = !!(pre && pre.amount);
  var reNoFile = /^\[ไม่มีหลักฐาน: ([^\]]*)\]\s*/.exec(f.note || ''); if (reNoFile) { f.noFile = true; f.noFileReason = reNoFile[1]; f.note = f.note.replace(reNoFile[0], ''); }
  var MAIN = ['OUT', 'IN', 'TRANSFER'], more = MAIN.indexOf(f.type) < 0;
  var md = modal({ title: isEdit ? 'แก้ไขรายการ' : 'บันทึกรายการเงิน', wide: false, body: '<div id="tf"></div>', foot: '<span class="xs muted grow" id="tfHint"></span><button class="btn" data-cancel>ยกเลิก</button>' + (isEdit ? '' : '<button class="btn" data-again>บันทึก + รายการถัดไป</button>') + '<button class="btn btn-brand" data-save>' + IC.check + (isEdit ? 'บันทึกการแก้ไข' : 'บันทึก') + '</button>' });
  var box = $('#tf', md.el);
  $('[data-cancel]', md.el).onclick = md.close;
  function wType() { var c = M.cat[f.category]; return f.type === 'OUT' && c && c.welfare ? c.welfare : ''; }
  function draw() {
    var ty = TYPES[f.type], cls = ty.cls, bal = M.balances(), wt = wType(), yearBE = be(f.date || M.today());
    var cats = (f.type === 'IN') ? M.cats('IN') : (f.type === 'OUT' || f.type === 'REFUND' || f.type === 'ADV') ? M.cats('OUT') : [];
    var loans = (f.type === 'ADVR' || f.type === 'BORR') ? M.openLoans(f.type === 'ADVR' ? 'ADV' : 'BOR').concat(f.loanId && isEdit ? [M.loanState(f.loanId)] : []).filter(function (s, i, a) { return s.loan && a.findIndex(function (z) { return z.loan.id === s.loan.id; }) === i; }) : [];
    var h = '<div class="typesel" role="group" aria-label="ประเภทรายการ">' +
      [['OUT', 'out', 'out', 'รายจ่าย'], ['IN', 'in', 'in', 'รายรับ'], ['TRANSFER', 'move', 'move', 'โอนระหว่างบัญชี'], ['_more', 'loan', 'loan', 'เงินยืม / เงินคืน']].map(function (x) {
        var on = x[0] === '_more' ? more : f.type === x[0];
        return '<button type="button" class="' + x[1] + '" data-ty="' + x[0] + '" aria-pressed="' + on + '"' + (isEdit && x[0] !== f.type && !(x[0] === '_more' && more) ? ' disabled style="opacity:.4"' : '') + '>' + IC[x[2]] + '<span>' + x[3] + '</span></button>';
      }).join('') + '</div>';
    if (more) h += '<div class="seg" role="group" aria-label="ชนิดเงินยืม/เงินคืน">' + [['ADV', 'ให้ยืม / สำรองจ่าย'], ['ADVR', 'รับคืนเงินยืม'], ['REFUND', 'เงินคืน / เงินเหลือจ่าย'], ['BOR', 'ฝ่ายยืมเงิน'], ['BORR', 'คืนเงินที่ฝ่ายยืม']].map(function (x) { return '<button type="button" data-sub="' + x[0] + '" aria-pressed="' + (f.type === x[0]) + '"' + (isEdit && f.type !== x[0] ? ' disabled' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>' +
      '<p class="xs muted">' + ({ ADV: 'จ่ายเงินออกไปก่อนแล้วรอคืน เช่น ยืมค่าพวงหรีดในนาม รพ. รอเบิกบัญชี — ไม่นับเป็นรายจ่ายฝ่าย', ADVR: 'รับเงินคืนจากรายการที่ฝ่ายให้ยืม/สำรองจ่ายไว้', REFUND: 'เงินทอน/เงินเหลือจากที่เบิกไปใช้ — ลดยอดรายจ่ายของหมวดนั้น', BOR: 'ฝ่ายยืมเงินจากบุคคลมาสำรองจ่าย (เป็นหนี้ที่ต้องคืน)', BORR: 'คืนเงินให้ผู้ที่ฝ่ายยืมมา' }[f.type] || 'เลือกชนิดรายการ') + '</p>';
    h += '<div class="fgrid"><label class="field"><span>วันที่ทำรายการ <i class="req">*</i></span><input type="date" data-k="date" value="' + esc(f.date) + '" max="' + addDays(M.today(), 60) + '"></label>' +
      '<label class="field"><span>จำนวนเงิน (บาท) <i class="req">*</i></span><div class="moneyin ' + cls + '"><input data-k="amount" inputmode="decimal" placeholder="0" value="' + esc(f.amount) + '" autocomplete="off" aria-label="จำนวนเงิน"><span>บาท</span></div></label></div>';
    h += '<div class="field"><span>' + (f.type === 'TRANSFER' ? 'โอนจากบัญชี' : (TYPES[f.type].sign > 0 ? 'เงินเข้าบัญชี' : 'จ่ายจากบัญชี')) + ' <i class="req">*</i></span><div class="accpick">' +
      M.activeAccounts().concat(M.acc[f.account] && !M.acc[f.account].active ? [M.acc[f.account]] : []).map(function (a) { return '<button type="button" data-acc="' + a.id + '" aria-pressed="' + (f.account === a.id) + '"><b>' + esc(a.name) + '</b><span>คงเหลือ ' + m2(bal[a.id] || 0) + '</span></button>'; }).join('') + '</div><div id="balWarn"></div></div>';
    if (f.type === 'TRANSFER') h += '<div class="field"><span>ไปบัญชี <i class="req">*</i></span><div class="accpick">' + M.activeAccounts().map(function (a) { return '<button type="button" data-toacc="' + a.id + '" aria-pressed="' + (f.toAccount === a.id) + '"' + (a.id === f.account ? ' disabled style="opacity:.4"' : '') + '><b>' + esc(a.name) + '</b><span>คงเหลือ ' + m2(bal[a.id] || 0) + '</span></button>'; }).join('') + '</div></div>';
    if (loans.length || f.type === 'ADVR' || f.type === 'BORR') h += '<div class="field"><span>เลือกรายการเงินยืม <i class="req">*</i></span>' + (loans.length ? '<div class="pills">' + loans.map(function (s) { return '<button type="button" class="pill" data-loanpick="' + s.loan.id + '" aria-pressed="' + (f.loanId === s.loan.id) + '">' + esc(s.loan.title) + ' <small>ค้าง ' + m(s.outstanding) + '</small></button>'; }).join('') + '</div>' : '<div class="empty" style="padding:10px">ไม่มีรายการเงินยืมค้าง</div>') + '</div>';
    if (cats.length) h += '<div class="field"><span>หมวดหมู่ ' + (f.type === 'ADV' ? '(หมวดของค่าใช้จ่าย ถ้าไม่ได้คืนจะนับเป็นหมวดนี้)' : '<i class="req">*</i>') + '</span><div class="pills">' + cats.map(function (c) { return '<button type="button" class="pill" data-cat="' + c.id + '" aria-pressed="' + (f.category === c.id) + '"><i class="dot" style="background:' + esc(c.color) + '"></i>' + esc(c.name) + '</button>'; }).join('') + '</div></div>';
    if (wt) {
      var amtEach = +(wt === 'BDAY' ? st.bdayAmount : st.sickAmount) || 0;
      h += '<div class="field"><span>' + (wt === 'BDAY' ? 'สมาชิกที่ได้รับสวัสดิการวันเกิด' : 'สมาชิกที่ใช้สิทธิค่าเยี่ยมไข้') + ' ปี ' + yearBE + ' (สิทธิ ' + m(amtEach) + ' บาท/คน/ปี) <i class="req">*</i></span><div class="pills">' +
        D.members.filter(function (x) { return x.active || f.beneficiaries.indexOf(x.empCode) >= 0; }).map(function (x) {
          var used = M.welfareOf(yearBE, x.empCode, wt).filter(function (w) { return !isEdit || w.txnId !== f.id; }).length > 0;
          return '<button type="button" class="pill' + (used ? ' used' : '') + '" data-ben="' + x.empCode + '" aria-pressed="' + (f.beneficiaries.indexOf(x.empCode) >= 0) + '">' + esc(x.fname) + (x.bd && wt === 'BDAY' ? ' <small>' + x.bd.split('-').reverse().join('/') + '</small>' : '') + '</button>';
        }).join('') + '</div><label class="check" style="margin-top:4px"><input type="checkbox" data-k="allowDupWelfare"' + (f.allowDupWelfare ? ' checked' : '') + '> อนุมัติจ่ายซ้ำ/กรณีพิเศษ (คนที่ใช้สิทธิแล้วในปีนี้)</label></div>';
    }
    h += '<label class="field"><span>รายละเอียด <i class="req">*</i></span><input type="text" data-k="desc" list="descList" value="' + esc(f.desc) + '" placeholder="' + esc({ OUT: 'เช่น ค่าพวงหรีด บิดา คุณ…', IN: 'เช่น เงินค่าขายขยะ เดือน…', TRANSFER: 'เช่น โอนเงินฝ่ายรายเดือนเข้า SCB', ADV: 'เช่น ยืมค่าพวงหรีดในนาม รพ.', REFUND: 'เช่น เงินเหลือ งานเลี้ยงปีใหม่', BOR: 'เช่น ยืมเงิน พญ.… สำรองจ่าย', ADVR: 'เช่น รับคืนค่าพวงหรีดจาก รพ.', BORR: 'เช่น คืนเงินยืม พญ.…' }[f.type] || '') + '" maxlength="200"></label>' +
      '<datalist id="descList">' + uniq(M.tx.slice().reverse().filter(function (t) { return t.type === f.type; }).map(function (t) { return t.desc; })).slice(0, 40).map(function (d) { return '<option value="' + esc(d) + '">'; }).join('') + '</datalist>';
    if (f.type !== 'TRANSFER') h += '<div class="fgrid"><label class="field"><span>' + (f.type === 'BOR' || f.type === 'BORR' ? 'ยืมจาก / ผู้ให้ยืม' : f.type === 'ADV' ? 'ผู้ยืม / ผู้รับเงินไปสำรองจ่าย' : 'ผู้ดำเนินการ / ผู้รับเงิน') + '</span><select data-k="payee"><option value="">— ไม่ระบุ / บุคคลภายนอก —</option>' + D.members.filter(function (x) { return x.active || x.empCode === f.payee; }).map(function (x) { return '<option value="' + x.empCode + '"' + (f.payee === x.empCode ? ' selected' : '') + '>' + esc(x.title + x.fname + ' ' + x.lname) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field"><span>ชื่อบุคคลภายนอก (ถ้ามี)</span><input type="text" data-k="payeeName" value="' + esc(f.payee ? '' : f.payeeName) + '"' + (f.payee ? ' disabled' : '') + ' placeholder="เช่น ร้าน… / ฝ่ายบัญชี"></label></div>';
    if (f.type === 'ADV') h += '<label class="field"><span>กำหนดคืน (ถ้ามี)</span><input type="date" data-k="dueDate" value="' + esc(f.dueDate) + '"></label>';
    if (f.type !== 'TRANSFER' && f.type !== 'IN') h += '<label class="field"><span>โครงการ / กิจกรรม</span><select data-k="project"><option value="">— ไม่ผูกโครงการ —</option>' + D.projects.slice().sort(function (a, b) { return b.year - a.year || (a.name < b.name ? -1 : 1); }).filter(function (p) { return p.status !== 'CLOSED' || p.id === f.project; }).map(function (p) { return '<option value="' + p.id + '"' + (f.project === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '<option value="_new"' + (f.project === '_new' ? ' selected' : '') + '>+ สร้างโครงการใหม่…</option></select>' +
      (f.project === '_new' ? '<input type="text" data-k="projectName" placeholder="ชื่อโครงการ เช่น ปีใหม่ 2570" value="' + esc(f.projectName) + '" style="margin-top:6px">' : '') + '</label>';
    var needFile = (f.type === 'OUT' || f.type === 'ADV' || f.type === 'BORR') && st.requireFileOut === 'TRUE';
    h += '<div class="field"><span>หลักฐาน (ใบเสร็จ / สลิปโอน) ' + (needFile ? '<i class="req">*</i>' : '(ไม่บังคับ)') + '</span>' +
      '<label class="drop" data-drop>' + IC.cam + '<span>ถ่ายรูป / เลือกไฟล์ (รูปภาพหรือ PDF ไม่เกิน 10 MB · เลือกได้หลายไฟล์)</span><input type="file" accept="image/*,application/pdf" multiple hidden data-file></label>' +
      '<div class="thumbs">' + f.files.map(function (x, i) { return '<div class="thumb">' + (x.url ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.name).slice(0, 30) + '</a>' : esc(x.name).slice(0, 30)) + '<button type="button" data-rmf="' + i + '" aria-label="เอาไฟล์ออก">' + IC.x + '</button></div>'; }).join('') +
      f.uploads.map(function (x, i) { return '<div class="thumb">' + (x.preview ? '<img src="' + x.preview + '" alt="">' : esc(x.name).slice(0, 30)) + '<button type="button" data-rmu="' + i + '" aria-label="เอาไฟล์ออก">' + IC.x + '</button></div>'; }).join('') + '</div>' +
      (needFile ? '<label class="check"><input type="checkbox" data-k="noFile"' + (f.noFile ? ' checked' : '') + '> ไม่มีหลักฐาน (ระบุเหตุผล)</label>' + (f.noFile ? '<input type="text" data-k="noFileReason" value="' + esc(f.noFileReason) + '" placeholder="เช่น โอนผ่านแอปไม่มีสลิป / ใบเสร็จจะส่งภายหลัง">' : '') : '') + '</div>';
    var preview = f.type === 'TRANSFER' ? '' : lineLabel(Object.assign({}, f, { amount: money(f.amount), payee: f.payee, reportLabel: '' }), f.beneficiaries.map(function (c) { return { empCode: c }; }));
    if (f.type !== 'TRANSFER') h += '<details' + (f.reportLabel ? ' open' : '') + '><summary class="small muted" style="cursor:pointer">ข้อความในรายงานไลน์ & หมายเหตุ</summary><div class="col" style="gap:10px;margin-top:10px">' +
      '<label class="field"><span>ข้อความในรายงานไลน์ (เว้นว่าง = ใช้ข้อความอัตโนมัติ)</span><input type="text" data-k="reportLabel" value="' + esc(f.reportLabel) + '" placeholder="' + esc(preview) + '"></label>' +
      '<div class="preview-line" id="pv"></div></div></details>';
    h += '<label class="field"><span>หมายเหตุ</span><textarea data-k="note" rows="2" placeholder="รายละเอียดเพิ่มเติม เช่น เบิก 1,500 ใช้จริง 1,320 คืน 180">' + esc(f.note) + '</textarea></label><div data-err></div>';
    box.innerHTML = h;
    updPreview();
    // events
    $$('[data-ty]', box).forEach(function (b) { b.onclick = function () { if (b.dataset.ty === '_more') { more = true; if (MAIN.indexOf(f.type) >= 0) f.type = 'ADV'; } else { more = false; f.type = b.dataset.ty; } fixAfterType(); draw(); }; });
    $$('[data-sub]', box).forEach(function (b) { b.onclick = function () { f.type = b.dataset.sub; fixAfterType(); draw(); }; });
    $$('[data-acc]', box).forEach(function (b) { b.onclick = function () { f.account = b.dataset.acc; if (f.toAccount === f.account) f.toAccount = ''; draw(); }; });
    $$('[data-toacc]', box).forEach(function (b) { b.onclick = function () { f.toAccount = b.dataset.toacc; draw(); }; });
    $$('[data-cat]', box).forEach(function (b) { b.onclick = function () { f.category = f.category === b.dataset.cat && f.type === 'ADV' ? '' : b.dataset.cat; if (!wType()) f.beneficiaries = []; autoAmount(); draw(); }; });
    $$('[data-ben]', box).forEach(function (b) { b.onclick = function () { var c = b.dataset.ben, i = f.beneficiaries.indexOf(c); if (i >= 0) f.beneficiaries.splice(i, 1); else f.beneficiaries.push(c); autoAmount(); autoDesc(); draw(); }; });
    $$('[data-loanpick]', box).forEach(function (b) { b.onclick = function () { f.loanId = b.dataset.loanpick; var s = M.loanState(f.loanId); if (!amtTouched || !f.amount) f.amount = String(s.outstanding); if (!f.desc) f.desc = (f.type === 'ADVR' ? 'รับคืน ' : 'คืนเงินยืม ') + s.loan.title; draw(); }; });
    $$('[data-k]', box).forEach(function (i) {
      var k = i.dataset.k;
      i[i.type === 'checkbox' || i.tagName === 'SELECT' ? 'onchange' : 'oninput'] = function () {
        f[k] = i.type === 'checkbox' ? i.checked : i.value;
        if (k === 'amount') amtTouched = true;
        if (k === 'payee' || k === 'noFile' || k === 'project' || (k === 'date' && wType())) draw(); else updPreview();
      };
    });
    var fi = $('[data-file]', box), dr = $('[data-drop]', box);
    fi.onchange = function () { addFiles(fi.files); };
    ['dragover', 'dragenter'].forEach(function (e) { dr.addEventListener(e, function (ev) { ev.preventDefault(); dr.classList.add('on'); }); });
    ['dragleave', 'drop'].forEach(function (e) { dr.addEventListener(e, function (ev) { ev.preventDefault(); dr.classList.remove('on'); if (e === 'drop') addFiles(ev.dataTransfer.files); }); });
    $$('[data-rmf]', box).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); f.files.splice(+b.dataset.rmf, 1); draw(); }; });
    $$('[data-rmu]', box).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); f.uploads.splice(+b.dataset.rmu, 1); draw(); }; });
    $('#tfHint').textContent = TYPES[f.type].name + (f.type === 'TRANSFER' ? '' : ' · ' + (TYPES[f.type].sign > 0 ? 'เพิ่ม' : 'ลด') + 'ยอด' + M.accName(f.account, true));
  }
  function updWarn() {
    var w = $('#balWarn', box); if (!w) return;
    var amt = money(f.amount), b = M.balances()[f.account] || 0, orig = isEdit && M.txById[f.id] ? M.effect(M.txById[f.id], f.account) : 0;
    var after = r2(b - orig + (TYPES[f.type].sign * amt));
    w.innerHTML = TYPES[f.type].sign < 0 && amt > 0 && after < 0 ? '<div class="banner warn" style="margin-top:6px">' + IC.warn.replace('<svg', '<svg width="16" height="16"') + ' ยอด' + esc(M.accName(f.account)) + 'จะติดลบ ' + m2(after) + ' บาท — ถ้าสำรองจ่ายไปก่อน บันทึกได้ แล้วโอนเงินเข้าบัญชีนี้ภายหลัง</div>' : '';
  }
  function updPreview() {
    updWarn();
    var pv = $('#pv', box); if (!pv) return;
    var a = M.acc[f.account], sg = TYPES[f.type].sign > 0 ? '+' : '-';
    pv.textContent = (f.reportLabel || lineLabel(Object.assign({}, f, { amount: money(f.amount), reportLabel: '' }), f.beneficiaries.map(function (c) { return { empCode: c }; }))) + ' ' + sg + m(money(f.amount) || 0) + ' (' + (a ? a.payVerb : '') + ' ' + (f.date ? ddmm(f.date) : '') + ')';
  }
  function fixAfterType() {
    var kind = f.type === 'IN' ? 'IN' : (f.type === 'OUT' || f.type === 'REFUND' || f.type === 'ADV') ? 'OUT' : '';
    var c = M.cat[f.category]; if (!kind || (c && c.kind !== kind)) f.category = '';
    if (f.type !== 'ADVR' && f.type !== 'BORR') f.loanId = '';
    if (f.type !== 'TRANSFER') f.toAccount = ''; else if (!f.toAccount) f.toAccount = (M.activeAccounts().filter(function (a) { return a.id !== f.account; })[0] || {}).id || '';
    if (!wType()) f.beneficiaries = [];
  }
  function autoAmount() {
    var wt = wType(); if (!wt || (amtTouched && f.amount && f.beneficiaries.length <= 1)) return;
    var each = +(wt === 'BDAY' ? st.bdayAmount : st.sickAmount) || 0;
    if (f.beneficiaries.length) { f.amount = String(each * f.beneficiaries.length); amtTouched = false; }
  }
  function autoDesc() {
    var wt = wType(); if (!wt) return;
    var auto = !f.desc || /^(HBD|สวัสดิการวันเกิด|ค่าเยี่ยมไข้)/.test(f.desc);
    if (!auto) return;
    var names = f.beneficiaries.map(function (c) { return 'คุณ' + M.memName(c); }).join(', ');
    f.desc = wt === 'BDAY' ? (f.beneficiaries.length === 1 && M.mem[f.beneficiaries[0]].bd ? 'HBD ' + M.mem[f.beneficiaries[0]].bd.split('-').reverse().join('/') + ' ' + names : 'สวัสดิการวันเกิด ' + names) : 'ค่าเยี่ยมไข้ ' + names;
  }
  function addFiles(list) {
    Array.prototype.slice.call(list || []).forEach(function (file) {
      if (file.size > 10 * 1024 * 1024) return toast('ไฟล์ ' + file.name + ' ใหญ่เกิน 10 MB', true);
      if (/^image\//.test(file.type)) compressImage(file).then(function (u) { f.uploads.push(u); draw(); }).catch(fail);
      else { var rd = new FileReader(); rd.onload = function () { f.uploads.push({ name: file.name, mime: file.type || 'application/pdf', data: String(rd.result).split(',')[1], preview: '' }); draw(); }; rd.readAsDataURL(file); }
    });
  }
  function payload() {
    var p = { type: f.type, date: f.date, amount: money(f.amount), account: f.account, toAccount: f.toAccount, category: f.category, desc: f.desc.trim(), reportLabel: f.reportLabel.trim(),
      payee: f.payee, payeeName: f.payee ? '' : f.payeeName, project: f.project === '_new' ? '' : f.project, projectName: f.project === '_new' ? f.projectName : '', loanId: f.loanId, dueDate: f.dueDate,
      note: f.note, files: f.files, uploads: f.uploads.map(function (u) { return { name: u.name, mime: u.mime, data: u.data }; }), noFile: f.noFile, noFileReason: f.noFileReason,
      beneficiaries: f.beneficiaries, allowDupWelfare: f.allowDupWelfare };
    if (isEdit) p.id = f.id;
    return p;
  }
  function validate() {
    if (!f.date) return 'กรุณาเลือกวันที่';
    if (!(money(f.amount) > 0)) return 'กรุณาใส่จำนวนเงิน (ตัวเลขมากกว่า 0)';
    if (f.type === 'TRANSFER' && !f.toAccount) return 'กรุณาเลือกบัญชีปลายทาง';
    if ((f.type === 'IN' || f.type === 'OUT' || f.type === 'REFUND') && !f.category) return 'กรุณาเลือกหมวดหมู่';
    if ((f.type === 'ADVR' || f.type === 'BORR') && !f.loanId) return 'กรุณาเลือกรายการเงินยืม';
    if (wType() && !f.beneficiaries.length) return 'กรุณาเลือกสมาชิกที่ใช้สิทธิ';
    if (!f.desc.trim()) return 'กรุณาใส่รายละเอียด';
    if (f.project === '_new' && !f.projectName.trim()) return 'กรุณาใส่ชื่อโครงการใหม่';
    var need = (f.type === 'OUT' || f.type === 'ADV' || f.type === 'BORR') && st.requireFileOut === 'TRUE';
    if (need && !f.files.length && !f.uploads.length && !(f.noFile && f.noFileReason.trim())) return 'รายจ่ายต้องแนบหลักฐาน หรือติ๊ก "ไม่มีหลักฐาน" พร้อมเหตุผล';
    return '';
  }
  function save(btn, again) {
    var er = validate(), eb = $('[data-err]', box);
    if (er) { eb.innerHTML = '<div class="err-msg">' + esc(er) + '</div>'; eb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    eb.innerHTML = '';
    busy(btn, api('saveTxn', payload()), 'กำลังบันทึก').then(function (r) {
      applyTxnResult(r);
      toast(isEdit ? 'บันทึกการแก้ไขแล้ว' : 'บันทึกแล้ว · ' + TYPES[r.txn.type].name + ' ' + m(r.txn.amount) + ' บาท', false, isEdit ? null : { label: 'ดูรายการ', fn: function () { txDetail(r.txn.id); } });
      if (again) { f = Object.assign(f, { amount: '', desc: '', reportLabel: '', note: '', files: [], uploads: [], noFile: false, noFileReason: '', beneficiaries: [], loanId: '', allowDupWelfare: false }); amtTouched = false; if (f.project === '_new') f.project = r.txn.project; draw(); }
      else md.close();
    }).catch(function (e) { eb.innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; eb.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
  }
  $('[data-save]', md.el).onclick = function () { save(this, false); };
  var ag = $('[data-again]', md.el); if (ag) ag.onclick = function () { save(this, true); };
  if (wType() && !f.desc) { autoAmount(); autoDesc(); }
  if (f.type === 'TRANSFER') fixAfterType();
  draw();
}
function money(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[,฿\s]/g, '')); return isFinite(n) ? r2(n) : 0; }
function applyTxnResult(r) {
  var D = S.D, t = r.txn;
  D.txns = D.txns.filter(function (x) { return x.id !== t.id; }).concat([t]);
  if (r.loan) D.loans = D.loans.filter(function (l) { return l.id !== r.loan.id; }).concat([r.loan]);
  if (r.welfare) D.welfare = D.welfare.filter(function (w) { return w.txnId !== t.id; }).concat(r.welfare);
  if (r.dues) D.dues = D.dues.filter(function (d) { return d.txnId !== t.id; }).concat(r.dues);
  if (t.project && !D.projects.some(function (p) { return p.id === t.project; })) reload(true);
  MODEL.build(D); render();
}
function compressImage(file) {
  return new Promise(function (res, rej) {
    var rd = new FileReader();
    rd.onerror = function () { rej(new Error('อ่านไฟล์ไม่ได้')); };
    rd.onload = function () {
      var img = new Image();
      img.onerror = function () { res({ name: file.name, mime: file.type, data: String(rd.result).split(',')[1], preview: '' }); };
      img.onload = function () {
        var max = 1600, w = img.width, h = img.height, k = Math.min(1, max / Math.max(w, h));
        var cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(img, 0, 0, cv.width, cv.height);
        var url = cv.toDataURL('image/jpeg', .82);
        res({ name: file.name.replace(/\.(png|heic|heif|webp|gif|jpeg)$/i, '') .replace(/\.jpg$/i, '') + '.jpg', mime: 'image/jpeg', data: url.split(',')[1], preview: url });
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(file);
  });
}
