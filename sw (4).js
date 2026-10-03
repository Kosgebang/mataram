/* Service worker Pembukuan Kos
   - Tampilan aplikasi disimpan di HP supaya cepat dibuka.
   - index.html selalu dicek ke server dulu, jadi versi baru langsung terpakai.
   - Data (Google Apps Script) TIDAK pernah disimpan di cache: selalu data terbaru.
   Naikkan VERSI setiap kali mengganti ikon atau manifest. */
const VERSI = 'kos-v1';
const SHELL = ['./', './index.html', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSI).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSI).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // data dari Apps Script: jangan pernah dari cache
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // halaman aplikasi: ambil dari server dulu, kalau offline pakai salinan terakhir
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const salin = res.clone(); caches.open(VERSI).then(c => c.put('./index.html', salin)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // huruf Google Fonts: pakai cache, perbarui di belakang
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(VERSI).then(c => c.match(req).then(ada => {
        const baru = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => ada);
        return ada || baru;
      }))
    );
    return;
  }

  // file lain di situs ini (ikon, manifest): cache dulu
  if (url.origin === self.location.origin) {
    e.respondWith(caches.match(req).then(ada => ada || fetch(req)));
  }
});
