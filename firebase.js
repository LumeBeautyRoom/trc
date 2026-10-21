/* ==========================================================================
   LUMÉ Beauty Room — capa de datos con Firebase (Firestore)
   --------------------------------------------------------------------------
   • Sincroniza en tiempo real Agenda, Caja, Gastos e Inventario entre todos
     los dispositivos usando tu proyecto de Firebase.
   • Si no hay internet o no carga Firebase, funciona en MODO LOCAL
     (localStorage) automáticamente, sin perder datos.
   • Requiere haber creado la base de datos Firestore en la consola de Firebase
     y reglas que permitan lectura/escritura (ver LEEME.md).
   ========================================================================== */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBA7e_LuKRLV3JaSFu5IijycfquAN6aXCU",
  authDomain: "lume-d271c.firebaseapp.com",
  projectId: "lume-d271c",
  storageBucket: "lume-d271c.firebasestorage.app",
  messagingSenderId: "257262251217",
  appId: "1:257262251217:web:9d748164620818d06929f0",
  measurementId: "G-W4H686BN17"
};

const Data = (function(){
  // "busy" = solo los horarios ocupados (fecha, hora, duración), lo único que ve la página pública
  const cols = ["bookings","sales","expenses","inventory","clients","busy"];
  const state = { bookings:[], sales:[], expenses:[], inventory:[], clients:[], busy:[] };
  let db = null, mode = "local", started = false;
  let changeCb = function(){};
  let errorCb = function(){};
  // se resuelve cuando ya llegó la primera carga de datos (para la pantalla de carga)
  let readyResolve;
  const readyP = new Promise(r=> readyResolve = r);

  const lkey = (c)=> "lume_" + c;

  // Datos viejos o capturados a mano: les ponemos lo mínimo para que la app no falle
  // (id del documento, textos como texto, fechas como "AAAA-MM-DD…").
  const txt = (v)=> v==null ? "" : String(v);
  function stamp(v){
    if(!v) return "";
    if(typeof v === "string") return v;
    if(typeof v.toDate === "function") return v.toDate().toISOString();   // Timestamp de Firestore
    if(typeof v.seconds === "number") return new Date(v.seconds*1000).toISOString();
    const d = new Date(v);
    return isNaN(d) ? "" : d.toISOString();
  }
  // docId = id del documento en Firestore (manda sobre el campo "id", que en datos viejos
  // puede faltar o venir como número); fallbackId = solo si el dato no trae id (modo local)
  function fix(c, x, docId, fallbackId){
    if(docId) x.id = docId;
    else if(x.id==null || x.id==="") x.id = fallbackId;
    else x.id = String(x.id);
    if(c==="clients"){
      x.name = txt(x.name || x.nombre); x.phone = txt(x.phone || x.telefono || x.tel);
      x.note = txt(x.note); x.createdAt = stamp(x.createdAt); x.lastVisit = stamp(x.lastVisit).slice(0,10);
      if(x.birthDate) x.birthDate = stamp(x.birthDate).slice(0,10);
      if(!Array.isArray(x.conditions)) x.conditions = [];
    } else if(c==="bookings" || c==="sales"){
      const cl = (x.client && typeof x.client==="object") ? x.client : { name: txt(x.client) };
      x.client = { ...cl, name: txt(cl.name), phone: txt(cl.phone), note: txt(cl.note) };
      x.createdAt = stamp(x.createdAt);
      if(!Array.isArray(x.items)) x.items = [];
    }
    return x;
  }
  function loadLocal(){ cols.forEach(c=> state[c] = (Store.get(lkey(c), []) || []).map((x,i)=> fix(c, x, null, "local"+i))); }
  function saveLocal(c){ Store.set(lkey(c), state[c]); }

  function init(){
    loadLocal(); // arranca desde la caché local para mostrar algo al instante
    if(typeof firebase !== "undefined" && firebase.initializeApp){
      try{
        if(!firebase.apps || !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        // caché en disco: cargas más rápidas y funciona offline
        try{ db.enablePersistence({ synchronizeTabs:true }).catch(function(){}); }catch(e){}
        mode = "firebase";
        console.log("[LUMÉ] Conectado a Firebase (proyecto:", FIREBASE_CONFIG.projectId + ")");
      }catch(e){
        console.warn("[LUMÉ] No se pudo iniciar Firebase, usando modo local:", e);
        mode = "local";
      }
    } else {
      mode = "local";
      console.log("[LUMÉ] Firebase no disponible — modo local (localStorage).");
    }
    return mode;
  }

  // Inicia la sincronización en tiempo real. cb se llama en cada cambio.
  // 'which' (opcional) limita a ciertas colecciones (ej. solo ["bookings"]).
  function startSync(cb, which){
    changeCb = cb || changeCb;
    const list = (which && which.length) ? which : cols;
    if(started){ changeCb(); return; }
    started = true;

    if(mode === "firebase"){
      const pending = new Set(list);
      const arrived = (c)=>{ pending.delete(c); if(!pending.size) readyResolve(mode); };
      list.forEach(c=>{
        db.collection(c).onSnapshot(
          snap=>{
            state[c] = snap.docs.map(d=> fix(c, d.data(), d.id));
            try{ saveLocal(c); }catch(e){}     // caché local de respaldo
            arrived(c);
            changeCb();
          },
          err=>{ console.warn("[LUMÉ] Error de sincronización en '"+c+"':", err.message); arrived(c); }
        );
      });
    } else {
      loadLocal();
      readyResolve(mode);
      changeCb();
    }
  }

  // Promesa que se cumple con la primera carga de datos (o al pasar 'ms' milisegundos).
  function whenReady(ms){
    return ms ? Promise.race([readyP, new Promise(r=> setTimeout(r, ms))]) : readyP;
  }

  // Crea o actualiza un documento (por su campo id).
  async function put(collection, obj){
    if(mode === "firebase" && db){
      try{ await db.collection(collection).doc(String(obj.id)).set(obj); return true; }
      catch(e){ console.warn("[LUMÉ] Error al guardar en '"+collection+"', respaldo local:", e); errorCb(e, collection); }
    }
    const arr = state[collection];
    const i = arr.findIndex(x=> x.id === obj.id);
    if(i >= 0) arr[i] = obj; else arr.push(obj);
    saveLocal(collection); changeCb();
    return false;
  }

  // Elimina un documento por id.
  async function remove(collection, id){
    if(mode === "firebase" && db){
      try{ await db.collection(collection).doc(String(id)).delete(); return true; }
      catch(e){ console.warn("[LUMÉ] Error al eliminar en '"+collection+"', respaldo local:", e); errorCb(e, collection); }
    }
    state[collection] = state[collection].filter(x=> x.id !== id);
    saveLocal(collection); changeCb();
    return false;
  }

  const get = (collection)=> state[collection] || [];

  // Siguiente número de ticket (basado en los cobros ya sincronizados).
  function nextTicketNo(){
    return get("sales").reduce((m,s)=> Math.max(m, s.ticketNo || 0), 1000) + 1;
  }

  const getMode = ()=> mode;

  // avisa cuando Firebase rechaza un guardado (sin permiso, sin sesión…)
  const onError = (cb)=>{ errorCb = cb || function(){}; };

  return { init, startSync, whenReady, put, remove, get, nextTicketNo, getMode, onError };
})();

/* ==========================================================================
   Inicio de sesión del administrador (Firebase Authentication)
   • El usuario "lume" se convierte en el correo lume@<CONFIG.adminDomain>.
   • La cuenta se crea en Firebase Console → Authentication → Users.
   • La sesión queda guardada en el dispositivo hasta tocar "Salir".
   ========================================================================== */
const Auth = (function(){
  const available = ()=> typeof firebase !== "undefined" && !!firebase.auth && !!(firebase.apps && firebase.apps.length);
  function toEmail(user){
    user = (user||"").trim().toLowerCase();
    return user.includes("@") ? user : user + "@" + (CONFIG.adminDomain || "lumebeautyroom.com");
  }
  function onChange(cb){
    if(!available()){ cb(null); return; }
    firebase.auth().onAuthStateChanged(cb);
  }
  function signIn(user, pass){ return firebase.auth().signInWithEmailAndPassword(toEmail(user), pass); }
  function signOut(){ return available() ? firebase.auth().signOut() : Promise.resolve(); }
  // mensaje entendible para los errores de Firebase
  function errorText(e){
    const c = (e && e.code) || "";
    if(/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return "Usuario o contraseña incorrectos.";
    if(/too-many-requests/.test(c)) return "Demasiados intentos. Espera unos minutos e intenta de nuevo.";
    if(/network/.test(c)) return "Sin conexión a internet. Revisa tu red.";
    if(/operation-not-allowed/.test(c)) return "Activa Correo/Contraseña en Firebase → Authentication → Sign-in method.";
    return "No se pudo iniciar sesión (" + (c || "error") + ").";
  }
  return { available, onChange, signIn, signOut, toEmail, errorText };
})();

/* Registra/actualiza una clienta y cuenta la visita. Devuelve su id. */
function upsertClient(name, phone, note){
  const clients = Data.get("clients");
  const key = normalizePhone(phone);
  let c = key ? clients.find(x=> normalizePhone(x.phone)===key) : null;
  if(!c) c = clients.find(x=> (x.name||"").trim().toLowerCase() === (name||"").trim().toLowerCase());
  if(c){
    const upd = { ...c, name:name||c.name, phone:phone||c.phone, visits:(+c.visits||0)+1, lastVisit:todayISO() };
    if(note) upd.note = note;
    Data.put("clients", upd);
    return c.id;
  }
  const id = uid();
  Data.put("clients", { id, name:name||"", phone:phone||"", note:note||"", visits:1, lastVisit:todayISO(), createdAt:new Date().toISOString() });
  return id;
}