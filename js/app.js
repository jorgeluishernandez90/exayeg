// ==================================================================
// Guía de estudio IEEG — lógica de la aplicación
// ==================================================================

let TEMARIO = null;
let currentUser = null;      // objeto de Firebase Auth, o null
let progresoLocal = {};      // { "subtema-id": { score, total, fecha } }
let firebaseListo = false;
let db = null;

const mainEl = document.getElementById('main-content');
const navEl = document.getElementById('temario');
const resumenEl = document.getElementById('progreso-resumen');

// ---------------- Menú móvil (drawer) ----------------
const sidebarEl = document.getElementById('sidebar');
const btnMenuMovil = document.getElementById('btn-menu-movil');
const fondoMenuMovil = document.getElementById('fondo-menu-movil');

function abrirMenuMovil() {
  sidebarEl.classList.add('abierta');
  fondoMenuMovil.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function cerrarMenuMovil() {
  sidebarEl.classList.remove('abierta');
  fondoMenuMovil.classList.remove('visible');
  document.body.style.overflow = '';
}
if (btnMenuMovil) btnMenuMovil.addEventListener('click', abrirMenuMovil);
if (fondoMenuMovil) fondoMenuMovil.addEventListener('click', cerrarMenuMovil);

// ---------------- Inicialización Firebase (opcional) ----------------
function initFirebase() {
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !cfg.apiKey) {
    console.log('Firebase no configurado: usando solo localStorage.');
    return;
  }
  firebase.initializeApp(cfg);
  db = firebase.firestore();
  firebaseListo = true;

  const btnLogin = document.getElementById('btn-login');
  const btnLogout = document.getElementById('btn-logout');
  const authStatus = document.getElementById('auth-status');
  btnLogin.style.display = 'inline-block';

  btnLogin.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert('No se pudo iniciar sesión: ' + err.message));
  });
  btnLogout.addEventListener('click', () => firebase.auth().signOut());

  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      authStatus.textContent = 'Sesión iniciada como ' + (user.displayName || user.email);
      btnLogin.style.display = 'none';
      btnLogout.style.display = 'inline-block';
      await cargarProgresoDesdeFirestore();
    } else {
      authStatus.textContent = 'Estudiando como invitado. Tu avance solo se guarda en este navegador.';
      btnLogin.style.display = 'inline-block';
      btnLogout.style.display = 'none';
      cargarProgresoLocal();
    }
    renderNav();
    actualizarResumen();
  });
}

// ---------------- Progreso: localStorage ----------------
function cargarProgresoLocal() {
  try {
    progresoLocal = JSON.parse(localStorage.getItem('ieeg-progreso') || '{}');
  } catch (e) {
    progresoLocal = {};
  }
}

function guardarProgresoLocal() {
  localStorage.setItem('ieeg-progreso', JSON.stringify(progresoLocal));
}

// ---------------- Progreso: Firestore ----------------
async function cargarProgresoDesdeFirestore() {
  if (!db || !currentUser) return;
  const doc = await db.collection('progreso').doc(currentUser.uid).get();
  progresoLocal = doc.exists ? (doc.data().subtemas || {}) : {};
}

async function guardarProgreso(subtemaId, score, total) {
  progresoLocal[subtemaId] = { score, total, fecha: new Date().toISOString() };
  if (firebaseListo && currentUser) {
    await db.collection('progreso').doc(currentUser.uid).set(
      { subtemas: progresoLocal, actualizado: new Date().toISOString() },
      { merge: true }
    );
  } else {
    guardarProgresoLocal();
  }
  renderNav();
  actualizarResumen();
}

// ---------------- Carga del temario ----------------
async function cargarTemario() {
  const res = await fetch('data/temario.json');
  TEMARIO = await res.json();
  renderNav();
  actualizarResumen();
  renderInicio();
}

const btnInicio = document.getElementById('btn-inicio');
if (btnInicio) btnInicio.addEventListener('click', () => { renderInicio(); cerrarMenuMovil(); });

function listaSubtemas() {
  const lista = [];
  TEMARIO.modulos.forEach(m => m.areas.forEach(a => a.subtemas.forEach(s => lista.push(s))));
  return lista;
}

function actualizarResumen() {
  const subtemas = listaSubtemas();
  const disponibles = subtemas.filter(s => s.disponible);
  const completados = disponibles.filter(s => progresoLocal[s.id]);
  resumenEl.textContent = `Avance: ${completados.length} de ${disponibles.length} lecciones disponibles`;
}

// ---------------- Navegación lateral (ruta tipo Duolingo) ----------------
function renderNav() {
  if (!TEMARIO) return;
  navEl.innerHTML = '';
  TEMARIO.modulos.forEach(modulo => {
    const h = document.createElement('div');
    h.className = 'modulo-titulo';
    h.textContent = modulo.nombre;
    navEl.appendChild(h);

    modulo.areas.forEach(area => {
      const ha = document.createElement('div');
      ha.className = 'area-titulo';
      ha.textContent = area.nombre;
      navEl.appendChild(ha);

      // La siguiente lección disponible-y-no-completada de esta área se marca
      // como "actual" (el punto de la ruta donde va el usuario), igual que
      // en Duolingo: lo hecho queda atrás, lo de enfrente es el siguiente paso.
      const siguienteId = (area.subtemas.find(s => s.disponible && !progresoLocal[s.id]) || {}).id;

      const ul = document.createElement('ul');
      ul.className = 'subtemas ruta';
      area.subtemas.forEach(sub => {
        const li = document.createElement('li');
        li.className = 'nodo-ruta';
        const btn = document.createElement('button');
        const completado = !!progresoLocal[sub.id];
        const esSiguiente = sub.id === siguienteId;
        btn.className = 'subtema-link' + (!sub.disponible ? ' bloqueado' : '') + (esSiguiente ? ' siguiente' : '');
        btn.innerHTML = `<span class="sello-mini${completado ? ' completo' : ''}">${completado ? '✓' : (sub.disponible ? '' : '🔒')}</span> ${sub.nombre}`;
        if (sub.disponible) {
          btn.addEventListener('click', () => abrirLeccion(sub.id));
        } else {
          btn.disabled = true;
          btn.title = 'Próximamente';
        }
        li.appendChild(btn);
        ul.appendChild(li);
      });
      navEl.appendChild(ul);
    });
  });
}

// ---------------- Pantalla de inicio (tarjetas de módulo) ----------------
function renderInicio() {
  document.querySelectorAll('.subtema-link').forEach(b => b.classList.remove('activo'));
  if (!TEMARIO) return;

  const tarjetas = TEMARIO.modulos.map(modulo => {
    const subtemas = [];
    modulo.areas.forEach(a => a.subtemas.forEach(s => subtemas.push(s)));
    const disponibles = subtemas.filter(s => s.disponible);
    const completados = disponibles.filter(s => progresoLocal[s.id]);
    const pct = disponibles.length ? Math.round((completados.length / disponibles.length) * 100) : 0;
    const siguiente = disponibles.find(s => !progresoLocal[s.id]);

    return `
      <button class="module-card" data-modulo="${modulo.id}">
        <div class="module-card-top">
          <h3>${modulo.nombre}</h3>
          <span class="module-card-count">${completados.length}/${disponibles.length} lecciones</span>
        </div>
        <div class="module-card-bar"><div class="module-card-bar-fill" style="width:${pct}%"></div></div>
        <span class="module-card-cta">${completados.length === 0 ? 'Empezar módulo' : (pct === 100 ? 'Repasar módulo ✓' : 'Continuar: ' + (siguiente ? siguiente.nombre : ''))} →</span>
      </button>`;
  }).join('');

  mainEl.innerHTML = `
    <div class="bienvenida">
      <h1>Bienvenido a tu guía de estudio</h1>
      <p>Avanza módulo por módulo. Cada lección tiene una explicación breve, ejemplos y un simulacro de preguntas.</p>
    </div>
    <div class="module-grid">${tarjetas}</div>
  `;

  mainEl.querySelectorAll('.module-card').forEach(card => {
    card.addEventListener('click', () => {
      const modulo = TEMARIO.modulos.find(m => m.id === card.dataset.modulo);
      const subtemas = [];
      modulo.areas.forEach(a => a.subtemas.forEach(s => subtemas.push(s)));
      const siguiente = subtemas.find(s => s.disponible && !progresoLocal[s.id]) || subtemas.find(s => s.disponible);
      if (siguiente) abrirLeccion(siguiente.id);
    });
  });
}

// Convierte "Tema: resto de la explicación" en un bloque con subtítulo.
// Si el párrafo no sigue ese patrón (o el "título" es demasiado largo
// para ser un título real), se muestra como párrafo normal.
function renderPuntoExplicacion(texto) {
  const idx = texto.indexOf(': ');
  if (idx > 0 && idx < 90) {
    const titulo = texto.slice(0, idx);
    const resto = texto.slice(idx + 2);
    return `<div class="punto-explicacion"><h3>${titulo}</h3><p>${resto}</p></div>`;
  }
  return `<div class="punto-explicacion"><p>${texto}</p></div>`;
}

// Dibuja el diagrama de una lección, si trae uno (campo "diagrama": {titulo, svg}).
// Si la lección no tiene diagrama, no se muestra nada (no rompe lecciones viejas).
function renderDiagrama(leccion) {
  if (!leccion.diagrama || !leccion.diagrama.svg) return '';
  const titulo = leccion.diagrama.titulo || 'Esquema';
  return `
    <section class="bloque diagrama-leccion">
      <h2>${titulo}</h2>
      <div class="diagrama-visual">${leccion.diagrama.svg}</div>
    </section>`;
}

// Tabla comparativa opcional: { titulo, columnas: [...], filas: [[...],[...]] }
function renderTabla(leccion) {
  const t = leccion.tabla_comparativa;
  if (!t || !t.columnas || !t.filas) return '';
  return `
    <section class="bloque tabla-comparativa">
      <h2>${t.titulo || 'Comparativo'}</h2>
      <div class="table-wrap">
        <table class="study">
          <thead><tr>${t.columnas.map(c => `<th>${c}</th>`).join('')}</tr></thead>
          <tbody>
            ${t.filas.map(fila => `<tr>${fila.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    </section>`;
}

// Línea de tiempo opcional: { titulo, eventos: [{momento, descripcion}] }
function renderLineaTiempo(leccion) {
  const lt = leccion.linea_tiempo;
  if (!lt || !lt.eventos) return '';
  return `
    <section class="bloque linea-tiempo">
      <h2>${lt.titulo || 'Línea de tiempo'}</h2>
      <ol class="timeline">
        ${lt.eventos.map(e => `
          <li>
            <span class="timeline-momento">${e.momento}</span>
            <span class="timeline-desc">${e.descripcion}</span>
          </li>`).join('')}
      </ol>
    </section>`;
}

// Callouts opcionales: [{ tipo: "tip"|"legal", titulo, texto }]
function renderCallouts(leccion) {
  if (!leccion.callouts || !leccion.callouts.length) return '';
  return leccion.callouts.map(c => `
    <div class="callout ${c.tipo || 'tip'}">
      <span class="label">${c.titulo || (c.tipo === 'legal' ? 'Fundamento legal' : 'Importante')}</span>
      ${c.texto}
    </div>`).join('');
}

// ---------------- Render de una lección ----------------
async function abrirLeccion(subtemaId) {
  document.querySelectorAll('.subtema-link').forEach(b => b.classList.remove('activo'));
  cerrarMenuMovil();
  const res = await fetch(`data/lecciones/${subtemaId}.json`);
  if (!res.ok) {
    mainEl.innerHTML = `<div class="proxima-disponibilidad">Esta lección todavía no está lista.</div>`;
    return;
  }
  const leccion = await res.json();

  mainEl.innerHTML = `
    <div class="encabezado-leccion">
      <span class="eyebrow">${leccion.area}</span>
      <h1 class="titulo-leccion">${leccion.titulo}</h1>
    </div>
    <p class="intro-leccion">${leccion.introduccion}</p>

    ${renderDiagrama(leccion)}

    <section class="bloque explicacion">
      <h2>Explicación</h2>
      ${leccion.explicacion.map(p => renderPuntoExplicacion(p)).join('')}
      ${renderCallouts(leccion)}
    </section>

    ${renderTabla(leccion)}
    ${renderLineaTiempo(leccion)}

    <section class="bloque ejemplos">
      <h2>Ejemplos</h2>
      ${leccion.ejemplos.map(e => `
        <div class="ejemplo">
          <span class="mal">✗ ${e.incorrecto}</span><br>
          <span class="bien">✓ ${e.correcto}</span>
          <span class="nota">${e.nota}</span>
        </div>`).join('')}
    </section>

    <section class="bloque material-consulta">
      <h2>Material de consulta</h2>
      <ul>
        ${leccion.material_consulta.map(m => `<li><a href="${m.url}" target="_blank" rel="noopener">${m.titulo}</a></li>`).join('')}
      </ul>
    </section>

    <section class="bloque quiz" id="quiz-section">
      <div class="quiz-intro">
        <h2 style="margin-bottom:0;border:none;padding-left:0;">Simulacro · ${leccion.preguntas.length} preguntas</h2>
        <button class="btn" id="btn-empezar-quiz">Comenzar</button>
      </div>
      <div id="quiz-contenedor"></div>
    </section>
  `;

  const link = [...document.querySelectorAll('.subtema-link')].find(b => b.textContent.includes(leccion.titulo));
  if (link) link.classList.add('activo');

  window.scrollTo(0, 0);

  document.getElementById('btn-empezar-quiz').addEventListener('click', () => renderQuiz(leccion));
}

// Muestra la lista numerada (ordenamiento) o las dos columnas (relación de
// elementos) que acompañan a la pregunta, antes de las opciones de respuesta.
// Si la pregunta no trae "elementos" ni columnas, no se muestra nada (no
// rompe las preguntas de cuestionamiento directo o completamiento).
function renderExtraPregunta(p) {
  if (p.elementos) {
    return `<ol class="elementos-ordenamiento">
      ${p.elementos.map(e => `<li>${e}</li>`).join('')}
    </ol>`;
  }
  if (p.columna_izquierda && p.columna_derecha) {
    return `<div class="columnas-relacion">
      <ol class="columna-num">${p.columna_izquierda.map(e => `<li>${e}</li>`).join('')}</ol>
      <ol class="columna-let">${p.columna_derecha.map(e => `<li>${e}</li>`).join('')}</ol>
    </div>`;
  }
  return '';
}

// ---------------- Motor de quiz ----------------
function renderQuiz(leccion) {
  const cont = document.getElementById('quiz-contenedor');
  document.getElementById('btn-empezar-quiz').style.display = 'none';

  cont.innerHTML = leccion.preguntas.map((p, i) => `
    <div class="pregunta" id="pregunta-${i}">
      <span class="num">Pregunta ${i + 1} de ${leccion.preguntas.length}</span>
      <p class="enunciado">${p.enunciado}</p>
      ${renderExtraPregunta(p)}
      ${p.opciones.map((op, j) => `
        <label class="opcion">
          <input type="radio" name="pregunta-${i}" value="${j}">
          <span>${op}</span>
        </label>`).join('')}
    </div>
  `).join('') + `<button class="btn" id="btn-revisar">Revisar respuestas</button>
    <div id="resultado-final"></div>`;

  document.getElementById('btn-revisar').addEventListener('click', () => {
    let aciertos = 0;
    leccion.preguntas.forEach((p, i) => {
      const seleccionado = document.querySelector(`input[name="pregunta-${i}"]:checked`);
      const preguntaEl = document.getElementById(`pregunta-${i}`);
      const correcta = seleccionado && parseInt(seleccionado.value) === p.respuesta_correcta;
      if (correcta) aciertos++;
      preguntaEl.classList.add(correcta ? 'correcta' : 'incorrecta');
      const retro = document.createElement('div');
      retro.className = 'retro ' + (correcta ? 'ok' : 'no');
      retro.textContent = correcta
        ? '✓ Correcto. ' + p.explicacion
        : `✗ La respuesta correcta era: "${p.opciones[p.respuesta_correcta]}". ${p.explicacion}`;
      preguntaEl.appendChild(retro);
    });

    document.getElementById('btn-revisar').disabled = true;
    document.getElementById('resultado-final').innerHTML = `
      <div class="resultado-final">
        <div class="sello-grande">${aciertos}/${leccion.preguntas.length}</div>
        <p>Obtuviste ${aciertos} de ${leccion.preguntas.length} respuestas correctas en "${leccion.titulo}".</p>
      </div>`;

    guardarProgreso(leccion.id, aciertos, leccion.preguntas.length);
  });
}

// ---------------- Arranque ----------------
cargarProgresoLocal();
initFirebase();
cargarTemario();
