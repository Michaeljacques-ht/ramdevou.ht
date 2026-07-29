// Randevou.ht — Service Worker (requis pour PWA / Play Store)
const CACHE = 'randevou-v1';
const STATIQUES = [
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/icone-192.png',
  '/icone-512.png'
];

// Installation : pré-cacher les fichiers statiques
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIQUES)));
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cles) =>
      Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie :
// - API (/api/...) : réseau uniquement (données temps réel, jamais de cache)
// - Pages HTML : réseau d'abord, cache en secours (hors ligne)
// - Statiques (css/js/png) : cache d'abord, réseau en secours
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  // API : toujours le réseau
  if (url.pathname.startsWith('/api/')) return;

  // Pages HTML et URLs personnalisées d'entreprises
  const estPage =
    e.request.mode === 'navigate' || url.pathname.endsWith('.html');

  if (estPage) {
    e.respondWith(
      fetch(e.request)
        .then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copie));
          return rep;
        })
        .catch(() =>
          caches.match(e.request).then(
            (r) =>
              r ||
              new Response(
                '<!DOCTYPE html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors ligne — Randevou.ht</title><body style="font-family:sans-serif;text-align:center;padding:60px 20px;color:#0B1424"><h1 style="color:#2563EB">📶 Pas de connexion</h1><p>Randevou.ht a besoin d\'Internet pour afficher les rendez-vous.<br>Vérifiez votre connexion puis réessayez.</p><button onclick="location.reload()" style="background:#2563EB;color:#fff;border:0;padding:12px 28px;border-radius:8px;font-size:16px">Réessayer</button></body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
          )
        )
    );
    return;
  }

  // Statiques : cache d'abord
  e.respondWith(
    caches.match(e.request).then(
      (r) =>
        r ||
        fetch(e.request).then((rep) => {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copie));
          return rep;
        })
    )
  );
});
