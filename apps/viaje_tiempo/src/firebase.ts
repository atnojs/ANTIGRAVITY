import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithRedirect, getRedirectResult, setPersistence, browserSessionPersistence, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Persistencia de sesión y login mediante redirect (patrón Antigravity):
// más robusto que popup en producción (iframes, móviles y dominios Hostinger).
export const signInWithGoogle = () => signInWithRedirect(auth, googleProvider);
export const finishGoogleSignIn = () => getRedirectResult(auth);
export const initAuthPersistence = () => setPersistence(auth, browserSessionPersistence);
export const logout = () => signOut(auth);
