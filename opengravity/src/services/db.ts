import db from './firebaseConfig.js';
import { FieldValue } from 'firebase-admin/firestore';

export interface StoredMessage {
  id?: string;
  telegram_user_id: number;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
  created_at: FirebaseFirestore.Timestamp;
}

/**
 * Añade un mensaje al historial de conversación en Firestore.
 */
export async function addMessage(
  userId: number,
  role: 'user' | 'assistant' | 'system' | 'tool',
  content: string | null,
  toolCalls: any = null,
  toolCallId: string | null = null
) {
  const toolCallsStr = toolCalls ? JSON.stringify(toolCalls) : null;

  await db
    .collection('conversations')
    .doc(String(userId))
    .collection('messages')
    .add({
      telegram_user_id: userId,
      role,
      content: content ?? null,
      tool_calls: toolCallsStr ?? null,
      tool_call_id: toolCallId ?? null,
      created_at: FieldValue.serverTimestamp(),
    });
}

/**
 * Obtiene el historial de mensajes de un usuario, ordenados cronológicamente.
 */
export async function getMessageHistory(userId: number, limit: number = 50): Promise<StoredMessage[]> {
  const snapshot = await db
    .collection('conversations')
    .doc(String(userId))
    .collection('messages')
    .orderBy('created_at', 'desc')
    .limit(limit)
    .get();

  const messages = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as StoredMessage[];

  // Revertimos para que el orden sea cronológico (antiguo -> nuevo) para el LLM
  return messages.reverse();
}

/**
 * Borra todo el historial de conversación de un usuario.
 */
export async function clearHistory(userId: number) {
  const messagesRef = db
    .collection('conversations')
    .doc(String(userId))
    .collection('messages');

  const snapshot = await messagesRef.get();

  if (snapshot.empty) return;

  // Firestore batch delete (máximo 500 docs por batch)
  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}
