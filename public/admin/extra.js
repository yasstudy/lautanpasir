(() => {
  const $ = s => document.querySelector(s), esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rp = n => 'Rp ' + new Intl.NumberFormat('id-ID').format(Number(n) || 0);
  const tok = () => sessionStorage.getItem('lp_admin_token') || '';
  const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 3200); };
  async function api(url, method = 'GET', body) {
    const r = await fetch(url, { method, headers: { Authorization: 'Bearer ' + tok(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Gagal (' + r.status + ')'); return d;
  }
  const readImg = f => new Promise((ok, no) => { if (!f) return ok(null); if (f.size > 1.5e6) return no(new Error('Gambar maks. 1,5 MB.')); const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
  const field = (id, label, val = '', type = 'text', extra = '') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" value="${esc(val)}" ${extra}></div>`;
  const area = (id, label, val = '') => `<div class="field"><label for="${id}">${label}</label><textarea id="${id}">${esc(val)}</textarea></div>`;
  const tabs = ['booking', 'pay', 'paket', 'armada'];
  document.addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  function show(t) {
    tabs.forEach(x => { $('#tab-' + x).classList.toggle('hidden', x !== t); });
    document.querySelectorAll('[data-tab]').forEach(b => b.className = 'btn' + (b.dataset.tab === t ? ' btn-primary' : ''));
    ({ pay: loadPay, paket: () => loadList('packages'), armada: () => loadList('fleet') })[t]?.();
  }

  // ----- Paket & Armada -----
  const cfg = {
    packages: { box: '#tab-paket', title: 'Paket Wisata', cols: ['Nama', 'Rute', 'Harga', 'Status'], row: p => [p.name, p.route, p.price > 0 ? rp(p.price) : 'Hubungi', p.active ? 'Tampil' : 'Disembunyikan'] },
    fleet: { box: '#tab-armada', title: 'Armada', cols: ['Nama', 'Kursi', 'Harga', 'Status'], row: f => [f.name, f.seats, f.price > 0 ? rp(f.price) : 'Hubungi', f.active ? 'Tampil' : 'Disembunyikan'] }
  };
  let cache = {};
  async function loadList(name) {
    const c = cfg[name], box = $(c.box);
    try { cache[name] = await api('/api/admin/' + name); } catch (e) { return toast(e.message); }
    box.innerHTML = `<div class="section-head"><div><h2>${c.title}</h2><p>Perubahan langsung tampil di website.</p></div><button class="btn btn-primary" data-new>+ Tambah</button></div><div class="table-wrap"><div class="table-scroll"><table><thead><tr>${c.cols.map(h => `<th>${h}</th>`).join('')}<th></th></tr></thead><tbody>${cache[name].map(x => `<tr>${c.row(x).map((v, i) => `<td>${i === 0 ? `<b>${esc(v)}</b>` : esc(v)}</td>`).join('')}<td><button class="btn" data-edit="${esc(x.id)}">Edit</button> <button class="btn btn-danger" data-del="${esc(x.id)}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="5">Belum ada data.</td></tr>'}</tbody></table></div></div><div id="form-${name}"></div>`;
    box.onclick = ev => {
      if (ev.target.closest('[data-new]')) return form(name, {});
      const ed = ev.target.closest('[data-edit]'), dl = ev.target.closest('[data-del]');
      if (ed) form(name, cache[name].find(x => x.id === ed.dataset.edit));
      if (dl && confirm('Hapus item ini?')) api(`/api/admin/${name}/${dl.dataset.del}`, 'DELETE').then(() => { toast('Dihapus.'); loadList(name); }).catch(e => toast(e.message));
    };
  }
  function form(name, x) {
    const pk = name === 'packages', f = $('#form-' + name);
    f.innerHTML = `<div class="table-wrap" style="padding:20px;margin-top:18px"><h3 style="margin-top:0">${x.id ? 'Edit' : 'Tambah'} ${pk ? 'paket' : 'armada'}</h3>
      ${field('f-name', 'Nama', x.name)}${pk ? field('f-route', 'Rute / destinasi', x.route) + field('f-dur', 'Durasi', x.duration) + field('f-tag', 'Label (opsional, mis. Favorit)', x.tag) : field('f-seats', 'Jumlah kursi', x.seats, 'number', 'min="1"')}
      ${field('f-price', 'Harga (Rp). Isi 0 jika "Hubungi Kami"', x.price ?? 0, 'number', 'min="0"')}
      ${pk ? area('f-it', 'Rencana perjalanan (satu baris per hari)', (x.itinerary || []).join('\n')) + area('f-inc', 'Termasuk (satu baris per item)', (x.includes || []).join('\n')) + area('f-terms', 'Ketentuan (satu baris per item)', (x.terms || []).join('\n')) : area('f-feat', 'Fasilitas (satu baris per item)', (x.features || []).join('\n'))}
      <div class="field"><label for="f-img">Foto (kosongkan untuk mempertahankan)</label><input id="f-img" type="file" accept="image/png,image/jpeg,image/webp">${x.image ? `<small>Foto saat ini: <a href="${esc(x.image)}" target="_blank">lihat</a></small>` : ''}</div>
      <label style="display:flex;gap:8px;align-items:center;margin:8px 0 16px"><input id="f-act" type="checkbox" ${x.active !== false ? 'checked' : ''}> Tampilkan di website</label>
      <button class="btn btn-primary" id="f-save">Simpan</button> <button class="btn" id="f-cancel">Batal</button></div>`;
    f.scrollIntoView({ behavior: 'smooth' });
    $('#f-cancel').onclick = () => f.innerHTML = '';
    $('#f-save').onclick = async () => {
      try {
        const img = await readImg($('#f-img').files[0]);
        const v = id => $('#' + id).value, body = { name: v('f-name'), price: v('f-price'), active: $('#f-act').checked, image: img || x.image || '' };
        if (pk) Object.assign(body, { route: v('f-route'), duration: v('f-dur'), tag: v('f-tag'), itinerary: v('f-it'), includes: v('f-inc'), terms: v('f-terms') }); else Object.assign(body, { seats: v('f-seats'), features: v('f-feat') });
        await api('/api/admin/' + name + (x.id ? '/' + x.id : ''), x.id ? 'PUT' : 'POST', body); toast('Tersimpan.'); loadList(name);
      } catch (e) { toast(e.message); }
    };
  }

  // ----- Pembayaran -----
  async function loadPay() {
    const box = $('#tab-pay'); let s, b;
    try { [s, b] = await Promise.all([api('/api/admin/settings'), api('/api/bookings')]); } catch (e) { return toast(e.message); }
    const wait = b.bookings.filter(x => x.hasProof || x.paymentStatus === 'Menunggu verifikasi');
    box.innerHTML = `<div class="section-head"><div><h2>Verifikasi pembayaran</h2><p>Bukti yang dikirim pelanggan.</p></div></div><div class="table-wrap"><div class="table-scroll"><table><thead><tr><th>Pesanan</th><th>Total</th><th>Metode</th><th>Status</th><th></th></tr></thead><tbody>${wait.map(x => `<tr><td><b>${esc(x.id)}</b><div class="sub">${esc(x.customerName)} · ${esc(x.package)}</div></td><td>${rp(x.price)}</td><td>${esc(x.paymentMethod || '-')}</td><td>${esc(x.paymentStatus)}${x.paidAmount ? `<div class="sub">Dibayar ${rp(x.paidAmount)}</div>` : ''}</td><td><button class="btn" data-proof="${esc(x.id)}">Lihat bukti</button> <button class="btn btn-primary" data-pay="${esc(x.id)}|Lunas|${x.price}">Lunas</button> <button class="btn" data-pay="${esc(x.id)}|DP|${Math.round(x.price * s.dpPercent / 100)}">DP</button> <button class="btn btn-danger" data-pay="${esc(x.id)}|Ditolak|0">Tolak</button></td></tr>`).join('') || '<tr><td colspan="5">Belum ada bukti pembayaran.</td></tr>'}</tbody></table></div></div>
      <div class="section-head" style="margin-top:34px"><div><h2>Pengaturan pembayaran &amp; kontak</h2><p>Tampil di halaman bayar dan footer website.</p></div></div><div class="table-wrap" style="padding:20px">
      ${field('s-wa', 'WhatsApp (format 628xxx)', s.contact.whatsapp)}${field('s-phone', 'Telepon', s.contact.phone)}${field('s-mail', 'Email', s.contact.email)}${field('s-addr', 'Alamat', s.contact.address)}
      ${area('s-banks', 'Rekening bank (satu baris: Bank | Nomor | Atas nama)', s.banks.map(x => `${x.bank} | ${x.number} | ${x.holder}`).join('\n'))}
      ${field('s-dp', 'Minimal DP (%)', s.dpPercent, 'number', 'min="1" max="100"')}${field('s-qnote', 'Catatan di bawah QRIS', s.qrisNote)}
      <div class="field"><label for="s-qris">Gambar QRIS (upload dari aplikasi bank/merchant Anda)</label><input id="s-qris" type="file" accept="image/png,image/jpeg,image/webp">${s.qrisImage ? `<img src="${esc(s.qrisImage)}" alt="QRIS" style="max-width:180px;margin-top:8px"> <button class="btn" id="s-qdel">Hapus QRIS</button>` : '<small>Belum ada QRIS.</small>'}</div>
      <button class="btn btn-primary" id="s-save">Simpan pengaturan</button></div>`;
    const save = async (extra = {}) => {
      const banks = $('#s-banks').value.split('\n').map(l => l.split('|').map(t => t.trim())).filter(a => a[0] && a[1]).map(a => ({ bank: a[0], number: a[1], holder: a[2] || '' }));
      const img = await readImg($('#s-qris').files[0]);
      await api('/api/admin/settings', 'PUT', { contact: { whatsapp: $('#s-wa').value, phone: $('#s-phone').value, email: $('#s-mail').value, address: $('#s-addr').value }, banks, dpPercent: $('#s-dp').value, qrisNote: $('#s-qnote').value, qrisImage: img || s.qrisImage, ...extra });
      toast('Pengaturan tersimpan.'); loadPay();
    };
    $('#s-save').onclick = () => save().catch(e => toast(e.message));
    $('#s-qdel')?.addEventListener('click', () => save({ qrisImage: '' }).catch(e => toast(e.message)));
    box.onclick = async ev => {
      const pr = ev.target.closest('[data-proof]'), py = ev.target.closest('[data-pay]');
      try {
        if (pr) { const { proof } = await api(`/api/bookings/${pr.dataset.proof}/proof`); const w = window.open(); w.document.write(`<img src="${proof}" style="max-width:100%">`); }
        if (py) { const [id, st, amt] = py.dataset.pay.split('|'); await api('/api/bookings/' + id, 'PATCH', { paymentStatus: st, paidAmount: Number(amt) }); toast(`${id}: ${st}`); loadPay(); }
      } catch (e) { toast(e.message); }
    };
  }
})();
