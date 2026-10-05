const API = "https://func-pki-proyecto3-asetbvg6epd2e5a9.westus3-01.azurewebsites.net";

// --- Navegación del sidebar ---
const navBtns = document.querySelectorAll("nav button[data-panel]");
function menu(abrir) {
  document.body.classList.toggle("menu-abierto", abrir);
  document.getElementById("menuBtn").setAttribute("aria-expanded", abrir);
}
document.getElementById("menuBtn").onclick = () => menu(true);
document.getElementById("navClose").onclick = () => menu(false);
document.getElementById("overlay").onclick = () => menu(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") menu(false); });

navBtns.forEach(b => {
  b.onclick = () => {
    menu(false);
    navBtns.forEach(x => x.classList.toggle("activo", x === b));
    document.querySelectorAll(".panel").forEach(p => p.classList.toggle("activo", p.id === b.dataset.panel));
  };
});

// --- Helpers de render (todo con textContent: nada del servidor se inserta como HTML) ---
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function jsonResaltado(obj) {
  const pre = el("pre");
  const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false)\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  const txt = JSON.stringify(obj, null, 2);
  let last = 0, m;
  while ((m = re.exec(txt))) {
    pre.append(txt.slice(last, m.index));
    let cls = "j-num";
    if (m[1]) cls = m[2] ? "j-key" : "j-str";
    else if (m[3]) cls = "j-bool";
    else if (m[0] === "null") cls = "j-null";
    pre.append(el("span", cls, m[1] || m[0]));
    if (m[2]) pre.append(m[2]);
    last = re.lastIndex;
  }
  pre.append(txt.slice(last));
  return pre;
}

function cn(subject) {
  const m = /CN=([^,]+)/i.exec(subject || "");
  return m ? m[1] : subject;
}

function corto(tp) {
  return tp && tp.length > 16 ? tp.slice(0, 8) + "…" + tp.slice(-5) : tp;
}

function datosPerfil(d) {
  const g = el("div", "datos");
  [
    ["CN", cn(d.cliente)],
    ["Emisor", d.emisor],
    ["Expira", d.validoHasta ? new Date(d.validoHasta).toLocaleString("es-PE") : "—"],
    ["Thumbprint", corto(d.thumbprint)]
  ].forEach(([k, v]) => {
    const c = el("div", "dato");
    c.append(el("span", "", k), el("b", "", v ?? "—"));
    if (k === "Thumbprint" && d.thumbprint) c.title = d.thumbprint;
    g.append(c);
  });
  return g;
}

function tablaDocumentos(d) {
  const t = el("table");
  const head = el("tr");
  ["ID", "Nombre", "Fecha"].forEach(h => head.append(el("th", "", h)));
  t.append(head);
  (d.documentos || []).forEach(x => {
    const tr = el("tr");
    [x.id, x.nombre, x.fecha].forEach(v => tr.append(el("td", "", v)));
    t.append(tr);
  });
  return t;
}

function mostrar(contenedor, status, ok, data, render, ruta) {
  const card = el("div", "res");
  const head = el("div", "res-head");
  head.append(
    el("span", "pill " + (ok ? "ok" : "err"),
      ok ? `✓ ${status} OK` : `✗ ${status} ${status === 401 ? "Unauthorized" : "Error"}`),
    el("span", "", ruta));
  card.append(head);

  if (ok && render === "perfil" && data && typeof data === "object") card.append(datosPerfil(data));
  if (ok && render === "documentos" && data && Array.isArray(data.documentos)) card.append(tablaDocumentos(data));
  if (!ok && render === "rechazo") card.append(el("div", "nota", "El API rechaza requests sin certificado válido."));

  card.append(typeof data === "object" && data !== null ? jsonResaltado(data) : el("pre", "", String(data || "(sin cuerpo)")));
  contenedor.replaceChildren(card);
}

// --- Llamadas al API ---
document.querySelectorAll("button[data-m]").forEach(btn => {
  btn.onclick = async () => {
    const cont = btn.closest(".panel").querySelector(".resultado");
    const ruta = `${btn.dataset.m} ${btn.dataset.p}`;
    btn.disabled = true;
    cont.replaceChildren(el("div", "aviso", "Llamando a " + ruta + "…"));
    try {
      const r = await fetch(API + btn.dataset.p, {
        method: btn.dataset.m,
        credentials: "include",
        cache: "no-store"
      });
      const text = await r.text();
      let data = text;
      try { data = JSON.parse(text); } catch {}
      mostrar(cont, r.status, r.ok, data, btn.dataset.render, ruta);
    } catch (e) {
      const card = el("div", "res");
      const head = el("div", "res-head");
      head.append(el("span", "pill err", "✗ Error de red"), el("span", "", ruta));
      card.append(head, el("pre", "", "No hubo respuesta HTTP (¿CORS o handshake TLS rechazado?).\n" + e.message));
      cont.replaceChildren(card);
    } finally {
      btn.disabled = false;
    }
  };
});

// --- Copiar comandos ---
document.querySelectorAll("button.copy").forEach(b => {
  b.onclick = async () => {
    const txt = b.closest(".cmd").querySelector("pre").textContent;
    try { await navigator.clipboard.writeText(txt); b.textContent = "¡Copiado!"; }
    catch { b.textContent = "Selecciona y copia"; }
    setTimeout(() => b.textContent = "Copiar", 1500);
  };
});
