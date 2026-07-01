/* ==========================================================================
   LUMÉ Beauty Room — generador de ticket en PDF (sin dependencias)
   Crea un PDF de rollo (80mm) con fuente monoespaciada estándar (Courier),
   funciona 100% offline. Expone buildTicketPDF(sale) -> { save, output }.
   ========================================================================== */
(function(global){
  "use strict";

  const PT_PER_MM = 72/25.4;
  const W = Math.round(80 * PT_PER_MM);   // 80mm de ancho
  const M = 10;                            // margen
  const CW = W - 2*M;                       // ancho de contenido

  function charW(size){ return size*0.6; }  // Courier es monoespaciada
  function maxChars(size){ return Math.floor(CW / charW(size)); }
  function esc(s){ return String(s).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)"); }

  function wrap(str, size){
    const max = maxChars(size);
    const words = String(str).split(/\s+/);
    const lines = []; let cur = "";
    words.forEach(w=>{
      if(!cur.length){ cur = w; }
      else if((cur+" "+w).length <= max){ cur += " "+w; }
      else { lines.push(cur); cur = w; }
      while(cur.length > max){ lines.push(cur.slice(0,max)); cur = cur.slice(max); }
    });
    if(cur.length) lines.push(cur);
    return lines.length ? lines : [""];
  }

  function Builder(sale){
    const ops = [];
    let y = 12; // distancia desde arriba (pt)

    function textLine(str, {size=9, bold=false, align="left", gap=null}={}){
      ops.push({ t:"text", str, size, bold, align, y });
      y += (gap!=null ? gap : size + 3);
    }
    function twoCol(left, right, {size=9, bold=false, gap=null}={}){
      ops.push({ t:"text", str:left,  size, bold, align:"left",  y });
      ops.push({ t:"text", str:right, size, bold, align:"right", y });
      y += (gap!=null ? gap : size + 3);
    }
    function rule(){ ops.push({ t:"line", y }); y += 6; }
    function space(px){ y += px; }

    // ---------------- contenido del ticket ----------------
    textLine(CONFIG.businessName.toUpperCase(), { size:13, bold:true, align:"center", gap:16 });
    if(CONFIG.businessAddress) textLine(CONFIG.businessAddress, { size:8, align:"center", gap:11 });
    if(CONFIG.businessPhone)   textLine("Tel: "+CONFIG.businessPhone, { size:8, align:"center", gap:11 });
    space(2); rule();

    const dt = new Date(sale.createdAt);
    twoCol("TICKET #"+sale.ticketNo, dt.toLocaleDateString("es-MX"), { size:9, bold:true });
    twoCol("Cliente: "+sale.client.name, dt.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}), { size:8 });
    rule();

    sale.items.forEach(i=>{
      const nm = wrap(`${i.qty} x ${i.name}`, 8);
      nm.forEach((ln,idx)=>{
        if(idx === nm.length-1){ twoCol(ln, money(i.qty*i.price), { size:8 }); }
        else { textLine(ln, { size:8, gap:10 }); }
      });
    });
    space(2); rule();

    if(Math.abs(sale.extra) > 0.001){
      twoCol("Subtotal", money(sale.subtotal), { size:8 });
      twoCol(sale.extra>0 ? "Extra / Ajuste" : "Descuento", money(Math.abs(sale.extra)), { size:8 });
    }
    twoCol("TOTAL", money(sale.total), { size:12, bold:true, gap:18 });
    textLine("Pago: "+sale.method.charAt(0).toUpperCase()+sale.method.slice(1), { size:9, gap:14 });
    rule();
    textLine(CONFIG.ticketFooter, { size:9, align:"center", gap:12 });

    const H = Math.ceil(y + 8);
    return { ops, H };
  }

  function contentStream(ops, H){
    let s = "0.4 w\n";
    ops.forEach(o=>{
      const pdfY = (H - o.y).toFixed(2);
      if(o.t === "line"){
        s += `${M} ${pdfY} m ${W-M} ${pdfY} l S\n`;
      } else {
        const font = o.bold ? "/F2" : "/F1";
        let x = M;
        const w = String(o.str).length * charW(o.size);
        if(o.align === "center") x = (W - w)/2;
        else if(o.align === "right") x = W - M - w;
        s += `BT ${font} ${o.size} Tf ${x.toFixed(2)} ${pdfY} Td (${esc(o.str)}) Tj ET\n`;
      }
    });
    return s;
  }

  // convierte string (con acentos Latin-1) a bytes
  function toBytes(str){
    const b = new Uint8Array(str.length);
    for(let i=0;i<str.length;i++) b[i] = str.charCodeAt(i) & 0xff;
    return b;
  }

  function assemble(content, H){
    const objs = [];
    objs.push(`<</Type/Catalog/Pages 2 0 R>>`);
    objs.push(`<</Type/Pages/Kids[3 0 R]/Count 1>>`);
    objs.push(`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${W} ${H}]/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>`);
    objs.push(`<</Length ${toBytes(content).length}>>\nstream\n${content}endstream`);
    objs.push(`<</Type/Font/Subtype/Type1/BaseFont/Courier/Encoding/WinAnsiEncoding>>`);
    objs.push(`<</Type/Font/Subtype/Type1/BaseFont/Courier-Bold/Encoding/WinAnsiEncoding>>`);

    let out = "%PDF-1.4\n";
    const offsets = [];
    objs.forEach((body,i)=>{
      offsets.push(toBytes(out).length);
      out += `${i+1} 0 obj\n${body}\nendobj\n`;
    });
    const xrefPos = toBytes(out).length;
    out += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
    offsets.forEach(off=>{ out += String(off).padStart(10,"0") + " 00000 n \n"; });
    out += `trailer\n<</Size ${objs.length+1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;
    return toBytes(out);
  }

  global.buildTicketPDF = function(sale){
    const { ops, H } = Builder(sale);
    const content = contentStream(ops, H);
    const bytes = assemble(content, H);
    const blob = new Blob([bytes], { type:"application/pdf" });
    return {
      blob,
      output(kind){ return kind === "blob" ? blob : URL.createObjectURL(blob); },
      dataUrl(){ return URL.createObjectURL(blob); },
      save(filename){
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename || "ticket.pdf";
        document.body.appendChild(a); a.click();
        setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 1500);
      }
    };
  };
})(window);
