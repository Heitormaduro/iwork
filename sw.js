// Service worker do iWork: deixa o app abrir sem internet depois da primeira visita.
// Páginas: rede primeiro (pega a versão nova), cache se estiver offline.
// Arquivos (JS, CSS, ícones, fontes): cache primeiro, atualizado em segundo plano.
const VERSAO = 'iwork-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(VERSAO)
      .then((c) => c.addAll(['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  const mesmaOrigem = url.origin === self.location.origin
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'
  if (!mesmaOrigem && !fonte) return // WhatsApp e outros sites: deixa passar

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone()
          caches.open(VERSAO).then((c) => c.put('./', copia))
          return resp
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  e.respondWith(
    caches.match(req).then((emCache) => {
      const rede = fetch(req)
        .then((resp) => {
          if (resp.ok || resp.type === 'opaque') {
            const copia = resp.clone()
            caches.open(VERSAO).then((c) => c.put(req, copia))
          }
          return resp
        })
        .catch(() => emCache)
      return emCache ?? rede
    }),
  )
})
