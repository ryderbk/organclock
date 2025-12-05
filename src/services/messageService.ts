import { db } from '@/config/firebase';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';

const MESSAGES = 'special_messages';

export async function sendMessageForSpecial({ userId, message, userName }: { userId: string; message: string; userName?: string }) {
    // user -> admin message (user requests)
    const userRef = doc(db, 'users', userId);
    const uSnap = await getDoc(userRef);
    const adminId = uSnap.exists() ? (uSnap.data() as any).adminId : null;

    const payload = {
        userId,
        userName: userName || (uSnap.exists() ? (uSnap.data() as any).name : ''),
        userEmail: uSnap.exists() ? (uSnap.data() as any).email : '',
        adminId: adminId || null,
        message,
        sender: 'user',
        createdAt: Date.now(),
    };
    await addDoc(collection(db, MESSAGES), payload);
}

export async function sendAdminMessageToUser({ adminId, userId, message, adminName, scheduleId, expireAt }: { adminId: string; userId: string; message: string; adminName?: string; scheduleId?: string; expireAt?: Date }) {
    // Prevent sending message to self (admin) by mistake
    if (!userId) throw new Error('No target userId provided');
    if (adminId === userId) {
        // avoid creating a message where the admin is also the recipient
        throw new Error('adminId and userId are identical — refusing to send admin message to self');
    }

    const userRef = doc(db, 'users', userId);
    const uSnap = await getDoc(userRef);
    const payload: any = {
        userId,
        userName: uSnap.exists() ? (uSnap.data() as any).name : '',
        userEmail: uSnap.exists() ? (uSnap.data() as any).email : '',
        adminId: adminId || null,
        adminName: adminName || '',
        message,
        sender: 'admin',
        scheduleId: scheduleId || null,
        createdAt: Date.now(),
    };
    if (expireAt) payload.expireAt = expireAt;
    const ref = await addDoc(collection(db, MESSAGES), payload);
    console.log(`[sendAdminMessageToUser] Created message ${ref.id} for userId=${userId}, scheduleId=${scheduleId}, message="${message.substring(0, 50)}..."`);
    return ref.id;
}

// Update an existing admin message by id
export async function updateMessageById(id: string, newMessage: string) {
    if (!id) throw new Error('No message id provided');
    const d = doc(db, MESSAGES, id);
    await updateDoc(d, { message: newMessage, updatedAt: Date.now() });
}

// Listen only for user-sent requests (sender == 'user') for RequestedMessages
export function listenUserRequests(userId: string, cb: (msgs: any[]) => void) {
    const q = query(collection(db, MESSAGES), where('userId', '==', userId), where('sender', '==', 'user'));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        cb(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
}

// Listen only for admin-pushed messages (sender == 'admin') for a particular user
export function listenAdminPushesForUser(userId: string, cb: (msgs: any[]) => void) {
    const q = query(collection(db, MESSAGES), where('userId', '==', userId), where('sender', '==', 'admin'));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        console.log(`[listenAdminPushesForUser] User ${userId}: Found ${list.length} admin messages`, list.map(m => ({ id: m.id, scheduleId: m.scheduleId, message: m.message })));
        cb(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
}

// Listen admin-pushed messages for a specific schedule
export function listenAdminPushesForSchedule(userId: string, scheduleId: string, cb: (msgs: any[]) => void) {
    const q = query(collection(db, MESSAGES), where('userId', '==', userId), where('sender', '==', 'admin'), where('scheduleId', '==', scheduleId));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        cb(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
}

export function deleteMessageById(id: string) {
    if (!id) throw new Error('No message id provided');
    console.log(`[deleteMessageById] Deleting message with ID: ${id}`);
    return deleteDoc(doc(db, MESSAGES, id)).then(() => {
        console.log(`[deleteMessageById] ✓ Successfully deleted message ${id}`);
    }).catch((err: any) => {
        console.error(`[deleteMessageById] ✗ Failed to delete message ${id}:`, err.message);
        throw err;
    });
}

// Delete all messages for a specific schedule
export async function deleteMessagesByScheduleId(userId: string, scheduleId: string) {
    if (!userId || !scheduleId) throw new Error('userId and scheduleId required');

    console.log(`=== deleteMessagesByScheduleId START ===`);
    console.log(`userId: ${userId}, scheduleId: ${scheduleId}`);

    let deletedCount = 0;

    // Method 1: Delete by scheduleId field (for messages created with scheduleId)
    try {
        const q = query(
            collection(db, MESSAGES),
            where('userId', '==', userId),
            where('scheduleId', '==', scheduleId)
        );
        const snap = await getDocs(q);
        console.log(`Method 1: Found ${snap.docs.length} messages with userId=${userId} and scheduleId=${scheduleId}`);

        for (const docSnap of snap.docs) {
            try {
                console.log(`  Deleting message ${docSnap.id}:`, docSnap.data());
                await deleteDoc(docSnap.ref);
                deletedCount++;
                console.log(`  ✓ Deleted message ${docSnap.id}`);
            } catch (err: any) {
                console.error(`  ✗ Failed to delete message ${docSnap.id}:`, err.message);
                throw err;
            }
        }
    } catch (err) {
        console.error(`Method 1 failed:`, err);
        throw err;
    }

    // Method 2: Also search all messages for this user and find any that reference this schedule
    try {
        const allUserMessagesQ = query(
            collection(db, MESSAGES),
            where('userId', '==', userId)
        );
        const allSnap = await getDocs(allUserMessagesQ);
        console.log(`\nMethod 2: Found ${allSnap.docs.length} total messages for userId=${userId}`);

        const toDelete = allSnap.docs.filter((d) => {
            const data = d.data() as any;
            const matches =
                data.scheduleId === scheduleId ||
                (data.scheduleId === null && scheduleId === null) ||
                data.scheduleId === undefined && scheduleId === undefined;
            return matches;
        });

        console.log(`  Filtered to ${toDelete.length} messages matching scheduleId=${scheduleId}`);

        for (const docSnap of toDelete) {
            try {
                console.log(`  Deleting message ${docSnap.id}:`, docSnap.data());
                await deleteDoc(docSnap.ref);
                deletedCount++;
                console.log(`  ✓ Deleted message ${docSnap.id}`);
            } catch (err: any) {
                console.error(`  ✗ Failed to delete message ${docSnap.id}:`, err.message);
                throw err;
            }
        }
    } catch (err) {
        console.error(`Method 2 failed:`, err);
        throw err;
    }

    console.log(`=== deleteMessagesByScheduleId COMPLETE: Deleted ${deletedCount} messages ===\n`);
    return deletedCount;
}

// For admin inbox we should only consider user-requested messages (sender == 'user')
export function listenAdminMessagesGrouped(adminId: string, cb: (groups: any[]) => void) {
    const q = query(collection(db, MESSAGES), where('adminId', '==', adminId), where('sender', '==', 'user'));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const grouped: Record<string, any> = {};
        list.forEach((m) => {
            const uid = m.userId || 'unknown';
            if (!grouped[uid]) grouped[uid] = { userId: uid, name: m.userName || '', email: m.userEmail || '', count: 0 };
            grouped[uid].count += 1;
        });
        cb(Object.values(grouped));
    });
    return unsub;
}

// For admin detail view, only show user-requested messages (sender == 'user')
export function listenMessagesForUser(adminId: string, userId: string, cb: (msgs: any[]) => void) {
    const q = query(collection(db, MESSAGES), where('adminId', '==', adminId), where('userId', '==', userId), where('sender', '==', 'user'));
    const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        cb(list.sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsub;
}

export function listenAdminMessageCount(adminId: string, cb: (count: number) => void) {
    const q = query(collection(db, MESSAGES), where('adminId', '==', adminId), where('sender', '==', 'user'));
    const unsub = onSnapshot(q, (snap) => cb(snap.size));
    return unsub;
}

// Automatic cleanup: delete messages AND schedule documents for expired schedules
export async function cleanupExpiredScheduleMessages(userId: string) {
    try {
        console.log(`\n=== cleanupExpiredSchedules START for userId=${userId} ===`);
        const now = new Date();
        let totalMessagesDeleted = 0;
        let totalSchedulesDeleted = 0;

        // First, get all messages for this user to understand what we're working with
        const allMessagesQuery = query(collection(db, MESSAGES), where('userId', '==', userId), where('sender', '==', 'admin'));
        const allMessagesSnap = await getDocs(allMessagesQuery);
        console.log(`Total admin messages for user: ${allMessagesSnap.docs.length}`);
        allMessagesSnap.docs.forEach((doc) => {
            const data = doc.data() as any;
            console.log(`  Message ${doc.id}: scheduleId=${data.scheduleId}, message="${data.message?.substring(0, 40)}..."`);
        });

        // Get all schedules for this user
        const schedulesQuery = query(collection(db, 'user_schedules'), where('userId', '==', userId));
        const schedulesSnap = await getDocs(schedulesQuery);
        console.log(`Total schedules for user: ${schedulesSnap.docs.length}`);

        // Filter for expired schedules (where `to` time has passed)
        const expiredSchedules = schedulesSnap.docs.filter((doc) => {
            const data = doc.data() as any;
            let toTime: Date | null = null;

            if (data.to) {
                if (typeof data.to === 'string') {
                    toTime = new Date(data.to);
                } else if (data.to.toDate && typeof data.to.toDate === 'function') {
                    toTime = data.to.toDate();
                }
            }

            if (!toTime) return false;

            const isExpired = toTime < now;
            if (isExpired) {
                console.log(`  ✓ Schedule ${doc.id} EXPIRED at ${toTime.toISOString()} (now: ${now.toISOString()})`);
            }
            return isExpired;
        });

        console.log(`Found ${expiredSchedules.length} expired schedules to cleanup`);

        // Delete messages and schedule documents for each expired schedule
        for (const scheduleDoc of expiredSchedules) {
            const scheduleId = scheduleDoc.id;
            const scheduleData = scheduleDoc.data() as any;
            console.log(`\nProcessing schedule ${scheduleId}, has messageId: ${scheduleData.messageId || 'none'}`);

            try {
                let deletedForThisSchedule = 0;

                // Strategy 1: Delete by scheduleId field (primary method)
                try {
                    const messagesQuery = query(
                        collection(db, MESSAGES),
                        where('userId', '==', userId),
                        where('scheduleId', '==', scheduleId)
                    );
                    const messagesSnap = await getDocs(messagesQuery);
                    console.log(`  Strategy 1 (by scheduleId): Found ${messagesSnap.docs.length} messages`);

                    for (const msgDoc of messagesSnap.docs) {
                        try {
                            const msgData = msgDoc.data();
                            console.log(`    Deleting message ${msgDoc.id}`);
                            await deleteDoc(msgDoc.ref);
                            deletedForThisSchedule++;
                            totalMessagesDeleted++;
                            console.log(`    ✓ Successfully deleted message ${msgDoc.id}`);
                        } catch (err: any) {
                            console.error(`    ✗ FAILED to delete message ${msgDoc.id}:`, err.message, err.code);
                        }
                    }
                } catch (err: any) {
                    console.warn(`  Strategy 1 failed (probably index issue):`, err.message);
                }

                // Strategy 2: Delete by messageId from schedule document (if we didn't find by scheduleId)
                if (deletedForThisSchedule === 0 && scheduleData.messageId) {
                    try {
                        console.log(`  Strategy 2 (by legacy messageId): Attempting to delete messageId=${scheduleData.messageId}`);
                        const legacyMsg = await getDoc(doc(db, MESSAGES, scheduleData.messageId));
                        if (legacyMsg.exists()) {
                            const msgData = legacyMsg.data() as any;
                            console.log(`    Message exists: scheduleId=${msgData.scheduleId}, message="${msgData.message?.substring(0, 40)}..."`);
                            console.log(`    Deleting message ${scheduleData.messageId}`);
                            await deleteDoc(doc(db, MESSAGES, scheduleData.messageId));
                            deletedForThisSchedule++;
                            totalMessagesDeleted++;
                            console.log(`    ✓ Successfully deleted message ${scheduleData.messageId}`);
                        } else {
                            console.log(`    Message ${scheduleData.messageId} doesn't exist (may already be deleted)`);
                        }
                    } catch (err: any) {
                        console.error(`    ✗ FAILED to delete message ${scheduleData.messageId}:`, err.message, err.code);
                    }
                }

                // Strategy 3: Search all messages and find ones matching this schedule by text or other fields
                if (deletedForThisSchedule === 0) {
                    try {
                        console.log(`  Strategy 3 (scanning all messages for this user):`);
                        const matchingMessages = allMessagesSnap.docs.filter((doc) => {
                            const data = doc.data() as any;
                            return data.scheduleId === scheduleId;
                        });
                        console.log(`    Found ${matchingMessages.length} messages matching scheduleId`);
                        for (const msgDoc of matchingMessages) {
                            try {
                                console.log(`    Deleting message ${msgDoc.id}`);
                                await deleteDoc(msgDoc.ref);
                                deletedForThisSchedule++;
                                totalMessagesDeleted++;
                                console.log(`    ✓ Successfully deleted message ${msgDoc.id}`);
                            } catch (err: any) {
                                console.error(`    ✗ FAILED to delete message ${msgDoc.id}:`, err.message);
                            }
                        }
                    } catch (err: any) {
                        console.error(`  Strategy 3 failed:`, err.message);
                    }
                }

                console.log(`  Total messages deleted for this schedule: ${deletedForThisSchedule}`);

                // NOW DELETE THE SCHEDULE DOCUMENT ITSELF
                try {
                    console.log(`  ✓ Now deleting schedule document ${scheduleId}`);
                    await deleteDoc(doc(db, 'user_schedules', scheduleId));
                    totalSchedulesDeleted++;
                    console.log(`  ✓ Successfully deleted schedule document ${scheduleId}`);
                } catch (err: any) {
                    console.error(`  ✗ FAILED to delete schedule document ${scheduleId}:`, err.message, err.code);
                }
            } catch (err: any) {
                console.error(`  Error processing schedule ${scheduleId}:`, err.message);
            }
        }

        console.log(`\n=== cleanupExpiredSchedules COMPLETE ===`);
        console.log(`  Total messages deleted: ${totalMessagesDeleted}`);
        console.log(`  Total schedules deleted: ${totalSchedulesDeleted}`);
        console.log(`\n`);
        return totalSchedulesDeleted;
    } catch (err: any) {
        console.error(`cleanupExpiredSchedules FAILED with error:`, err.message);
        throw err;
    }
}
