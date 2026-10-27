// Caderneta: guarda o app no aparelho para abrir rápido e sem internet.
// Os dados continuam vindo do Firebase, que tem o próprio cache offline.
const VERSAO = 'caderneta-v1';
const BASE = ['./', './index.html', './manifest.json', './icone-192.png', './icone-512.png', './favicon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Banco de dados e login: sempre direto na rede
  if (/firebaseio\.com|googleapis\.com\/identitytoolkit|securetoken|firebaseapp\.com/.test(url.href)) return;

  // Páginas e arquivos do próprio app: rede primeiro (pega atualizações), cache se estiver offline
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(VERSAO).then(c => c.put(req, copia));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Fontes e bibliotecas do Firebase: cache primeiro (mudam raramente)
  if (/fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs/.test(url.href)) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const copia = res.clone();
        caches.open(VERSAO).then(c => c.put(req, copia));
        return res;
      }))
    );
  }
});
