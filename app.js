/* ==========================================================================
   LUMÉ Beauty Room — datos y lógica compartida
   ==========================================================================
   ▸ EDITA AQUÍ tus datos (bloque CONFIG): contacto, contraseña y PERSONAL.
   ▸ Los datos (citas, ventas, gastos, inventario, clientas) se sincronizan con
     tu Firebase (ver firebase.js). Si no hay internet, funciona en modo local.
   ========================================================================== */

const CONFIG = {
  // === CONTACTO ===
  whatsapp: "+528711777487",           // WhatsApp con lada (se limpian +, espacios, guiones)
  instagram: "lume.trc",               // usuario o URL completa de Instagram

  // === ADMINISTRADOR ===
  adminPassword: "camis10",           // cámbiala por una contraseña propia

  // === NEGOCIO (aparece en el ticket) ===
  businessName: "LUMÉ Beauty Room",
  businessPhone: "+528711777487",
  businessAddress: "Paseo del Tecnológico 900.1, Residencial la Hacienda, 27272 Torreón, Coah.",
  currency: "$",
  ticketFooter: "¡Gracias por tu visita!",

  // === HORARIO DEL SALÓN (para el calendario y horarios disponibles) ===
  openHour: 9,      // abre a las 9:00
  closeHour: 21,    // cierra a las 21:00
  slotStep: 15,     // separación de horarios ofrecidos, en minutos

  // === PERSONAL / TRABAJADORAS ===
  // Para agregar más: copia el bloque { ... } y pon su foto (empleN.png) en la carpeta.
  staff: [
    { id: "emple1", name: "Ana González", photo: "emple1.png" }
  ],
};

/* ---------- utilidades ---------- */
const money = (n) => CONFIG.currency + (Math.round((+n || 0) * 100) / 100).toLocaleString("es-MX");
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
function fmtDate(iso){ if(!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; }
function fmtDateLong(iso){ if(!iso) return ""; const dt=new Date(iso+"T00:00:00"); return dt.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"}); }
function igLink(v){ v=(v||"").trim(); if(!v) return "#"; if(/^https?:\/\//i.test(v)) return v; return "https://instagram.com/"+v.replace(/^@/,""); }
function waLink(number, text){ const n=(number||"").replace(/[^\d]/g,""); return `https://wa.me/${n}?text=${encodeURIComponent(text||"")}`; }
function normalizePhone(p){ return (p||"").replace(/\D/g,""); }

/* ---------- tiempo / duración ---------- */
function durLabel(m){ m=+m||0; const h=Math.floor(m/60), mm=m%60; let s=""; if(h) s+=h+"h"; if(mm) s+=(h?" ":"")+mm+"min"; return s||"0min"; }
function hmToMin(t){ if(!t) return 0; const [h,m]=t.split(":").map(Number); return (h||0)*60+(m||0); }
function minToHM(x){ x=Math.max(0,Math.round(x)); const h=Math.floor(x/60), m=x%60; return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0"); }

/* intervalos ocupados de un día (opcionalmente de una trabajadora) */
function bookedIntervals(bookings, dateISO, staffId, ignoreId){
  return bookings.filter(b=> b.date===dateISO && b.status!=="cancelada" && b.id!==ignoreId
        && (!staffId || !b.staffId || b.staffId===staffId))
    .map(b=>{ const s=hmToMin(b.time); return [s, s+(+b.dur||60)]; });
}
/* horarios de inicio disponibles para un servicio de 'totalDur' minutos */
function availableSlots(bookings, dateISO, totalDur, staffId, ignoreId){
  const open=CONFIG.openHour*60, close=CONFIG.closeHour*60, step=CONFIG.slotStep||15;
  const ivs=bookedIntervals(bookings, dateISO, staffId, ignoreId);
  const out=[];
  for(let s=open; s+totalDur<=close; s+=step){
    const e=s+totalDur;
    const clash=ivs.some(([a,b])=> s<b && e>a);
    if(!clash) out.push(minToHM(s));
  }
  return out;
}

/* ---------- almacenamiento ---------- */
const Store = {
  get(key, def){ try{ const v=localStorage.getItem(key); return v?JSON.parse(v):def; }catch(e){ return def; } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
};
const KEYS = {
  bookings:"lume_bookings", sales:"lume_sales", expenses:"lume_expenses",
  inventory:"lume_inventory", clients:"lume_clients", auth:"lume_auth", seeded:"lume_seeded",
};

/* ---------- colores por categoría ---------- */
const CAT_STYLE = {
  "Uñas":             { bg:"#f9d6e3", bd:"#e7a3c0", tx:"#7d2f4f" },  // rosa
  "Pestañas y Cejas": { bg:"#e6d6f6", bd:"#c3a3ea", tx:"#573289" },  // lila
  "Cabello":          { bg:"#cfe1f8", bd:"#9dc0ee", tx:"#26467c" },  // azul
  "Maquillaje":       { bg:"#fbdcc4", bd:"#f2b78a", tx:"#8a481d" },  // durazno
  "Peinado":          { bg:"#d0efdd", bd:"#a1dbbd", tx:"#1f6a49" },  // menta
};
function catColor(cat){ return CAT_STYLE[cat] || { bg:"#eee", bd:"#ccc", tx:"#333" }; }

/* ---------- catálogo de servicios (nombre, precio, duración) ---------- */
const SERVICES = [
  { cat:"Uñas", items:[
    { id:"ini-poly",  name:"Inicio polygel",              desc:"Uñas nuevas esculturales de polygel.",       min:350, max:350, dur:100 },
    { id:"ini-acr",   name:"Inicio acrílico",             desc:"Uñas nuevas esculturales de acrílico.",      min:350, max:350, dur:100 },
    { id:"mant-poly", name:"Mantenimiento polygel",       desc:"Relleno y mantenimiento de polygel.",        min:300, max:300, dur:90 },
    { id:"mant-acr",  name:"Mantenimiento acrílico",      desc:"Relleno y mantenimiento de acrílico.",       min:300, max:300, dur:90 },
    { id:"gelish",    name:"Gelish",                      desc:"Esmaltado semipermanente.",                  min:200, max:200, dur:60 },
    { id:"rubber",    name:"Rubber",                      desc:"Rubber base de larga duración.",             min:250, max:250, dur:60 },
    { id:"ret-gel",   name:"Retiro Gelish o Rubber",      desc:"Retiro de gelish o rubber.",                 min:50,  max:50,  dur:30 },
    { id:"ret-acr",   name:"Retiro acrílico o polygel",   desc:"Retiro de acrílico o polygel.",              min:80,  max:80,  dur:30 },
    { id:"ped-sen",   name:"Pedicure sencillo",           desc:"Pedicure completo con esmalte normal.",      min:350, max:350, dur:60 },
    { id:"ped-gel",   name:"Pedicure con Gelish",         desc:"Pedicure con gelish semipermanente.",        min:380, max:380, dur:100 },
    { id:"ped-acri",  name:"Pedicure con Acripie",        desc:"Pedicure con refuerzo de acrílico.",         min:420, max:420, dur:120 },
    { id:"acripie",   name:"Acripie",                     desc:"Refuerzo de acrílico en pies.",              min:300, max:300, dur:60 },
    { id:"diseno",    name:"Diseño elaborado",            desc:"Diseño artístico personalizado.",            min:50,  max:150, dur:30 },
    { id:"repo",      name:"Reposición uña",              desc:"Reposición de una uña.",                     min:20,  max:20,  dur:5 },
  ]},
  { cat:"Pestañas y Cejas", items:[
    { id:"lift-pes",  name:"Lifting pestañas",            desc:"Lifting y curvatura de pestañas.",           min:300, max:300, dur:60 },
    { id:"lam-cej",   name:"Laminado cejas",              desc:"Laminado para cejas definidas.",             min:300, max:300, dur:60 },
    { id:"lift-lam",  name:"Lifting y laminado",          desc:"Lifting de pestañas + laminado de cejas.",   min:500, max:500, dur:90 },
    { id:"pes-clas",  name:"Pestañas clásicas",           desc:"Extensiones pestaña por pestaña.",           min:350, max:350, dur:240 },
    { id:"pes-hib",   name:"Pestañas híbridas",           desc:"Mezcla de clásicas y volumen.",              min:450, max:450, dur:240 },
    { id:"pes-vol",   name:"Pestañas volumen",            desc:"Volumen ruso.",                              min:550, max:550, dur:240 },
  ]},
  { cat:"Cabello", items:[
    { id:"keratina",  name:"Keratina",                    desc:"Tratamiento de keratina/alaciado.",          min:400, max:1000, dur:180 },
  ]},
  { cat:"Maquillaje", items:[
    { id:"maquillaje",name:"Maquillaje",                  desc:"Maquillaje profesional.",                    min:300, max:300, dur:60 },
  ]},
  { cat:"Peinado", items:[
    { id:"peinado",   name:"Peinado",                     desc:"Peinado profesional.",                       min:300, max:300, dur:60 },
  ]},
];

const SERVICE_INDEX = {};
SERVICES.forEach(g => g.items.forEach(it => { SERVICE_INDEX[it.id] = { ...it, cat:g.cat, color:catColor(g.cat) }; }));

function priceLabel(it){ return it.min===it.max ? money(it.min) : `${money(it.min)} - ${money(it.max)}`; }

/* ---------- personal ---------- */
function staffById(id){ return (CONFIG.staff||[]).find(s=> s.id===id) || null; }

/* ---------- inventario de ejemplo (solo la primera vez, modo local) ---------- */
function seedInventoryOnce(){
  if(Store.get(KEYS.seeded)) return;
  if(!Store.get(KEYS.inventory)){
    Store.set(KEYS.inventory, [
      { id:uid(), name:"Acrílico polvo transparente", qty:5, min:2, cost:180 },
      { id:uid(), name:"Polygel nude", qty:4, min:2, cost:150 },
      { id:uid(), name:"Gelish top coat", qty:3, min:2, cost:120 },
      { id:uid(), name:"Kit lifting de pestañas", qty:2, min:1, cost:350 },
    ]);
  }
  Store.set(KEYS.seeded, true);
}
seedInventoryOnce();