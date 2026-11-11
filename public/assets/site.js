const $ = s => document.querySelector(s);
const rp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(n) || 0);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
async function api(url, body) {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Terjadi kesalahan.');
  return d;
}
function toast(m) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.append(t); } t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3200); }
const priceLabel = p => p > 0 ? `<b>${rp(p)}</b> <small>mulai dari</small>` : 'Hubungi Kami <small>untuk harga</small>';
const pkgCard = p => `<article class="card"><div class="photo"><img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">${p.tag ? `<span class="tag">${esc(p.tag)}</span>` : ''}</div><div class="card-body"><h3>${esc(p.name)}</h3><div class="meta">⌖ ${esc(p.route)}</div><div class="meta">◷ Durasi ${esc(p.duration)}</div><div class="card-bottom"><span class="price">${priceLabel(p.price)}</span><a class="mini-btn" href="pesan.html?paket=${encodeURIComponent(p.id)}">Pesan →</a></div><button class="mini-btn wide" style="margin-top:8px" onclick="showDetail('${esc(p.id)}')">Lihat Detail</button></div></article>`;
const fleetCard = f => `<article class="card fleet-card"><div class="photo"><img loading="lazy" src="${esc(f.image)}" alt="${esc(f.name)}"></div><div class="card-body"><h3>${esc(f.name)}</h3><div class="meta">♙ ${esc(f.seats)} kursi</div><div class="features">${(f.features || []).map(x => `<span class="feature">${esc(x)}</span>`).join('')}</div><div class="card-bottom"><span class="price">${priceLabel(f.price)}</span><a class="mini-btn" href="pesan.html?armada=${encodeURIComponent(f.id)}">Ajukan Sewa →</a></div></div></article>`;
let PKGS = [];
function showDetail(id) {
  const p = PKGS.find(x => x.id === id); if (!p) return;
  const L = (h, a) => a?.length ? `<h3>${h}</h3><ul>${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  $('#detailTitle').textContent = p.name;
  $('#detailContent').innerHTML = L('Rencana perjalanan', p.itinerary) + L('Termasuk', p.includes) + L('Ketentuan', p.terms);
  $('#detailBook').href = 'pesan.html?paket=' + encodeURIComponent(p.id);
  $('#detailModal').classList.add('show');
}
function closeDetail() { $('#detailModal').classList.remove('show'); }
document.addEventListener('DOMContentLoaded', () => {
  $('#menuBtn')?.addEventListener('click', () => $('#nav').classList.toggle('open'));
  api('/api/public/settings').then(s => {
    document.querySelectorAll('[data-c]').forEach(e => { e.textContent = s.contact[e.dataset.c] || ''; });
    document.querySelectorAll('[data-wa]').forEach(e => { e.href = 'https://wa.me/' + s.contact.whatsapp; });
  }).catch(() => {});
});
