import { db } from '@/config/firebase';
import { addDoc, collection, onSnapshot, orderBy, query } from 'firebase/firestore';

export type ActivityLog = {
    id: string;
    activity: string;
    notes: string;
    timestamp: number;
};

export async function addLog(uid: string, activity: string, notes: string, timestamp?: number) {
    const colRef = collection(db, 'users', uid, 'logs');
    const data = { activity, notes, timestamp: timestamp ?? Date.now() };
    await addDoc(colRef, data);
}

export function subscribeLogs(
    uid: string,
    cb: (logs: ActivityLog[]) => void
) {
    const colRef = collection(db, 'users', uid, 'logs');
    const q = query(colRef, orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        const logs: ActivityLog[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        cb(logs);
    });
    return unsub;
}
