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
}

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

// ---------------- Navegación lateral ----------------
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

      const ul = document.createElement('ul');
      ul.className = 'subtemas';
      area.subtemas.forEach(sub => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        const completado = !!progresoLocal[sub.id];
        btn.className = 'subtema-link' + (!sub.disponible ? ' bloqueado' : '');
        btn.innerHTML = `<span class="sello-mini${completado ? ' completo' : ''}">${completado ? '✓' : ''}</span> ${sub.nombre}`;
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

// ---------------- Render de una lección ----------------
async function abrirLeccion(subtemaId) {
  document.querySelectorAll('.subtema-link').forEach(b => b.classList.remove('activo'));
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
    </section>

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

  document.getElementById('btn-empezar-quiz').addEventListener('click', () => renderQuiz(leccion));
}

// ---------------- Motor de quiz ----------------
function renderQuiz(leccion) {
  const cont = document.getElementById('quiz-contenedor');
  document.getElementById('btn-empezar-quiz').style.display = 'none';

  cont.innerHTML = leccion.preguntas.map((p, i) => `
    <div class="pregunta" id="pregunta-${i}">
      <span class="num">Pregunta ${i + 1} de ${leccion.preguntas.length}</span>
      <p class="enunciado">${p.enunciado}</p>
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
