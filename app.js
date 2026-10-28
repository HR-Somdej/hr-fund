/* =====================================================================
   app.js — แกนหน้าเว็บ HR Fund: ตัวช่วย · เรียกหลังบ้าน · ล็อกอิน · โครงหน้า · กล่องโต้ตอบ
   ===================================================================== */
'use strict';
var IS_DEMO = (typeof API_URL !== 'undefined' && API_URL === 'demo');
var ORG = {
  system: 'ระบบบริหารเงินฝ่ายทรัพยากรบุคคล', short: 'HR Fund', dept: 'ฝ่ายทรัพยากรบุคคล',
  hosp: 'โรงพยาบาลสมเด็จพระบรมราชเทวี ณ ศรีราชา', trc: 'สภากาชาดไทย', en: 'HR Department Fund · Queen Savang Vadhana Memorial Hospital, Thai Red Cross Society'
};

/* ---------------- ตัวช่วย ---------------- */
var $ = function (s, el) { return (el || document).querySelector(s); };
var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function r2(n) { return Math.round((+n || 0) * 100) / 100; }
/** เงิน: จำนวนเต็มไม่มีทศนิยม · มีเศษแสดง 2 ตำแหน่ง (เหมือนรายงานเดิม) */
function m(n) { n = r2(n); var neg = n < 0; n = Math.abs(n); var s = n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); return (neg ? '-' : '') + s; }
function m2(n) { n = r2(n); return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function mk(n) { var a = Math.abs(n); if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'; if (a >= 1e4) return (n / 1e3).toFixed(0) + 'k'; if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k'; return String(Math.round(n)); }
function sgn(n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + m(Math.abs(n)); }
var TH_M = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
var TH_MF = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
var TH_D = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
function pd(s) { var p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2] || 1); }
function ds(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function addDays(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return ds(d); }
function daysBetween(a, b) { return Math.round((pd(b) - pd(a)) / 86400000); }
function thDate(s, long, full) { if (!s) return ''; var d = pd(s); return (long ? TH_D[d.getDay()] + ' ' : '') + d.getDate() + ' ' + (full ? TH_MF : TH_M)[d.getMonth()] + ' ' + (full ? d.getFullYear() + 543 : String(d.getFullYear() + 543).slice(2)); }
function ddmm(s) { var p = String(s).split('-'); return p[2] + '/' + p[1]; }
function ddmmyy(s) { var p = String(s).split('-'); return p[2] + '/' + p[1] + '/' + String(+p[0] + 543).slice(2); }
function thMonth(ym, short) { var p = ym.split('-').map(Number); return (short ? TH_M : TH_MF)[p[1] - 1] + ' ' + (short ? String(p[0] + 543).slice(2) : p[0] + 543); }
function stampTh(s) { if (!s) return ''; var p = s.split(' '); return thDate(p[0]) + (p[1] ? ' ' + p[1].slice(0, 5) + ' น.' : ''); }
function be(s) { return +String(s).slice(0, 4) + 543; }
function ymOf(s) { return String(s).slice(0, 7); }
function addMonths(ym, n) { var p = ym.split('-').map(Number), d = new Date(p[0], p[1] - 1 + n, 1); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); }
function debounce(fn, ms) { var t; return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); }; }
function store(k, v) { try { if (v === undefined) { var x = localStorage.getItem('hrf:' + k); return x ? JSON.parse(x) : null; } if (v === null) localStorage.removeItem('hrf:' + k); else localStorage.setItem('hrf:' + k, JSON.stringify(v)); } catch (e) { return null; } }
function rid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function cssv(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
function groupBy(a, f) { var o = {}; a.forEach(function (x) { var k = f(x); (o[k] = o[k] || []).push(x); }); return o; }

var IC = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M12 3v3M8 3.8l1 2.2M16 3.8l-1 2.2"/><circle cx="16.5" cy="14.5" r="1.6" fill="#fff"/></svg>',
  dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  coins: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><ellipse cx="9" cy="7" rx="6" ry="2.6"/><path d="M3 7v4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7"/><path d="M9 13.6v3.4c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4c0-1.4-2.7-2.6-6-2.6"/></svg>',
  cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7"/><path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0"/><path d="M12 12V8M12 5.5c.8-.8.8-1.7 0-2.5-.8.8-.8 1.7 0 2.5z"/></svg>',
  hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14h3l3.5 3H15a2 2 0 0 0 0-4h-3.5"/><path d="M8 14l2.5-2.5a2 2 0 0 1 1.4-.6H15"/><path d="M15 17l4.5-2.6a1.7 1.7 0 0 1 2 2.6L16 21H8l-5-3"/><circle cx="16" cy="6" r="3"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  line: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M21 11.5c0 4.1-4 7.5-9 7.5-.9 0-1.8-.1-2.6-.3L5 21l.8-3.6C4 16 3 13.9 3 11.5 3 7.4 7 4 12 4s9 3.4 9 7.5z"/></svg>',
  set: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  in: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 13l6 6 6-6"/></svg>',
  out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 11l6-6 6 6"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
  loan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/><path d="M12 8v4l2.5 1.5"/></svg>',
  refund: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14l-5-5 5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
  prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M7 9V3h10v6M7 18H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M7 14h10v7H7z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 11a8 8 0 0 0-14.7-4.4L4 8M4 4v4h4M4 13a8 8 0 0 0 14.7 4.4L20 16M20 20v-4h-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20c-.5-2.6-1.9-4.3-3.8-5"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  xls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11l5 6M14 11l-5 6"/></svg>',
  spin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path class="sp" d="M12 3a9 9 0 1 0 9 9"/></svg>',
  warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 7.5C3.8 9.3 2 12 2 12s3.6 6 10 6c1.6 0 3-.4 4.3-1M9.9 10a3 3 0 0 0 4.2 4.1"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  clip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h4"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M12 11v6M12 7.6v.4"/></svg>',
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-5 9 5M4 9v9M20 9v9M8 12v4M12 12v4M16 12v4M3 20h18"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3h-4a2 2 0 0 0 0 4h4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/></svg>',
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
  dup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/><path d="M14 11v6M11 14h6"/></svg>',
  help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9.2"/><path d="M9.4 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.6 2.2-2.6 3.9M12 17.2v.3"/></svg>'
};

/* ---------------- เรียกหลังบ้าน ----------------
 * ไม่ตั้ง Content-Type (text/plain) → ไม่มี preflight · อ่าน = ลองซ้ำ 3 ครั้ง · เขียน = ส่ง _rid ลองซ้ำได้ไม่บันทึกซ้ำ */
var S = { token: null, D: null, page: 'dash', params: {}, demoReady: false };
var NET = { busy: 0 }, ACTS = {}, actTimer = null;
var ACT_TH = { login: 'กำลังเข้าสู่ระบบ', bootstrap: 'กำลังโหลดข้อมูล', saveTxn: 'กำลังบันทึกรายการ', deleteTxn: 'กำลังลบรายการ', payDues: 'กำลังบันทึกรับเงินฝ่าย', setDues: 'กำลังบันทึก',
  saveMember: 'กำลังบันทึกสมาชิก', saveReport: 'กำลังบันทึกรายงาน', getAudit: 'กำลังโหลดประวัติ', saveProject: 'กำลังบันทึกโครงการ', saveBudget: 'กำลังบันทึกแผนงบ', saveSettings: 'กำลังบันทึกตั้งค่า', saveUser: 'กำลังบันทึกผู้ใช้', changePassword: 'กำลังเปลี่ยนรหัสผ่าน' };
function netBar(d, action) {
  NET.busy += d; if (action) { ACTS[action] = (ACTS[action] || 0) + d; if (ACTS[action] <= 0) delete ACTS[action]; }
  var b = $('#netbar'); if (b) b.hidden = NET.busy <= 0;
  clearTimeout(actTimer);
  var pill = $('#activity');
  if (NET.busy <= 0) { if (pill) pill.hidden = true; return; }
  actTimer = setTimeout(function () {
    if (NET.busy <= 0) return;
    if (!pill) { pill = document.createElement('div'); pill.id = 'activity'; pill.className = 'activity'; pill.setAttribute('role', 'status'); document.body.appendChild(pill); }
    var names = Object.keys(ACTS).map(function (a) { return ACT_TH[a] || 'กำลังทำงาน'; });
    pill.innerHTML = IC.spin + '<span>' + esc(names[0] || 'กำลังทำงาน') + '…</span>';
    pill.hidden = false;
  }, 350);
}
function isRead(a) { return /^(get|bootstrap|login|ping)/.test(a); }
function api(action, payload, opt) {
  opt = opt || {};
  payload = payload || {};
  if (!isRead(action) && !payload._rid) payload._rid = rid();
  netBar(1, opt.quiet ? null : action);
  var tries = isRead(action) ? 3 : 2, n = 0;
  function once() {
    n++;
    var p;
    if (IS_DEMO) {
      p = demoReady().then(function () {
        return new Promise(function (res) { setTimeout(function () { res(JSON.parse(JSON.stringify(DEMO_BACKEND.rpc(action, S.token, JSON.parse(JSON.stringify(payload)))))); }, 120 + Math.random() * 160); });
      });
    } else {
      p = fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: action, token: S.token, payload: payload }), credentials: 'omit', redirect: 'follow' })
        .then(function (r) { return r.text(); })
        .then(function (t) { if (t.charAt(0) === '<') throw new Error('BUSY'); return JSON.parse(t); });
    }
    return p.catch(function (e) {
      if (n < tries) return new Promise(function (res) { setTimeout(res, 700 * n); }).then(once);
      throw new Error(e && e.message === 'BUSY' ? 'เซิร์ฟเวอร์ Google ไม่ว่างชั่วคราว กรุณาลองใหม่อีกครั้ง' : 'เชื่อมต่อระบบไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่');
    });
  }
  return once().then(function (r) {
    netBar(-1, opt.quiet ? null : action);
    if (!r.ok) {
      if (r.error === 'SESSION_EXPIRED') { logout(true); throw new Error('หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่'); }
      throw new Error(r.error || 'เกิดข้อผิดพลาด');
    }
    return r.data;
  }, function (e) { netBar(-1, opt.quiet ? null : action); throw e; });
}
function demoReady() {
  if (S.demoReady) return Promise.resolve();
  return new Promise(function (res) { setTimeout(function () { if (!S.demoReady) { DEMO_BACKEND.demoInit('demo1234'); S.demoReady = true; } res(); }, 10); });
}
/** ปุ่มที่กดแล้วรอเซิร์ฟเวอร์ */
function busy(btn, promise, label) {
  if (!btn) return promise;
  var html = btn.innerHTML, w = btn.offsetWidth; btn.disabled = true; btn.classList.add('is-busy'); btn.style.minWidth = w + 'px';
  btn.innerHTML = IC.spin + (label ? '<span>' + esc(label) + '</span>' : '');
  var done = function () { btn.disabled = false; btn.classList.remove('is-busy'); btn.innerHTML = html; btn.style.minWidth = ''; };
  return Promise.resolve(promise).then(function (x) { done(); return x; }, function (e) { done(); throw e; });
}

/* ---------------- กล่องโต้ตอบ ---------------- */
var toastT;
function toast(msg, err, action) {
  var t = $('#toast'); if (t) t.remove();
  t = document.createElement('div'); t.id = 'toast'; t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', err ? 'alert' : 'status');
  t.innerHTML = '<span>' + esc(msg) + '</span>' + (action ? '<button type="button">' + esc(action.label) + '</button>' : '');
  if (action) t.querySelector('button').onclick = function () { t.remove(); action.fn(); };
  document.body.appendChild(t);
  clearTimeout(toastT); toastT = setTimeout(function () { t.remove(); }, err ? 6500 : (action ? 6000 : 2800));
}
function fail(e) { toast(e && e.message ? e.message : String(e), true); }
/** modal({title, body(html), foot(html), wide, onOpen(el), cls}) → {el, close} */
function modal(o) {
  var sc = document.createElement('div'); sc.className = 'scrim' + (o.drawer ? ' drawer-scrim' : '');
  sc.innerHTML = '<div class="' + (o.drawer ? 'drawer' : 'modal' + (o.wide ? ' wide' : '')) + ' ' + (o.cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title || '') + '">' +
    '<div class="modal-h">' + (o.head || '<h3>' + esc(o.title || '') + '</h3>') + '<button class="iconbtn" data-x aria-label="ปิด">' + IC.x + '</button></div>' +
    '<div class="modal-b">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-f">' + o.foot + '</div>' : '') + '</div>';
  document.body.appendChild(sc);
  document.body.style.overflow = 'hidden';
  var closed = false;
  function close() { if (closed) return; closed = true; sc.remove(); if (!$('.scrim')) document.body.style.overflow = ''; document.removeEventListener('keydown', onKey); if (o.onClose) o.onClose(); }
  function onKey(e) { if (e.key === 'Escape' && sc === $$('.scrim').pop()) close(); }
  document.addEventListener('keydown', onKey);
  sc.addEventListener('mousedown', function (e) { if (e.target === sc) close(); });
  $('[data-x]', sc).onclick = close;
  var box = sc.firstChild;
  if (o.onOpen) o.onOpen(box, close);
  setTimeout(function () { var f = $('[autofocus]', box); if (f && window.innerWidth > 700) f.focus(); }, 60);
  return { el: box, close: close };
}
function confirmBox(msg, okLabel, danger) {
  return new Promise(function (res) {
    var done = false;
    var md = modal({ title: 'ยืนยัน', body: '<p>' + esc(msg).replace(/\n/g, '<br>') + '</p>',
      foot: '<button class="btn" data-no>ยกเลิก</button><button class="btn ' + (danger ? 'btn-danger' : 'btn-brand') + '" data-yes>' + esc(okLabel || 'ยืนยัน') + '</button>',
      onClose: function () { if (!done) res(false); } });
    $('[data-no]', md.el).onclick = function () { md.close(); };
    $('[data-yes]', md.el).onclick = function () { done = true; md.close(); res(true); };
  });
}
function pwToggle(root) {
  $$('.pw', root).forEach(function (w) {
    var b = $('button', w), i = $('input', w);
    b.innerHTML = IC.eye;
    b.onclick = function () { var s = i.type === 'password'; i.type = s ? 'text' : 'password'; b.innerHTML = s ? IC.eyeOff : IC.eye; b.setAttribute('aria-label', s ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'); };
  });
}
function loadScript(src) {
  return new Promise(function (res, rej) {
    if ($('script[src="' + src + '"]')) return res();
    var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('โหลดตัวช่วยไม่สำเร็จ (ตรวจสอบอินเทอร์เน็ต)')); };
    document.head.appendChild(s);
  });
}
var LIB = {
  chart: 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.js',
  h2c: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
};

/* ---------------- ธีม ---------------- */
function applyTheme() { var t = store('theme'); if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
function toggleTheme() {
  var dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
  store('theme', dark ? 'light' : 'dark'); applyTheme(); render();
}

/* ---------------- ล็อกอิน ---------------- */
function renderLogin(msg) {
  document.title = 'เข้าสู่ระบบ · ' + ORG.short;
  $('#app').innerHTML =
    '<div class="login">' +
    '<section class="art"><div class="org"><img src="logo-hospital.png" alt=""><div><b>' + ORG.dept + '</b><br>' + ORG.hosp + ' ' + ORG.trc + '</div></div>' +
    '<div><div class="eyebrow" style="color:rgba(255,255,255,.8)">HR FUND</div><h1>' + ORG.system + '</h1>' +
    '<p style="opacity:.88;margin-top:10px;max-width:46ch">บันทึกรับ–จ่ายเงินฝ่าย เงินฝ่ายรายเดือน สวัสดิการวันเกิด/เยี่ยมไข้ เงินยืม และรายงานส่งไลน์ ในที่เดียว</p>' +
    '<div class="coins"><span>บัญชีฝ่าย SCB</span><span>เงินสดกองกลาง</span><span>แดชบอร์ด</span><span>รายงานไลน์</span></div></div>' +
    '<div class="xs" style="opacity:.75">' + esc(ORG.en) + '</div></section>' +
    '<section class="box"><form id="lf" autocomplete="on">' +
    '<div><div class="eyebrow">เข้าสู่ระบบ</div><h2>ยินดีต้อนรับ</h2></div>' +
    (IS_DEMO ? '<div class="banner demo">หน้าทดลอง · ข้อมูลจริงจากชีทเดิม · แอดมิน 5660101 · ผู้ดู 5604163 · รหัสผ่าน demo1234</div>' : '') +
    (msg ? '<div class="err-msg">' + esc(msg) + '</div>' : '') +
    '<label class="field"><span>รหัสพนักงาน</span><input name="u" inputmode="numeric" autocomplete="username" required autofocus value="' + esc(store('lastUser') || '') + '"></label>' +
    '<label class="field"><span>รหัสผ่าน</span><div class="pw"><input name="p" type="password" autocomplete="current-password" required><button type="button" aria-label="แสดงรหัสผ่าน"></button></div></label>' +
    '<label class="check"><input type="checkbox" name="r" checked> จำการเข้าสู่ระบบ 30 วัน (เฉพาะเครื่องส่วนตัว)</label>' +
    '<button class="btn btn-brand btn-lg" type="submit">เข้าสู่ระบบ</button>' +
    '<p class="small muted">ครั้งแรกใช้รหัสผ่าน = รหัสพนักงาน ระบบจะให้ตั้งรหัสผ่านใหม่ · ลืมรหัสผ่าน ติดต่อแอดมินเงินฝ่าย</p>' +
    '<div class="conn" id="conn"><i></i><span>กำลังตรวจการเชื่อมต่อ…</span></div>' +
    '</form></section></div>';
  pwToggle($('#lf'));
  var f = $('#lf');
  f.onsubmit = function (e) {
    e.preventDefault();
    var btn = $('button[type=submit]', f), u = f.u.value.trim();
    busy(btn, api('login', { username: u, password: f.p.value, remember: f.r.checked, withBoot: true, ua: navigator.userAgent }), 'กำลังเข้าสู่ระบบ').then(function (d) {
      S.token = d.token; store('lastUser', u);
      if (f.r.checked) store('token', d.token); else { store('token', null); try { sessionStorage.setItem('hrf:token', d.token); } catch (x) { } }
      setBoot(d.boot);
      if (d.mustChange) changePasswordDlg(true);
    }).catch(function (e) { renderLogin(e.message); });
  };
  api('ping', {}, { quiet: true }).then(function () { var c = $('#conn'); if (c) { c.className = 'conn ok'; c.lastChild.textContent = 'เชื่อมต่อระบบแล้ว'; } })
    .catch(function () { var c = $('#conn'); if (c) { c.className = 'conn bad'; c.lastChild.textContent = 'ยังเชื่อมต่อระบบไม่ได้'; } });
}
function logout(silent) {
  S.token = null; S.D = null; store('token', null); store('boot', null);
  try { sessionStorage.removeItem('hrf:token'); } catch (e) { }
  if (!silent) toast('ออกจากระบบแล้ว');
  renderLogin(silent ? 'หมดเวลาการใช้งาน กรุณาเข้าสู่ระบบใหม่' : '');
}
function changePasswordDlg(force) {
  var md = modal({ title: force ? 'ตั้งรหัสผ่านใหม่ก่อนใช้งาน' : 'เปลี่ยนรหัสผ่าน',
    body: (force ? '<div class="banner info">เข้าสู่ระบบครั้งแรก กรุณาตั้งรหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</div>' : '') +
      '<label class="field"><span>รหัสผ่านเดิม</span><div class="pw"><input type="password" name="o" autocomplete="current-password"><button type="button"></button></div></label>' +
      '<label class="field"><span>รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)</span><div class="pw"><input type="password" name="n" autocomplete="new-password"><button type="button"></button></div></label>' +
      '<label class="field"><span>ยืนยันรหัสผ่านใหม่</span><div class="pw"><input type="password" name="n2" autocomplete="new-password"><button type="button"></button></div></label><div data-err></div>',
    foot: (force ? '<button class="btn" data-out>ออกจากระบบ</button>' : '') + '<button class="btn btn-brand" data-ok>บันทึกรหัสผ่าน</button>',
    onClose: function () { if (force && S.D && S.D.me.mustChange) logout(); } });
  pwToggle(md.el);
  if (force) $('[data-out]', md.el).onclick = function () { md.close(); };
  $('[data-ok]', md.el).onclick = function () {
    var o = $('[name=o]', md.el).value, n = $('[name=n]', md.el).value, n2 = $('[name=n2]', md.el).value, er = $('[data-err]', md.el);
    if (n !== n2) { er.innerHTML = '<div class="err-msg">รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน</div>'; return; }
    busy(this, api('changePassword', { oldPassword: o, newPassword: n, remember: !!store('token') })).then(function (d) {
      S.token = d.token; if (store('token')) store('token', d.token); else try { sessionStorage.setItem('hrf:token', d.token); } catch (e) { }
      S.D.me.mustChange = false; md.close(); toast('เปลี่ยนรหัสผ่านแล้ว'); render(); birthdayPopup();
    }).catch(function (e) { er.innerHTML = '<div class="err-msg">' + esc(e.message) + '</div>'; });
  };
}

/* ---------------- ข้อมูล ---------------- */
function setBoot(b) {
  S.D = b; MODEL.build(b);
  try { store('boot', { t: Date.now(), user: b.me.user, d: b }); } catch (e) { }
  var want = location.hash.replace('#', '');
  if (PAGES[want] && canSee(want)) S.page = want;
  render();
  if (!b.me.mustChange) birthdayPopup();
  checkVersion();
}
function reload(quiet) {
  return api('bootstrap', {}, { quiet: quiet }).then(function (b) { S.D = b; MODEL.build(b); store('boot', { t: Date.now(), user: b.me.user, d: b }); render(); return b; });
}
var isAdmin = function () { return S.D && (S.D.me.role === 'admin' || S.D.me.role === 'owner'); };

/* ---------------- หน้า / โครงหน้า ---------------- */
var PAGES = {};   // ลงทะเบียนในไฟล์ pages.js / plan.js / report.js / settings.js
var NAV = [
  { sec: 'ภาพรวม' }, { id: 'dash', icon: 'dash', label: 'แดชบอร์ด' }, { id: 'ledger', icon: 'list', label: 'รายการเงิน' },
  { sec: 'งานประจำ' }, { id: 'dues', icon: 'coins', label: 'เงินฝ่ายรายเดือน' }, { id: 'welfare', icon: 'cake', label: 'สวัสดิการ & วันเกิด' }, { id: 'loans', icon: 'loan', label: 'เงินยืม / รอคืน' }, { id: 'report', icon: 'line', label: 'รายงานส่งไลน์' },
  { sec: 'วางแผน' }, { id: 'plan', icon: 'flag', label: 'โครงการ & งบ' }, { id: 'stats', icon: 'trend', label: 'สถิติ & ประมาณการ' },
  { sec: 'ระบบ', admin: true }, { id: 'settings', icon: 'set', label: 'ตั้งค่า', admin: true }
];
function canSee(id) { var n = NAV.filter(function (x) { return x.id === id; })[0]; return n && (!n.admin || isAdmin()); }
function go(page, params) {
  if (!canSee(page)) page = 'dash';
  S.page = page; S.params = params || {};
  if (location.hash !== '#' + page) history.replaceState(null, '', '#' + page);
  render(); window.scrollTo(0, 0);
}
function badgeOf(id) {
  if (!S.D) return 0;
  if (id === 'loans') return MODEL.openLoans().length;
  if (id === 'welfare') return MODEL.upcomingBirthdays(+S.D.settings.birthdayDays || 7).filter(function (b) { return b.days === 0; }).length;
  return 0;
}
function render() {
  if (!S.D) return;
  var D = S.D, me = D.me, nav = NAV.filter(function (n) { return !n.admin || isAdmin(); });
  var pg = PAGES[S.page] || PAGES.dash;
  document.title = (pg.title || '') + ' · ' + ORG.short;
  var navHtml = nav.map(function (n) {
    if (n.sec) return '<div class="sec">' + esc(n.sec) + '</div>';
    var b = badgeOf(n.id);
    return '<button data-go="' + n.id + '"' + (S.page === n.id ? ' aria-current="page"' : '') + '>' + IC[n.icon] + '<span>' + esc(n.label) + '</span>' + (b ? '<span class="badge">' + b + '</span>' : '') + '</button>';
  }).join('');
  $('#app').innerHTML =
    '<div class="netbar" id="netbar" hidden><i></i></div>' +
    '<div class="app"><aside class="side noprint"><div class="brand"><div class="mark">' + IC.logo + '</div><div><b>' + ORG.short + '</b><span>เงินฝ่ายทรัพยากรบุคคล</span></div></div>' +
    (isAdmin() ? '<button class="addbtn" data-add>' + IC.plus + 'บันทึกรายการ</button>' : '') +
    '<nav class="nav" aria-label="เมนูหลัก">' + navHtml + '</nav>' +
    '<div class="who"><div class="avatar">' + esc((me.name || '?').replace(/^(นาย|นางสาว|นาง|แพทย์หญิง|นายแพทย์)\s*/, '').charAt(0)) + '</div><div class="ell"><b class="ell">' + esc(shortName(me.user, me.name)) + '</b><span class="r">' + esc(me.roleTh) + '</span></div>' +
    '<div class="tools"><button data-theme title="สลับโหมดมืด/สว่าง" aria-label="สลับโหมดมืด">' + IC.moon + '</button><button data-pw title="เปลี่ยนรหัสผ่าน" aria-label="เปลี่ยนรหัสผ่าน">' + IC.key + '</button><button data-logout title="ออกจากระบบ" aria-label="ออกจากระบบ">' + IC.logout + '</button></div></div>' +
    '<div class="ver">v' + esc(D.app.version) + ' · ' + esc(D.app.buildTh) + '</div></aside>' +
    '<div><header class="topbar noprint"><div class="mark">' + IC.logo + '</div><div><b>' + ORG.short + '</b><span>' + esc(pg.title || '') + '</span></div><div class="tools"><button data-theme aria-label="สลับโหมดมืด">' + IC.moon + '</button><button data-reload aria-label="โหลดข้อมูลใหม่">' + IC.refresh + '</button></div></header>' +
    '<main class="main" id="main">' + (IS_DEMO ? '<div class="banner demo noprint">' + IC.info.replace('<svg', '<svg width="16" height="16"') + ' หน้าทดลอง — บันทึกได้จริงแต่ข้อมูลอยู่ในเครื่องนี้ชั่วคราว (รีเฟรชแล้วกลับค่าเดิม)</div>' : '') +
    '<div id="verbar"></div><div id="page"></div>' +
    '<footer class="foot noprint"><span>' + ORG.system + '</span><span>·</span><span>' + ORG.dept + ' ' + ORG.hosp + '</span><span>·</span><span>v' + esc(D.app.version) + ' (' + esc(D.app.build) + ')</span></footer></main></div></div>' +
    '<nav class="bnav noprint" aria-label="เมนูมือถือ">' +
    [['dash', 'dash', 'ภาพรวม'], ['ledger', 'list', 'รายการ'], ['dues', 'coins', 'เงินฝ่าย'], ['report', 'line', 'รายงาน'], ['_menu', 'menu', 'เมนู']].map(function (x) {
      return '<button data-go="' + x[0] + '"' + (S.page === x[0] ? ' aria-current="page"' : '') + '>' + IC[x[1]] + '<span>' + x[2] + '</span></button>';
    }).join('') + '</nav>' +
    (isAdmin() ? '<button class="fab noprint" data-add aria-label="บันทึกรายการ">' + IC.plus + '</button>' : '');
  $$('[data-go]').forEach(function (b) { b.onclick = function () { if (b.dataset.go === '_menu') return mobileMenu(); go(b.dataset.go); }; });
  $$('[data-add]').forEach(function (b) { b.onclick = function () { openTxnForm(); }; });
  $$('[data-theme]').forEach(function (b) { b.onclick = toggleTheme; });
  $$('[data-reload]').forEach(function (b) { b.onclick = function () { reload().then(function () { toast('อัปเดตข้อมูลล่าสุดแล้ว'); }).catch(fail); }; });
  var pw = $('[data-pw]'); if (pw) pw.onclick = function () { changePasswordDlg(false); };
  var lo = $('[data-logout]'); if (lo) lo.onclick = function () { confirmBox('ออกจากระบบ?', 'ออกจากระบบ').then(function (y) { if (y) logout(); }); };
  if (window.CH) CH.destroyAll();
  try { pg.render($('#page')); } catch (e) { console.error(e); $('#page').innerHTML = '<div class="card"><div class="empty">' + IC.warn + 'แสดงหน้านี้ไม่สำเร็จ: ' + esc(e.message) + '</div></div>'; }
  showVerBar();
}
function mobileMenu() {
  var nav = NAV.filter(function (n) { return n.id && (!n.admin || isAdmin()); });
  var md = modal({ title: 'เมนู', body: '<div class="nav" style="--side-ink:var(--ink)">' + nav.map(function (n) { return '<button data-m="' + n.id + '" class="btn btn-ghost" style="justify-content:flex-start">' + IC[n.icon] + esc(n.label) + '</button>'; }).join('') +
    '<hr style="border:0;border-top:1px solid var(--line);width:100%"><button class="btn btn-ghost" data-pw2 style="justify-content:flex-start">' + IC.key + 'เปลี่ยนรหัสผ่าน</button><button class="btn btn-ghost" data-lo2 style="justify-content:flex-start">' + IC.logout + 'ออกจากระบบ</button>' +
    '<p class="xs muted">' + esc(S.D.me.name) + ' · ' + esc(S.D.me.roleTh) + ' · v' + esc(S.D.app.version) + ' (' + esc(S.D.app.build) + ')</p></div>' });
  $$('[data-m]', md.el).forEach(function (b) { b.onclick = function () { md.close(); go(b.dataset.m); }; });
  $('[data-pw2]', md.el).onclick = function () { md.close(); changePasswordDlg(false); };
  $('[data-lo2]', md.el).onclick = function () { md.close(); logout(); };
}
function pageHead(eyebrow, title, sub, actions) {
  return '<div class="pagehead rise"><div><div class="eyebrow">' + esc(eyebrow) + '</div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div><div class="row noprint">' + (actions || '') + '</div></div>';
}
function shortName(code, fallback) {
  var mb = MODEL.mem && MODEL.mem[code];
  if (mb) return 'คุณ' + mb.fname;
  return fallback || code || '';
}

/* ---------------- เวอร์ชัน ---------------- */
var VER = { latest: null };
function checkVersion() {
  if (IS_DEMO || typeof FRONT_BUILD === 'undefined') return;
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (v) { VER.latest = v; showVerBar(); }).catch(function () { });
}
setInterval(function () { if (S.D) checkVersion(); }, 600000);
function showVerBar() {
  var el = $('#verbar'); if (!el || !S.D || IS_DEMO) return;
  var h = '';
  if (VER.latest && VER.latest.build && VER.latest.build !== FRONT_BUILD) h = '<div class="banner info">มีหน้าเว็บรุ่นใหม่ (' + esc(VER.latest.buildTh || VER.latest.build) + ') <button class="btn btn-sm" onclick="location.reload()">โหลดรุ่นใหม่</button></div>';
  else if (S.D.app.build !== FRONT_BUILD) h = '<div class="banner warn">' + IC.warn.replace('<svg', '<svg width="16" height="16"') + ' หลังบ้านเป็นรุ่น ' + esc(S.D.app.build) + ' แต่หน้าเว็บเป็นรุ่น ' + esc(FRONT_BUILD) + ' — แอดมินต้อง Deploy Apps Script เป็น New version</div>';
  el.innerHTML = h;
}

/* ---------------- เริ่มต้น ---------------- */
function boot() {
  applyTheme();
  var tok = store('token'); if (!tok) try { tok = sessionStorage.getItem('hrf:token'); } catch (e) { }
  if (!tok) return renderLogin();
  S.token = tok;
  var cached = store('boot');
  if (cached && cached.d && Date.now() - cached.t < 7 * 86400000 && !IS_DEMO) { S.D = cached.d; MODEL.build(S.D); var w = location.hash.replace('#', ''); if (PAGES[w] && canSee(w)) S.page = w; render(); }
  else $('#app').innerHTML = '<div style="display:grid;place-items:center;min-height:100vh" class="muted">' + IC.spin.replace('<svg', '<svg width="28" height="28" class="is-busy"') + '</div>';
  api('bootstrap', {}, { quiet: !!S.D }).then(function (b) { setBoot(b); if (b.me.mustChange) changePasswordDlg(true); }).catch(function (e) { if (!S.D) renderLogin(e.message); else toast('ใช้ข้อมูลที่บันทึกไว้ในเครื่อง (' + e.message + ')', true); });
}
window.addEventListener('hashchange', function () { var w = location.hash.replace('#', ''); if (S.D && PAGES[w] && w !== S.page && canSee(w)) { S.page = w; render(); } });
document.addEventListener('DOMContentLoaded', boot);
