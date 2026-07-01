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
  const cols = ["bookings","sales","expenses","inventory"];
  const state = { bookings:[], sales:[], expenses:[], inventory:[] };
  let db = null, mode = "local", started = false;
  let changeCb = function(){};

  const lkey = (c)=> "lume_" + c;
  function loadLocal(){ cols.forEach(c=> state[c] = Store.get(lkey(c), [])); }
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
  function startSync(cb){
    changeCb = cb || changeCb;
    if(started){ changeCb(); return; }
    started = true;

    if(mode === "firebase"){
      cols.forEach(c=>{
        db.collection(c).onSnapshot(
          snap=>{
            state[c] = snap.docs.map(d=> d.data());
            try{ saveLocal(c); }catch(e){}     // caché local de respaldo
            changeCb();
          },
          err=>{ console.warn("[LUMÉ] Error de sincronización en '"+c+"':", err.message); }
        );
      });
    } else {
      loadLocal();
      changeCb();
    }
  }

  // Crea o actualiza un documento (por su campo id).
  async function put(collection, obj){
    if(mode === "firebase" && db){
      try{ await db.collection(collection).doc(String(obj.id)).set(obj); return true; }
      catch(e){ console.warn("[LUMÉ] Error al guardar en '"+collection+"', respaldo local:", e); }
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
      catch(e){ console.warn("[LUMÉ] Error al eliminar en '"+collection+"', respaldo local:", e); }
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

  return { init, startSync, put, remove, get, nextTicketNo, getMode };
})();
