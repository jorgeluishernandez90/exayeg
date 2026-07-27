# Guía de estudio · Consejerías electorales IEEG

App web para repasar el temario del examen del IEEG por lecciones, con simulacros
de 10 preguntas por subtema. Gratis de principio a fin: sin dominio, sin tarjeta
de crédito, sin servidor propio.

## Cómo está organizado

```
index.html              → la página
css/styles.css           → diseño
js/app.js                 → toda la lógica (navegación, quiz, avance)
js/firebase-config.js     → (opcional) llaves para cuentas de usuario
data/temario.json         → el mapa de temas/subtemas que ves en el menú
data/lecciones/*.json     → una lección por subtema (explicación + 10 preguntas)
```

Para agregar un tema nuevo **no se toca el código**: solo se crea un archivo
`data/lecciones/<id-del-subtema>.json` (copiando el patrón de
`reglas-ortograficas.json`) y se cambia `"disponible": false` a `true` en
`data/temario.json`.

## Paso 1 — Publicar el sitio gratis con GitHub Pages

1. Crea una cuenta en [github.com](https://github.com) (gratis).
2. Crea un repositorio nuevo, por ejemplo `guia-ieeg` (puede ser público).
3. Sube estos archivos y carpetas tal cual están (botón "Add file" →
   "Upload files", o arrastrando la carpeta completa).
4. Entra a **Settings → Pages** del repositorio.
5. En "Branch" elige `main` y guarda.
6. En un par de minutos tu sitio queda publicado en:
   `https://tu-usuario.github.io/guia-ieeg/`

Eso es todo para tener la guía en línea, funcionando con avance guardado
por navegador (localStorage) — sin necesidad de lo que sigue.

## Paso 2 — (Opcional) Cuentas de usuario y avance en la nube

Si quieres que cada persona inicie sesión y su avance se guarde sin
importar el dispositivo:

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
   e inicia sesión con una cuenta de Google.
2. "Agregar proyecto" → dale un nombre (ej. `guia-ieeg`) → sigue el asistente
   (puedes desactivar Google Analytics, no lo necesitas).
3. Dentro del proyecto: **Compilación → Authentication → Comenzar** →
   pestaña "Sign-in method" → habilita **Google**.
4. **Compilación → Firestore Database → Crear base de datos** → modo
   "producción" → elige la región más cercana (ej. `us-central`).
   Después, en la pestaña "Reglas", pega esto y publica:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /progreso/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
   (Esto asegura que cada usuario solo pueda leer/escribir su propio avance.)
5. En el ícono de engrane → **Configuración del proyecto** → baja hasta
   "Tus apps" → clic en el ícono `</>` (Web) → registra la app (no necesitas
   marcar "Firebase Hosting").
6. Copia el objeto `firebaseConfig` que te muestra y pégalo en
   `js/firebase-config.js`, reemplazando el objeto vacío.
7. Sube ese archivo actualizado a GitHub (Paso 1.3). Listo: ahora aparece
   el botón "Iniciar sesión con Google" y el avance se guarda en la nube.
8. En **Authentication → Settings → Authorized domains**, agrega
   `tu-usuario.github.io` para que el login funcione en producción.

Todo esto vive dentro del plan gratuito "Spark" de Firebase, pensado para
proyectos exactamente de este tamaño.

## Siguientes pasos de contenido

Ya está lista y funcionando la lección **"Reglas ortográficas"** como
plantilla. Cuando me compartas los siguientes subtemas (por ejemplo
"Acentuación"), te genero el `.json` correspondiente con explicación,
ejemplos y las 10 preguntas, siguiendo exactamente este mismo patrón.
