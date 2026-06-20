/* 英語発音記号メーカー PWA service worker.
   アプリ本体（シェル）をキャッシュしてオフライン起動できるようにする。
   発音辞書(CDN)はアプリ側がIndexedDBにキャッシュするため、ここでは扱わない。
   AI機能(api.anthropic.com)はオンライン専用。 */
const CACHE = "pronounce-v2";   // ← ファイルを更新したら必ず番号を上げる（v2, v3…）
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  // 別オリジン（CDN辞書・api.anthropic.com など）はそのままネットワークへ。
  // オフライン時はアプリ側がIndexedDB/エラー処理でフォールバックする。
  if (url.origin !== location.origin) return;
  // 同一オリジン：キャッシュ優先＋取得したら更新キャッシュ
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => { try { c.put(e.request, copy); } catch (_) {} });
        return resp;
      }).catch(() => e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())
    )
  );
});
