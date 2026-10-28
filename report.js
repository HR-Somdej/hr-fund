/* =====================================================================
   report.js — รายงานส่งไลน์ (ข้อความตามรูปแบบเดิม) · ภาพรายงานสไตล์ SMC Daily · ใบรายงาน A4
   ขอบเขต: (1) รายการใหม่ตั้งแต่รายงานครั้งก่อน (ตามเวลาที่บันทึก) (2) ทั้งเดือน (3) กำหนดช่วงเอง
   ===================================================================== */
'use strict';
UI.rep = { mode: null, asOf: null, ym: null, from: '', to: '', showMove: true, showLoans: true, showLink: true, out: 'text', edited: null };

function reportData() {
  var M = MODEL, R = UI.rep, D = S.D;
  var reps = D.reports.slice().sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; });
  var last = reps[reps.length - 1];
  if (!R.mode) R.mode = last ? 'since' : 'month';
  if (!R.asOf) R.asOf = M.today();
  if (!R.ym) R.ym = R.asOf.slice(0, 7);
  var items;
  if (R.mode === 'since') {
    var after = last ? last.createdAt : '0';
    items = M.tx.filter(function (t) { return t.type !== 'OPEN' && t.createdAt > after && t.date <= R.asOf; });
  } else if (R.mode === 'month') items = M.tx.filter(function (t) { return t.type !== 'OPEN' && t.date.slice(0, 7) === R.ym && t.date <= R.asOf; });
  else items = M.tx.filter(function (t) { return t.type !== 'OPEN' && (!R.from || t.date >= R.from) && (!R.to || t.date <= R.to); });
  var ins = items.filter(function (t) { return FLOW_IN[t.type]; }), outs = items.filter(function (t) { return FLOW_OUT[t.type]; }), moves = items.filter(function (t) { return t.type === 'TRANSFER'; });
  var bal = M.balances(R.mode === 'range' && R.to ? R.to : R.asOf);
  return { items: items, ins: ins, outs: outs, moves: moves, bal: bal, last: last, totIn: r2(sum(ins, function (t) { return t.amount; })), totOut: r2(sum(outs, function (t) { return t.amount; })),
    loans: M.openLoans(), title: 'เดือน ' + TH_MF[+(R.mode === 'month' ? R.ym : R.asOf).slice(5, 7) - 1] + ' อัพเดท ' + ddmmyy(R.mode === 'range' && R.to ? R.to : R.asOf) };
}
function lineOf(t) {
  var a = MODEL.acc[t.account], sg = FLOW_IN[t.type] ? '+' : '-';
  return lineLabel(t) + ' ' + sg + m(t.amount) + ' (' + (a ? a.payVerb : '') + ' ' + ddmm(t.date) + ')';
}
function reportText(d) {
  var R = UI.rep, M = MODEL, L = [];
  L.push(d.title, '');
  L.push('รายรับระหว่างเดือน' + (d.ins.length ? ' รวม ' + m(d.totIn) + ' บาท' : ''));
  if (d.ins.length) d.ins.forEach(function (t) { L.push(lineOf(t)); }); else L.push('- ไม่มี -');
  L.push('');
  L.push('รายจ่ายระหว่างเดือน' + (d.outs.length ? ' รวม -' + m(d.totOut) + ' บาท' : ''));
  if (d.outs.length) d.outs.forEach(function (t) { L.push(lineOf(t)); }); else L.push('- ไม่มี -');
  if (R.showMove && d.moves.length) {
    L.push('', 'โอนระหว่างบัญชี');
    d.moves.forEach(function (t) { L.push(t.desc + ' ' + m(t.amount) + ' (' + M.accName(t.account, true) + ' → ' + M.accName(t.toAccount, true) + ' ' + ddmm(t.date) + ')'); });
  }
  L.push('', 'ยอดเงินคงเหลือปัจจุบัน💸');
  M.activeAccounts().forEach(function (a) { L.push(a.reportName + ' ' + m2(d.bal[a.id] || 0) + ' บาท'); });
  L.push('รวมเงินทั้งสิ้น ' + m2(d.bal._total) + ' บาท');
  if (R.showLoans && d.loans.length) {
    L.push('', 'เงินยืม/รอเบิกคืน (ยังไม่รวมในยอดข้างบน)');
    d.loans.forEach(function (s) { L.push('• ' + s.loan.title + ' ' + m(s.outstanding) + ' บาท' + (M.mem[s.loan.party] ? ' (คุณ' + M.memName(s.loan.party) + ')' : '')); });
  }
  if (R.showLink && S.D.settings.systemUrl) L.push('', S.D.settings.reportFooter || 'รายละเอียด', S.D.settings.systemUrl);
  return L.join('\n');
}
function reportCard(d) {
  var M = MODEL, R = UI.rep, accs = M.activeAccounts();
  var li = function (t) { return '<div class="li"><span>' + esc(lineLabel(t)) + '<small>' + esc(ddmm(t.date) + ' · ' + (M.acc[t.account] ? M.acc[t.account].payVerb : '')) + '</small></span><b class="' + (FLOW_IN[t.type] ? 'in' : t.type === 'ADV' ? 'loan' : 'out') + '">' + (FLOW_IN[t.type] ? '+' : '−') + m(t.amount) + '</b></div>'; };
  return '<div class="rcard" id="rcard"><div class="rh"><div class="t1">รายงานเงินฝ่ายทรัพยากรบุคคล · รพ.สมเด็จฯ ณ ศรีราชา</div><div class="t2">' + esc(d.title) + '</div>' +
    '<div class="bigv">' + m2(d.bal._total) + '<small>บาท</small></div><div style="font-size:.74rem;opacity:.85">ยอดเงินคงเหลือรวมทั้งสิ้น 💸</div>' +
    '<div class="accs2">' + accs.map(function (a) { return '<div>' + esc(a.reportName.replace(/^ใน/, '')) + '<b>' + m2(d.bal[a.id] || 0) + '</b></div>'; }).join('') + '</div></div>' +
    '<div class="rb"><div class="sec"><span>รายรับระหว่างเดือน</span><span class="in">+' + m(d.totIn) + '</span></div>' + (d.ins.map(li).join('') || '<div class="none">ไม่มีรายการ</div>') +
    '<div class="sec" style="margin-top:12px"><span>รายจ่ายระหว่างเดือน</span><span class="out">−' + m(d.totOut) + '</span></div>' + (d.outs.map(li).join('') || '<div class="none">ไม่มีรายการ</div>') +
    (R.showMove && d.moves.length ? '<div class="sec" style="margin-top:12px"><span>โอนระหว่างบัญชี</span></div>' + d.moves.map(function (t) { return '<div class="li"><span>' + esc(t.desc) + '<small>' + esc(M.accName(t.account, true) + ' → ' + M.accName(t.toAccount, true) + ' · ' + ddmm(t.date)) + '</small></span><b>' + m(t.amount) + '</b></div>'; }).join('') : '') +
    (R.showLoans && d.loans.length ? '<div class="sec" style="margin-top:12px"><span>เงินยืม/รอเบิกคืน</span><span class="loan">' + m(sum(d.loans, function (s) { return s.outstanding; })) + '</span></div>' + d.loans.map(function (s) { return '<div class="li"><span>' + esc(s.loan.title) + '<small>' + esc((M.memName(s.loan.party) ? 'คุณ' + M.memName(s.loan.party) + ' · ' : '') + thDate(s.date)) + '</small></span><b class="loan">' + m(s.outstanding) + '</b></div>'; }).join('') : '') +
    '</div><div class="rf"><img src="logo-hospital.png" alt=""><div>ฝ่ายทรัพยากรบุคคล โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา สภากาชาดไทย<br>HR Fund · ' + esc(stampTh(S.D.now || M.today())) + '</div></div></div>';
}
function reportA4(d) {
  var M = MODEL, R = UI.rep, rows = function (list, sign) {
    return list.map(function (t, i) { return '<tr><td style="text-align:center">' + (i + 1) + '</td><td>' + ddmmyy(t.date) + '</td><td>' + esc(lineLabel(t)) + (t.note ? '<br><small style="color:#666">' + esc(t.note.slice(0, 120)) + '</small>' : '') + '</td><td>' + esc(M.accName(t.account)) + '</td><td class="n">' + sign + m2(t.amount) + '</td></tr>'; }).join('') || '<tr><td colspan="5" style="text-align:center;color:#777">ไม่มีรายการ</td></tr>';
  };
  return '<div class="a4" id="a4"><div class="hd"><img src="logo-hospital.png" alt=""><div><h2>รายงานสถานะเงินฝ่ายทรัพยากรบุคคล</h2><div>โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา สภากาชาดไทย</div><div style="color:#555">' + esc(d.title) + (R.mode === 'since' && d.last ? ' (รายการตั้งแต่รายงานวันที่ ' + esc(stampTh(d.last.createdAt)) + ')' : '') + '</div></div></div>' +
    '<b>1. รายรับระหว่างงวด</b> รวม ' + m2(d.totIn) + ' บาท<table><thead><tr><th style="width:36px">ที่</th><th style="width:72px">วันที่</th><th>รายการ</th><th style="width:130px">บัญชี</th><th style="width:96px">จำนวนเงิน</th></tr></thead><tbody>' + rows(d.ins, '') + '</tbody></table>' +
    '<b>2. รายจ่ายระหว่างงวด</b> รวม ' + m2(d.totOut) + ' บาท<table><thead><tr><th style="width:36px">ที่</th><th style="width:72px">วันที่</th><th>รายการ</th><th style="width:130px">บัญชี</th><th style="width:96px">จำนวนเงิน</th></tr></thead><tbody>' + rows(d.outs, '-') + '</tbody></table>' +
    (d.moves.length ? '<b>3. โอนระหว่างบัญชี</b><table><tbody>' + d.moves.map(function (t) { return '<tr><td style="width:72px">' + ddmmyy(t.date) + '</td><td>' + esc(t.desc) + '</td><td>' + esc(M.accName(t.account) + ' → ' + M.accName(t.toAccount)) + '</td><td class="n" style="width:96px">' + m2(t.amount) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
    '<b>' + (d.moves.length ? '4' : '3') + '. ยอดเงินคงเหลือ ณ วันที่ ' + thDate(R.asOf, false, true) + '</b><table><tbody>' + M.activeAccounts().map(function (a) { return '<tr><td>' + esc(a.name) + (a.number ? ' (' + esc(a.number) + ')' : '') + '</td><td class="n" style="width:140px">' + m2(d.bal[a.id] || 0) + '</td></tr>'; }).join('') + '<tr><th style="text-align:left">รวมเงินทั้งสิ้น</th><th class="n">' + m2(d.bal._total) + '</th></tr></tbody></table>' +
    (d.loans.length ? '<b>เงินยืม/รอเบิกคืนคงค้าง</b><table><tbody>' + d.loans.map(function (s) { return '<tr><td>' + esc(s.loan.title) + '</td><td style="width:140px">' + esc(M.memName(s.loan.party, true) || s.loan.party || '') + '</td><td class="n" style="width:96px">' + m2(s.outstanding) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
    '<div class="sign"><div>ลงชื่อ ......................................................<br>(' + esc(S.D.me.name || '') + ')<br>ผู้จัดทำรายงาน</div><div>ลงชื่อ ......................................................<br>(......................................................)<br>หัวหน้าฝ่ายทรัพยากรบุคคล</div></div>' +
    '<p style="font-size:11px;color:#777;margin-top:24px">พิมพ์จากระบบ HR Fund เมื่อ ' + esc(stampTh(S.D.now || MODEL.today())) + '</p></div>';
}

PAGES.report = { title: 'รายงานส่งไลน์', render: function (el) {
  var R = UI.rep, d = reportData(), adm = isAdmin();
  var text = R.edited != null ? R.edited : reportText(d);
  el.innerHTML = pageHead('รายงานประจำเดือน', 'รายงานส่งไลน์', 'สร้างข้อความ/ภาพสรุปยอดเงินฝ่าย ตามรูปแบบที่ใช้ส่งกลุ่มไลน์ฝ่าย', '') +
    '<div class="rep-grid"><div class="col">' +
    '<div class="card rise d1"><div class="card-h"><h3><span class="ic">' + IC.set + '</span>ตั้งค่ารายงาน</h3></div><div class="card-b col" style="gap:12px">' +
    '<label class="field"><span>อัปเดต ณ วันที่</span><input type="date" data-r="asOf" value="' + R.asOf + '"></label>' +
    '<div class="field"><span>รายการที่รวมในรายงาน</span><div class="col" style="gap:6px">' +
    '<label class="check"><input type="radio" name="rm" value="since"' + (R.mode === 'since' ? ' checked' : '') + '> รายการใหม่ตั้งแต่รายงานครั้งก่อน' + (d.last ? ' <span class="xs muted">(' + esc(stampTh(d.last.createdAt)) + ')</span>' : '') + '</label>' +
    '<label class="check"><input type="radio" name="rm" value="month"' + (R.mode === 'month' ? ' checked' : '') + '> ทั้งเดือน</label>' + (R.mode === 'month' ? '<input type="month" data-r="ym" value="' + R.ym + '">' : '') +
    '<label class="check"><input type="radio" name="rm" value="range"' + (R.mode === 'range' ? ' checked' : '') + '> กำหนดช่วงวันที่เอง</label>' + (R.mode === 'range' ? '<div class="fgrid"><input type="date" data-r="from" value="' + R.from + '" aria-label="ตั้งแต่"><input type="date" data-r="to" value="' + R.to + '" aria-label="ถึง"></div>' : '') + '</div></div>' +
    '<div class="field"><span>แสดงเพิ่ม</span><label class="check"><input type="checkbox" data-o="showMove"' + (R.showMove ? ' checked' : '') + '> รายการโอนระหว่างบัญชี</label><label class="check"><input type="checkbox" data-o="showLoans"' + (R.showLoans ? ' checked' : '') + '> เงินยืม/รอเบิกคืน</label><label class="check"><input type="checkbox" data-o="showLink"' + (R.showLink ? ' checked' : '') + '> ลิงก์ระบบท้ายข้อความ</label></div>' +
    '<p class="small">รับ <b class="in">+' + m(d.totIn) + '</b> (' + d.ins.length + ') · จ่าย <b class="out">−' + m(d.totOut) + '</b> (' + d.outs.length + ')' + (d.moves.length ? ' · โอน ' + d.moves.length : '') + '</p>' +
    (adm ? '<button class="btn btn-brand" data-saverep>' + IC.check + 'บันทึกว่าส่งรายงานแล้ว</button><p class="xs muted">กดหลังส่งไลน์ — ครั้งต่อไประบบจะเริ่มนับรายการใหม่ต่อจากรายงานนี้</p>' : '') + '</div></div>' +
    '<div class="card rise d2"><div class="card-h"><h3><span class="ic">' + IC.doc + '</span>รายงานที่ส่งแล้ว</h3></div><div class="card-b"><div class="histlist">' + (S.D.reports.slice().reverse().map(function (r) { return '<button data-hist="' + esc(r.id) + '"><span>' + esc(r.text.split('\n')[0]) + '</span><span class="xs muted">' + esc(stampTh(r.createdAt)) + '</span></button>'; }).join('') || '<div class="empty">ยังไม่มี</div>') + '</div></div></div></div>' +
    '<div class="col"><div class="tabs" role="tablist">' + [['text', 'ข้อความไลน์'], ['img', 'ภาพรายงาน'], ['a4', 'ใบรายงาน A4']].map(function (x) { return '<button role="tab" data-out="' + x[0] + '" aria-selected="' + (R.out === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="rout"></div></div></div>';
  var out = $('#rout', el);
  if (R.out === 'text') {
    out.innerHTML = '<div class="card rise"><div class="card-b col" style="padding-top:16px;gap:10px"><div class="row"><button class="btn btn-brand" data-copy>' + IC.copy + 'คัดลอกข้อความ</button><button class="btn" data-share>' + IC.line + 'ส่งไลน์</button>' + (R.edited != null ? '<button class="btn btn-ghost" data-reset>คืนค่าอัตโนมัติ</button>' : '') + '<span class="grow"></span><span class="xs muted">แก้ข้อความในกล่องได้ก่อนคัดลอก</span></div>' +
      '<textarea class="linetext" data-txt rows="22" aria-label="ข้อความรายงาน">' + esc(text) + '</textarea></div></div>';
    $('[data-txt]', out).oninput = function () { R.edited = this.value; };
    $('[data-copy]', out).onclick = function () { copyText($('[data-txt]', out).value); };
    $('[data-share]', out).onclick = function () { var t = $('[data-txt]', out).value; if (navigator.share) navigator.share({ text: t }).catch(function () { }); else window.open('https://line.me/R/share?text=' + encodeURIComponent(t), '_blank'); };
    var rs = $('[data-reset]', out); if (rs) rs.onclick = function () { R.edited = null; render(); };
  } else if (R.out === 'img') {
    out.innerHTML = '<div class="row noprint" style="margin-bottom:12px"><button class="btn btn-brand" data-png>' + IC.img + 'บันทึกภาพ PNG</button><button class="btn" data-shimg>' + IC.share + 'แชร์ภาพ</button><span class="xs muted">มือถือ: กด "แชร์ภาพ" แล้วเลือก LINE</span></div><div style="display:grid;place-items:center">' + reportCard(d) + '</div>';
    $('[data-png]', out).onclick = function () { reportImage(this).then(function (blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'รายงานเงินฝ่าย-' + R.asOf + '.png'; a.click(); }).catch(fail); };
    $('[data-shimg]', out).onclick = function () { reportImage(this).then(function (blob) { var f = new File([blob], 'รายงานเงินฝ่าย-' + R.asOf + '.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f] }).catch(function () { }); else { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = f.name; a.click(); toast('อุปกรณ์นี้แชร์ภาพตรงไม่ได้ — บันทึกภาพแล้ว ส่งไลน์ได้เลย'); } }).catch(fail); };
  } else {
    out.innerHTML = '<div class="row noprint" style="margin-bottom:12px"><button class="btn btn-brand" data-print>' + IC.print + 'พิมพ์ / บันทึก PDF</button></div><div style="overflow-x:auto">' + reportA4(d) + '</div>';
    $('[data-print]', out).onclick = function () { printA4(); };
  }
  $$('[data-out]', el).forEach(function (b) { b.onclick = function () { R.out = b.dataset.out; render(); }; });
  $$('[name=rm]', el).forEach(function (r) { r.onchange = function () { R.mode = r.value; R.edited = null; render(); }; });
  $$('[data-r]', el).forEach(function (i) { i.onchange = function () { R[i.dataset.r] = i.value; R.edited = null; render(); }; });
  $$('[data-o]', el).forEach(function (i) { i.onchange = function () { R[i.dataset.o] = i.checked; R.edited = null; render(); }; });
  $$('[data-hist]', el).forEach(function (b) { b.onclick = function () { var r = S.D.reports.filter(function (x) { return x.id === b.dataset.hist; })[0]; var md = modal({ title: 'รายงานที่ส่งแล้ว · ' + stampTh(r.createdAt), body: '<textarea class="linetext" rows="20" readonly>' + esc(r.text) + '</textarea>', foot: '<button class="btn btn-brand" data-cp>' + IC.copy + 'คัดลอก</button>' }); $('[data-cp]', md.el).onclick = function () { copyText(r.text); }; }; });
  var sv = $('[data-saverep]', el); if (sv) sv.onclick = function () {
    var t = R.edited != null ? R.edited : reportText(d), b = this;
    busy(b, api('saveReport', { asOf: R.asOf, mode: R.mode, from: R.from, to: R.to, text: t, txnIds: d.items.map(function (x) { return x.id; }) })).then(function (r) { S.D.reports.push(r.report); R.edited = null; R.mode = 'since'; render(); toast('บันทึกแล้ว · รายงานครั้งถัดไปจะเริ่มนับจากตอนนี้'); }).catch(fail);
  };
} };
function copyText(t) {
  var ok = function () { toast('คัดลอกแล้ว — วางในไลน์ได้เลย'); };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, fallback); else fallback();
  function fallback() { var ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { toast('คัดลอกไม่สำเร็จ กรุณาเลือกข้อความแล้วคัดลอกเอง', true); } ta.remove(); }
}
function reportImage(btn) {
  return busy(btn, loadScript(LIB.h2c).then(function () {
    var el = $('#rcard'); if (!el) throw new Error('ไม่พบภาพรายงาน');
    return html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
  }).then(function (cv) { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }), 'กำลังสร้างภาพ');
}
function printA4() {
  var html = $('#a4').outerHTML, w = window.open('', '_blank');
  if (!w) { window.print(); return; }
  w.document.write('<!doctype html><html lang="th"><head><meta charset="utf-8"><title>รายงานเงินฝ่าย ' + UI.rep.asOf + '</title><base href="' + location.href.replace(/[^/]*$/, '') + '"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap"><link rel="stylesheet" href="style.css"><style>body{background:#fff}.a4{box-shadow:none;margin:0 auto}@page{size:A4;margin:12mm}@media print{.a4{width:auto;padding:0}}</style></head><body>' + html + '<script>setTimeout(function(){print()},700)<\/script></body></html>');
  w.document.close();
}
