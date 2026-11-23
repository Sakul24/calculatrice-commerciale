/*
 * Service worker — Calculatrice Commerciale
 * Met l'application en cache pour qu'elle s'ouvre sans connexion.
 * Après une mise à jour du site, incrémentez VERSION pour forcer le rafraîchissement du cache.
 */
const VERSION = 'v1';
const CACHE = `calculatrice-${VERSION}`;
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './favicon.svg',
    './icons/icon-512.png',
    './icons/icon-maskable-512.png',
    './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k.startsWith('calculatrice-') && k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// Réponse immédiate depuis le cache, puis mise à jour en arrière-plan (stale-while-revalidate)
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

    event.respondWith((async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });

        const network = fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
        });

        if (cached) {
            event.waitUntil(network.catch(() => {}));
            return cached;
        }
        try {
            return await network;
        } catch (e) {
            if (req.mode === 'navigate') {
                const shell = await cache.match('./index.html');
                if (shell) return shell;
            }
            return Response.error();
        }
    })());
});
