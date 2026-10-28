/* =====================================================================
   settings.js — ตั้งค่า (แอดมิน): ผู้ใช้และสิทธิ์ · สมาชิก · บัญชีเงิน · หมวดหมู่ · ค่าระบบ · ประวัติการใช้งาน
   ===================================================================== */
'use strict';
UI.setTab = 'users';
PAGES.settings = { title: 'ตั้งค่า', admin: true, render: function (el) {
  var tabs = [['users', 'ผู้ใช้และสิทธิ์'], ['members', 'สมาชิกฝ่าย'], ['accounts', 'บัญชีเงิน'], ['cats', 'หมวดหมู่'], ['system', 'ค่าระบบ'], ['audit', 'ประวัติการใช้งาน'], ['about', 'เกี่ยวกับระบบ']];
  el.innerHTML = pageHead('สำหรับแอดมิน', 'ตั้งค่า', 'แอดมินหลัก: ' + esc(MODEL.memName(S.D.settings.owner, true) || S.D.settings.owner) + ' · เพิ่ม/ถอดแอดมินได้เฉพาะแอดมินหลัก', '') +
    '<div class="setgrid"><nav class="setnav" aria-label="หมวดตั้งค่า">' + tabs.map(function (t) { return '<button data-st="' + t[0] + '" aria-current="' + (UI.setTab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</nav><div id="sbox" class="col"></div></div>';
  $$('[data-st]', el).forEach(function (b) { b.onclick = function () { UI.setTab = b.dataset.st; render(); }; });
  var box = $('#sbox', el);
  ({ users: setUsers, members: setMembers, accounts: setAccounts, cats: setCats, system: setSystem, audit: setAudit, about: setAbout })[UI.setTab](box);
} };

function setUsers(box) {
  var D = S.D, owner = D.me.role === 'owner', users = (D.users || []).slice().sort(function (a, b) { var o = { owner: 0, admin: 1, viewer: 2 }; return o[a.role] - o[b.role] || (a.name < b.name ? -1 : 1); });
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.users + '</span>ผู้ใช้ระบบ (' + users.length + ')</h3><button class="btn btn-sm btn-brand" data-add>' + IC.plus + 'เพิ่มผู้ใช้ (ไม่ใช่สมาชิก)</button></div>' +
    '<div class="card-b"><p class="small muted" style="margin-bottom:10px">สมาชิกฝ่ายทุกคนเข้าระบบได้อัตโนมัติด้วยรหัสพนักงาน (สิทธิ์ผู้ดู: เห็นแดชบอร์ด รายการทั้งหมด และรายงาน) · แอดมิน = บันทึก/แก้ไขได้ · รหัสผ่านเริ่มต้น = รหัสพนักงาน</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อ</th><th>รหัส</th><th>สิทธิ์</th><th>เข้าใช้ล่าสุด</th><th></th></tr></thead><tbody>' +
    users.map(function (u) {
      return '<tr><td>' + esc(u.name) + (u.active ? '' : ' <span class="chip idle">ปิดใช้งาน</span>') + (u.mustChange ? ' <span class="chip warn">ยังไม่ตั้งรหัส</span>' : '') + '</td><td class="tnum">' + esc(u.empCode) + '</td><td><span class="chip ' + (u.role === 'owner' ? 'brand' : u.role === 'admin' ? 'move' : 'idle') + '">' + ({ owner: 'แอดมินหลัก', admin: 'แอดมิน', viewer: 'ผู้ดู' }[u.role]) + '</span></td><td class="small muted">' + esc(stampTh(u.lastLogin) || '—') + '</td><td class="num">' +
        (owner && u.role === 'viewer' && u.active ? '<button class="btn btn-sm" data-mk="' + u.empCode + '">ตั้งเป็นแอดมิน</button> ' : '') +
        (owner && u.role === 'admin' ? '<button class="btn btn-sm" data-rm="' + u.empCode + '">ถอดแอดมิน</button> <button class="btn btn-sm btn-ghost" data-own="' + u.empCode + '">โอนแอดมินหลัก</button> ' : '') +
        (u.role !== 'owner' && (owner || u.role === 'viewer') ? '<button class="btn btn-sm btn-ghost" data-rs="' + u.empCode + '" title="รีเซ็ตรหัสผ่านเป็นรหัสพนักงาน">' + IC.key + '</button>' : '') +
        (!MODEL.mem[u.empCode] && u.role !== 'owner' ? '<button class="btn btn-sm btn-ghost" data-tg="' + u.empCode + '">' + (u.active ? 'ปิด' : 'เปิด') + '</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></div></div>';
  var upd = function (r, msg) { D.users = r.users; render(); toast(msg); };
  $$('[data-mk]', box).forEach(function (b) { b.onclick = function () { busy(b, api('saveUser', { empCode: b.dataset.mk, role: 'admin' })).then(function (r) { upd(r, 'ตั้งเป็นแอดมินแล้ว'); }).catch(fail); }; });
  $$('[data-rm]', box).forEach(function (b) { b.onclick = function () { busy(b, api('saveUser', { empCode: b.dataset.rm, role: 'viewer' })).then(function (r) { upd(r, 'ถอดสิทธิ์แอดมินแล้ว'); }).catch(fail); }; });
  $$('[data-own]', box).forEach(function (b) { b.onclick = function () { confirmBox('โอนสิทธิ์แอดมินหลักให้ ' + MODEL.memName(b.dataset.own, true) + '? คุณจะเป็นแอดมินทั่วไป', 'โอนสิทธิ์', true).then(function (y) { if (y) busy(b, api('saveUser', { empCode: b.dataset.own, role: 'owner' })).then(function () { reload().then(function () { toast('โอนสิทธิ์แอดมินหลักแล้ว'); }); }).catch(fail); }); }; });
  $$('[data-rs]', box).forEach(function (b) { b.onclick = function () { confirmBox('รีเซ็ตรหัสผ่านของ ' + (MODEL.memName(b.dataset.rs, true) || b.dataset.rs) + ' เป็นรหัสพนักงาน?', 'รีเซ็ต').then(function (y) { if (y) busy(b, api('resetPassword', { empCode: b.dataset.rs })).then(function (r) { toast(r.message); reload(true); }).catch(fail); }); }; });
  $$('[data-tg]', box).forEach(function (b) { b.onclick = function () { var u = D.users.filter(function (x) { return x.empCode === b.dataset.tg; })[0]; busy(b, api('saveUser', { empCode: u.empCode, name: u.name, role: u.role, active: !u.active })).then(function (r) { upd(r, 'บันทึกแล้ว'); }).catch(fail); }; });
  $('[data-add]', box).onclick = function () {
    var md = modal({ title: 'เพิ่มผู้ใช้ (ไม่ใช่สมาชิกฝ่าย)', body: '<p class="small muted">เช่น ผู้บริหาร/ผู้ตรวจสอบ ที่ต้องการดูยอดเงินฝ่าย · สมาชิกฝ่ายให้เพิ่มที่แท็บ "สมาชิกฝ่าย"</p><div class="fgrid"><label class="field"><span>รหัสพนักงาน</span><input data-k="c" inputmode="numeric"></label><label class="field"><span>ชื่อ-สกุล</span><input data-k="n"></label></div>' + (D.me.role === 'owner' ? '<label class="check"><input type="checkbox" data-k="a"> เป็นแอดมิน (บันทึก/แก้ไขได้)</label>' : '') + '<div data-err></div>',
      foot: '<button class="btn btn-brand" data-ok>เพิ่มผู้ใช้</button>' });
    $('[data-ok]', md.el).onclick = function () { var a = $('[data-k=a]', md.el); busy(this, api('saveUser', { empCode: $('[data-k=c]', md.el).value, name: $('[data-k=n]', md.el).value, role: a && a.checked ? 'admin' : 'viewer' })).then(function (r) { md.close(); upd(r, 'เพิ่มผู้ใช้แล้ว · รหัสผ่านเริ่มต้น = รหัสพนักงาน'); }).catch(function (e) { $('[data-err]', md.el).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; }); };
  };
}

function setMembers(box) {
  var D = S.D, list = D.members.slice().sort(function (a, b) { return (b.active - a.active) || (a.fname < b.fname ? -1 : 1); });
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.users + '</span>สมาชิกฝ่าย (' + list.filter(function (x) { return x.active; }).length + ' คน)</h3><button class="btn btn-sm btn-brand" data-add>' + IC.plus + 'เพิ่มสมาชิก</button></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>ชื่อ-สกุล</th><th>รหัส</th><th>วันเกิด</th><th class="num">เงินฝ่าย/เดือน</th><th>สถานะ</th><th></th></tr></thead><tbody>' +
    list.map(function (x) { return '<tr' + (x.active ? '' : ' style="opacity:.55"') + '><td>' + esc(x.title + x.fname + ' ' + x.lname) + (x.note ? '<br><span class="xs muted">' + esc(x.note) + '</span>' : '') + '</td><td class="tnum">' + esc(x.empCode) + '</td><td>' + (x.birth ? thDate(x.birth, false, true) : '—') + '</td><td class="num">' + (x.rate ? m(x.rate) : '<span class="chip idle">ยกเว้น</span>') + '</td><td>' + (x.active ? '<span class="chip ok">สมาชิก</span>' : '<span class="chip idle">พ้นสมาชิก ' + esc(x.leaveYm ? thMonth(x.leaveYm, true) : '') + '</span>') + '</td><td class="num"><button class="btn btn-sm" data-ed="' + x.empCode + '">' + IC.edit + 'แก้ไข</button></td></tr>'; }).join('') + '</tbody></table></div></div>';
  $('[data-add]', box).onclick = function () { memberForm(); };
  $$('[data-ed]', box).forEach(function (b) { b.onclick = function () { memberForm(MODEL.mem[b.dataset.ed]); }; });
}
function memberForm(x) {
  var isNew = !x; x = x || { empCode: '', title: 'นางสาว', fname: '', lname: '', birth: '', rate: +S.D.settings.defaultRate, active: true, joinYm: MODEL.today().slice(0, 7), leaveYm: '', note: '' };
  var md = modal({ title: isNew ? 'เพิ่มสมาชิกฝ่าย' : 'แก้ไขสมาชิก', body:
    '<div class="fgrid"><label class="field"><span>รหัสพนักงาน <i class="req">*</i></span><input data-k="empCode" inputmode="numeric" value="' + esc(x.empCode) + '"' + (isNew ? ' autofocus' : ' disabled') + '></label><label class="field"><span>คำนำหน้า</span><select data-k="title">' + ['นาย', 'นาง', 'นางสาว', 'แพทย์หญิง', 'นายแพทย์'].map(function (t) { return '<option' + (x.title === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>' +
    '<label class="field"><span>ชื่อ <i class="req">*</i></span><input data-k="fname" value="' + esc(x.fname) + '"></label><label class="field"><span>นามสกุล</span><input data-k="lname" value="' + esc(x.lname) + '"></label>' +
    '<label class="field"><span>วันเกิด (ใช้แจ้งเตือน/สิทธิวันเกิด)</span><input type="date" data-k="birth" value="' + esc(x.birth) + '"></label><label class="field"><span>เงินฝ่ายต่อเดือน (บาท) · 0 = ยกเว้น</span><input data-k="rate" inputmode="decimal" value="' + esc(x.rate) + '"></label>' +
    '<label class="field"><span>เริ่มเป็นสมาชิก (เดือน)</span><input type="month" data-k="joinYm" value="' + esc(x.joinYm || '') + '"></label><label class="field"><span>พ้นสมาชิก (เดือนสุดท้ายที่จ่าย)</span><input type="month" data-k="leaveYm" value="' + esc(x.leaveYm || '') + '"></label></div>' +
    '<label class="check"><input type="checkbox" data-k="active"' + (x.active ? ' checked' : '') + '> ยังเป็นสมาชิก (ปิด = ลาออก/ย้าย · เข้าระบบไม่ได้)</label><label class="field"><span>หมายเหตุ</span><input data-k="note" value="' + esc(x.note || '') + '" placeholder="เช่น หัวหน้าฝ่าย เดือนละ 200 / เดิมชื่อ…"></label><div data-err></div>',
    foot: '<button class="btn" data-c>ยกเลิก</button><button class="btn btn-brand" data-ok>' + IC.check + 'บันทึก</button>' });
  $('[data-c]', md.el).onclick = md.close;
  $('[data-ok]', md.el).onclick = function () {
    var v = function (k) { var i = $('[data-k=' + k + ']', md.el); return i.type === 'checkbox' ? i.checked : i.value; };
    busy(this, api('saveMember', { isNew: isNew, empCode: v('empCode') || x.empCode, title: v('title'), fname: v('fname'), lname: v('lname'), birth: v('birth'), rate: v('rate'), joinYm: v('joinYm'), leaveYm: v('leaveYm'), active: v('active'), note: v('note') })).then(function (r) {
      S.D.members = S.D.members.filter(function (z) { return z.empCode !== r.member.empCode; }).concat([r.member]); MODEL.build(S.D); md.close(); render(); toast(isNew ? 'เพิ่มสมาชิกแล้ว · เข้าระบบด้วยรหัสพนักงาน' : 'บันทึกแล้ว'); reload(true);
    }).catch(function (e) { $('[data-err]', md.el).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; });
  };
}

function setAccounts(box) {
  var bal = MODEL.balances();
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.bank + '</span>บัญชีเงิน</h3><button class="btn btn-sm btn-brand" data-add>' + IC.plus + 'เพิ่มบัญชี</button></div><div class="card-b tbl-wrap"><table class="tbl"><thead><tr><th>บัญชี</th><th>ชื่อในรายงาน</th><th>ข้อความวิธีโอน</th><th class="num">คงเหลือ</th><th></th></tr></thead><tbody>' +
    S.D.accounts.map(function (a) { return '<tr' + (a.active ? '' : ' style="opacity:.55"') + '><td><span class="row" style="gap:7px"><i class="dot" style="background:' + esc(a.color) + '"></i><b>' + esc(a.name) + '</b></span><span class="xs muted">' + esc(a.kind === 'CASH' ? 'เงินสด' : 'ธนาคาร') + (a.number ? ' · ' + esc(a.number) : '') + (a.note ? ' · ' + esc(a.note) : '') + '</span></td><td class="small">' + esc(a.reportName) + '</td><td class="small">' + esc(a.payVerb) + '</td><td class="num">' + m2(bal[a.id] || 0) + '</td><td class="num"><button class="btn btn-sm" data-ed="' + a.id + '">' + IC.edit + '</button></td></tr>'; }).join('') + '</tbody></table><p class="xs muted" style="margin-top:8px">"ชื่อในรายงาน" = บรรทัดยอดคงเหลือในข้อความไลน์ · "ข้อความวิธีโอน" = ข้อความในวงเล็บท้ายรายการ เช่น (โอน SCB 27/08)</p></div></div>';
  var form = function (a) {
    var isNew = !a; a = a || { name: '', short: '', reportName: '', payVerb: '', kind: 'BANK', number: '', color: '#2a78d6', active: true, note: '' };
    var md = modal({ title: isNew ? 'เพิ่มบัญชีเงิน' : 'แก้ไขบัญชี', body: '<div class="fgrid"><label class="field"><span>ชื่อบัญชี</span><input data-k="name" value="' + esc(a.name) + '"></label><label class="field"><span>ชื่อย่อ</span><input data-k="short" value="' + esc(a.short) + '"></label>' +
      '<label class="field"><span>ชื่อในรายงาน</span><input data-k="reportName" value="' + esc(a.reportName) + '" placeholder="ในบัญชีฝ่าย SCB"></label><label class="field"><span>ข้อความวิธีโอน</span><input data-k="payVerb" value="' + esc(a.payVerb) + '" placeholder="โอน SCB"></label>' +
      '<label class="field"><span>ประเภท</span><select data-k="kind"><option value="BANK"' + (a.kind === 'BANK' ? ' selected' : '') + '>ธนาคาร</option><option value="CASH"' + (a.kind === 'CASH' ? ' selected' : '') + '>เงินสด</option></select></label><label class="field"><span>เลขบัญชี</span><input data-k="number" value="' + esc(a.number) + '"></label>' +
      '<label class="field"><span>สี</span><input type="color" class="colorin" data-k="color" value="' + esc(a.color) + '"></label><label class="field"><span>หมายเหตุ</span><input data-k="note" value="' + esc(a.note) + '"></label></div>' +
      '<label class="check"><input type="checkbox" data-k="active"' + (a.active ? ' checked' : '') + '> เปิดใช้งาน (ปิดได้เมื่อยอดเป็น 0)</label><div data-err></div>', foot: '<button class="btn btn-brand" data-ok>บันทึก</button>' });
    $('[data-ok]', md.el).onclick = function () { var p = { id: a.id }; $$('[data-k]', md.el).forEach(function (i) { p[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; }); busy(this, api('saveAccount', p)).then(function () { md.close(); reload().then(function () { toast('บันทึกบัญชีแล้ว'); }); }).catch(function (e) { $('[data-err]', md.el).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; }); };
  };
  $('[data-add]', box).onclick = function () { form(); };
  $$('[data-ed]', box).forEach(function (b) { b.onclick = function () { form(MODEL.acc[b.dataset.ed]); }; });
}

function setCats(box) {
  var list = S.D.categories.map(function (c) { return Object.assign({}, c); });
  function draw() {
    var sec = function (kind) {
      return '<div class="card rise"><div class="card-h"><h3><span class="ic">' + (kind === 'IN' ? IC.in : IC.out) + '</span>หมวด' + (kind === 'IN' ? 'รายรับ' : 'รายจ่าย') + '</h3><button class="btn btn-sm" data-new="' + kind + '">' + IC.plus + 'เพิ่มหมวด</button></div><div class="card-b col" style="gap:6px">' +
        list.map(function (c, i) { return c.kind !== kind ? '' : '<div class="row" style="flex-wrap:nowrap"><input type="color" class="colorin" data-i="' + i + '" data-f="color" value="' + esc(c.color) + '" aria-label="สี"><input data-i="' + i + '" data-f="name" value="' + esc(c.name) + '" aria-label="ชื่อหมวด"' + (c.id === 'OPENING' ? ' disabled' : '') + '>' + (c.welfare ? '<span class="chip move">สิทธิ' + (c.welfare === 'BDAY' ? 'วันเกิด' : 'เยี่ยมไข้') + '</span>' : '') + '<label class="check xs" style="white-space:nowrap"><input type="checkbox" data-i="' + i + '" data-f="active"' + (c.active ? ' checked' : '') + '> ใช้งาน</label><button class="iconbtn" data-up="' + i + '" aria-label="เลื่อนขึ้น">' + IC.out + '</button></div>'; }).join('') + '</div></div>';
    };
    box.innerHTML = sec('OUT') + sec('IN') + '<div class="row"><span class="grow small muted">ปิดหมวด = ไม่แสดงตอนบันทึกใหม่ (ข้อมูลเดิมยังอยู่) · เปลี่ยนชื่อได้ไม่กระทบรายการเดิม</span><button class="btn btn-brand" data-save>' + IC.check + 'บันทึกหมวดหมู่</button></div>';
    $$('[data-f]', box).forEach(function (i) { i.onchange = function () { list[+i.dataset.i][i.dataset.f] = i.type === 'checkbox' ? i.checked : i.value; }; });
    $$('[data-up]', box).forEach(function (b) { b.onclick = function () { var i = +b.dataset.up, k = list[i].kind; for (var j = i - 1; j >= 0; j--) if (list[j].kind === k) { var t = list[j]; list[j] = list[i]; list[i] = t; break; } draw(); }; });
    $$('[data-new]', box).forEach(function (b) { b.onclick = function () { list.push({ id: '', kind: b.dataset.new, name: 'หมวดใหม่', color: '#8a8086', active: true }); draw(); }; });
    $('[data-save]', box).onclick = function () { busy(this, api('saveCategories', { list: list })).then(function (r) { S.D.categories = r.categories; MODEL.build(S.D); render(); toast('บันทึกหมวดหมู่แล้ว'); }).catch(fail); };
  }
  draw();
}

function setSystem(box) {
  var s = S.D.settings;
  var f = function (k, label, hint, type) { return '<label class="field"><span>' + label + '</span><input data-k="' + k + '" ' + (type || '') + ' value="' + esc(s[k]) + '">' + (hint ? '<span class="xs">' + hint + '</span>' : '') + '</label>'; };
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.set + '</span>ค่าระบบ</h3></div><div class="card-b col" style="gap:14px"><div class="fgrid">' +
    f('bdayAmount', 'สวัสดิการวันเกิด (บาท/คน/ปี)', '', 'inputmode="decimal"') + f('sickAmount', 'ค่าเยี่ยมไข้ (บาท/คน/ปี)', '', 'inputmode="decimal"') +
    f('defaultRate', 'เงินฝ่ายรายเดือนตั้งต้น (บาท)', 'ใช้กับสมาชิกใหม่ · ตั้งรายคนได้ที่แท็บสมาชิก', 'inputmode="decimal"') +
    '<label class="field"><span>บัญชีรับเงินฝ่ายรายเดือน</span><select data-k="duesAccount">' + S.D.accounts.map(function (a) { return '<option value="' + a.id + '"' + (s.duesAccount === a.id ? ' selected' : '') + '>' + esc(a.name) + '</option>'; }).join('') + '</select></label>' +
    f('birthdayDays', 'แจ้งเตือนวันเกิดล่วงหน้า (วัน)', '', 'inputmode="numeric"') +
    '<label class="field"><span>บังคับแนบหลักฐานรายจ่าย</span><select data-k="requireFileOut"><option value="TRUE"' + (s.requireFileOut === 'TRUE' ? ' selected' : '') + '>บังคับ (ระบุเหตุผลถ้าไม่มี)</option><option value="FALSE"' + (s.requireFileOut !== 'TRUE' ? ' selected' : '') + '>ไม่บังคับ</option></select></label></div>' +
    f('systemUrl', 'ลิงก์ระบบ (ท้ายข้อความไลน์)', '') + f('reportFooter', 'ข้อความก่อนลิงก์', 'เดิมใช้ "รายละเอียด"') +
    f('driveFolderId', 'รหัสโฟลเดอร์ Google Drive เก็บไฟล์แนบ', 'ว่าง = ระบบสร้างโฟลเดอร์ "HR Fund · เอกสารแนบ" ให้เองในบัญชีที่ติดตั้ง') +
    '<div class="row"><span class="grow"></span><button class="btn btn-brand" data-save>' + IC.check + 'บันทึกค่าระบบ</button></div></div></div>';
  $('[data-save]', box).onclick = function () { var v = {}; $$('[data-k]', box).forEach(function (i) { v[i.dataset.k] = i.value; }); busy(this, api('saveSettings', { values: v })).then(function (r) { S.D.settings = r.settings; render(); toast('บันทึกค่าระบบแล้ว'); }).catch(fail); };
}

function setAudit(box) {
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.doc + '</span>ประวัติการใช้งาน (300 รายการล่าสุด)</h3></div><div class="card-b" id="aud"><div class="skel" style="height:200px"></div></div></div>';
  var TH = { LOGIN: 'เข้าสู่ระบบ', ADD_TXN: 'เพิ่มรายการ', EDIT_TXN: 'แก้ไขรายการ', DELETE_TXN: 'ลบรายการ', PAY_DUES: 'รับเงินฝ่าย', SET_DUES: 'ตั้งสถานะเงินฝ่าย', ADD_MEMBER: 'เพิ่มสมาชิก', EDIT_MEMBER: 'แก้ไขสมาชิก', SAVE_REPORT: 'บันทึกรายงาน', CHANGE_PASSWORD: 'เปลี่ยนรหัสผ่าน', RESET_PASSWORD: 'รีเซ็ตรหัสผ่าน', ADD_USER: 'เพิ่มผู้ใช้', EDIT_USER: 'แก้ไขผู้ใช้', SAVE_SETTINGS: 'แก้ค่าระบบ', SAVE_BUDGET: 'แก้แผนงบ', ADD_PROJECT: 'สร้างโครงการ', EDIT_PROJECT: 'แก้ไขโครงการ', DELETE_PROJECT: 'ลบโครงการ', EDIT_LOAN: 'แก้ไขเงินยืม', TRANSFER_OWNER: 'โอนแอดมินหลัก', SAVE_CATEGORIES: 'แก้หมวดหมู่', ADD_ACCOUNT: 'เพิ่มบัญชี', EDIT_ACCOUNT: 'แก้ไขบัญชี' };
  api('getAudit', { limit: 300 }).then(function (r) {
    $('#aud', box).innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th><th>รายละเอียด</th></tr></thead><tbody>' + r.rows.map(function (x) { return '<tr><td class="small" style="white-space:nowrap">' + esc(stampTh(x.ts)) + '</td><td class="small">' + esc(MODEL.memName(x.user) || x.user) + '</td><td><span class="chip ' + (/DELETE/.test(x.action) ? 'out' : /ADD|PAY/.test(x.action) ? 'in' : 'idle') + '">' + esc(TH[x.action] || x.action) + '</span></td><td class="small">' + esc(x.detail) + '</td></tr>'; }).join('') + '</tbody></table></div>';
  }).catch(function (e) { $('#aud', box).innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; });
}

function setAbout(box) {
  var D = S.D;
  box.innerHTML = '<div class="card rise"><div class="card-h"><h3><span class="ic">' + IC.info + '</span>เกี่ยวกับระบบ</h3></div><div class="card-b"><dl class="kv"><dt>ระบบ</dt><dd>' + esc(D.app.name) + ' (' + esc(D.app.short) + ')</dd><dt>หน่วยงาน</dt><dd>' + esc(D.app.org) + '</dd>' +
    '<dt>หลังบ้าน</dt><dd>v' + esc(D.app.version) + ' · build ' + esc(D.app.build) + '</dd><dt>หน้าเว็บ</dt><dd>build ' + esc(typeof FRONT_BUILD !== 'undefined' ? FRONT_BUILD : '-') + (typeof FRONT_BUILD !== 'undefined' && FRONT_BUILD !== D.app.build ? ' <span class="chip warn">ไม่ตรงกับหลังบ้าน</span>' : ' <span class="chip ok">ตรงกัน</span>') + '</dd>' +
    '<dt>ข้อมูล</dt><dd>' + D.txns.length + ' รายการ · สมาชิก ' + D.members.filter(function (x) { return x.active; }).length + ' คน · โครงการ ' + D.projects.length + '</dd><dt>รายการแรก</dt><dd>' + (MODEL.tx[0] ? thDate(MODEL.tx[0].date, false, true) : '—') + '</dd></dl>' +
    '<p class="small muted" style="margin-top:12px">ข้อมูลทั้งหมดเก็บใน Google Sheet ของบัญชี hrsomdej (ไฟล์ "HR Fund · ฐานข้อมูลเงินฝ่ายทรัพยากรบุคคล") · ไฟล์แนบเก็บใน Google Drive · หน้าเว็บบน GitHub Pages</p></div></div>';
}
