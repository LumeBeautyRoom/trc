/* ==========================================================================
   LUMÉ Beauty Room — notificaciones del administrador
   --------------------------------------------------------------------------
   • "Tu siguiente cita empieza en 15 min" (minutos configurables).
   • Resumen nocturno (9 p.m. por defecto): "Mañana tienes 5 citas, tu primera
     cita empieza a las 9:00 a.m. ¡Suerte!".
   • Aviso cuando una clienta agenda desde la página.
   Funcionan mientras el panel esté abierto o minimizado (pestaña o app
   instalada). La configuración se guarda en cada dispositivo.
   Requiere app.js (Store, fmt12, todayISO…).
   ========================================================================== */
const Notify = (function(){
  "use strict";
  const KEY = "lume_notif", SENT = "lume_notif_sent";
  const DEFAULTS = { enabled:false, before:15, nightly:true, nightlyHour:21, newBooking:true, sound:true };
  let cfg = Object.assign({}, DEFAULTS, Store.get(KEY, {}));
  let sent = Store.get(SENT, {});
  let known = null;               // ids de citas ya vistas (para detectar nuevas)
  const ignored = new Set();      // citas creadas desde este mismo panel
  let getBookings = ()=> [];
  let timer = null;

  const supported = ()=> "Notification" in window;
  const permission = ()=> supported() ? Notification.permission : "unsupported";

  function save(){ Store.set(KEY, cfg); }
  function markSent(k){ sent[k] = Date.now(); try{ Store.set(SENT, sent); }catch(e){} }
  function prune(){
    const lim = Date.now() - 4*864e5;
    Object.keys(sent).forEach(k=>{ if(sent[k] < lim) delete sent[k]; });
  }

  /* ---------- sonido corto (campanita) ---------- */
  let actx = null;
  function unlockAudio(){
    if(actx) return;
    try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
  }
  ["pointerdown","keydown"].forEach(ev=> window.addEventListener(ev, unlockAudio, { once:true, passive:true }));
  function chime(){
    if(!cfg.sound || !actx) return;
    try{
      if(actx.state === "suspended") actx.resume();
      const t = actx.currentTime;
      [880, 1318.5].forEach((f,i)=>{
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i*0.16);
        g.gain.exponentialRampToValueAtTime(0.18, t + i*0.16 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i*0.16 + 0.5);
        o.connect(g).connect(actx.destination);
        o.start(t + i*0.16); o.stop(t + i*0.16 + 0.55);
      });
    }catch(e){}
  }

  /* ---------- aviso dentro del panel ---------- */
  function banner(title, body, opts){
    let stack = document.getElementById("notifStack");
    if(!stack){
      stack = document.createElement("div");
      stack.id = "notifStack"; stack.className = "notif-stack";
      stack.setAttribute("aria-live", "polite");
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "notif-card";
    el.innerHTML = `<div class="nc-ico" aria-hidden="true">🔔</div>
      <div class="nc-main"><div class="nc-title">${esc(title)}</div><div class="nc-body">${esc(body)}</div>
      ${opts.actionLabel?`<button class="btn sm nc-act" type="button">${esc(opts.actionLabel)}</button>`:""}</div>
      <button class="x-btn nc-x" type="button" aria-label="Cerrar">&times;</button>`;
    const close = ()=>{ el.classList.add("out"); setTimeout(()=> el.remove(), 300); };
    el.querySelector(".nc-x").onclick = close;
    const act = el.querySelector(".nc-act");
    if(act) act.onclick = ()=>{ close(); opts.onAction && opts.onAction(); };
    stack.prepend(el);
    setTimeout(close, opts.sticky ? 60000 : 14000);
  }

  /* ---------- notificación del sistema + aviso interno ---------- */
  async function push(title, body, opts){
    opts = opts || {};
    banner(title, body, opts);
    if(document.visibilityState === "visible") chime();
    if(!cfg.enabled || permission() !== "granted") return;
    const o = { body, icon:"admin-icon-192.png", badge:"admin-icon-192.png", tag:opts.tag||"lume",
                renotify:true, vibrate:[120,60,120], data:{ url: opts.url || "admin.html#agenda" } };
    try{
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if(reg){ await reg.showNotification(title, o); return; }
    }catch(e){}
    try{
      const n = new Notification(title, o);
      n.onclick = ()=>{ window.focus(); n.close(); opts.onAction && opts.onAction(); };
    }catch(e){}
  }

  const active = (b)=> !isBlock(b) && blocksTime(b);
  const byTime = (a,b)=> (a.time||"").localeCompare(b.time||"");

  /* ---------- revisión periódica ---------- */
  function check(){
    const all = getBookings().filter(active);
    const today = todayISO(), nm = nowMin();

    // 1) la siguiente cita está por empezar
    all.filter(b=> b.date===today && b.status!=="cobrada").forEach(b=>{
      const diff = hmToMin(b.time) - nm;
      const k = `up_${b.id}_${b.date}_${b.time}`;
      if(diff <= (+cfg.before||15) && diff > -5 && !sent[k]){
        markSent(k);
        push(diff > 0 ? `Tu siguiente cita empieza en ${diff} min` : "Tu cita empieza ahora",
             `${b.client.name} · ${servicesText(b)} · ${fmt12(b.time)}`,
             { tag:"up-"+b.id, sticky:true, actionLabel:"Ver cita", onAction:()=> window.LumeOpenCita && window.LumeOpenCita(b.id) });
      }
    });

    // 2) resumen de la noche para el día siguiente
    const h = new Date().getHours();
    const kn = "night_" + today;
    if(cfg.nightly && h >= (+cfg.nightlyHour||21) && !sent[kn]){
      markSent(kn);
      const tm = addDaysISO(today, 1);
      const list = all.filter(b=> b.date===tm).sort(byTime);
      if(list.length){
        push(`Mañana tienes ${list.length} ${list.length===1?"persona":"personas"} 💅`,
             `Tu primera cita empieza a las ${fmt12(list[0].time)} con ${list[0].client.name}. ¡Suerte! ✨`,
             { tag:"night", url:"admin.html#manana", sticky:true, actionLabel:"Ver y enviar recordatorios",
               onAction:()=> window.LumeOpenTomorrow && window.LumeOpenTomorrow() });
      } else {
        push("Mañana no tienes citas", "Tienes el día libre 🌙 ¡A descansar!", { tag:"night" });
      }
    }
  }

  /* ---------- citas nuevas (agendadas por clientas) ---------- */
  function trackNew(){
    const all = getBookings();
    if(!known){ known = new Set(all.map(b=> b.id)); return; }
    const fresh = all.filter(b=> !known.has(b.id));
    fresh.forEach(b=> known.add(b.id));
    if(!cfg.newBooking) return;
    const news = fresh.filter(b=> !ignored.has(b.id) && !isBlock(b) && blocksTime(b));
    if(news.length === 1){
      const b = news[0];
      push("Nueva cita agendada ✨", `${b.client.name} · ${dayLabel(b.date)} ${fmt12(b.time)} · ${servicesText(b)}`,
           { tag:"new-"+b.id, actionLabel:"Ver cita", onAction:()=> window.LumeOpenCita && window.LumeOpenCita(b.id) });
    } else if(news.length > 1){
      push(`${news.length} citas nuevas ✨`, news.map(b=> `${b.client.name} (${dayLabel(b.date)} ${fmt12(b.time)})`).join(", "), { tag:"new-many" });
    }
  }

  /* ---------- API ---------- */
  function start(fn){
    getBookings = fn;
    prune();
    trackNew();
    check();
    clearInterval(timer);
    timer = setInterval(check, 30000);
    document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState==="visible") check(); });
  }
  function onData(){ if(known){ trackNew(); check(); } }

  async function enable(){
    if(!supported()) return "unsupported";
    let p = Notification.permission;
    if(p === "default") p = await Notification.requestPermission();
    cfg.enabled = (p === "granted");
    save();
    return p;
  }

  return {
    start, onData, check, enable, push, permission, supported,
    ignore: (id)=> ignored.add(id),
    getConfig: ()=> Object.assign({}, cfg),
    setConfig: (c)=>{ cfg = Object.assign(cfg, c); save(); },
    test: ()=> push("Así se verán tus avisos 🔔", "Tu siguiente cita empieza en 15 min · Ejemplo · 10:00 a.m.", { tag:"test" }),
  };
})();
