/* =====================================================================
   model.js — คำนวณทุกอย่างจากข้อมูลดิบในเครื่อง (ข้อมูลฝ่ายเล็ก → เร็ว ไม่ต้องรอเซิร์ฟเวอร์)
   หลักการนับ:
     · ยอดคงเหลือ = ผลรวมทุกชนิดรายการตามบัญชี (TRANSFER ย้ายระหว่างบัญชี)
     · "รายรับ" วิเคราะห์ = IN (ไม่รวมยอดยกมา) · "รายจ่าย" วิเคราะห์ = OUT − REFUND ตามหมวด + เงินยืมที่ตัดเป็นรายจ่าย
     · เงินยืม/คืน (ADV ADVR BOR BORR) และการโอน ไม่นับเป็นรายรับ/รายจ่าย (เป็นการหมุนเงิน)
     · รายงานไลน์ใช้ "กระแสเงินจริง": เข้า = IN REFUND ADVR BOR · ออก = OUT ADV BORR
   ===================================================================== */
'use strict';
var TYPES = {
  OPEN: { name: 'ยอดยกมา', sign: 1, cls: 'in', ic: 'in' },
  IN: { name: 'รายรับ', sign: 1, cls: 'in', ic: 'in' },
  OUT: { name: 'รายจ่าย', sign: -1, cls: 'out', ic: 'out' },
  REFUND: { name: 'เงินคืน/เงินเหลือจ่าย', sign: 1, cls: 'in', ic: 'refund' },
  TRANSFER: { name: 'โอนระหว่างบัญชี', sign: -1, cls: 'move', ic: 'move' },
  ADV: { name: 'ให้ยืม/สำรองจ่าย', sign: -1, cls: 'loan', ic: 'loan' },
  ADVR: { name: 'รับคืนเงินยืม', sign: 1, cls: 'loan', ic: 'loan' },
  BOR: { name: 'ยืมเงินเข้าฝ่าย', sign: 1, cls: 'loan', ic: 'loan' },
  BORR: { name: 'คืนเงินที่ฝ่ายยืม', sign: -1, cls: 'loan', ic: 'loan' }
};
var FLOW_IN = { IN: 1, REFUND: 1, ADVR: 1, BOR: 1 }, FLOW_OUT = { OUT: 1, ADV: 1, BORR: 1 };

var MODEL = {
  D: null, acc: {}, cat: {}, mem: {}, proj: {}, loan: {}, tx: [], txById: {}, dues: {},
  build: function (D) {
    var M = this; M.D = D;
    M.acc = {}; D.accounts.forEach(function (a) { M.acc[a.id] = a; });
    M.cat = {}; D.categories.forEach(function (c) { M.cat[c.id] = c; });
    M.mem = {}; D.members.forEach(function (x) { M.mem[x.empCode] = x; });
    M.proj = {}; D.projects.forEach(function (p) { M.proj[p.id] = p; });
    M.loan = {}; D.loans.forEach(function (l) { M.loan[l.id] = l; });
    M.tx = D.txns.slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0); });
    M.txById = {}; M.tx.forEach(function (t) { M.txById[t.id] = t; });
    M.dues = {}; D.dues.forEach(function (d) { M.dues[d.empCode + '|' + d.ym] = d; });
    M._cache = {};
  },
  /* ---------- ทั่วไป ---------- */
  today: function () { return this.D.today; },
  memName: function (code, full) { var x = this.mem[code]; if (!x) { var u = (this.D.users || []).filter(function (u) { return u.empCode === code; })[0]; return u ? u.name : code || ''; } return full ? (x.title + x.fname + ' ' + x.lname).trim() : x.fname; },
  payeeOf: function (t) { return t.payee ? this.memName(t.payee) : (t.payeeName || ''); },
  catName: function (id) { var c = this.cat[id]; return c ? c.name : (id || '—'); },
  catColor: function (id) { var c = this.cat[id]; return c ? c.color : '#8a8086'; },
  accName: function (id, short) { var a = this.acc[id]; return a ? (short ? a.short : a.name) : id; },
  projName: function (id) { var p = this.proj[id]; return p ? p.name : ''; },
  activeAccounts: function () { return this.D.accounts.filter(function (a) { return a.active; }); },
  cats: function (kind, all) { return this.D.categories.filter(function (c) { return c.kind === kind && (all || c.active) && c.id !== 'OPENING'; }); },
  /** ผลของรายการต่อบัญชี acc */
  effect: function (t, acc) {
    var ty = TYPES[t.type]; if (!ty) return 0;
    var e = 0;
    if (t.account === acc) e += ty.sign * t.amount;
    if (t.type === 'TRANSFER' && t.toAccount === acc) e += t.amount;
    return e;
  },
  balances: function (asOf) {
    var M = this, b = {}; M.D.accounts.forEach(function (a) { b[a.id] = 0; });
    M.tx.forEach(function (t) {
      if (asOf && t.date > asOf) return;
      var ty = TYPES[t.type]; if (!ty) return;
      b[t.account] = (b[t.account] || 0) + ty.sign * t.amount;
      if (t.type === 'TRANSFER') b[t.toAccount] = (b[t.toAccount] || 0) + t.amount;
    });
    var tot = 0; Object.keys(b).forEach(function (k) { b[k] = r2(b[k]); tot += b[k]; });
    b._total = r2(tot);
    return b;
  },
  /** ยอดคงเหลือรายวัน (เฉพาะวันที่มีรายการ) → [{date, acc:{}, total}] */
  balanceSeries: function () {
    if (this._cache.bs) return this._cache.bs;
    var M = this, b = {}, out = [], ids = M.D.accounts.map(function (a) { return a.id; });
    ids.forEach(function (i) { b[i] = 0; });
    var byDate = groupBy(M.tx, function (t) { return t.date; });
    Object.keys(byDate).sort().forEach(function (d) {
      byDate[d].forEach(function (t) { var ty = TYPES[t.type]; if (!ty) return; b[t.account] += ty.sign * t.amount; if (t.type === 'TRANSFER') b[t.toAccount] += t.amount; });
      var o = { date: d, acc: {}, total: 0 }; ids.forEach(function (i) { o.acc[i] = r2(b[i]); o.total += b[i]; }); o.total = r2(o.total);
      out.push(o);
    });
    return (this._cache.bs = out);
  },
  /* ---------- ปี/ช่วงเวลา ---------- */
  yearOf: function (date, basis) { var y = be(date), mo = +date.slice(5, 7); return basis === 'FY' && mo >= 10 ? y + 1 : y; },
  range: function (year, basis) { var ce = year - 543; return basis === 'FY' ? [(ce - 1) + '-10-01', ce + '-09-30'] : [ce + '-01-01', ce + '-12-31']; },
  monthsOf: function (year, basis) { var r = this.range(year, basis), out = [], ym = r[0].slice(0, 7); for (var i = 0; i < 12; i++) { out.push(ym); ym = addMonths(ym, 1); } return out; },
  years: function (basis) { var M = this, s = {}; M.tx.forEach(function (t) { if (t.type !== 'OPEN') s[M.yearOf(t.date, basis)] = 1; }); s[M.yearOf(M.today(), basis)] = 1; return Object.keys(s).map(Number).sort(); },
  curYear: function (basis) { return this.yearOf(this.today(), basis); },
  /* ---------- วิเคราะห์รายรับ/รายจ่าย ---------- */
  /** แถววิเคราะห์: {date, kind:'in'|'out', cat, amount(สุทธิ), t} */
  rows: function () {
    if (this._cache.rows) return this._cache.rows;
    var M = this, out = [];
    M.tx.forEach(function (t) {
      if (t.type === 'IN') out.push({ date: t.date, kind: 'in', cat: t.category, amount: t.amount, t: t, project: t.project });
      else if (t.type === 'OUT') out.push({ date: t.date, kind: 'out', cat: t.category, amount: t.amount, t: t, project: t.project });
      else if (t.type === 'REFUND') out.push({ date: t.date, kind: 'out', cat: t.category, amount: -t.amount, t: t, project: t.project, refund: true });
    });
    M.D.loans.forEach(function (l) {
      if (l.status !== 'WRITEOFF') return;
      var st = M.loanState(l.id);
      if (st.outstanding > 0) out.push({ date: l.closedAt || M.today(), kind: 'out', cat: l.category || 'OTHER_OUT', amount: st.outstanding, t: null, loan: l, project: '' });
    });
    return (this._cache.rows = out);
  },
  sumRows: function (from, to, kind, filter) {
    return r2(sum(this.rows().filter(function (r) { return r.kind === kind && r.date >= from && r.date <= to && (!filter || filter(r)); }), function (r) { return r.amount; }));
  },
  byMonth: function (year, basis) {
    var M = this, ms = M.monthsOf(year, basis), o = {};
    ms.forEach(function (ym) { o[ym] = { in: 0, out: 0 }; });
    M.rows().forEach(function (r) { var ym = r.date.slice(0, 7); if (o[ym]) o[ym][r.kind] += r.amount; });
    return ms.map(function (ym) { return { ym: ym, in: r2(o[ym].in), out: r2(o[ym].out), net: r2(o[ym].in - o[ym].out) }; });
  },
  byCat: function (from, to, kind) {
    var o = {};
    this.rows().forEach(function (r) { if (r.kind === kind && r.date >= from && r.date <= to) o[r.cat] = (o[r.cat] || 0) + r.amount; });
    return Object.keys(o).map(function (k) { return { cat: k, amount: r2(o[k]) }; }).filter(function (x) { return Math.abs(x.amount) > 0.004; }).sort(function (a, b) { return b.amount - a.amount; });
  },
  /** ยอดรายหมวดรายปี: {cat: {year: amount}} */
  catYear: function (basis, kind) {
    var M = this, o = {};
    M.rows().forEach(function (r) { if (r.kind !== kind) return; var y = M.yearOf(r.date, basis); (o[r.cat] = o[r.cat] || {})[y] = r2(((o[r.cat] || {})[y] || 0) + r.amount); });
    return o;
  },
  /* ---------- เงินยืม ---------- */
  loanState: function (id) {
    var M = this, l = M.loan[id], given = 0, back = 0, rows = M.tx.filter(function (t) { return t.loanId === id; });
    rows.forEach(function (t) { if (t.type === 'ADV' || t.type === 'BOR') given += t.amount; if (t.type === 'ADVR' || t.type === 'BORR') back += t.amount; });
    var first = rows[0];
    return { loan: l, given: r2(given), back: r2(back), outstanding: r2(given - back), txns: rows, account: first ? first.account : '', date: first ? first.date : (l && l.openedAt) };
  },
  openLoans: function (dir) {
    var M = this;
    return M.D.loans.filter(function (l) { return l.status === 'OPEN' && (!dir || l.direction === dir); }).map(function (l) { return M.loanState(l.id); }).filter(function (s) { return s.outstanding > 0.004; });
  },
  /* ---------- เงินฝ่ายรายเดือน ---------- */
  memberActiveIn: function (x, ym) { return (!x.joinYm || x.joinYm <= ym) && (!x.leaveYm || ym <= x.leaveYm) && (x.active || (x.leaveYm && ym <= x.leaveYm)); },
  duesCell: function (code, ym) {
    var x = this.mem[code], d = this.dues[code + '|' + ym], cur = this.today().slice(0, 7);
    if (d && d.status === 'PAID') return { st: ym > (d.paidDate || this.today()).slice(0, 7) ? 'pre' : (d.method === 'CASH' ? 'cash' : 'paid'), d: d, amount: d.amount };
    if (d && d.status === 'UNBOOKED') return { st: 'unb', d: d, amount: d.amount || (x && x.rate) || 0 };
    if (d && d.status === 'EXEMPT') return { st: 'ex', d: d };
    if (!x || !this.memberActiveIn(x, ym)) return { st: 'na' };
    if (!(x.rate > 0)) return { st: 'ex', auto: true };
    if (ym > cur) return { st: 'fut', amount: x.rate };
    return { st: 'due', amount: x.rate };
  },
  duesSummary: function (ym) {
    var M = this, exp = 0, got = 0, nPaid = 0, nDue = 0;
    M.D.members.forEach(function (x) {
      var c = M.duesCell(x.empCode, ym);
      if (c.st === 'paid' || c.st === 'cash' || c.st === 'pre' || c.st === 'unb') { got += c.amount; exp += c.amount; nPaid++; }
      else if (c.st === 'due' || c.st === 'fut') { exp += c.amount; nDue++; }
    });
    return { expected: r2(exp), collected: r2(got), paid: nPaid, due: nDue };
  },
  /* ---------- สวัสดิการ / วันเกิด ---------- */
  welfareOf: function (year, code, type) { return this.D.welfare.filter(function (w) { return w.year === year && w.empCode === code && w.type === type; }); },
  /** วันเกิดใน N วันข้างหน้า (รวมวันนี้) + วันเกิดที่ผ่านมาแล้วแต่ยังไม่ได้ใช้สิทธิ (ภายใน back วัน) */
  upcomingBirthdays: function (days, back) {
    var M = this, today = M.today(), y = +today.slice(0, 4), out = [];
    M.D.members.forEach(function (x) {
      if (!x.active || !x.bd) return;
      [y - 1, y, y + 1].forEach(function (yy) {
        var d = yy + '-' + x.bd; if (x.bd === '02-29' && !(yy % 4 === 0)) d = yy + '-02-28';
        var diff = daysBetween(today, d);
        var used = M.welfareOf(be(d), x.empCode, 'BDAY').length > 0;
        if ((diff >= 0 && diff <= days) || (back && diff < 0 && diff >= -back && !used)) out.push({ m: x, date: d, days: diff, used: used, year: be(d) });
      });
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  },
  /* ---------- สถิติ / ประมาณการ ---------- */
  /** ประมาณการทั้งปีปัจจุบัน = ยอดจริงถึงวันนี้ + ยอดเดือนที่เหลือของปีก่อน (คำนึงฤดูกาล เช่น ธ.ค. มีงานปีใหม่) */
  projectYear: function (cat, year, basis, kind) {
    var M = this, r = M.range(year, basis), today = M.today(), pr = M.range(year - 1, basis);
    var ytd = M.sumRows(r[0], today < r[1] ? today : r[1], kind, function (x) { return !cat || x.cat === cat; });
    if (today >= r[1]) return { ytd: ytd, proj: ytd, rest: 0 };
    var offset = daysBetween(pr[0], r[0]);
    var restFrom = addDays(today, 1 - offset), restTo = pr[1];
    var rest = M.sumRows(restFrom, restTo, kind, function (x) { return !cat || x.cat === cat; });
    return { ytd: ytd, rest: rest, proj: r2(ytd + Math.max(0, rest)) };
  },
  /** ข้อเสนองบปีหน้า: เฉลี่ยปีที่ครบแล้วล่าสุด 2 ปี (ถ้ามีปีเดียวใช้ปีนั้น) ปัดขึ้นหลักร้อย + เผื่อสูงสุด */
  suggest: function (vals) {
    var v = vals.filter(function (x) { return x != null; });
    if (!v.length) return { avg: 0, max: 0, sug: 0 };
    var last2 = v.slice(-2), avg = sum(last2) / last2.length, mx = Math.max.apply(null, v);
    return { avg: r2(avg), max: r2(mx), sug: Math.ceil(avg / 100) * 100 };
  },
  /** ข้อเสนองบรายหมวด: สวัสดิการวันเกิดคิดตามสิทธิ (สมาชิกที่ใช้งาน × อัตรา) · หมวดอื่นใช้สถิติ */
  suggestCat: function (c, vals) {
    if (c && c.welfare === 'BDAY') {
      var n = (S.D.members || []).filter(function (x) { return x.active !== false && String(x.active).toUpperCase() !== 'FALSE'; }).length;
      var amt = +(S.D.settings || {}).bdayAmount || 0, base = this.suggest(vals);
      return { avg: base.avg, max: base.max, sug: n * amt, rule: n + ' คน × ' + amt };
    }
    return this.suggest(vals);
  },
  eventStats: function (cat) {
    var a = this.rows().filter(function (r) { return r.cat === cat && r.kind === 'out' && r.t && r.t.type === 'OUT'; }).map(function (r) { return r.amount; }).sort(function (x, y) { return x - y; });
    if (!a.length) return null;
    var med = a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
    return { n: a.length, mean: r2(sum(a) / a.length), median: r2(med), min: a[0], max: a[a.length - 1] };
  },
  /** ประเภทโครงการ = ชื่อโครงการตัดปี พ.ศ. ออก (เช่น "ปีใหม่ 2569" → "ปีใหม่") */
  projType: function (name) { return String(name || '').replace(/\s*25\d\d\s*/g, ' ').replace(/\s+/g, ' ').trim(); },
  projActual: function (id) {
    var M = this, out = 0, inn = 0, n = 0, first = '', last = '';
    M.rows().forEach(function (r) { if (r.project !== id) return; if (r.kind === 'out') out += r.amount; else inn += r.amount; n++; first = !first || r.date < first ? r.date : first; last = r.date > last ? r.date : last; });
    var adv = 0; M.tx.forEach(function (t) { if (t.project === id && t.type === 'ADV') adv += M.loanState(t.loanId).outstanding; });
    return { out: r2(out), in: r2(inn), n: n, first: first, last: last, pendingAdv: r2(adv) };
  }
};
