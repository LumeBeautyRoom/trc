/* ==========================================================================
   LUMÉ Beauty Room — app web instalable
   • Registra el service worker (sw.js).
   • Cualquier botón con el atributo data-install aparece cuando el teléfono
     permite instalar la app; en iPhone muestra cómo agregarla a la pantalla
     de inicio (Compartir → Agregar a inicio).
   ========================================================================== */
(function(){
  "use strict";

  if("serviceWorker" in navigator && location.protocol !== "file:"){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register("sw.js").catch(e=> console.warn("[LUMÉ] Service worker no registrado:", e));
    });
  }

  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
  let deferred = null;

  function buttons(){ return document.querySelectorAll("[data-install]"); }
  function show(on){ buttons().forEach(b=> b.hidden = !on); }

  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault();
    deferred = e;
    show(true);
  });
  window.addEventListener("appinstalled", ()=>{ deferred = null; show(false); });

  function iosHint(){
    let m = document.getElementById("iosHint");
    if(!m){
      m = document.createElement("div");
      m.id = "iosHint";
      m.className = "ios-hint";
      m.innerHTML = `<div class="ios-card" role="dialog" aria-label="Instalar app">
          <img src="${document.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href")||"icon-192.png"}" alt="">
          <h4>Instala la app</h4>
          <ol>
            <li>Toca <b>Compartir</b> <span class="ios-share" aria-hidden="true">⎋</span> en la barra de Safari</li>
            <li>Elige <b>Agregar a inicio</b></li>
            <li>Toca <b>Agregar</b> ✨</li>
          </ol>
          <button class="btn block" type="button">Entendido</button>
        </div>`;
      m.addEventListener("click", (e)=>{ if(e.target===m || e.target.closest("button")) m.classList.remove("open"); });
      document.body.appendChild(m);
    }
    requestAnimationFrame(()=> m.classList.add("open"));
  }

  document.addEventListener("click", async (e)=>{
    const b = e.target.closest("[data-install]");
    if(!b) return;
    e.preventDefault();
    if(deferred){
      deferred.prompt();
      try{ await deferred.userChoice; }catch(_){}
      deferred = null; show(false);
    } else if(isIOS){
      iosHint();
    }
  });

  document.addEventListener("DOMContentLoaded", ()=>{
    // en iPhone no existe el aviso automático: mostramos el botón con instrucciones
    show(!standalone && isIOS);
  });

  window.LumePWA = { standalone, isIOS };
})();
