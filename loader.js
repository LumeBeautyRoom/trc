/* ==========================================================================
   LUMÉ Beauty Room — pantalla de carga
   --------------------------------------------------------------------------
   • Se incluye como PRIMER elemento del <body>: <script src="loader.js"></script>
   • Muestra el logo, un frasco de esmalte que se va llenando con gotas que
     caen del pincel y el porcentaje de carga.
   • Por defecto termina cuando la página termina de cargar (window.load).
     Si el <script> trae data-wait="manual", espera a LumeLoader.done()
     (por ejemplo, cuando ya llegaron los datos de Firebase).
   ========================================================================== */
(function(){
  "use strict";
  var me = document.currentScript;
  var manual = me && me.getAttribute("data-wait") === "manual";
  var MAX_WAIT = 9000;   // nunca bloquear la página más de esto

  var css = "" +
  "#lumeLoader{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;" +
    "background:#efece4;color:#141311;font-family:'Jost',system-ui,-apple-system,Segoe UI,Roboto,sans-serif;transition:opacity .45s ease,visibility .45s;}" +
  "#lumeLoader.out{opacity:0;visibility:hidden;}" +
  "#lumeLoader .ll-logo{width:min(220px,58vw);height:auto;margin-bottom:6px;}" +
  "#lumeLoader svg{width:132px;height:auto;overflow:visible;}" +
  "#lumeLoader .ll-pct{font-family:'Archivo Black','Jost',sans-serif;font-size:1.9rem;line-height:1;letter-spacing:.5px;font-variant-numeric:tabular-nums;margin-top:4px;}" +
  "#lumeLoader .ll-txt{font-size:.72rem;letter-spacing:4px;text-transform:uppercase;color:#6f6d64;}" +
  "#lumeLoader .ll-bar{width:min(220px,58vw);height:3px;border-radius:9px;background:#d9d4c7;overflow:hidden;margin-top:10px;}" +
  "#lumeLoader .ll-bar i{display:block;height:100%;width:0;background:#141311;border-radius:9px;}" +
  "#lumeLoader .ll-brush{animation:llSway 2.4s ease-in-out infinite;transform-origin:80px 0;}" +
  "#lumeLoader .ll-drop{animation:llDrop 1.2s cubic-bezier(.55,0,.85,.4) infinite;transform-origin:80px 112px;}" +
  "#lumeLoader .ll-ripple{animation:llRipple 1.2s ease-out infinite;transform-box:fill-box;transform-origin:center;}" +
  "#lumeLoader .ll-wave{animation:llWave 1.6s linear infinite;}" +
  "@keyframes llSway{0%,100%{transform:rotate(-2deg)}50%{transform:rotate(2deg)}}" +
  "@keyframes llDrop{0%{transform:translateY(0) scale(.2,.2);opacity:0}" +
    "18%{transform:translateY(0) scale(1,1);opacity:1}" +
    "38%{transform:translateY(2px) scale(.9,1.25);opacity:1}" +
    "86%{transform:translateY(var(--fall,60px)) scale(.8,1.35);opacity:1}" +
    "100%{transform:translateY(var(--fall,60px)) scale(1.4,.4);opacity:0}}" +
  "@keyframes llRipple{0%,80%{transform:scale(.2);opacity:0}86%{opacity:.9}100%{transform:scale(1.5);opacity:0}}" +
  "@keyframes llWave{from{transform:translateX(0)}to{transform:translateX(-40px)}}" +
  "@media (prefers-reduced-motion:reduce){#lumeLoader .ll-brush,#lumeLoader .ll-drop,#lumeLoader .ll-ripple,#lumeLoader .ll-wave{animation:none}}";

  // Frasco de esmalte: tapa con pincel arriba, gota que cae y frasco que se llena.
  var POLISH = "#c2386a";
  var svg = '' +
  '<svg viewBox="0 0 160 236" aria-hidden="true">' +
    '<defs>' +
      '<clipPath id="llBody"><rect x="36" y="150" width="88" height="80" rx="20"/></clipPath>' +
      '<linearGradient id="llGloss" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '</defs>' +
    '<g class="ll-brush">' +
      '<rect x="64" y="0" width="32" height="62" rx="6" fill="#141311"/>' +
      '<rect x="69" y="6" width="5" height="50" rx="2.5" fill="#fff" opacity=".18"/>' +
      '<rect x="77.5" y="62" width="5" height="30" fill="#2b2a27"/>' +
      '<path d="M73 92 h14 c0 9 -3 16 -7 21 c-4 -5 -7 -12 -7 -21z" fill="' + POLISH + '"/>' +
      '<path d="M76 94 c0 6 1 10 3 14" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
    '</g>' +
    '<path class="ll-drop" d="M80 108 c3 5 5 8 5 11 a5 5 0 0 1 -10 0 c0 -3 2 -6 5 -11z" fill="' + POLISH + '"/>' +
    // frasco
    '<rect x="66" y="136" width="28" height="18" rx="3" fill="#fff" fill-opacity=".45" stroke="#141311" stroke-width="2.5"/>' +
    '<g clip-path="url(#llBody)">' +
      '<rect x="36" y="150" width="88" height="80" fill="#fff" fill-opacity=".5"/>' +
      '<g id="llLiquid" transform="translate(0,80)">' +
        '<path class="ll-wave" d="M20 158 q10 -6 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V260 H20z" fill="' + POLISH + '"/>' +
        '<ellipse class="ll-ripple" cx="80" cy="158" rx="9" ry="2.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5"/>' +
      '</g>' +
      '<rect x="44" y="160" width="10" height="58" rx="5" fill="url(#llGloss)"/>' +
    '</g>' +
    '<rect x="36" y="150" width="88" height="80" rx="20" fill="none" stroke="#141311" stroke-width="2.5"/>' +
  '</svg>';

  var root = document.createElement("div");
  root.id = "lumeLoader";
  root.setAttribute("role", "progressbar");
  root.setAttribute("aria-label", "Cargando");
  root.setAttribute("aria-valuemin", "0");
  root.setAttribute("aria-valuemax", "100");
  root.innerHTML =
    '<img class="ll-logo" src="logo-crop.png" alt="LUMÉ Beauty Room" onerror="this.src=\'logo.png\'">' +
    svg +
    '<div class="ll-pct"><span id="llPct">0</span>%</div>' +
    '<div class="ll-txt">Cargando</div>' +
    '<div class="ll-bar"><i id="llBar"></i></div>';

  var style = document.createElement("style");
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);
  (document.body || document.documentElement).appendChild(root);
  document.documentElement.style.overflow = "hidden";

  var pctEl = root.querySelector("#llPct"), barEl = root.querySelector("#llBar");
  var liquid = root.querySelector("#llLiquid"), drop = root.querySelector(".ll-drop");
  var shown = 0, target = 8, finished = false, removed = false;

  function setTarget(n){ if(n > target) target = Math.min(100, n); }

  function paint(){
    var p = Math.round(shown);
    pctEl.textContent = p;
    barEl.style.width = p + "%";
    root.setAttribute("aria-valuenow", p);
    // nivel del esmalte: 0% = vacío (y+80), 100% = casi lleno (y+6)
    var off = 80 - (shown / 100) * 70;
    liquid.setAttribute("transform", "translate(0," + off.toFixed(1) + ")");
    // la gota cae hasta la superficie del esmalte
    drop.style.setProperty("--fall", (158 + off - 116).toFixed(1) + "px");
  }

  function frame(){
    if(removed) return;
    // avance "lento" mientras esperamos, para que nunca se vea congelado
    if(!finished && target < 92) target += 0.06;
    var speed = finished ? 0.22 : 0.08;
    shown += Math.max(0, (target - shown) * speed);
    if(target - shown < 0.4) shown = target;
    paint();
    if(finished && shown >= 99.5){ hide(); return; }
    requestAnimationFrame(frame);
  }

  function hide(){
    if(removed) return;
    removed = true;
    shown = 100; paint();
    setTimeout(function(){
      root.classList.add("out");
      document.documentElement.style.overflow = "";
      setTimeout(function(){ if(root.parentNode) root.parentNode.removeChild(root); }, 500);
    }, 120);
  }

  function done(){ if(finished) return; finished = true; setTarget(100); }

  document.addEventListener("DOMContentLoaded", function(){ setTarget(35); });
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(function(){ setTarget(55); }); }
  window.addEventListener("load", function(){ setTarget(manual ? 80 : 100); if(!manual) done(); });
  setTimeout(done, MAX_WAIT);

  requestAnimationFrame(frame);

  window.LumeLoader = { step: setTarget, done: done };
})();
