/* ==========================================================================
   LUMÉ Beauty Room — datos y lógica compartida
   ==========================================================================
   ▸ EDITA AQUÍ tus datos de contacto y contraseña (bloque CONFIG).
   ▸ Los datos (citas, ventas, gastos, inventario) se guardan en el propio
     navegador (localStorage). Se recomienda usar siempre el mismo equipo /
     navegador, o publicar el sitio en un hosting para acceso compartido.
   ========================================================================== */

const CONFIG = {
  // === CONTACTO ===
  // Número de WhatsApp con lada (puede llevar +, espacios o guiones; se limpian solos).
  whatsapp: "+528711777487",
  // Instagram: acepta el usuario (lume.trc) o la URL completa.
  instagram: "lume.trc",

  // === ADMINISTRADOR ===
  adminPassword: "lume2026",   // cámbiala por una contraseña propia

  // === NEGOCIO (aparece en el ticket) ===
  businessName: "LUMÉ Beauty Room",
  businessPhone: "+528711777487",
  businessAddress: "Paseo del Tecnológico 900.1, Residencial la Hacienda, 27272 Torreón, Coah.",
  currency: "$",
  ticketFooter: "¡Gracias por tu visita!",
};

/* ---------- utilidades ---------- */
const money = (n) => CONFIG.currency + (Math.round((+n || 0) * 100) / 100).toLocaleString("es-MX");
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
function fmtDate(iso){
  if(!iso) return "";
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function fmtDateLong(iso){
  if(!iso) return "";
  const dt = new Date(iso + "T00:00:00");
  return dt.toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
}
function igLink(v){
  v = (v || "").trim();
  if(!v) return "#";
  if(/^https?:\/\//i.test(v)) return v;              // ya es una URL completa
  return "https://instagram.com/" + v.replace(/^@/, "");
}
function waLink(number, text){
  const n = (number || "").replace(/[^\d]/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text || "")}`;
}

/* ---------- almacenamiento ---------- */
const Store = {
  get(key, def){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch(e){ return def; }
  },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)); },
};
const KEYS = {
  bookings:  "lume_bookings",
  sales:     "lume_sales",
  expenses:  "lume_expenses",
  inventory: "lume_inventory",
  auth:      "lume_auth",
  seeded:    "lume_seeded",
};

/* ---------- catálogo de servicios (nombre, descripción, precio) ---------- */
const SERVICES = [
  { cat: "Uñas esculturales / tip", items: [
    { id:"poly-mini", name:"Polygel mini",     desc:"Uñas esculturales de polygel, largo mini. Acabado natural y resistente.", min:280, max:300 },
    { id:"poly-med",  name:"Polygel medianas", desc:"Uñas esculturales de polygel, largo mediano.", min:320, max:350 },
    { id:"poly-lar",  name:"Polygel largas",   desc:"Uñas esculturales de polygel, largo largo.", min:360, max:380 },
    { id:"acr-mini",  name:"Acrílico mini",    desc:"Uñas esculturales de acrílico, largo mini.", min:250, max:270 },
    { id:"acr-med",   name:"Acrílico medianas",desc:"Uñas esculturales de acrílico, largo mediano.", min:280, max:290 },
    { id:"acr-lar",   name:"Acrílico largas",  desc:"Uñas esculturales de acrílico, largo largo.", min:300, max:330 },
  ]},
  { cat: "Gelish", items: [
    { id:"gel-sen",   name:"Gelish sencillo",       desc:"Esmaltado semipermanente de larga duración.", min:180, max:180 },
    { id:"ped-sin",   name:"Pedicure sin gelish",   desc:"Pedicure completo: limpieza, exfoliación y esmaltado normal.", min:350, max:350 },
    { id:"ped-con",   name:"Pedicure con gelish",   desc:"Pedicure completo con esmaltado semipermanente gelish.", min:380, max:380 },
    { id:"ped-acri",  name:"Pedicure con acripie",  desc:"Pedicure con refuerzo de acrílico en uñas de los pies.", min:420, max:420 },
    { id:"acripie",   name:"Acripie",               desc:"Refuerzo de acrílico en uñas de los pies.", min:300, max:300 },
    { id:"ret-gel",   name:"Retiro gelish c/aplicación", desc:"Retiro de gelish con nueva aplicación.", min:20, max:20 },
    { id:"ret-rub",   name:"Retiro gelish / rubber",desc:"Retiro de gelish o rubber base.", min:50, max:50 },
    { id:"rubber",    name:"Rubber",                desc:"Esmaltado con rubber base para mayor resistencia.", min:200, max:200 },
  ]},
  { cat: "Extras", items: [
    { id:"diseno",    name:"Diseño a mano alzada",  desc:"Diseño artístico personalizado hecho a mano.", min:30, max:80 },
    { id:"french",    name:"French",                desc:"Diseño clásico francés.", min:50, max:50 },
    { id:"efectos",   name:"Efectos",               desc:"Espejo, aurora, cat eye o reflectivo.", min:50, max:50 },
    { id:"boomer",    name:"Baby boomer (aerógrafo)",desc:"Degradado baby boomer aplicado con aerógrafo.", min:60, max:60 },
    { id:"ret-acr",   name:"Retiro acrílico",       desc:"Retiro seguro de acrílico.", min:80, max:80 },
    { id:"repo",      name:"Reposición de uña",     desc:"Reposición de una uña individual.", min:20, max:20 },
  ]},
  { cat: "Pestañas y Cejas", items: [
    { id:"lift-pes",  name:"Lifting de pestañas",   desc:"Lifting y curvatura natural de pestañas.", min:300, max:300 },
    { id:"lam-cej",   name:"Diseño y laminado de cejas", desc:"Diseño y laminado para cejas definidas.", min:300, max:300 },
    { id:"combo-pc",  name:"Lifting pestañas + laminado cejas", desc:"Combo de lifting de pestañas y laminado de cejas.", min:500, max:500 },
  ]},
  { cat: "Alaciado de cabello", items: [
    { id:"keratina",  name:"Keratina",              desc:"Tratamiento de keratina para alaciar y nutrir el cabello.", min:400, max:1000 },
  ]},
];

// índice rápido id -> servicio
const SERVICE_INDEX = {};
SERVICES.forEach(g => g.items.forEach(it => { SERVICE_INDEX[it.id] = { ...it, cat:g.cat }; }));

function priceLabel(it){
  return it.min === it.max ? money(it.min) : `${money(it.min)} - ${money(it.max)}`;
}

/* datos de inventario de ejemplo (solo la primera vez) */
function seedInventoryOnce(){
  if(Store.get(KEYS.seeded)) return;
  if(!Store.get(KEYS.inventory)){
    Store.set(KEYS.inventory, [
      { id:uid(), name:"Acrílico polvo transparente", qty:5, min:2, cost:180 },
      { id:uid(), name:"Polygel nude", qty:4, min:2, cost:150 },
      { id:uid(), name:"Gelish top coat", qty:3, min:2, cost:120 },
      { id:uid(), name:"Tips (caja)", qty:8, min:3, cost:60 },
      { id:uid(), name:"Kit lifting de pestañas", qty:2, min:1, cost:350 },
    ]);
  }
  Store.set(KEYS.seeded, true);
}
seedInventoryOnce();
