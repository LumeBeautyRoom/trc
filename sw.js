/* ==========================================================================
   LUMÉ Beauty Room — service worker (app web instalable + modo sin internet)
   • Archivos del sitio: primero red (siempre lo más nuevo) y, si no hay
     internet, la copia guardada.
   • Librerías de Firebase y fuentes: copia guardada y se actualiza en segundo plano.
   • Los datos de Firestore NO pasan por aquí (Firebase tiene su propia caché).
   • Al tocar una notificación abre/enfoca el panel de administrador.
   Si cambias archivos y quieres forzar la actualización, sube el número de VERSION.
   ========================================================================== */
const VERSION = "lume-v5";
const SHELL = [
  "./", "index.html", "agendar.html", "admin.html",
  "styles.css", "app.js", "firebase.js", "ticket-pdf.js",
  "loader.js", "pwa.js", "notify.js",
  "logo.png", "logo-crop.png", "icon-192.png", "admin-icon-192.png",
  "manifest.webmanifest", "admin.webmanifest",
];

self.addEventListener("install", (e)=>{
  e.waitUntil(
    caches.open(VERSION)
      .then(c=> Promise.all(SHELL.map(u=> c.add(u).catch(()=>{}))))
      .then(()=> self.skipWaiting())
  );
});

self.addEventListener("activate", (e)=>{
  e.waitUntil(
    caches.keys()
      .then(keys=> Promise.all(keys.filter(k=> k!==VERSION).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});

const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener("fetch", (e)=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  if(url.origin === location.origin){
    // red primero, copia guardada si no hay internet
    e.respondWith(
      fetch(req).then(res=>{
        if(res.ok){ const copy=res.clone(); caches.open(VERSION).then(c=> c.put(req, copy)); }
        return res;
      }).catch(()=> caches.match(req, { ignoreSearch:true })
        .then(r=> r || (req.mode==="navigate" ? caches.match("index.html") : Response.error())))
    );
    return;
  }

  if(CDN.test(req.url)){
    // copia guardada al instante y se actualiza en segundo plano
    e.respondWith(
      caches.open(VERSION).then(c=> c.match(req).then(hit=>{
        const net = fetch(req).then(res=>{ if(res.ok || res.type==="opaque") c.put(req, res.clone()); return res; }).catch(()=> hit);
        return hit || net;
      }))
    );
  }
});

self.addEventListener("notificationclick", (e)=>{
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "admin.html#agenda";
  e.waitUntil(
    self.clients.matchAll({ type:"window", includeUncontrolled:true }).then(list=>{
      for(const c of list){
        if(c.url.includes("admin.html")){ c.focus(); c.postMessage({ type:"open", url:target }); return; }
      }
      return self.clients.openWindow(target);
    })
  );
});
