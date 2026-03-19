import { auth } from "../firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

export const AuthService = {
    // Registro de nuevo usuario
    register: (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    },

    // Inicio de sesión
    login: (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    // Inicio de sesión con Google
    loginWithGoogle: () => {
        return signInWithPopup(auth, googleProvider);
    },

    // Cerrar sesión
    logout: () => {
        return signOut(auth);
    },

    // Escuchar cambios en el estado de autenticación
    subscribeToAuthChanges: (callback) => {
        return onAuthStateChanged(auth, callback);
    },

    // Obtener el usuario actual
    getCurrentUser: () => {
        return auth.currentUser;
    }
};
