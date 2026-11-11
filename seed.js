const std = ['Bus pariwisata dan pengemudi', 'BBM dan tol sesuai rute yang disepakati', 'Koordinasi jadwal perjalanan'];
module.exports = {
  packages: [
    { id: 'yogyakarta', name: 'Paket Study Tour Yogyakarta', route: 'Borobudur · Malioboro', duration: '2–3 Hari', image: '/images/yogyakarta.webp', tag: 'Favorit', price: 0, active: true, includes: std, itinerary: ['Hari 1: Berangkat menuju Yogyakarta, kunjungan edukasi Candi Borobudur, check-in.', 'Hari 2: Kunjungan edukasi sesuai agenda sekolah, dilanjutkan kawasan Malioboro.', 'Hari 3 (opsional): Sarapan, pusat oleh-oleh, perjalanan pulang.'], terms: ['Tiket masuk, konsumsi, dan penginapan dikonfirmasi dalam penawaran tertulis.'] },
    { id: 'dieng', name: 'Paket Wisata Alam Dieng', route: 'Dieng · Telaga Warna', duration: '2–3 Hari', image: '/images/dieng.webp', tag: '', price: 0, active: true, includes: std, itinerary: ['Hari 1: Perjalanan ke Dieng, check-in dan istirahat.', 'Hari 2: Eksplorasi Telaga Warna dan destinasi alam sesuai cuaca.', 'Hari 3 (opsional): Sarapan, oleh-oleh, perjalanan pulang.'], terms: ['Destinasi alam dapat berubah mengikuti cuaca dan akses setempat.'] },
    { id: 'keluarga', name: 'Paket Wisata Keluarga', route: 'Pantai · Taman Rekreasi', duration: '2–3 Hari', image: '/images/family.webp', tag: 'Liburan', price: 0, active: true, includes: std, itinerary: ['Hari 1: Penjemputan dan perjalanan ke destinasi pilihan keluarga.', 'Hari 2: Kunjungan pantai atau taman rekreasi.', 'Hari 3 (opsional): Waktu santai, perjalanan pulang.'], terms: ['Harga akhir mengikuti rute, tanggal, durasi, dan jumlah peserta.'] },
    { id: 'jakarta', name: 'Paket City Tour Jakarta', route: 'Monas · Kota Tua · Ancol', duration: '2–3 Hari', image: '/images/jakarta.webp', tag: '', price: 0, active: true, includes: std, itinerary: ['Hari 1: Penjemputan dan city tour Monas serta Kota Tua.', 'Hari 2: Kunjungan Ancol atau destinasi kota sesuai minat.', 'Hari 3 (opsional): Agenda tambahan, perjalanan pulang.'], terms: ['Tiket masuk, parkir, konsumsi, dan penginapan dikonfirmasi pada penawaran.'] }
  ],
  fleet: [
    { id: 'medium', name: 'Medium Bus (32 Kursi)', seats: 32, image: '/images/medium-bus.webp', features: ['AC', 'Reclining Seat', 'TV', 'Bagasi'], price: 0, active: true },
    { id: 'big', name: 'Big Bus (40 Kursi)', seats: 40, image: '/images/big-bus.webp', features: ['AC', 'Reclining Seat', 'TV', 'Bagasi'], price: 0, active: true },
    { id: 'large', name: 'Big Bus Kapasitas Besar (50 Kursi)', seats: 50, image: '/images/large-bus.webp', features: ['AC', 'Reclining Seat', 'TV', 'Bagasi'], price: 0, active: true }
  ],
  settings: {
    contact: { whatsapp: '6282234567890', phone: '0822-3456-7890', email: 'lautanpasirtravel@gmail.com', address: 'Jl. Raya Madiun No. 123, Malang' },
    banks: [{ bank: 'BCA', number: '0000000000', holder: 'Lautan Pasir Tour & Travel' }],
    qrisImage: '', qrisNote: 'Scan QRIS, lalu unggah bukti pembayaran.', dpPercent: 30
  }
};
