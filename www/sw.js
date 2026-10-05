// Service Worker — network-first, so a new deploy is picked up immediately.
// (The previous cache-first version kept serving a stale index.html.)
const BUILD = "2026-10-05-reel-sound-v215";
const CACHE = "hire-reels-v178-reel-sound";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))  // ล้างแคชเก่าทั้งหมด
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window", includeUncontrolled: true }))
      .then((clients) => Promise.all(clients.map((client) => {
        const url = new URL(client.url);
        if (url.searchParams.get("build") === BUILD) return;
        url.searchParams.set("build", BUILD);
        return client.navigate(url.href);
      })))
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // อย่าแตะไฟล์ยืนยันตัวตนของแอป ต้องให้แอนดรอยด์อ่านจากเซิร์ฟเวอร์ตรง ๆ
  if (e.request.url.indexOf("/.well-known/") > -1) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      // ใช้แคชเฉพาะตอนออฟไลน์จริง ๆ
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match("./index.html")))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const callId = event.notification.data?.callId;
  const requestedAction = event.action || "accept";
  const fallbackTarget = callId ? `./?incomingCall=${encodeURIComponent(callId)}` : "./";
  const baseTarget = event.notification.data?.url || fallbackTarget;
  const targetUrl = new URL(baseTarget, self.location.origin);
  if (callId) targetUrl.searchParams.set("incomingCall", callId);
  if (requestedAction === "decline") targetUrl.searchParams.set("callAction", "decline");
  const target = targetUrl.href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows[0];
      if (existing) return existing.navigate(target).then(client => client?.focus());
      return clients.openWindow(target);
    })
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = { body: event.data?.text() || "สายเรียกเข้า" }; }
  const title = payload.title || (payload.kind === "video" ? "วิดีโอคอลเข้า" : "สายเสียงเข้า");
  // แอปเปิดอยู่และเห็นหน้าจอ หน้าจอสายเข้าในแอปขึ้นเองแล้ว ไม่ต้องเด้งซ้ำ
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    if (windows.some((client) => client.visibilityState === "visible" && client.focused)) return;
    return self.registration.showNotification(title, {
      body: payload.body || "มีสายเรียกเข้าจาก WorkD",
      icon: payload.icon || "icon-192.png",
      badge: payload.badge || "icon-192.png",
      tag: payload.tag || "workd-incoming-call",
      requireInteraction: true,
      renotify: true,
      vibrate: [300, 150, 300, 150, 500],
      actions: [
        { action: "accept", title: "รับสาย" },
        { action: "decline", title: "ปฏิเสธ" }
      ],
      data: { type: "incoming-call", callId: payload.callId, url: payload.url || "./" }
    });
  }));
});














