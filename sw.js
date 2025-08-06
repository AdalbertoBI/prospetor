// workers/sw.js
const CACHE_NAME = 'pmg-prospector-v1';
const urlsToCache = [
'/',
'/assets/css/style.css',
'/assets/js/main.js',
'/assets/data/imagens.json'
];

self.addEventListener('install', (event) => {
event.waitUntil(
caches.open(CACHE_NAME)
.then((cache) => cache.addAll(urlsToCache))
);
});

self.addEventListener('fetch', (event) => {
event.respondWith(
caches.match(event.request)
.then((response) => {
return response || fetch(event.request);
})
);
});