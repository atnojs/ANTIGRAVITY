const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('./ServiceAccountKey.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'opengravity-telebot',
    });

    const db = admin.firestore();
    const messagesRef = db.collection('conversations').doc('189912061').collection('messages');

    const snapshot = await messagesRef.get();

    if (snapshot.empty) {
        console.log("No hay mensajes que borrar para este usuario.");
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`¡Historial limpiado! Se borraron ${snapshot.size} mensajes.`);
    process.exit(0);
}

main().catch(console.error);
