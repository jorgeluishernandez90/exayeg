// ------------------------------------------------------------------
// PLANTILLA DE CONFIGURACIÓN DE FIREBASE
// ------------------------------------------------------------------
// Si quieres cuentas de usuario y avance guardado entre dispositivos:
//   1. Crea un proyecto gratis en https://console.firebase.google.com
//   2. Activa "Authentication" > método "Google"
//   3. Activa "Firestore Database" > modo producción
//   4. En "Configuración del proyecto" > "Tus apps" > copia el objeto
//      firebaseConfig y pégalo abajo, reemplazando el objeto vacío.
//
// Si NO llenas esto, la app sigue funcionando perfecto: el avance se
// guarda solo en el navegador de cada quien (localStorage).
// ------------------------------------------------------------------

const firebaseConfig = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

window.FIREBASE_CONFIG = firebaseConfig;
