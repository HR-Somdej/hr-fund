/* =====================================================================
   members.js — เงินฝ่ายรายเดือน · สวัสดิการ & วันเกิด (ป๊อปอัปแจ้งเตือน) · เงินยืม/รอคืน
   ===================================================================== */
'use strict';
UI.duesYear = null; UI.duesSel = {}; UI.wfYear = null; UI.loanTab = 'open';

/* =====================================================================
   เงินฝ่ายรายเดือน
   ===================================================================== */
PAGES.dues = { title: 'เงินฝ่ายรายเดือน', render: function (el) {
  var D = S.D, M = MODEL, adm = isAdmin(), cur = M.today().slice(0, 7);
  var years = uniq(D.dues.map(function (d) { return +d.ym.slice(0, 4) + 543; }).concat([be(M.today()), be(M.today()) + 1])).sort();
  var Y = UI.duesYear = UI.duesYear || be(M.today()), ce = Y - 543;
  var months = []; for (var i = 1; i <= 12; i++) months.push(ce + '-' + ('0' + i).slice(-2));
  var mems = D.members.filter(function (x) { return x.active || months.some(function (ym) { return M.dues[x.empCode + '|' + ym]; }); })
    .sort(function (a, b) { return (b.rate >= 200) - (a.rate >= 200) || (a.active === b.active ? 0 : a.active ? -1 : 1) || (a.empCode < b.empCode ? -1 : 1); });
  var sm = M.duesSummary(cur), yearPaid = 0, yearDue = 0, pre = 0, unb = [], unbAmt = 0;
  mems.forEach(function (x) { months.forEach(function (ym) { var c = M.duesCell(x.empCode, ym); if (c.st === 'paid' || c.st === 'cash' || c.st === 'pre' || c.st === 'unb') yearPaid += c.amount || 0; if (c.st === 'due') yearDue += c.amount || 0; if (c.st === 'pre') pre++; if (c.st === 'unb') { unb.push(x.empCode + '|' + ym); unbAmt += c.amount || 0; } }); });
  var rate = D.settings.defaultRate;
  el.innerHTML = pageHead('งานประจำเดือน', 'เงินฝ่ายรายเดือน', 'เก็บคนละ ' + m(+rate) + ' บาท/เดือน (ตั้งรายคนได้ที่ ตั้งค่า › สมาชิก) · ' + (adm ? 'แตะช่องที่ค้างเพื่อเลือก แล้วกด "รับเงิน" — เลือกเดือนข้างหน้าได้ (จ่ายล่วงหน้า)' : 'ดูสถานะการจ่ายของสมาชิกทุกคน'),
    '<select data-dy style="width:auto" aria-label="ปี">' + years.map(function (y) { return '<option' + (y === Y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select>' +
    (adm ? '<button class="btn" data-tr>' + IC.move + 'โอนเงินฝ่ายเข้า SCB</button>' : '')) +
    '<div class="stats rise d1">' +
    statCard('in', IC.coins, 'เก็บได้ ' + thMonth(cur, true), m(sm.collected) + '<small>/ ' + m(sm.expected) + '</small>', 'จ่ายแล้ว ' + sm.paid + ' คน · ค้าง ' + sm.due + ' คน') +
    statCard('', IC.cal, 'เก็บได้ทั้งปี ' + Y, m(yearPaid), 'รวมที่จ่ายล่วงหน้า ' + pre + ' ช่อง') +
    statCard(yearDue ? 'out' : 'in', IC.warn, 'ค้างถึงเดือนนี้', m(yearDue), yearDue ? 'ยังไม่ได้รับเงิน' : 'เก็บครบแล้ว 🎉') + '</div>' +
    '<div class="card rise d2"><div class="card-h"><h3><span class="ic">' + IC.users + '</span>ตารางเงินฝ่าย ปี ' + Y + '</h3><div class="legend-cells"><span><i class="cell paid">✓</i> โอน</span><span><i class="cell cash">฿</i> เงินสด</span><span><i class="cell pre">✓</i> ล่วงหน้า</span><span><i class="cell due">ค้าง</i> ค้าง</span><span><i class="cell unb">!</i> รอลงบัญชี</span><span><i class="cell ex">–</i> ยกเว้น</span></div></div>' +
    (unb.length ? '<div class="banner warn" style="margin:0 16px 10px">' + IC.warn.replace('<svg', '<svg width="16" height="16"') + '<span class="grow">มี <b>' + unb.length + '</b> ช่อง รวม <b>' + m(unbAmt) + '</b> บาท ที่ชีทเดิมติ๊กว่าจ่ายแล้ว แต่ยังไม่ได้บันทึกรับเงินเข้าบัญชี' + (adm ? ' — เลือกแล้วกด "รับเงิน" เพื่อลงบัญชีตามวันที่ได้รับจริง' : '') + '</span>' + (adm ? '<button class="btn btn-sm" data-unb>เลือกทั้งหมด</button>' : '') + '</div>' : '') +
    '<div class="card-b tbl-wrap"><table class="dues"><thead><tr><th style="text-align:left">สมาชิก</th>' + months.map(function (ym) { return '<th class="mh' + (ym === cur ? ' cur' : '') + '" data-mh="' + ym + '" title="' + (adm ? 'เลือกช่องที่ค้างทั้งเดือน' : '') + '">' + TH_M[+ym.slice(5) - 1] + '</th>'; }).join('') + '<th>รวม</th></tr></thead><tbody>' +
    mems.map(function (x) {
      var tot = 0;
      return '<tr><td class="nm"><b>' + esc(x.fname) + '</b> ' + esc(x.lname.slice(0, 1)) + '.<small>' + (x.rate ? m(x.rate) + '/เดือน' : 'ยกเว้น') + (x.active ? '' : ' · พ้นสมาชิก') + '</small></td>' +
        months.map(function (ym) {
          var c = M.duesCell(x.empCode, ym), k = x.empCode + '|' + ym, pick = adm && (c.st === 'due' || c.st === 'fut' || c.st === 'unb' || ((c.st === 'ex' && !c.auto) || ((c.st === 'paid' || c.st === 'cash') && c.d && !c.d.txnId)));
          if (c.st === 'paid' || c.st === 'cash' || c.st === 'pre') tot += c.amount || 0;
          var lbl = { paid: '✓', cash: '฿', pre: '✓', ex: '–', due: 'ค้าง', fut: '·', na: '', unb: '!' }[c.st];
          var tip = esc(x.fname) + ' ' + thMonth(ym, true) + ' · ' + ({ paid: 'จ่ายแล้ว (โอน)', cash: 'จ่ายแล้ว (เงินสด)', pre: 'จ่ายล่วงหน้า', ex: 'ยกเว้น', due: 'ค้าง ' + m(c.amount) + ' บาท', fut: 'ยังไม่ถึงกำหนด', na: 'ไม่ได้เป็นสมาชิก', unb: 'จ่ายแล้วตามชีทเดิม · รอบันทึกรับเงินเข้าบัญชี' }[c.st]) + (c.d && c.d.paidDate ? ' · รับเงิน ' + thDate(c.d.paidDate) : '') + (c.d && c.d.note ? ' · ' + esc(c.d.note) : '');
          return '<td><button class="cell ' + c.st + (pick ? ' pick' : '') + (UI.duesSel[k] ? ' sel' : '') + '" data-c="' + k + '" data-st="' + c.st + '" data-tip="' + tip + '"' + (pick ? '' : ' tabindex="-1"') + '>' + lbl + '</button></td>';
        }).join('') + '<td class="num small" style="padding-left:8px">' + m(tot) + '</td></tr>';
    }).join('') + '</tbody><tfoot><tr><td class="nm">เก็บได้ / ควรได้</td>' + months.map(function (ym) { var s = M.duesSummary(ym); return '<td class="tnum"' + (s.collected >= s.expected && s.expected ? ' style="color:var(--in)"' : '') + '>' + mk(s.collected) + '<br><span style="opacity:.6">' + mk(s.expected) + '</span></td>'; }).join('') + '<td></td></tr></tfoot></table></div></div>' +
    '<div id="selbar"></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.list + '</span>รายการรับเงินฝ่าย ปี ' + Y + '</h3></div><div class="txlist">' +
    (M.tx.filter(function (t) { return t.category === 'DUES' && be(t.date) === Y; }).reverse().map(function (t) { return txRow(t); }).join('') || '<div class="empty">ยังไม่มีรายการ</div>') + '</div></div>';
  $('[data-dy]', el).onchange = function () { UI.duesYear = +this.value; UI.duesSel = {}; render(); };
  $$('.txlist .tx', el).forEach(function (r) { r.onclick = function () { txDetail(r.dataset.id); }; });
  var tr = $('[data-tr]', el); if (tr) tr.onclick = function () { openTxnForm({ type: 'TRANSFER', account: D.settings.duesAccount || 'CASH', toAccount: 'SCB', amount: sm.collected || '', desc: 'โอนเงินฝ่ายรายเดือน ' + thMonth(cur, true) + ' เข้าบัญชีฝ่าย SCB' }); };
  if (!adm) return;
  $$('.cell.pick', el).forEach(function (b) { b.onclick = function () { var k = b.dataset.c; if (UI.duesSel[k]) delete UI.duesSel[k]; else UI.duesSel[k] = b.dataset.st; b.classList.toggle('sel'); selBar(); }; });
  $$('[data-mh]', el).forEach(function (h) { h.onclick = function () { var ym = h.dataset.mh, cells = $$('.cell.pick[data-c$="|' + ym + '"]', el).filter(function (b) { return b.dataset.st === 'due' || b.dataset.st === 'fut' || b.dataset.st === 'unb'; }); var all = cells.every(function (b) { return UI.duesSel[b.dataset.c]; }); cells.forEach(function (b) { if (all) delete UI.duesSel[b.dataset.c]; else UI.duesSel[b.dataset.c] = b.dataset.st; b.classList.toggle('sel', !all); }); selBar(); }; });
  var ub = $('[data-unb]', el); if (ub) ub.onclick = function () { unb.forEach(function (k) { UI.duesSel[k] = 'unb'; var b = $('.cell[data-c="' + k + '"]', el); if (b) b.classList.add('sel'); }); selBar(); };
  selBar();
  function selBar() {
    var keys = Object.keys(UI.duesSel), bar = $('#selbar', el);
    if (!keys.length) { bar.innerHTML = ''; return; }
    var payK = keys.filter(function (k) { return UI.duesSel[k] === 'due' || UI.duesSel[k] === 'fut' || UI.duesSel[k] === 'unb'; });
    var clrK = keys.filter(function (k) { return UI.duesSel[k] === 'ex' || UI.duesSel[k] === 'paid' || UI.duesSel[k] === 'cash' || UI.duesSel[k] === 'unb'; });
    var tot = sum(payK, function (k) { return (M.mem[k.split('|')[0]] || {}).rate || 0; });
    bar.innerHTML = '<div class="selbar"><span>เลือก <b>' + keys.length + '</b> ช่อง' + (payK.length ? ' · รับเงิน ' + payK.length + ' ช่อง รวม <b>' + m(tot) + '</b> บาท' : '') + '</span><span class="grow"></span>' +
      (payK.length ? '<button class="btn" data-pay>' + IC.coins + 'รับเงิน</button><button class="btn btn-ghost" data-ex>ตั้งเป็นยกเว้น</button>' : '') +
      (clrK.length ? '<button class="btn btn-ghost" data-clr>ล้างสถานะ (' + clrK.length + ')</button>' : '') + '<button class="btn btn-ghost" data-cancel>ยกเลิก</button></div>';
    $('[data-cancel]', bar).onclick = function () { UI.duesSel = {}; render(); };
    var p = $('[data-pay]', bar); if (p) p.onclick = function () { payDlg(payK, tot); };
    var ex = $('[data-ex]', bar); if (ex) ex.onclick = function () {
      var md = modal({ title: 'ตั้งเป็นยกเว้น ' + payK.length + ' ช่อง', body: '<label class="field"><span>เหตุผลที่ยกเว้น</span><input type="text" data-note placeholder="เช่น ลาคลอด / ลาศึกษาต่อ" autofocus></label>', foot: '<button class="btn" data-c>ยกเลิก</button><button class="btn btn-brand" data-ok>ตั้งเป็นยกเว้น</button>' });
      $('[data-c]', md.el).onclick = md.close;
      $('[data-ok]', md.el).onclick = function () { busy(this, api('setDues', { status: 'EXEMPT', note: $('[data-note]', md.el).value, cells: payK.map(function (k) { var p = k.split('|'); return { empCode: p[0], ym: p[1] }; }) })).then(function (r) { D.dues = r.dues; UI.duesSel = {}; MODEL.build(D); md.close(); render(); toast('ตั้งยกเว้นแล้ว'); }).catch(fail); };
    };
    var cl = $('[data-clr]', bar); if (cl) cl.onclick = function () {
      confirmBox('ล้างสถานะ ' + clrK.length + ' ช่อง (ยกเว้น/จ่ายแล้วที่นำเข้าจากชีทเดิม) ให้กลับเป็น "ค้าง"?', 'ล้างสถานะ').then(function (y) {
        if (!y) return;
        api('setDues', { status: '', cells: clrK.map(function (k) { var p = k.split('|'); return { empCode: p[0], ym: p[1] }; }) }).then(function (r) { D.dues = r.dues; UI.duesSel = {}; MODEL.build(D); render(); toast('ล้างสถานะแล้ว'); }).catch(fail);
      });
    };
  }
  function payDlg(keys, tot) {
    var byMem = groupBy(keys, function (k) { return k.split('|')[0]; });
    var f = { date: M.today(), account: D.settings.duesAccount || 'CASH', method: 'TRANSFER', note: '', uploads: [] };
    var md = modal({ title: 'รับเงินฝ่ายรายเดือน', body: '<div id="pd"></div>', foot: '<button class="btn" data-x2>ยกเลิก</button><button class="btn btn-brand" data-ok>' + IC.check + 'บันทึกรับเงิน ' + m(tot) + ' บาท</button>' });
    $('[data-x2]', md.el).onclick = md.close;
    function draw() {
      var bal = M.balances();
      $('#pd', md.el).innerHTML = '<table class="tbl"><thead><tr><th>สมาชิก</th><th>เดือน</th><th class="num">จำนวน</th></tr></thead><tbody>' +
        Object.keys(byMem).map(function (c) { var ks = byMem[c].map(function (k) { return k.split('|')[1]; }).sort(); var mb = M.mem[c]; return '<tr><td>' + esc(mb.fname + ' ' + mb.lname) + '</td><td>' + ks.map(function (ym) { return thMonth(ym, true); }).join(', ') + (ks.some(function (ym) { return ym > M.today().slice(0, 7); }) ? ' <span class="chip in">ล่วงหน้า</span>' : '') + '</td><td class="num">' + m(mb.rate * ks.length) + '</td></tr>'; }).join('') +
        '</tbody><tfoot><tr><td colspan="2">รวม ' + keys.length + ' ช่อง</td><td class="num">' + m(tot) + '</td></tr></tfoot></table>' +
        '<div class="fgrid"><label class="field"><span>วันที่รับเงิน</span><input type="date" data-k="date" value="' + f.date + '"></label><div class="field"><span>วิธีจ่ายของสมาชิก</span><div class="seg"><button type="button" data-m="TRANSFER" aria-pressed="' + (f.method === 'TRANSFER') + '">โอน</button><button type="button" data-m="CASH" aria-pressed="' + (f.method === 'CASH') + '">เงินสด</button></div></div></div>' +
        '<div class="field"><span>เงินเข้าบัญชี</span><div class="accpick">' + M.activeAccounts().map(function (a) { return '<button type="button" data-acc="' + a.id + '" aria-pressed="' + (f.account === a.id) + '"><b>' + esc(a.name) + '</b><span>คงเหลือ ' + m2(bal[a.id] || 0) + '</span></button>'; }).join('') + '</div><span class="xs">ปกติเข้าบัญชีสวัสดิการ (เงินสดกองกลาง) ก่อน แล้วโอนรวมเข้า SCB ด้วยปุ่ม "โอนเงินฝ่ายเข้า SCB"</span></div>' +
        '<label class="drop">' + IC.cam + '<span>แนบสลิป (ไม่บังคับ)</span><input type="file" accept="image/*,application/pdf" multiple hidden data-file></label><div class="thumbs">' + f.uploads.map(function (u) { return '<div class="thumb">' + (u.preview ? '<img src="' + u.preview + '" alt="">' : esc(u.name)) + '</div>'; }).join('') + '</div>' +
        '<label class="field"><span>หมายเหตุ</span><input type="text" data-k="note" value="' + esc(f.note) + '"></label><div data-err></div>';
      $$('[data-k]', md.el).forEach(function (i) { i.oninput = function () { f[i.dataset.k] = i.value; }; });
      $$('[data-m]', md.el).forEach(function (b) { b.onclick = function () { f.method = b.dataset.m; draw(); }; });
      $$('[data-acc]', md.el).forEach(function (b) { b.onclick = function () { f.account = b.dataset.acc; draw(); }; });
      $('[data-file]', md.el).onchange = function () { Array.prototype.forEach.call(this.files, function (file) { (/^image\//.test(file.type) ? compressImage(file) : new Promise(function (res) { var rd = new FileReader(); rd.onload = function () { res({ name: file.name, mime: file.type, data: String(rd.result).split(',')[1] }); }; rd.readAsDataURL(file); })).then(function (u) { f.uploads.push(u); draw(); }); }); };
    }
    draw();
    $('[data-ok]', md.el).onclick = function () {
      busy(this, api('payDues', { date: f.date, account: f.account, method: f.method, note: f.note, uploads: f.uploads.map(function (u) { return { name: u.name, mime: u.mime, data: u.data }; }),
        items: keys.map(function (k) { var p = k.split('|'); return { empCode: p[0], ym: p[1] }; }) }), 'กำลังบันทึก').then(function (r) {
        D.txns.push(r.txn); D.dues = D.dues.filter(function (d) { return !r.dues.some(function (x) { return x.empCode === d.empCode && x.ym === d.ym; }); }).concat(r.dues);
        UI.duesSel = {}; MODEL.build(D); md.close(); render(); toast('บันทึกรับเงินฝ่าย ' + m(r.txn.amount) + ' บาทแล้ว');
      }).catch(function (e) { $('[data-err]', md.el).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; });
    };
  }
} };

/* =====================================================================
   สวัสดิการ & วันเกิด
   ===================================================================== */
function bdRow(b) {
  var x = b.m, d = pd(b.date), adm = isAdmin();
  var when = b.days === 0 ? '<b style="color:var(--brand-ink)">วันนี้! 🎂</b>' : b.days > 0 ? 'อีก ' + b.days + ' วัน' : 'ผ่านมา ' + (-b.days) + ' วัน';
  return '<div class="bd' + (b.days === 0 ? ' today' : '') + '"><div class="cake"><div><b>' + d.getDate() + '</b>' + TH_M[d.getMonth()] + '</div></div><div class="t"><b>คุณ' + esc(x.fname) + ' ' + esc(x.lname) + '</b><span>' + when + ' · ' + (b.used ? '<span class="chip ok">ใช้สิทธิปี ' + b.year + ' แล้ว</span>' : '<span class="chip warn">ยังไม่ได้รับสวัสดิการ</span>') + '</span></div>' +
    (adm && !b.used ? '<button class="btn btn-sm btn-soft" data-paybd="' + x.empCode + '" data-date="' + b.date + '">' + IC.cake + 'จ่าย ' + m(+S.D.settings.bdayAmount) + '</button>' : '') + '</div>';
}
function bindBdRows(root, after) {
  $$('[data-paybd]', root).forEach(function (b) { b.onclick = function () { if (after) after(); payWelfare(b.dataset.paybd, 'BDAY', b.dataset.date); }; });
}
function payWelfare(code, type, date) {
  var x = MODEL.mem[code], st = S.D.settings;
  openTxnForm({ type: 'OUT', category: type, beneficiaries: [code], amount: String(type === 'BDAY' ? st.bdayAmount : st.sickAmount), account: 'CASH', payee: code,
    date: MODEL.today(), desc: type === 'BDAY' ? 'HBD ' + (x.bd ? x.bd.split('-').reverse().join('/') : '') + ' คุณ' + x.fname : 'ค่าเยี่ยมไข้ คุณ' + x.fname });
}
function birthdayPopup(force) {
  if (!S.D || S.D.me.mustChange) return;
  var key = 'bdpop:' + S.D.me.user, today = MODEL.today();
  if (!force && store(key) === today) return;
  var list = MODEL.upcomingBirthdays(+S.D.settings.birthdayDays || 7, isAdmin() ? 30 : 0);
  if (!list.length) { if (force) toast('ไม่มีวันเกิดในช่วงนี้'); return; }
  store(key, today);
  var nToday = list.filter(function (b) { return b.days === 0; }).length;
  var md = modal({ cls: 'bdpop', head: '<div style="flex:1"><div class="xs" style="opacity:.85">แจ้งเตือนวันเกิดสมาชิกฝ่าย</div><h3 style="font-size:1.25rem">' + (nToday ? '🎉 วันนี้มีวันเกิด ' + nToday + ' คน' : '🎂 วันเกิดที่กำลังจะถึง') + '</h3></div>',
    body: '<div class="bdlist">' + list.map(bdRow).join('') + '</div><p class="xs muted">สวัสดิการวันเกิด ' + m(+S.D.settings.bdayAmount) + ' บาท/คน/ปี (ปีปฏิทิน) · ' + (isAdmin() ? 'แสดงวันเกิดใน ' + (S.D.settings.birthdayDays || 7) + ' วันข้างหน้า และที่ผ่านมาแล้วแต่ยังไม่ได้จ่าย' : 'แสดงวันเกิดใน ' + (S.D.settings.birthdayDays || 7) + ' วันข้างหน้า') + '</p>',
    foot: '<button class="btn" data-wf>ดูสวัสดิการทั้งหมด</button><button class="btn btn-brand" data-ok>รับทราบ</button>' });
  if (nToday && !REDUCED) { var cf = document.createElement('div'); cf.className = 'confetti'; var cols = ['#e0303f', '#eda100', '#1baf7a', '#2a78d6', '#e87ba4']; for (var i = 0; i < 26; i++) { var c = document.createElement('i'); c.style.left = (Math.random() * 100) + '%'; c.style.background = cols[i % 5]; c.style.animationDelay = (Math.random() * .8) + 's'; cf.appendChild(c); } $('.modal-h', md.el).appendChild(cf); }
  $('[data-ok]', md.el).onclick = md.close;
  $('[data-wf]', md.el).onclick = function () { md.close(); go('welfare'); };
  bindBdRows(md.el, md.close);
}
PAGES.welfare = { title: 'สวัสดิการ & วันเกิด', render: function (el) {
  var D = S.D, M = MODEL, adm = isAdmin(), st = D.settings;
  var ys = uniq(D.welfare.map(function (w) { return w.year; }).concat([be(M.today())])).sort();
  var Y = UI.wfYear = UI.wfYear || be(M.today());
  var mems = D.members.filter(function (x) { return x.active; }).sort(function (a, b) { return (a.bd || '99') < (b.bd || '99') ? -1 : 1; });
  var up = M.upcomingBirthdays(45, adm ? 60 : 0);
  var usedB = mems.filter(function (x) { return M.welfareOf(Y, x.empCode, 'BDAY').length; }).length, usedS = mems.filter(function (x) { return M.welfareOf(Y, x.empCode, 'SICK').length; }).length;
  var spentB = sum(D.welfare.filter(function (w) { return w.year === Y && w.type === 'BDAY'; }), function (w) { return w.amount; }), spentS = sum(D.welfare.filter(function (w) { return w.year === Y && w.type === 'SICK'; }), function (w) { return w.amount; });
  var cm = +M.today().slice(5, 7);
  el.innerHTML = pageHead('สิทธิสวัสดิการสมาชิก (ปีปฏิทิน)', 'สวัสดิการ & วันเกิด', 'วันเกิด ' + m(+st.bdayAmount) + ' บาท/คน/ปี · ค่าเยี่ยมไข้ ' + m(+st.sickAmount) + ' บาท/คน/ปี (ครั้งเดียว)',
    '<select data-wy style="width:auto" aria-label="ปี">' + ys.map(function (y) { return '<option' + (y === Y ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select><button class="btn" data-pop>' + IC.cake + 'แจ้งเตือนวันเกิด</button>') +
    '<div class="stats rise d1">' + statCard('', IC.cake, 'ใช้สิทธิวันเกิดปี ' + Y, usedB + '<small>/ ' + mems.length + ' คน</small>', 'จ่ายแล้ว ' + m(spentB) + ' บาท') +
    statCard('', IC.hand, 'ใช้สิทธิเยี่ยมไข้ปี ' + Y, usedS + '<small>/ ' + mems.length + ' คน</small>', 'จ่ายแล้ว ' + m(spentS) + ' บาท') +
    statCard('', IC.cal, 'วันเกิดเดือน' + TH_MF[cm - 1], mems.filter(function (x) { return x.bd && +x.bd.slice(0, 2) === cm; }).length + '<small>คน</small>', mems.filter(function (x) { return x.bd && +x.bd.slice(0, 2) === cm; }).map(function (x) { return x.fname; }).join(', ') || '—') +
    statCard('', IC.coins, 'คาดว่าต้องใช้ทั้งปี', m(mems.length * (+st.bdayAmount)), 'วันเกิดครบทุกคน (ไม่รวมเยี่ยมไข้)') + '</div>' +
    '<div class="grid-2"><div class="card rise d2"><div class="card-h"><h3><span class="ic">' + IC.cake + '</span>วันเกิดที่กำลังจะถึง (45 วัน)</h3></div><div class="card-b"><div class="bdlist">' + (up.map(bdRow).join('') || '<div class="empty">ไม่มี</div>') + '</div></div></div>' +
    '<div class="card rise d3"><div class="card-h"><h3><span class="ic">' + IC.cal + '</span>ปฏิทินวันเกิดทั้งปี</h3></div><div class="card-b"><div class="chart short"><canvas id="cBd"></canvas></div></div></div></div>' +
    '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.users + '</span>สถานะสิทธิรายคน ปี ' + Y + '</h3></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>สมาชิก</th><th>วันเกิด</th><th>สวัสดิการวันเกิด</th><th>ค่าเยี่ยมไข้</th></tr></thead><tbody>' +
    mems.map(function (x) {
      var b = M.welfareOf(Y, x.empCode, 'BDAY'), s = M.welfareOf(Y, x.empCode, 'SICK');
      var bdThis = x.bd ? (Y - 543) + '-' + x.bd : '', passed = bdThis && bdThis <= M.today();
      var cellW = function (arr, type) {
        if (arr.length) return '<span class="chip ok">' + IC.check + 'ใช้แล้ว' + (arr[0].date ? ' ' + thDate(arr[0].date) : '') + '</span>' + (arr[0].txnId && M.txById[arr[0].txnId] ? ' <a href="#" class="xs" data-tx="' + arr[0].txnId + '">ดูรายการ</a>' : '') + (arr.length > 1 ? ' <span class="chip warn">+' + (arr.length - 1) + ' ครั้ง</span>' : '');
        if (Y !== be(M.today())) return '<span class="muted small">ไม่ได้ใช้</span>';
        return (type === 'BDAY' && passed ? '<span class="chip warn">ถึงกำหนดแล้ว</span>' : '<span class="chip idle">ยังไม่ใช้</span>') + (adm ? ' <button class="btn btn-sm btn-ghost" data-pw="' + x.empCode + '" data-t="' + type + '">จ่าย</button>' : '');
      };
      return '<tr><td>' + esc(x.title + x.fname + ' ' + x.lname) + '</td><td>' + (x.bd ? +x.bd.slice(3) + ' ' + TH_M[+x.bd.slice(0, 2) - 1] : '<span class="muted">—</span>') + '</td><td>' + cellW(b, 'BDAY') + '</td><td>' + cellW(s, 'SICK') + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
  $('[data-wy]', el).onchange = function () { UI.wfYear = +this.value; render(); };
  $('[data-pop]', el).onclick = function () { birthdayPopup(true); };
  $$('[data-pw]', el).forEach(function (b) { b.onclick = function () { payWelfare(b.dataset.pw, b.dataset.t); }; });
  $$('[data-tx]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); txDetail(a.dataset.tx); }; });
  bindBdRows(el);
  CH.load().then(function () {
    if (S.page !== 'welfare') return; CH.theme();
    var cnt = TH_M.map(function (x, i) { return mems.filter(function (mb) { return mb.bd && +mb.bd.slice(0, 2) === i + 1; }).length; });
    CH.make($('#cBd'), { type: 'bar', data: { labels: TH_M, datasets: [{ label: 'จำนวนคน', data: cnt, backgroundColor: TH_M.map(function (x, i) { return i + 1 === cm ? cssv('--brand') : CH.alpha(cssv('--brand'), .35); }), borderRadius: 6 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { var n = mems.filter(function (mb) { return mb.bd && +mb.bd.slice(0, 2) === c.dataIndex + 1; }).map(function (mb) { return mb.fname + ' ' + +mb.bd.slice(3); }); return ' ' + n.join(', '); } } } }, scales: { x: CH.xPlain, y: { ticks: { stepSize: 1 }, grid: { color: cssv('--line-2') } } } } });
  }).catch(function () { });
} };

/* =====================================================================
   เงินยืม / รอคืน
   ===================================================================== */
PAGES.loans = { title: 'เงินยืม / รอคืน', render: function (el) {
  var D = S.D, M = MODEL;
  var all = D.loans.map(function (l) { return M.loanState(l.id); }).sort(function (a, b) { return (b.date || '') < (a.date || '') ? -1 : 1; });
  var open = all.filter(function (s) { return s.loan.status === 'OPEN' && s.outstanding > 0.004; });
  var aOut = r2(sum(open.filter(function (s) { return s.loan.direction === 'ADV'; }), function (s) { return s.outstanding; })), bOut = r2(sum(open.filter(function (s) { return s.loan.direction === 'BOR'; }), function (s) { return s.outstanding; }));
  var show = UI.loanTab === 'open' ? open : UI.loanTab === 'closed' ? all.filter(function (s) { return open.indexOf(s) < 0; }) : all;
  el.innerHTML = pageHead('ติดตามเงินหมุน', 'เงินยืม / รอคืน', 'เงินที่ฝ่ายให้ยืม/สำรองจ่ายรอเบิกคืน และเงินที่ฝ่ายยืมจากบุคคล — ไม่นับเป็นรายรับ/รายจ่ายของฝ่าย', isAdmin() ? '<button class="btn btn-brand" data-new>' + IC.plus + 'บันทึกเงินยืม</button>' : '') +
    '<div class="stats rise d1">' + statCard('loan', IC.loan, 'ฝ่ายรอรับคืน', m(aOut), open.filter(function (s) { return s.loan.direction === 'ADV'; }).length + ' รายการ') +
    statCard(bOut ? 'out' : '', IC.hand, 'ฝ่ายค้างคืนผู้อื่น', m(bOut), open.filter(function (s) { return s.loan.direction === 'BOR'; }).length + ' รายการ') +
    statCard('', IC.check, 'ปิดแล้วทั้งหมด', all.length - open.length + '<small>รายการ</small>', 'ตั้งแต่เริ่มบันทึก') + '</div>' +
    '<div class="tabs" role="tablist">' + [['open', 'ค้างอยู่ (' + open.length + ')'], ['closed', 'ปิดแล้ว'], ['all', 'ทั้งหมด']].map(function (x) { return '<button role="tab" data-lt="' + x[0] + '" aria-selected="' + (UI.loanTab === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
    '<div class="loancards rise d2">' + (show.map(loanCard).join('') || '<div class="card"><div class="empty">' + IC.check + 'ไม่มีรายการ</div></div>') + '</div>';
  $$('[data-lt]', el).forEach(function (b) { b.onclick = function () { UI.loanTab = b.dataset.lt; render(); }; });
  $$('[data-loan]', el).forEach(function (b) { b.onclick = function () { loanDetail(b.dataset.loan); }; });
  var nw = $('[data-new]', el); if (nw) nw.onclick = function () { openTxnForm({ type: 'ADV' }); };
} };
function loanCard(s) {
  var l = s.loan, age = daysBetween(s.date, MODEL.today()), closed = !(l.status === 'OPEN' && s.outstanding > 0.004);
  var who = MODEL.memName(l.party) || l.party || '—';
  return '<button class="loancard' + (closed ? ' closed' : '') + '" data-loan="' + esc(l.id) + '" style="cursor:pointer;text-align:left;font:inherit;color:inherit"><div class="top"><div class="ell"><span class="chip ' + (l.direction === 'BOR' ? 'out' : 'loan') + '">' + (l.direction === 'BOR' ? 'ฝ่ายยืมจาก' : 'ให้ยืม/สำรองจ่าย') + '</span><h4 style="margin-top:6px;font-size:.98rem">' + esc(l.title) + '</h4></div>' +
    (l.status === 'WRITEOFF' ? '<span class="chip idle">ตัดเป็นรายจ่าย</span>' : closed ? '<span class="chip ok">' + IC.check + 'ปิดแล้ว</span>' : '<span class="chip warn">' + age + ' วัน</span>') + '</div>' +
    '<div class="big">' + m(closed ? s.given : s.outstanding) + '<small class="muted" style="font-size:.8rem;font-weight:500"> บาท' + (closed ? '' : ' ค้าง') + '</small></div>' +
    '<div class="small muted">' + esc(who) + ' · ' + esc(thDate(s.date)) + ' · ' + esc(MODEL.accName(s.account, true)) + (s.back ? ' · คืนแล้ว ' + m(s.back) : '') + (l.dueDate ? ' · กำหนดคืน ' + thDate(l.dueDate) : '') + '</div>' +
    (s.given ? '<div class="bar"><i style="width:' + Math.min(100, s.back / s.given * 100) + '%;background:var(--in)"></i></div>' : '') + '</button>';
}
function loanDetail(id) {
  var M = MODEL, s = M.loanState(id), l = s.loan; if (!l) return toast('ไม่พบรายการเงินยืม', true);
  var adm = isAdmin(), open = l.status === 'OPEN' && s.outstanding > 0.004;
  var md = modal({ title: l.direction === 'BOR' ? 'เงินที่ฝ่ายยืมมา' : 'เงินให้ยืม / สำรองจ่าย', body:
    '<h3>' + esc(l.title) + '</h3><dl class="kv"><dt>' + (l.direction === 'BOR' ? 'ยืมจาก' : 'ผู้ยืม') + '</dt><dd>' + esc(M.memName(l.party, true) || l.party || '—') + '</dd><dt>ยอดยืม</dt><dd class="amt">' + m(s.given) + ' บาท</dd><dt>คืนแล้ว</dt><dd class="amt in">' + m(s.back) + ' บาท</dd><dt>คงค้าง</dt><dd class="amt loan" style="font-size:1.3rem">' + m(s.outstanding) + ' บาท</dd>' +
    (l.category ? '<dt>หมวด</dt><dd>' + esc(M.catName(l.category)) + '</dd>' : '') + (l.dueDate ? '<dt>กำหนดคืน</dt><dd>' + thDate(l.dueDate, false, true) + '</dd>' : '') + '<dt>สถานะ</dt><dd>' + ({ OPEN: 'ค้างอยู่', CLOSED: 'ปิดแล้ว ' + thDate(l.closedAt), WRITEOFF: 'ตัดเป็นรายจ่ายแล้ว ' + thDate(l.closedAt) }[l.status] || l.status) + '</dd></dl>' +
    '<div class="card" style="box-shadow:none"><div class="txlist">' + s.txns.map(function (t) { return txRow(t); }).join('') + '</div></div>',
    foot: adm ? (l.status === 'WRITEOFF' ? '<button class="btn" data-reopen>ยกเลิกการตัดรายจ่าย</button>' : (open && l.direction === 'ADV' ? '<button class="btn btn-ghost" data-wo>ตัดเป็นรายจ่าย (ไม่ได้คืน)</button>' : '')) + '<span class="grow"></span>' + (open ? '<button class="btn btn-brand" data-back>' + IC.refund + (l.direction === 'BOR' ? 'คืนเงิน' : 'รับคืน') + '</button>' : '') : '' });
  $$('.tx', md.el).forEach(function (r) { r.onclick = function () { md.close(); txDetail(r.dataset.id); }; });
  if (!adm) return;
  var bk = $('[data-back]', md.el); if (bk) bk.onclick = function () { md.close(); openTxnForm({ type: l.direction === 'BOR' ? 'BORR' : 'ADVR', loanId: l.id, amount: String(s.outstanding), account: s.account, desc: (l.direction === 'BOR' ? 'คืนเงินยืม ' : 'รับคืน ') + l.title, payee: MODEL.mem[l.party] ? l.party : '' }); };
  var wo = $('[data-wo]', md.el); if (wo) wo.onclick = function () { var b = this; confirmBox('ตัดยอดค้าง ' + m(s.outstanding) + ' บาท เป็นรายจ่ายหมวด "' + M.catName(l.category || 'OTHER_OUT') + '" (กรณีไม่ได้รับคืน)?', 'ตัดเป็นรายจ่าย').then(function (y) { if (y) busy(b, api('saveLoan', { id: l.id, status: 'WRITEOFF', closedAt: M.today() })).then(function (r) { S.D.loans = S.D.loans.map(function (x) { return x.id === l.id ? r.loan : x; }); MODEL.build(S.D); md.close(); render(); toast('ตัดเป็นรายจ่ายแล้ว'); }).catch(fail); }); };
  var ro = $('[data-reopen]', md.el); if (ro) ro.onclick = function () { busy(this, api('saveLoan', { id: l.id, status: 'REOPEN' })).then(function (r) { S.D.loans = S.D.loans.map(function (x) { return x.id === l.id ? r.loan : x; }); MODEL.build(S.D); md.close(); render(); }).catch(fail); };
}
