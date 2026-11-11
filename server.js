try{for(const l of require('node:fs').readFileSync(require('node:path').join(__dirname,'.env'),'utf8').split(/\r?\n/)){const m=l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')}}catch{}
const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const store = require('./store');
const seed = require('./seed');

const app = express();
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error('ADMIN_PASSWORD belum diatur. Isi di .env (lokal) atau Environment (hosting).'); process.exit(1); }
const STATUSES = ['Pending', 'Dikonfirmasi', 'Berangkat', 'Selesai', 'Dibatalkan'];
const sessions = new Map(); // token -> expiry

app.use((req, res, next) => { res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' }); next(); });
app.use(express.json({ limit: '3mb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const clean = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = v => (Number.isFinite(Number(v)) && Number(v) >= 0 ? Math.round(Number(v)) : 0);
const validDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const digits = v => String(v || '').replace(/\D/g, '');
const samePhone = (a, b) => { a = digits(a).replace(/^0/, '62'); b = digits(b).replace(/^0/, '62'); return a.length >= 9 && a === b; };
const isImg = v => typeof v === 'string' && (/^data:image\/(png|jpe?g|webp);base64,/.test(v) || /^\/images\/[\w.-]+$/.test(v) || /^https:\/\//.test(v));

// rate limit sederhana (per IP)
const hits = new Map();
const limit = (key, max, ms) => (req, res, next) => {
  const k = key + req.ip, now = Date.now(), h = (hits.get(k) || []).filter(t => now - t < ms);
  if (h.length >= max) return res.status(429).json({ error: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.' });
  h.push(now); hits.set(k, h); next();
};

const getBookings = () => store.get('bookings', []);
const getList = name => store.get(name, seed[name]);
const getSettings = () => store.get('settings', seed.settings);

function requireAdmin(req, res, next) {
  const t = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const exp = sessions.get(t);
  if (!exp || exp < Date.now()) { sessions.delete(t); return res.status(401).json({ error: 'Sesi admin tidak valid atau telah berakhir.' }); }
  next();
}
const safeEq = (a, b) => { const x = crypto.createHash('sha256').update(a).digest(), y = crypto.createHash('sha256').update(b).digest(); return crypto.timingSafeEqual(x, y); };

app.post('/api/auth/login', limit('login', 8, 10 * 60 * 1000), (req, res) => {
  const u = clean(req.body?.username, 100), p = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEq(u, ADMIN_USER) || !safeEq(p, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Username atau kata sandi salah.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 12 * 3600 * 1000);
  res.json({ success: true, token, username: u });
});

// ---------- Publik ----------
app.get('/api/public/packages', wrap(async (_q, res) => res.json((await getList('packages')).filter(x => x.active))));
app.get('/api/public/fleet', wrap(async (_q, res) => res.json((await getList('fleet')).filter(x => x.active))));
app.get('/api/public/settings', wrap(async (_q, res) => { const s = await getSettings(); res.json({ contact: s.contact, banks: s.banks, qrisImage: s.qrisImage, qrisNote: s.qrisNote, dpPercent: s.dpPercent }); }));

app.post('/api/bookings', limit('book', 10, 10 * 60 * 1000), wrap(async (req, res) => {
  const b = req.body || {};
  const name = clean(b.customerName, 120), phone = digits(clean(b.customerPhone, 30)), guests = Number(b.guests);
  const kind = b.kind === 'fleet' ? 'fleet' : 'package';
  const item = (await getList(kind === 'fleet' ? 'fleet' : 'packages')).find(x => x.id === b.itemId && x.active);
  if (!name || phone.length < 9 || !item || !validDate(b.date) || !Number.isInteger(guests) || guests < 1 || guests > 100)
    return res.status(400).json({ error: 'Data belum lengkap atau tidak valid. Periksa nama, WhatsApp, paket/armada, tanggal, dan jumlah peserta.' });
  if (b.date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Tanggal berangkat tidak boleh di masa lalu.' });
  const rows = await getBookings();
  const now = new Date(); let id;
  do id = `LP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${crypto.randomInt(0, 10000).toString().padStart(4, '0')}`; while (rows.some(r => r.id === id));
  const booking = {
    id, customerName: name, customerPhone: phone, customerEmail: clean(b.customerEmail, 180),
    package: item.name, itemId: item.id, kind, date: b.date, guests, price: num(item.price), destination: clean(b.destination, 200),
    status: 'Pending', paymentStatus: 'Menunggu pembayaran', paymentMethod: '', paymentProof: '', paidAmount: 0,
    adminNotes: '', customerNotes: clean(b.notes, 500), createdAt: now.toISOString(), fleet: 'Belum ditentukan'
  };
  rows.push(booking); await store.set('bookings', rows);
  res.status(201).json({ success: true, id, priceKnown: booking.price > 0 });
}));

const publicView = r => ({ id: r.id, customerName: r.customerName, package: r.package, date: r.date, guests: r.guests, price: r.price, destination: r.destination, status: r.status, paymentStatus: r.paymentStatus, paymentMethod: r.paymentMethod, paidAmount: r.paidAmount, hasProof: !!r.paymentProof, fleet: r.fleet, createdAt: r.createdAt });
async function findOwn(req) {
  const r = (await getBookings()).find(x => x.id === clean(req.body?.id, 40).toUpperCase());
  return r && samePhone(r.customerPhone, req.body?.phone) ? r : null;
}
app.post('/api/track', limit('track', 20, 10 * 60 * 1000), wrap(async (req, res) => {
  const r = await findOwn(req);
  if (!r) return res.status(404).json({ error: 'Pesanan tidak ditemukan. Periksa kode pesanan dan nomor WhatsApp.' });
  res.json({ booking: publicView(r) });
}));
app.post('/api/pay', limit('pay', 10, 10 * 60 * 1000), wrap(async (req, res) => {
  const rows = await getBookings();
  const id = clean(req.body?.id, 40).toUpperCase();
  const r = rows.find(x => x.id === id);
  if (!r || !samePhone(r.customerPhone, req.body?.phone)) return res.status(404).json({ error: 'Pesanan tidak ditemukan.' });
  if (r.status === 'Dibatalkan') return res.status(400).json({ error: 'Pesanan sudah dibatalkan.' });
  const method = req.body?.method === 'QRIS' ? 'QRIS' : 'Transfer Bank';
  const proof = req.body?.proof;
  if (!/^data:image\/(png|jpe?g|webp);base64,/.test(proof || '') || proof.length > 2.5e6) return res.status(400).json({ error: 'Bukti pembayaran harus berupa gambar (PNG/JPG/WEBP) maksimal ±1,8 MB.' });
  Object.assign(r, { paymentMethod: method, paymentProof: proof, paymentStatus: 'Menunggu verifikasi' });
  await store.set('bookings', rows);
  res.json({ booking: publicView(r) });
}));

// ---------- Admin ----------
app.get('/api/bookings', requireAdmin, wrap(async (req, res) => {
  let rows = await getBookings();
  const st = clean(req.query.status, 40), q = clean(req.query.q, 120).toLocaleLowerCase('id');
  if (st && st !== 'Semua') rows = rows.filter(r => r.status === st);
  if (q) rows = rows.filter(r => [r.id, r.customerName, r.customerPhone, r.package, r.date].some(v => String(v || '').toLocaleLowerCase('id').includes(q)));
  rows = rows.map(({ paymentProof, ...r }) => ({ ...r, hasProof: !!paymentProof })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  res.json({ bookings: rows, total: rows.length });
}));
app.get('/api/bookings/:id/proof', requireAdmin, wrap(async (req, res) => {
  const r = (await getBookings()).find(x => x.id === req.params.id);
  r?.paymentProof ? res.json({ proof: r.paymentProof }) : res.status(404).json({ error: 'Belum ada bukti pembayaran.' });
}));
app.patch('/api/bookings/:id', requireAdmin, wrap(async (req, res) => {
  const rows = await getBookings(), r = rows.find(x => x.id === req.params.id), b = req.body || {};
  if (!r) return res.status(404).json({ error: 'Pemesanan tidak ditemukan.' });
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Status tidak dikenal.' }); r.status = b.status; }
  if (b.paymentStatus !== undefined) { const v = clean(b.paymentStatus, 60); if (!v) return res.status(400).json({ error: 'Status pembayaran tidak boleh kosong.' }); r.paymentStatus = v; }
  if (b.adminNotes !== undefined) r.adminNotes = clean(b.adminNotes, 2000);
  if (b.fleet !== undefined) r.fleet = clean(b.fleet, 60) || 'Belum ditentukan';
  if (b.price !== undefined) r.price = num(b.price);
  if (b.paidAmount !== undefined) r.paidAmount = num(b.paidAmount);
  await store.set('bookings', rows);
  const { paymentProof, ...out } = r; res.json({ booking: out });
}));
app.delete('/api/bookings/:id', requireAdmin, wrap(async (req, res) => {
  const rows = await getBookings(), i = rows.findIndex(x => x.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Pemesanan tidak ditemukan.' });
  rows.splice(i, 1); await store.set('bookings', rows); res.json({ success: true });
}));
app.get('/api/stats', requireAdmin, wrap(async (_q, res) => {
  const rows = await getBookings(), active = rows.filter(r => r.status !== 'Dibatalkan'), usage = {};
  for (const r of active) if (r.fleet && r.fleet !== 'Belum ditentukan') usage[r.fleet] = (usage[r.fleet] || 0) + 1;
  res.json({ totalBookings: rows.length, revenueEstimate: active.reduce((s, r) => s + (r.price || 0), 0), paidTotal: rows.reduce((s, r) => s + (r.paidAmount || 0), 0), awaitingVerification: rows.filter(r => r.paymentStatus === 'Menunggu verifikasi').length, statusCounts: Object.fromEntries(STATUSES.map(s => [s, rows.filter(r => r.status === s).length])), fleetUsed: Object.keys(usage).length });
}));

// CRUD paket & armada
function crud(name, build) {
  const base = `/api/admin/${name}`;
  app.get(base, requireAdmin, wrap(async (_q, res) => res.json(await getList(name))));
  app.post(base, requireAdmin, wrap(async (req, res) => {
    const rows = await getList(name), item = build(req.body || {}); if (!item) return res.status(400).json({ error: 'Data tidak valid (nama wajib diisi).' });
    item.id = (item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'item') + '-' + crypto.randomBytes(2).toString('hex');
    rows.push(item); await store.set(name, rows); res.status(201).json(item);
  }));
  app.put(`${base}/:id`, requireAdmin, wrap(async (req, res) => {
    const rows = await getList(name), i = rows.findIndex(x => x.id === req.params.id), item = build(req.body || {});
    if (i < 0) return res.status(404).json({ error: 'Data tidak ditemukan.' }); if (!item) return res.status(400).json({ error: 'Data tidak valid.' });
    rows[i] = { ...item, id: rows[i].id }; await store.set(name, rows); res.json(rows[i]);
  }));
  app.delete(`${base}/:id`, requireAdmin, wrap(async (req, res) => {
    const rows = await getList(name), i = rows.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Data tidak ditemukan.' }); rows.splice(i, 1); await store.set(name, rows); res.json({ success: true });
  }));
}
const lines = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(s => clean(s, 300)).filter(Boolean).slice(0, 30);
crud('packages', b => clean(b.name, 120) && ({ name: clean(b.name, 120), route: clean(b.route, 160), duration: clean(b.duration, 40), image: isImg(b.image) ? b.image : '', tag: clean(b.tag, 20), price: num(b.price), active: b.active !== false, itinerary: lines(b.itinerary), includes: lines(b.includes), terms: lines(b.terms) }));
crud('fleet', b => clean(b.name, 120) && ({ name: clean(b.name, 120), seats: num(b.seats), image: isImg(b.image) ? b.image : '', features: lines(b.features), price: num(b.price), active: b.active !== false }));

app.get('/api/admin/settings', requireAdmin, wrap(async (_q, res) => res.json(await getSettings())));
app.put('/api/admin/settings', requireAdmin, wrap(async (req, res) => {
  const b = req.body || {}, cur = await getSettings();
  const s = {
    contact: { whatsapp: digits(b.contact?.whatsapp), phone: clean(b.contact?.phone, 40), email: clean(b.contact?.email, 120), address: clean(b.contact?.address, 200) },
    banks: (Array.isArray(b.banks) ? b.banks : []).slice(0, 6).map(x => ({ bank: clean(x.bank, 40), number: clean(x.number, 40), holder: clean(x.holder, 100) })).filter(x => x.bank && x.number),
    qrisImage: b.qrisImage === '' ? '' : (isImg(b.qrisImage) ? b.qrisImage : cur.qrisImage), qrisNote: clean(b.qrisNote, 200), dpPercent: Math.min(100, num(b.dpPercent) || 100)
  };
  await store.set('settings', s); res.json(s);
}));

app.use('/api', (_q, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));
app.use((err, _q, res, _n) => { console.error(err); res.status(err.type === 'entity.too.large' ? 413 : 500).json({ error: err.type === 'entity.too.large' ? 'File terlalu besar.' : 'Terjadi kesalahan pada server.' }); });

store.init().then(() => app.listen(PORT, () => console.log(`Lautan Pasir berjalan di port ${PORT}`))).catch(e => { console.error('Gagal menyiapkan penyimpanan:', e); process.exit(1); });
