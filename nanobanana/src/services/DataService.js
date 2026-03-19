import { db } from "../firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    addDoc,
    serverTimestamp
} from "firebase/firestore";

export const DataService = {
    // Crear o actualizar un documento en una colección específica
    saveDocument: async (collectionName, id, data) => {
        try {
            const docRef = doc(db, collectionName, id);
            await setDoc(docRef, {
                ...data,
                updatedAt: serverTimestamp()
            }, { merge: true });
            return { success: true };
        } catch (error) {
            console.error("Error guardando documento:", error);
            throw error;
        }
    },

    // Añadir un nuevo documento (ID automático)
    addDocument: async (collectionName, data) => {
        try {
            const docRef = await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error("Error añadiendo documento:", error);
            throw error;
        }
    },

    // Obtener un documento por ID
    getDocument: async (collectionName, id) => {
        try {
            const docRef = doc(db, collectionName, id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data();
            } else {
                return null;
            }
        } catch (error) {
            console.error("Error obteniendo documento:", error);
            throw error;
        }
    },

    // Obtener todos los documentos de una colección
    getAllDocuments: async (collectionName) => {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error obteniendo colección:", error);
            throw error;
        }
    },

    // Eliminar un documento
    deleteDocument: async (collectionName, id) => {
        try {
            await deleteDoc(doc(db, collectionName, id));
            return { success: true };
        } catch (error) {
            console.error("Error eliminando documento:", error);
            throw error;
        }
    }
};
