/* ============================================================
   scripts/app.js
   - JS principal de la tienda (sin mayoreo y sin carrito)
   - Variables, funciones y comentarios en español.
   - La descripción se toma de data-descripcion y SOLO se muestra en el modal.
   ============================================================ */

/* ===================== CONFIGURACIÓN ===================== */
/** Número de WhatsApp (incluye código de país, sin espacios) */
const numeroWhatsApp = "+50432903331";

/* ===================== UTILIDADES ===================== */
/** Selecciona un elemento (querySelector) */
const q = (sel, el = document) => el.querySelector(sel);
/** Selecciona varios elementos (querySelectorAll -> Array) */
const qa = (sel, el = document) => Array.from(el.querySelectorAll(sel));
/** Formatea número a Lempiras (Honduras) */
const aLempiras = (valor) => `L${Number(valor).toLocaleString('es-HN')}`;

/* ===================== ESTADO GLOBAL ===================== */
const estado = {
  imagenesDeslizador: [],   // URLs de imágenes del modal
  indiceDeslizador: 0,      // índice actual de imagen
  ultimoEnfoque: null,      // quién tenía el foco antes de abrir el modal
  tarjetaActual: null       // referencia a la tarjeta abierta
};

/* ===================== INICIO ===================== */
/** Inicializa todo cuando el DOM está listo */
document.addEventListener("DOMContentLoaded", () => {
  iniciarMenus();
  iniciarFiltros();
  iniciarBuscador();
  iniciarTarjetas();
  iniciarModal();
});

/* ===================== MENÚS / DROPDOWNS ===================== */
/** Abre/cierra menús desplegables de la barra de navegación */
function iniciarMenus(){
  qa(".desplegable").forEach((nodo) => {
    const boton = q(".boton-nav", nodo);
    const menu = q(".contenido-desplegable", nodo);
    if (!boton || !menu) return;

    boton.addEventListener("click", () => {
      const expandido = boton.getAttribute("aria-expanded") === "true";
      boton.setAttribute("aria-expanded", String(!expandido));
      menu.style.display = expandido ? "none" : "block";
    });

    // Cierra el menú si el foco sale del contenedor
    nodo.addEventListener("focusout", (ev) => {
      if (!nodo.contains(ev.relatedTarget)) {
        boton.setAttribute("aria-expanded", "false");
        menu.style.display = "none";
      }
    });
  });
}

/* ===================== FILTROS ===================== */
/** Configura la delegación de eventos para los filtros de categoría */
function iniciarFiltros(){
  document.addEventListener("click", (e) => {
    const botonFiltro = e.target.closest(".filtro");
    if (!botonFiltro) return;

    const categoria = botonFiltro.dataset.categoria || "todos";
    filtrarCategoria(categoria);

    // Marca visual del filtro activo
    qa(".filtro").forEach(b => b.classList.toggle("is-active", b === botonFiltro));
  });

  // Marca "Todos" como activo inicialmente (si existe)
  const botonTodos = qa(".filtro").find(b => b.dataset.categoria === "todos");
  if (botonTodos) botonTodos.classList.add("is-active");
}

/**
 * Muestra/oculta tarjetas según la categoría solicitada.
 * @param {string} categoria - 'todos', 'maquillaje', 'ropa', 'zapatos'
 */
function filtrarCategoria(categoria){
  qa(".tarjeta-producto").forEach(tarjeta=>{
    const mostrar = categoria === "todos" || tarjeta.dataset.categoria === categoria;
    tarjeta.style.display = mostrar ? "" : "none";
  });
}

/* ===================== BUSCADOR ===================== */
/** Filtra tarjetas por texto (nombre o categoría) usando el buscador */
function iniciarBuscador(){
  const formulario = q(".buscador");
  if (!formulario) return;
  const entrada = q("#entrada-busqueda", formulario);

  formulario.addEventListener("submit", (e)=>{
    e.preventDefault();
    const consulta = (entrada.value || "").toLowerCase().trim();

    qa(".tarjeta-producto").forEach(tarjeta=>{
      const nombre = (q("h3", tarjeta)?.innerText || "").toLowerCase();
      const cat  = (tarjeta.dataset.categoria || "").toLowerCase();
      const coincide = !consulta || nombre.includes(consulta) || cat.includes(consulta);
      tarjeta.style.display = coincide ? "" : "none";
    });
  });
}

/* ===================== TARJETAS / ABRIR MODAL ===================== */
/** Abre el modal de detalle al hacer click en una tarjeta o su imagen */
function iniciarTarjetas(){
  const seccionProductos = q("#productos");
  if (!seccionProductos) return;

  // Delegación: click en cualquier parte de la tarjeta abre el modal
  seccionProductos.addEventListener("click", (e)=>{
    const tarjeta = e.target.closest(".tarjeta-producto");
    if (!tarjeta) return;
    abrirDetalle(tarjeta);
  });

  // Aseguramos que las imágenes también reciban el click (por si hubiera overlays)
  qa(".tarjeta-producto .contenedor-imagen img").forEach(img=>{
    img.style.pointerEvents = "auto";
    img.addEventListener("click", (ev)=>{
      const tarjeta = ev.target.closest(".tarjeta-producto");
      if (tarjeta) abrirDetalle(tarjeta);
    });
  });
}

/* ===================== MODAL ===================== */
/** Configura cierre de modal, tecla Esc y trampa de foco básica */
function iniciarModal(){
  const modal = q("#modal-producto");
  if (!modal) return;

  const caja = q(".modal-contenido", modal);
  const botonCerrar = q(".cerrar-modal", modal);

  // Cerrar al hacer click en la X
  botonCerrar?.addEventListener("click", cerrarModal);

  // Cerrar al hacer click fuera del contenido
  modal.addEventListener("click", (e)=>{ if(e.target === modal) cerrarModal(); });

  // Cerrar con tecla Escape
  document.addEventListener("keydown", (e)=>{
    if (e.key === "Escape" && modal.style.display === "flex") cerrarModal();
  });

  // Trampa de foco simple dentro del modal
  modal.addEventListener("keydown", (e)=>{
    if (e.key !== "Tab") return;
    const focuseables = qa('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', caja)
      .filter(el=>!el.hasAttribute("disabled"));
    if (!focuseables.length) return;
    const primero=focuseables[0], ultimo=focuseables[focuseables.length-1];
    if (e.shiftKey && document.activeElement === primero){ ultimo.focus(); e.preventDefault(); }
    else if(!e.shiftKey && document.activeElement === ultimo){ primero.focus(); e.preventDefault(); }
  });
}

/**
 * Abre el modal y carga la información del producto seleccionado.
 * - Toma descripción desde data-descripcion (NO desde un <p> en la tarjeta).
 * @param {HTMLElement} tarjeta - Tarjeta de producto clicada.
 */
function abrirDetalle(tarjeta){
  estado.tarjetaActual = tarjeta;

  // Datos del producto tomados de data-* y de la tarjeta
  const categoria = tarjeta.dataset.categoria || "Otras categorías";
  const listaImagenes  = (tarjeta.dataset.imagenes || "").split(",").map(s=>s.trim()).filter(Boolean);
  const nombre  = q("h3", tarjeta)?.innerText?.trim() || "Producto";
  const descripcion = tarjeta.dataset.descripcion || nombre;  // <— SOLO data-descripcion
  const precio = tarjeta.dataset.precio ?? "0";
  const stock = tarjeta.dataset.stock || "Consultar";

  // Migas y texto
  q("#miga-categoria").innerText = capitalizar(categoria);
  q("#miga-nombre").innerText = nombre;
  q("#modal-titulo").innerText = nombre;
  q("#modal-descripcion").innerText = descripcion;

  // Disponibilidad + precio unitario
  q("#chip-stock").innerText = stock;
  q("#precio-unitario").innerText = aLempiras(precio);

  // Enlace de WhatsApp
  const mensaje = encodeURIComponent(`Hola, me interesa el producto: ${nombre} (${aLempiras(precio)}).`);
  q("#enlace-whatsapp").href = `https://wa.me/${numeroWhatsApp}?text=${mensaje}`;

  // Miniaturas y deslizador
  construirMiniaturas(listaImagenes.length ? listaImagenes : [q(".img-normal", tarjeta).src]);
  estado.imagenesDeslizador = listaImagenes.length ? listaImagenes : [q(".img-normal", tarjeta).src];
  estado.indiceDeslizador = 0;
  mostrarImagenDeslizador();

  // Relacionados (misma categoría)
  construirRelacionados(categoria, tarjeta);

  // Mostrar modal
  const modal = q("#modal-producto");
  modal.style.display = "flex";
  estado.ultimoEnfoque = document.activeElement;
  q(".modal-contenido", modal)?.focus();
  document.body.style.overflow = "hidden";

  // Controles de slider (se reasignan para evitar duplicados)
  q("#slider-anterior").onclick = anteriorImagen;
  q("#slider-siguiente").onclick = siguienteImagen;
}

/** Cierra el modal y devuelve el foco al elemento previo */
function cerrarModal(){
  const modal = q("#modal-producto");
  if (!modal) return;
  modal.style.display = "none";
  document.body.style.overflow = "";
  estado.ultimoEnfoque?.focus();
}

/**
 * Construye la lista de miniaturas en el panel izquierdo del modal.
 * @param {string[]} imagenes - URLs de imágenes a mostrar como miniaturas.
 */
function construirMiniaturas(imagenes){
  const lista = q("#miniaturas-detalle");
  if (!lista) return;
  lista.innerHTML = "";

  imagenes.forEach((src, i)=>{
    const li = document.createElement("li");
    li.innerHTML = `<img src="${src}" alt="Miniatura ${i+1}">`;
    if (i===0) li.classList.add("activa");
    li.addEventListener("click", ()=>{
      estado.indiceDeslizador = i;
      qa("li", lista).forEach(n=>n.classList.remove("activa"));
      li.classList.add("activa");
      mostrarImagenDeslizador();
    });
    lista.appendChild(li);
  });
}

/** Muestra la imagen actual del deslizador y actualiza el contador */
function mostrarImagenDeslizador(){
  const img = q("#modal-imagen");
  const contador = q("#contador-imagen");
  if (!img || !estado.imagenesDeslizador.length) return;

  img.src = estado.imagenesDeslizador[estado.indiceDeslizador];
  img.alt = `Imagen ${estado.indiceDeslizador+1} de ${estado.imagenesDeslizador.length}`;
  if (contador) contador.textContent = `${estado.indiceDeslizador+1}/${estado.imagenesDeslizador.length}`;

  // Sincroniza miniatura activa
  const lista = q("#miniaturas-detalle");
  if (lista){
    qa("li", lista).forEach((nodo, idx)=> nodo.classList.toggle("activa", idx===estado.indiceDeslizador));
  }
}

/** Pasa a la imagen anterior del deslizador */
function anteriorImagen(e){
  if (e) e.stopPropagation();
  if (!estado.imagenesDeslizador.length) return;
  estado.indiceDeslizador = (estado.indiceDeslizador - 1 + estado.imagenesDeslizador.length) % estado.imagenesDeslizador.length;
  mostrarImagenDeslizador();
}

/** Pasa a la imagen siguiente del deslizador */
function siguienteImagen(e){
  if (e) e.stopPropagation();
  if (!estado.imagenesDeslizador.length) return;
  estado.indiceDeslizador = (estado.indiceDeslizador + 1) % estado.imagenesDeslizador.length;
  mostrarImagenDeslizador();
}

/**
 * Genera una fila de productos relacionados (misma categoría).
 * @param {string} categoria - Categoría de referencia.
 * @param {HTMLElement} tarjetaActual - Tarjeta que se está mostrando.
 */
function construirRelacionados(categoria, tarjetaActual){
  const contenedor = q("#fila-relacionados");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  const candidatos = qa(`.tarjeta-producto[data-categoria="${categoria}"]`)
    .filter(t => t !== tarjetaActual)
    .slice(0,4);

  candidatos.forEach(t => {
    const imagen = q(".img-normal", t)?.src || "";
    const nombre = q("h3", t)?.innerText?.trim() || "Producto";
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-relacionado";
    tarjeta.innerHTML = `<img src="${imagen}" alt="${nombre}"><div class="nombre-relacionado">${nombre}</div>`;
    tarjeta.addEventListener("click", ()=>abrirDetalle(t));
    contenedor.appendChild(tarjeta);
  });
}

/** Capitaliza la primera letra de una cadena */
function capitalizar(txt){ return txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : txt; }
