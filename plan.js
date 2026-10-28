/* =====================================================================
   plan.js — โครงการ & แผนงบ · สถิติ & ประมาณการ (ควรเบิกเท่าไรจากสถิติย้อนหลัง)
   ===================================================================== */
'use strict';
UI.planTab = 'budget'; UI.projYear = 'all';

PAGES.plan = { title: 'โครงการ & งบ', render: function (el) {
  var D = S.D, M = MODEL, adm = isAdmin();
  var y = (UI.year = UI.year || M.curYear(UI.basis)), cy = M.curYear(UI.basis);
  el.innerHTML = pageHead('วางแผนการใช้เงิน', 'โครงการ & งบ', 'ตั้งงบรายหมวด/รายโครงการ เทียบกับที่ใช้จริง และดูข้อเสนองบจากสถิติย้อนหลัง', yearCtl()) +
    '<div class="tabs" role="tablist">' + [['budget', 'งบรายหมวด'], ['proj', 'โครงการ/กิจกรรม']].map(function (x) { return '<button role="tab" data-pt="' + x[0] + '" aria-selected="' + (UI.planTab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="pt"></div>';
  bindYearCtl(el, render);
  $$('[data-pt]', el).forEach(function (b) { b.onclick = function () { UI.planTab = b.dataset.pt; render(); }; });
  var box = $('#pt', el);
  if (UI.planTab === 'budget') budgetTab(box); else projTab(box);

  function budgetTab(box) {
    var r = M.range(y, UI.basis), outCats = M.cats('OUT'), cyr = M.catYear(UI.basis, 'out');
    var bud = {}; D.budgets.filter(function (b) { return b.year === y && b.basis === UI.basis; }).forEach(function (b) { bud[b.category] = b.amount; });
    var rows = outCats.map(function (c) {
      var hist = []; for (var yy = y - 3; yy < y; yy++) hist.push((cyr[c.id] || {})[yy] || 0);
      var used = Math.max(0, M.sumRows(r[0], r[1], 'out', function (x) { return x.cat === c.id; }));
      var pj = y === cy ? M.projectYear(c.id, y, UI.basis, 'out') : { proj: used };
      var sg = M.suggestCat(c, hist.filter(function (v, i) { return v || i >= 1; }));
      return { c: c, used: used, plan: bud[c.id], proj: pj.proj, sug: sg, hist: hist };
    });
    var tPlan = sum(rows, function (x) { return x.plan || 0; }), tUsed = sum(rows, function (x) { return x.used; }), tProj = sum(rows, function (x) { return x.proj; }), tSug = sum(rows, function (x) { return x.sug.sug; });
    var hasPlan = rows.some(function (x) { return x.plan != null; });
    box.innerHTML = '<div class="stats rise d1">' + statCard('', IC.flag, 'งบที่ตั้ง ' + yearLabel(), hasPlan ? m(tPlan) : '—', hasPlan ? 'รวมทุกหมวด' : 'ยังไม่ได้ตั้งงบ') +
      statCard('out', IC.out, 'ใช้จริงแล้ว', m(tUsed), hasPlan && tPlan ? Math.round(tUsed / tPlan * 100) + '% ของงบ' : '') +
      (y === cy ? statCard('', IC.trend, 'คาดการณ์ทั้งปี', m(tProj), 'ยอดจริง + เดือนที่เหลือของปีก่อน') : '') +
      statCard('', IC.coins, 'ข้อเสนองบ (จากสถิติ)', m(tSug), 'เฉลี่ย 2 ปีล่าสุด ปัดขึ้นหลักร้อย') + '</div>' +
      '<div class="card rise d2"><div class="card-h"><h3><span class="ic">' + IC.flag + '</span>งบรายหมวด ' + yearLabel() + '</h3>' + (adm ? '<div class="row"><button class="btn btn-sm" data-fill>ใช้ข้อเสนองบทั้งหมด</button><button class="btn btn-sm btn-brand" data-save>' + IC.check + 'บันทึกแผนงบ</button></div>' : '') + '</div>' +
      '<div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>หมวดรายจ่าย</th><th class="num">' + (y - 3) + '</th><th class="num">' + (y - 2) + '</th><th class="num">' + (y - 1) + '</th><th class="num">งบที่ตั้ง</th><th class="num">ใช้จริง</th><th style="min-width:110px">% ใช้</th>' + (y === cy ? '<th class="num">คาดการณ์ทั้งปี</th>' : '') + '<th class="num">ข้อเสนอ</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var pct = x.plan ? x.used / x.plan * 100 : null;
        return '<tr class="planrow"><td><span class="row" style="gap:7px;flex-wrap:nowrap"><i class="dot" style="background:' + esc(x.c.color) + '"></i>' + esc(x.c.name) + '</span></td>' +
          x.hist.map(function (v) { return '<td class="num muted">' + (v ? m(v) : '–') + '</td>'; }).join('') +
          '<td class="num">' + (adm ? '<input inputmode="decimal" data-bud="' + x.c.id + '" value="' + (x.plan != null ? x.plan : '') + '" placeholder="–" aria-label="งบ ' + esc(x.c.name) + '">' : (x.plan != null ? m(x.plan) : '–')) + '</td>' +
          '<td class="num b">' + (x.used ? m(x.used) : '–') + '</td><td>' + (pct != null ? '<div class="bar' + (pct > 100 ? ' over' : '') + '"><i style="width:' + Math.min(100, pct) + '%"></i></div><span class="xs ' + (pct > 100 ? 'out' : 'muted') + '">' + Math.round(pct) + '%</span>' : '') + '</td>' +
          (y === cy ? '<td class="num">' + (x.proj ? m(x.proj) : '–') + '</td>' : '') + '<td class="num"><span class="suggest">' + (x.sug.sug ? m(x.sug.sug) : '–') + '</span></td></tr>';
      }).join('') + '</tbody><tfoot><tr><td>รวม</td><td></td><td></td><td></td><td class="num">' + (hasPlan ? m(tPlan) : '–') + '</td><td class="num">' + m(tUsed) + '</td><td></td>' + (y === cy ? '<td class="num">' + m(tProj) + '</td>' : '') + '<td class="num">' + m(tSug) + '</td></tr></tfoot></table>' +
      '<p class="xs muted" style="margin-top:8px">ข้อเสนอ = ค่าเฉลี่ยรายจ่ายสุทธิ 2 ปีล่าสุดที่มีข้อมูล ปัดขึ้นหลักร้อย · คาดการณ์ทั้งปี = ยอดจริงถึงวันนี้ + ยอดช่วงเดียวกันของปีก่อนในเดือนที่เหลือ (คำนึงงานตามฤดูกาล เช่น ปีใหม่ เกษียณ)</p></div></div>' +
      '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.dash + '</span>งบ vs ใช้จริง vs ข้อเสนอ</h3></div><div class="card-b"><div class="chart tall"><canvas id="cBud"></canvas></div></div></div>';
    if (adm) {
      $('[data-fill]', box).onclick = function () { rows.forEach(function (x) { var i = $('[data-bud="' + x.c.id + '"]', box); if (i && x.sug.sug) i.value = x.sug.sug; }); toast('ใส่ข้อเสนองบแล้ว ตรวจแล้วกด "บันทึกแผนงบ"'); };
      $('[data-save]', box).onclick = function () {
        var b = this, list = $$('[data-bud]', box).map(function (i) { return { category: i.dataset.bud, amount: i.value.trim() === '' ? '' : money(i.value) }; });
        busy(b, api('saveBudget', { year: y, basis: UI.basis, rows: list })).then(function (r) { D.budgets = r.budgets; MODEL.build(D); render(); toast('บันทึกแผนงบ ' + yearLabel() + ' แล้ว'); }).catch(fail);
      };
    }
    CH.load().then(function () {
      if (S.page !== 'plan') return; CH.theme();
      var show = rows.filter(function (x) { return x.used || x.plan || x.sug.sug; });
      CH.make($('#cBud'), { type: 'bar', data: { labels: show.map(function (x) { return x.c.name.split('/')[0]; }), datasets: [
        { label: 'งบที่ตั้ง', data: show.map(function (x) { return x.plan || 0; }), backgroundColor: CH.alpha(cssv('--muted'), .3), borderRadius: 5 },
        { label: 'ใช้จริง', data: show.map(function (x) { return x.used; }), backgroundColor: show.map(function (x) { return x.plan && x.used > x.plan ? cssv('--bad') : x.c.color; }), borderRadius: 5 },
        { label: 'ข้อเสนอจากสถิติ', type: 'line', data: show.map(function (x) { return x.sug.sug; }), borderColor: cssv('--move'), backgroundColor: cssv('--move'), showLine: false, pointStyle: 'rectRot', pointRadius: 6 }] },
        options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: Object.assign({ ticks: { autoSkip: false, maxRotation: 50 } }, CH.xPlain), y: CH.yMoney } } });
    }).catch(function () { });
  }

  function projTab(box) {
    var ps = D.projects.slice().map(function (p) { return { p: p, a: M.projActual(p.id), type: M.projType(p.name) }; });
    var types = groupBy(ps, function (x) { return x.type; });
    var cur = ps.filter(function (x) { return UI.projYear === 'all' ? true : x.p.year === +UI.projYear; }).sort(function (a, b) { return b.p.year - a.p.year || (b.a.last > a.a.last ? 1 : -1); });
    var yrs = uniq(ps.map(function (x) { return x.p.year; })).sort().reverse();
    box.innerHTML = '<div class="row rise"><select data-py style="width:auto" aria-label="ปีของโครงการ"><option value="all">ทุกปี</option>' + yrs.map(function (yy) { return '<option' + (String(yy) === String(UI.projYear) ? ' selected' : '') + '>' + yy + '</option>'; }).join('') + '</select><span class="grow"></span>' + (adm ? '<button class="btn btn-brand" data-np>' + IC.plus + 'สร้างโครงการ</button>' : '') + '</div>' +
      '<div class="card rise d1"><div class="card-h"><h3><span class="ic">' + IC.trend + '</span>ควรเบิกเท่าไรสำหรับกิจกรรมประจำ (จากสถิติย้อนหลัง)</h3></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>กิจกรรม</th><th>ครั้งที่ผ่านมา</th><th class="num">เฉลี่ย/ครั้ง</th><th class="num">สูงสุด</th><th class="num">ล่าสุด</th><th class="num">แนะนำเบิก</th></tr></thead><tbody>' +
      Object.keys(types).map(function (k) {
        var arr = types[k].filter(function (x) { return x.a.out > 0; }).sort(function (a, b) { return a.p.year - b.p.year; });
        if (!arr.length) return '';
        var vals = arr.map(function (x) { return x.a.out; }), avg = sum(vals) / vals.length, last = arr[arr.length - 1];
        var sug = Math.ceil(Math.max(avg, last.a.out) / 100) * 100;
        return '<tr><td><b>' + esc(k) + '</b></td><td class="small">' + arr.map(function (x) { return x.p.year + ': ' + m(x.a.out); }).join(' · ') + '</td><td class="num">' + m(avg) + '</td><td class="num">' + m(Math.max.apply(null, vals)) + '</td><td class="num">' + m(last.a.out) + '</td><td class="num"><span class="suggest">' + m(sug) + '</span></td></tr>';
      }).join('') + '</tbody></table><p class="xs muted" style="margin-top:6px">แนะนำเบิก = ค่ามากกว่าระหว่าง "เฉลี่ยทุกครั้ง" กับ "ครั้งล่าสุด" ปัดขึ้นหลักร้อย (ราคามักขึ้นทุกปี) · ยอดสุทธิหลังหักเงินคืน/เงินเหลือแล้ว</p></div></div>' +
      '<div class="projcards rise d2">' + (cur.map(function (x) {
        var p = x.p, a = x.a, pct = p.budget ? a.out / p.budget * 100 : null;
        return '<button class="projcard" data-pj="' + p.id + '"><div class="row" style="justify-content:space-between"><span class="chip ' + (p.status === 'ACTIVE' ? 'move' : 'idle') + '">' + ({ ACTIVE: 'กำลังดำเนินการ', DONE: 'เสร็จแล้ว', CLOSED: 'ปิดโครงการ' }[p.status] || p.status) + '</span><span class="xs muted">ปี ' + p.year + '</span></div><h4>' + esc(p.name) + '</h4>' +
          '<div class="row" style="justify-content:space-between;align-items:baseline"><span class="amt out" style="font-size:1.3rem">' + m(a.out) + '</span><span class="small muted">' + (p.budget ? 'งบ ' + m(p.budget) : 'ไม่ได้ตั้งงบ') + '</span></div>' +
          (pct != null ? '<div class="bar' + (pct > 100 ? ' over' : '') + '"><i style="width:' + Math.min(100, pct) + '%"></i></div><span class="xs ' + (pct > 100 ? 'out' : 'muted') + '">ใช้ ' + Math.round(pct) + '% · ' + (pct > 100 ? 'เกินงบ ' + m(a.out - p.budget) : 'เหลือ ' + m(p.budget - a.out)) + '</span>' : '') +
          '<span class="xs muted">' + a.n + ' รายการ' + (a.first ? ' · ' + thDate(a.first) + (a.last !== a.first ? ' – ' + thDate(a.last) : '') : '') + (a.pendingAdv ? ' · รอเบิกคืน ' + m(a.pendingAdv) : '') + '</span></button>';
      }).join('') || '<div class="card"><div class="empty">ยังไม่มีโครงการ</div></div>') + '</div>';
    $('[data-py]', box).onchange = function () { UI.projYear = this.value; render(); };
    var np = $('[data-np]', box); if (np) np.onclick = function () { projForm(); };
    $$('[data-pj]', box).forEach(function (b) { b.onclick = function () { projDetail(b.dataset.pj); }; });
  }
} };
function projDetail(id) {
  var M = MODEL, p = M.proj[id], a = M.projActual(id), txs = M.tx.filter(function (t) { return t.project === id; });
  var md = modal({ title: 'โครงการ/กิจกรรม', wide: true, body: '<h3>' + esc(p.name) + '</h3><div class="stats">' + statCard('out', IC.out, 'ใช้จริง (สุทธิ)', m(a.out), a.n + ' รายการ') + statCard('', IC.flag, 'งบที่ตั้ง', p.budget != null ? m(p.budget) : '—', p.budget ? (a.out > p.budget ? 'เกินงบ ' + m(a.out - p.budget) : 'เหลือ ' + m(p.budget - a.out)) : '') + (a.pendingAdv ? statCard('loan', IC.loan, 'รอเบิกคืน', m(a.pendingAdv), '') : '') + '</div>' +
    (p.note ? '<p class="small" style="white-space:pre-wrap">' + esc(p.note) + '</p>' : '') + '<div class="card" style="box-shadow:none"><div class="txlist">' + (txs.slice().reverse().map(function (t) { return txRow(t); }).join('') || '<div class="empty">ยังไม่มีรายการ</div>') + '</div></div>',
    foot: isAdmin() ? '<button class="btn btn-danger" data-del>' + IC.trash + 'ลบ</button><span class="grow"></span><button class="btn" data-add>' + IC.plus + 'บันทึกรายจ่ายในโครงการนี้</button><button class="btn btn-brand" data-edit>' + IC.edit + 'แก้ไข/ตั้งงบ</button>' : '' });
  $$('.tx', md.el).forEach(function (r) { r.onclick = function () { md.close(); txDetail(r.dataset.id); }; });
  if (!isAdmin()) return;
  $('[data-edit]', md.el).onclick = function () { md.close(); projForm(p); };
  $('[data-add]', md.el).onclick = function () { md.close(); openTxnForm({ type: 'OUT', project: p.id }); };
  $('[data-del]', md.el).onclick = function () { var b = this; confirmBox('ลบโครงการ "' + p.name + '"?', 'ลบ', true).then(function (y) { if (y) busy(b, api('deleteProject', { id: p.id })).then(function () { S.D.projects = S.D.projects.filter(function (x) { return x.id !== p.id; }); MODEL.build(S.D); md.close(); render(); toast('ลบโครงการแล้ว'); }).catch(fail); }); };
}
function projForm(p) {
  p = p || { name: '', year: be(MODEL.today()), budget: null, status: 'ACTIVE', note: '' };
  var typ = MODEL.projType(p.name), hist = S.D.projects.filter(function (x) { return x.id !== p.id && typ && MODEL.projType(x.name) === typ; }).map(function (x) { return x.year + ': ' + m(MODEL.projActual(x.id).out); });
  var md = modal({ title: p.id ? 'แก้ไขโครงการ' : 'สร้างโครงการ/กิจกรรม', body:
    '<label class="field"><span>ชื่อโครงการ/กิจกรรม <i class="req">*</i> (ใส่ปี พ.ศ. ท้ายชื่อ เพื่อเทียบสถิติข้ามปี)</span><input type="text" data-k="name" value="' + esc(p.name) + '" placeholder="เช่น ปีใหม่ 2570 · งานเกษียณ 2570" autofocus></label>' +
    '<div class="fgrid"><label class="field"><span>ปี พ.ศ.</span><input type="number" data-k="year" value="' + esc(p.year) + '"></label><label class="field"><span>งบที่ตั้ง (บาท)</span><input inputmode="decimal" data-k="budget" value="' + (p.budget != null ? p.budget : '') + '" placeholder="ไม่ตั้งงบ"></label></div>' +
    '<p class="xs muted" id="hist">' + (hist.length ? 'สถิติกิจกรรมเดียวกัน: ' + esc(hist.join(' · ')) : '') + '</p>' +
    '<div class="field"><span>สถานะ</span><div class="seg">' + [['ACTIVE', 'กำลังดำเนินการ'], ['DONE', 'เสร็จแล้ว'], ['CLOSED', 'ปิดโครงการ']].map(function (x) { return '<button type="button" data-st="' + x[0] + '" aria-pressed="' + (p.status === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div></div>' +
    '<label class="field"><span>หมายเหตุ / รายละเอียดแผน</span><textarea data-k="note" rows="3">' + esc(p.note || '') + '</textarea></label><div data-err></div>',
    foot: '<button class="btn" data-c>ยกเลิก</button><button class="btn btn-brand" data-ok>' + IC.check + 'บันทึก</button>' });
  var st = p.status;
  $$('[data-st]', md.el).forEach(function (b) { b.onclick = function () { st = b.dataset.st; $$('[data-st]', md.el).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); }; });
  $('[data-k=name]', md.el).oninput = debounce(function () { var t = MODEL.projType(this.value), h = S.D.projects.filter(function (x) { return x.id !== p.id && t && MODEL.projType(x.name) === t; }).map(function (x) { return x.year + ': ' + m(MODEL.projActual(x.id).out); }); $('#hist', md.el).textContent = h.length ? 'สถิติกิจกรรมเดียวกัน: ' + h.join(' · ') : ''; }, 250);
  $('[data-c]', md.el).onclick = md.close;
  $('[data-ok]', md.el).onclick = function () {
    var v = function (k) { return $('[data-k=' + k + ']', md.el).value; };
    busy(this, api('saveProject', { id: p.id, name: v('name').trim(), year: +v('year'), budget: v('budget').trim() === '' ? '' : money(v('budget')), status: st, note: v('note') })).then(function (r) {
      S.D.projects = S.D.projects.filter(function (x) { return x.id !== r.project.id; }).concat([r.project]); MODEL.build(S.D); md.close(); render(); toast('บันทึกโครงการแล้ว');
    }).catch(function (e) { $('[data-err]', md.el).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; });
  };
}

/* =====================================================================
   สถิติ & ประมาณการ
   ===================================================================== */
PAGES.stats = { title: 'สถิติ & ประมาณการ', render: function (el) {
  var D = S.D, M = MODEL, ys = M.years(UI.basis), cy = M.curYear(UI.basis), done = ys.filter(function (y) { return y < cy; });
  var cyo = M.catYear(UI.basis, 'out'), cyi = M.catYear(UI.basis, 'in');
  var outCats = M.cats('OUT', true).filter(function (c) { return cyo[c.id]; }), inCats = M.cats('IN', true).filter(function (c) { return cyi[c.id]; });
  var totOut = ys.map(function (y) { return sum(outCats, function (c) { return (cyo[c.id] || {})[y] || 0; }); }), totIn = ys.map(function (y) { return sum(inCats, function (c) { return (cyi[c.id] || {})[y] || 0; }); });
  var pj = M.projectYear('', cy, UI.basis, 'out'), pji = M.projectYear('', cy, UI.basis, 'in');
  var nextSug = sum(outCats, function (c) { return M.suggestCat(c, done.map(function (y) { return (cyo[c.id] || {})[y] || 0; })).sug; });
  var nextIn = M.suggest(done.map(function (y, i) { return totIn[ys.indexOf(y)]; }));
  var bal = M.balances()._total;
  el.innerHTML = pageHead('วิเคราะห์ย้อนหลัง', 'สถิติ & ประมาณการ', 'ใช้ข้อมูลทุกปีที่บันทึกไว้ ประเมินว่าปีนี้จะใช้เท่าไร และปีหน้าควรตั้งงบเท่าไร', '<div class="seg"><button data-basis="CY" aria-pressed="' + (UI.basis === 'CY') + '">ปีปฏิทิน</button><button data-basis="FY" aria-pressed="' + (UI.basis === 'FY') + '">ปีงบประมาณ</button></div>') +
    '<div class="stats rise d1">' + statCard('out', IC.trend, 'คาดการณ์รายจ่ายทั้งปี ' + cy, m(pj.proj), 'จริงแล้ว ' + m(pj.ytd) + ' + คาดเพิ่ม ' + m(pj.rest)) +
    statCard('in', IC.trend, 'คาดการณ์รายรับทั้งปี ' + cy, m(pji.proj), 'จริงแล้ว ' + m(pji.ytd)) +
    statCard('', IC.flag, 'ข้อเสนองบรายจ่ายปี ' + (cy + 1), m(nextSug), 'รวมทุกหมวด (เฉลี่ย 2 ปีล่าสุด)') +
    (function () { var mo = nextSug > 0 ? bal / (nextSug / 12) : 0, net = nextSug - (nextIn.avg || 0); return statCard('', IC.coins, 'เงินคงเหลือรองรับรายจ่าย', nextSug > 0 ? (mo >= 24 ? (mo / 12).toFixed(1) + '<small>ปี</small>' : Math.floor(mo) + '<small>เดือน</small>') : '—', net > 0 ? 'กรณีไม่มีรายรับเข้าเลย' : 'รายรับเฉลี่ยพอกับรายจ่าย'); })() + '</div>' +
    '<div class="card rise d2"><div class="card-h"><h3><span class="ic">' + IC.dash + '</span>รายรับ–รายจ่ายรายปี</h3><span class="hint">ปีปัจจุบันแสดงยอดคาดการณ์เป็นแท่งจาง</span></div><div class="card-b"><div class="chart"><canvas id="cYear"></canvas></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.out + '</span>รายจ่ายสุทธิรายหมวด รายปี</h3></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>หมวด</th>' + ys.map(function (y) { return '<th class="num">' + y + (y === cy ? '*' : '') + '</th>'; }).join('') + '<th>แนวโน้ม</th><th class="num">ต่อครั้ง (เฉลี่ย/มัธยฐาน)</th><th class="num">ข้อเสนอ ' + (cy + 1) + '</th></tr></thead><tbody>' +
    outCats.map(function (c) {
      var v = ys.map(function (y) { return (cyo[c.id] || {})[y] || 0; }), es = M.eventStats(c.id), sg = M.suggestCat(c, done.map(function (y) { return (cyo[c.id] || {})[y] || 0; }));
      return '<tr><td><span class="row" style="gap:7px;flex-wrap:nowrap"><i class="dot" style="background:' + esc(c.color) + '"></i>' + esc(c.name) + '</span></td>' + v.map(function (x) { return '<td class="num">' + (x ? m(x) : '<span class="muted">–</span>') + '</td>'; }).join('') +
        '<td style="width:120px">' + sparkSvg(v, c.color) + '</td><td class="num small">' + (es ? m(es.mean) + ' / ' + m(es.median) + '<br><span class="muted xs">' + es.n + ' ครั้ง · ' + m(es.min) + '–' + m(es.max) + '</span>' : '–') + '</td><td class="num"><span class="suggest">' + (sg.sug ? m(sg.sug) : '–') + '</span>' + (sg.rule ? '<br><span class="muted xs">' + sg.rule + '</span>' : '') + '</td></tr>';
    }).join('') + '</tbody><tfoot><tr><td>รวม</td>' + totOut.map(function (x) { return '<td class="num">' + m(x) + '</td>'; }).join('') + '<td></td><td></td><td class="num">' + m(nextSug) + '</td></tr></tfoot></table><p class="xs muted" style="margin-top:6px">* ปีปัจจุบันเป็นยอดถึงวันนี้ · ข้อมูลเริ่ม 9 ม.ค. 2567 (ปี 2567 มีเฉพาะส่วนที่บันทึกในชีท)</p></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.in + '</span>รายรับรายหมวด รายปี</h3></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>หมวด</th>' + ys.map(function (y) { return '<th class="num">' + y + (y === cy ? '*' : '') + '</th>'; }).join('') + '<th>แนวโน้ม</th></tr></thead><tbody>' +
    inCats.map(function (c) { var v = ys.map(function (y) { return (cyi[c.id] || {})[y] || 0; }); return '<tr><td><span class="row" style="gap:7px;flex-wrap:nowrap"><i class="dot" style="background:' + esc(c.color) + '"></i>' + esc(c.name) + '</span></td>' + v.map(function (x) { return '<td class="num">' + (x ? m(x) : '<span class="muted">–</span>') + '</td>'; }).join('') + '<td style="width:120px">' + sparkSvg(v, c.color) + '</td></tr>'; }).join('') +
    '</tbody><tfoot><tr><td>รวม</td>' + totIn.map(function (x) { return '<td class="num">' + m(x) + '</td>'; }).join('') + '<td></td></tr></tfoot></table></div></div>' +
    '<div class="grid-2"><div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.cal + '</span>ฤดูกาลการใช้จ่าย (เฉลี่ยรายเดือน)</h3></div><div class="card-b"><div class="chart"><canvas id="cSeason"></canvas></div><p class="xs muted">เดือนไหนมักใช้เงินมาก — วางแผนสำรองเงินสดล่วงหน้า</p></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.users + '</span>ผู้ดำเนินการเบิกจ่าย</h3></div><div class="card-b"><div class="chart"><canvas id="cWho"></canvas></div></div></div></div>';
  $$('[data-basis]', el).forEach(function (b) { b.onclick = function () { UI.basis = b.dataset.basis; store('basis', UI.basis); UI.year = null; render(); }; });
  CH.load().then(function () {
    if (S.page !== 'stats') return; CH.theme();
    var inC = cssv('--in'), outC = cssv('--out');
    CH.make($('#cYear'), { type: 'bar', data: { labels: ys.map(function (y) { return (UI.basis === 'FY' ? 'ปีงบ ' : '') + y; }), datasets: [
      { label: 'รายรับ', data: totIn, backgroundColor: CH.alpha(inC, .85), borderRadius: 6, stack: 'i' }, { label: 'คาดเพิ่ม (รับ)', data: ys.map(function (y) { return y === cy ? Math.max(0, pji.proj - pji.ytd) : 0; }), backgroundColor: CH.alpha(inC, .3), borderRadius: 6, stack: 'i' },
      { label: 'รายจ่าย', data: totOut, backgroundColor: CH.alpha(outC, .85), borderRadius: 6, stack: 'o' }, { label: 'คาดเพิ่ม (จ่าย)', data: ys.map(function (y) { return y === cy ? Math.max(0, pj.proj - pj.ytd) : 0; }), backgroundColor: CH.alpha(outC, .3), borderRadius: 6, stack: 'o' }] },
      options: { plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: Object.assign({ stacked: true }, CH.xPlain), y: Object.assign({ stacked: true }, CH.yMoney) } } });
    var mo = TH_M.map(function () { return 0; }), nY = Math.max(1, done.length);
    M.rows().forEach(function (r) { if (r.kind === 'out' && done.indexOf(M.yearOf(r.date, UI.basis)) >= 0) mo[+r.date.slice(5, 7) - 1] += r.amount; });
    var order = UI.basis === 'FY' ? [9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8] : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    CH.make($('#cSeason'), { type: 'line', data: { labels: order.map(function (i) { return TH_M[i]; }), datasets: [{ label: 'เฉลี่ยต่อเดือน', data: order.map(function (i) { return r2(mo[i] / nY); }), borderColor: cssv('--brand'), backgroundColor: CH.alpha(cssv('--brand'), .15), fill: true, tension: .4, pointRadius: 3 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.xPlain, y: CH.yMoney } } });
    var who = {}; M.tx.forEach(function (t) { if (t.type === 'OUT' && t.payee) who[t.payee] = (who[t.payee] || 0) + t.amount; });
    var wk = Object.keys(who).sort(function (a, b) { return who[b] - who[a]; }).slice(0, 10);
    CH.make($('#cWho'), { type: 'bar', data: { labels: wk.map(function (c) { return M.memName(c); }), datasets: [{ label: 'ยอดที่ดำเนินการเบิกจ่าย', data: wk.map(function (c) { return r2(who[c]); }), backgroundColor: CH.pal().map(function (c) { return CH.alpha(c, .8); }), borderRadius: 6 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: CH.money } } }, scales: { x: CH.yMoney, y: { grid: { display: false } } } } });
  }).catch(function () { });
} };
