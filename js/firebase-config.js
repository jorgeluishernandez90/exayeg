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
  apiKey: "AIzaSyDJI2k1s0bN0UQUv18nkLCAwuPs3dYXQow",
  authDomain: "guia-exayeg.firebaseapp.com",
  projectId: "guia-exayeg",
  storageBucket: "guia-exayeg.firebasestorage.app",
  messagingSenderId: "596074551011",
  appId: "1:596074551011:web:8968efd82b8b2d3ed117d6"
};

window.FIREBASE_CONFIG = firebaseConfig;
