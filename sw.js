const CACHE = "daily-system-v2";
const BASE  = "/Dailies/";
const ASSETS = [BASE, BASE + "index.html", BASE + "manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow(BASE);
    })
  );
});

// ── Notification scheduling ───────────────────────────────────────────────────
let morningHour = 8,  morningMin = 0;
let eveningHour = 19, eveningMin = 0;
let morningTimer = null, eveningTimer = null;
let pendingSlot  = null;

self.addEventListener("message", e => {
  if (!e.data) return;
  if (e.data.type === "SCHEDULE") {
    morningHour = e.data.morningHour ?? 8;
    morningMin  = e.data.morningMin  ?? 0;
    eveningHour = e.data.eveningHour ?? 19;
    eveningMin  = e.data.eveningMin  ?? 0;
    scheduleAll();
  }
  if (e.data.type === "CANCEL") {
    clearTimeout(morningTimer);
    clearTimeout(eveningTimer);
  }
  if (e.data.type === "PENDING_RESPONSE") {
    showNotification(pendingSlot, e.data.tasks || []);
    pendingSlot = null;
  }
});

function msUntil(hour, min) {
  const now  = new Date();
  const next = new Date();
  next.setHours(hour, min, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next - now;
}

function scheduleAll() {
  clearTimeout(morningTimer);
  clearTimeout(eveningTimer);
  morningTimer = setTimeout(() => { fireNotification("morning"); scheduleAll(); }, msUntil(morningHour, morningMin));
  eveningTimer = setTimeout(() => { fireNotification("evening"); },               msUntil(eveningHour, eveningMin));
}

function fireNotification(slot) {
  clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    if (list.length > 0) { pendingSlot = slot; list[0].postMessage({ type: "GET_PENDING" }); }
    else showNotification(slot, []);
  });
}

function showNotification(slot, tasks) {
  const isMorning = slot === "morning";
  let body;
  if (tasks.length === 0) {
    body = isMorning ? "Open the app to plan your day." : "Check in before the day ends.";
  } else if (tasks.length === 1) {
    body = `Still to do: ${tasks[0]}`;
  } else {
    const preview = tasks.slice(0, 3).join(", ");
    const extra   = tasks.length > 3 ? ` +${tasks.length - 3} more` : "";
    body = `Still to do: ${preview}${extra}`;
  }
  self.registration.showNotification("Daily System", {
    body,
    icon:      BASE + "icon-192.png",
    badge:     BASE + "icon-192.png",
    tag:       `daily-system-${slot}`,
    renotify:  false,
  });
}

scheduleAll();
