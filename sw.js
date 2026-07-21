const CACHE = "daily-system-v3";
const BASE  = "/Dailies/";
const ASSETS = [BASE, BASE + "index.html", BASE + "manifest.json"];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(ASSETS); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e) {
  e.respondWith(
    caches.match(e.request).then(function(r) { return r || fetch(e.request); })
  );
});

self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(list) {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(BASE);
    })
  );
});

// The page sends SHOW_NOTIF when it wants to display a notification.
// This allows the notification to appear even when the app is backgrounded.
self.addEventListener("message", function(e) {
  if (!e.data) return;

  if (e.data.type === "SHOW_NOTIF") {
    self.registration.showNotification(e.data.title || "Daily System", {
      body:     e.data.body  || "",
      icon:     BASE + "icon-192.png",
      badge:    BASE + "icon-192.png",
      tag:      e.data.tag   || "ds-notif",
      renotify: false,
    });
  }

  // Legacy SW-side schedule — no-op now, scheduling moved to page
  if (e.data.type === "SCHEDULE" || e.data.type === "CANCEL") {
    // kept for compatibility, does nothing
  }
});
