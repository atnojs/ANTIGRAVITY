const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('./ServiceAccountKey.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'opengravity-telebot',
    });

    const db = admin.firestore();
    const convSnapshot = await db.collection('conversations').get();

    for (const convDoc of convSnapshot.docs) {
        const msgsRef = db.collection('conversations').doc(convDoc.id).collection('messages');
        const msgs = await msgsRef.get();
        if (!msgs.empty) {
            console.log(`Borrando ${msgs.size} mensajes del usuario ${convDoc.id}...`);
            const batch = db.batch();
            msgs.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        }
    }

    console.log("Limpieza de toda la BD completada.");
    process.exit(0);
}

main().catch(console.error);
