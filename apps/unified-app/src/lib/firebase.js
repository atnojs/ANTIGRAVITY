/*
 * Firebase — Unified Studio (apps/unified-app)
 * Recuperado del bundle de producción dist/assets/index-C7Ht2PdI.js (2026-10-27).
 * Símbolo minificado original: UN / ST / Gr / es.
 * Inicialización de Firebase (app, auth y firestore) y persistencia de sesión.
 *
 * IMPORTANTE: la config del bundle original apuntaba al proyecto
 * `generacion-de-imagenes-6e624`, cuya apiKey está revocada (auth/api-key-not-valid).
 * Se ha sustituido por el proyecto activo `nanobanana-cbb2d` (mismos campos).
 */

import { initializeApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAlTZgodkiHACqJSRcDqymTdvaegBdLZMk",
  authDomain: "nanobanana-cbb2d.firebaseapp.com",
  projectId: "nanobanana-cbb2d",
  storageBucket: "nanobanana-cbb2d.firebasestorage.app",
  messagingSenderId: "490656740654",
  appId: "1:490656740654:web:104f76973c1254d5b876bf",
  measurementId: "G-8XK035PGTV",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

setPersistence(auth, browserSessionPersistence).catch((s) => {
  console.error("Error setting persistence:", s);
});
