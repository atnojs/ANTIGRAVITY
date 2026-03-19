import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Cargar el service account key. 
// Para desarrollo local usa el archivo. Para la nube usa la variable de entorno FIREBASE_SERVICE_ACCOUNT.
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    const serviceAccountPath = resolve(process.cwd(), 'ServiceAccountKey.json');
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'opengravity-telebot',
});

const db = admin.firestore();

export default db;
