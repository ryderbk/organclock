import { db } from '@/config/firebase';
import { ref, push, onValue, off, query, orderByChild } from 'firebase/database';

export type ActivityLog = {
  id: string;
  activity: string;
  notes: string;
  timestamp: number;
};

export async function addLog(uid: string, activity: string, notes: string) {
  const logsRef = ref(db, `logs/${uid}`);
  const data = { activity, notes, timestamp: Date.now() };
  await push(logsRef, data);
}

export function subscribeLogs(
  uid: string,
  cb: (logs: ActivityLog[]) => void
) {
  const logsRef = query(ref(db, `logs/${uid}`), orderByChild('timestamp'));
  const handler = onValue(logsRef, (snapshot) => {
    const val = snapshot.val() || {};
    const logs: ActivityLog[] = Object.entries(val).map(([key, v]: any) => ({
      id: key,
      activity: v.activity,
      notes: v.notes,
      timestamp: v.timestamp,
    }));
    logs.sort((a, b) => b.timestamp - a.timestamp);
    cb(logs);
  });
  return () => off(logsRef, 'value', handler as any);
}
