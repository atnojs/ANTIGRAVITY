const admin = require('firebase-admin');
const fs = require('fs');

async function main() {
    const serviceAccount = JSON.parse(fs.readFileSync('./ServiceAccountKey.json', 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'opengravity-telebot',
    });

    const db = admin.firestore();
    const snapshot = await db.collection('conversations').doc('189912061').collection('messages').orderBy('created_at', 'desc').limit(20).get();

    let history = [];
    snapshot.docs.forEach(doc => history.push(doc.data()));

    history.sort((a, b) => {
        if (!a.created_at || !b.created_at) return 0;
        return a.created_at._seconds - b.created_at._seconds;
    });

    // Solo mostramos los últimos 20
    history.slice(-20).forEach(msg => {
        console.log(`\n--- ROLE: ${msg.role}`);
        if (msg.tool_calls) console.log("TOOL_CALLS:", msg.tool_calls);
        if (msg.tool_call_id) console.log("TOOL_CALL_ID:", msg.tool_call_id);
        if (msg.content) console.log("CONTENT:", msg.content);
    });

    process.exit(0);
}

main().catch(console.error);
