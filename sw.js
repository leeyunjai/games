/* 자동 생성 — vite.config.ts의 pwaPlugin이 만든 파일입니다. 직접 수정하지 마세요. */
const CACHE = 'games-vmtli5cza';
const PRECACHE = [
  "./assets/hub-CZfJCdt4.css",
  "./assets/omok-ug-glWLr.css",
  "./assets/janggi-WEdYPnBa.css",
  "./assets/sudoku-CxmVA6sf.css",
  "./assets/tetris-fEX4Ur9t.css",
  "./assets/reversi-B3X_hBFk.css",
  "./assets/pwa-DnD6ACY4.css",
  "./assets/hub-YARl3LZj.js",
  "./assets/omok-Bl0xxOA5.js",
  "./assets/janggi-dw8B-a3C.js",
  "./assets/sudoku-DRRxC6pu.js",
  "./assets/tetris-DaHtU0Uk.js",
  "./assets/records-DQDBHwip.js",
  "./assets/reversi-BN3VoR2_.js",
  "./assets/useKeys-mJSfHVzL.js",
  "./assets/stats-DNAOQCAe.js",
  "./assets/progress-DH3fiKQG.js",
  "./assets/GameShell-Bx-3lkAR.js",
  "./assets/sound-4C_5qHPt.js",
  "./assets/pwa-CXxx_Qf7.js",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./"
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new URL(p, self.registration.scope).href)))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

/* 화면 이동은 캐시 우선(오프라인 우선), 그 외 정적 파일도 캐시 우선 + 백그라운드 갱신 */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) {
      /* 백그라운드에서 조용히 갱신 */
      fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
      return cached;
    }
    try {
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      if (req.mode === 'navigate') {
        const fallback = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (fallback) return fallback;
      }
      throw err;
    }
  })());
});
