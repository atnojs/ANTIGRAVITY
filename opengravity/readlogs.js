import db from './src/services/firebaseConfig.js';

async function main() {
    const snapshot = await db.collection('messages').orderBy('timestamp', 'desc').limit(20).get();

    const history = [];
    snapshot.docs.forEach(doc => {
        history.push(doc.data());
    });

    history.reverse().forEach(msg => {
        console.log(`\n--- ROLE: ${msg.role}`);
        if (msg.tool_calls) console.log("TOOL_CALLS:", msg.tool_calls);
        if (msg.tool_call_id) console.log("TOOL_CALL_ID:", msg.tool_call_id);
        if (msg.content) console.log("CONTENT:", msg.content);
    });
    process.exit(0);
}

main().catch(console.error);
