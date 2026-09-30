/* ==========================================================================
   سَكِينَة — عامل الخدمة (Service Worker)
   الغرض الوحيد: تشغيل التطبيق بدون إنترنت بالكامل.
   لا تحليلات، لا طلبات خارجية، لا تخزين مؤقت لموارد طرف ثالث.
   ========================================================================== */

const VERSION = 'sakinah-v1.0.0';
const SHELL_CACHE = VERSION + '-shell';
const DATA_CACHE = VERSION + '-data';
const FONT_CACHE = VERSION + '-fonts';

/* ملفات الواجهة (يجب أن تُخزَّن مسبقًا ليفتح التطبيق أوفلاين) */
const SHELL_ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/store.js',
  'js/icons.js',
  'js/prayer.js',
  'js/hijri.js',
  'js/core.js',
  'js/quran.js',
  'js/azkar.js',
  'js/rituals.js',
  'js/screens.js',
  'js/boot.js',
];

/* بيانات أساسية مطلوبة على الفور */
const DATA_ASSETS = [
  'data/quran/index.json',
  'data/azkar/azkar.json',
  'data/azkar/categories.json',
  'data/names/names99.json',
  'data/names/situations.json',
  'data/cities.json',
  'data/hijri.json',
];

/* الخطوط: تُخزَّن عند أول استخدام */
const FONT_ASSETS = [
  'assets/fonts/Amiri-Regular.ttf',
  'assets/fonts/Amiri-Bold.ttf',
  'assets/fonts/AmiriQuran.ttf',
  'assets/fonts/Cairo.ttf',
  'assets/fonts/NotoNaskhArabic.ttf',
];

const ICON_ASSETS = [
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_ASSETS.map((u) => new Request(u, { cache: 'reload' })));

    const data = await caches.open(DATA_CACHE);
    await Promise.all(DATA_ASSETS.map(async (u) => {
      try { await data.add(new Request(u, { cache: 'reload' })); } catch (e) { /* نكمل */ }
    }));

    const icons = await caches.open(FONT_CACHE);
    await Promise.all(ICON_ASSETS.concat(FONT_ASSETS).map(async (u) => {
      try { await icons.add(new Request(u, { cache: 'reload' })); } catch (e) { /* نكمل */ }
    }));

    // تخزين نص السور مسبقًا قدر الإمكان (يُكمَل عند التصفح)
    await Promise.all(Array.from({ length: 114 }, (_, i) => i + 1).map(async (n) => {
      try { await data.add(new Request('data/quran/surah/' + n + '.json', { cache: 'reload' })); } catch (e) { /* نكمل */ }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // نتعامل فقط مع GET من نفس الأصل — لا طلبات خارجية إطلاقًا
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname.replace(/^\//, '');

  // بيانات المصحف والأذكار: cache-first (لا تتغير)
  if (path.startsWith('data/')) {
    event.respondWith(cacheFirst(req, DATA_CACHE));
    return;
  }
  // الخطوط والأيقونات: cache-first
  if (path.startsWith('assets/')) {
    event.respondWith(cacheFirst(req, FONT_CACHE));
    return;
  }
  // الواجهة: network-first مع الرجوع للمخزَّن (لتحديث سريع + عمل أوفلاين)
  event.respondWith(networkFirst(req, SHELL_CACHE));
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreSearch: true });
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html', { ignoreSearch: true });
      if (shell) return shell;
    }
    return new Response('غير متصل', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
  }
}
