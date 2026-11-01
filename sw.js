self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Algostead", {
    body: d.body || "",
    tag: "drillbit-reminder",
    data: { url: d.url || "/" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  let url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin);
  if (url.origin !== self.location.origin) url = new URL("/", self.location.origin);
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    const open = list.find(c => c.url.startsWith(self.location.origin));
    return open ? open.focus() : self.clients.openWindow(url.href);
  }));
});
