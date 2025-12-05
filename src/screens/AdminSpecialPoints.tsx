import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, ScrollView, FlatList, Alert, TextInput, Platform, StatusBar, ActivityIndicator, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '@/config/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    where,
} from 'firebase/firestore';
import BellIcon from '@/components/BellIcon';
import { listenAdminMessageCount, sendAdminMessageToUser, updateMessageById, deleteMessageById, listenAdminPushesForSchedule, deleteMessagesByScheduleId, cleanupExpiredScheduleMessages } from '@/services/messageService';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

// Reuse sample points mapping
const SAMPLE_POINTS: Record<string, { x: number; y: number }> = {
    'Point A': { x: 0.25, y: 0.2 },
    'Point B': { x: 0.5, y: 0.35 },
    'Point C': { x: 0.72, y: 0.5 },
    'Point D': { x: 0.4, y: 0.65 },
};

export default function AdminSpecialPoints() {
    const adminId = auth.currentUser?.uid;
    const nav = useNavigation<any>();
    const [badgeCount, setBadgeCount] = useState(0);

    // Ensure schedule objects contain only defined fields (Firestore rejects undefined anywhere)
    const sanitizeSchedules = (arr: any[]) => {
        return arr.map((s) => {
            const out: any = {
                id: s.id,
                from: s.from,
                to: s.to,
                points: s.points || [],
                createdAt: s.createdAt || new Date().toISOString(),
                createdBy: s.createdBy || adminId || null,
            };
            if (s.visibleFrom) out.visibleFrom = s.visibleFrom;
            if (s.visibleTo) out.visibleTo = s.visibleTo;
            if (s.messageId !== undefined && s.messageId !== null) out.messageId = s.messageId;
            return out;
        });
    };

    useEffect(() => {
        if (!adminId) return;
        const unsub = listenAdminMessageCount(adminId, (c) => setBadgeCount(c));
        return unsub;
    }, [adminId]);

    // sub-users under this admin
    const [users, setUsers] = useState<{ id: string; name?: string; email?: string }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [usersLoading, setUsersLoading] = useState(true);
    const [schedulesLoading, setSchedulesLoading] = useState(true);

    // schedules for selected user
    const [schedules, setSchedules] = useState<any[]>([]);

    // create / edit state
    const [showAdd, setShowAdd] = useState(false);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date(Date.now() + 1000 * 60 * 30));
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    // visibility scheduling for new schedule (default 1 day)
    const [showVisibilityBox, setShowVisibilityBox] = useState(false);
    const [visibilityFrom, setVisibilityFrom] = useState<Date>(new Date());
    const [visibilityTo, setVisibilityTo] = useState<Date>(new Date(Date.now() + 1000 * 60 * 60 * 24));
    // native pickers for add panel (Android: date then time)
    const [showVisToDateNative, setShowVisToDateNative] = useState(false);
    const [showVisToTimeNative, setShowVisToTimeNative] = useState(false);

    // editing visibility panel (separate from native picker)
    const [showEditingVisPanel, setShowEditingVisPanel] = useState(false);
    const [editingVisibilityFrom, setEditingVisibilityFrom] = useState<Date | null>(null);
    const [editingVisibilityTo, setEditingVisibilityTo] = useState<Date | null>(null);
    const [showEditingVisToDateNative, setShowEditingVisToDateNative] = useState(false);
    const [showEditingVisToTimeNative, setShowEditingVisToTimeNative] = useState(false);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
    const [currentPoints, setCurrentPoints] = useState<{ name: string; x: number; y: number }[]>([]);
    const [saving, setSaving] = useState(false);

    // message box state (for sending message along with points)
    const [showMessageBox, setShowMessageBox] = useState(false);
    const [messageText, setMessageText] = useState('');

    // separate message state for edit panel
    const [showMessageBoxEdit, setShowMessageBoxEdit] = useState(false);
    const [messageTextEdit, setMessageTextEdit] = useState('');

    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [editingFrom, setEditingFrom] = useState<Date | null>(null);
    const [editingTo, setEditingTo] = useState<Date | null>(null);
    const [editingPoints, setEditingPoints] = useState<{ name: string; x: number; y: number }[]>([]);

    // messages associated with the currently selected schedule (admin-pushed)
    const [scheduleMessages, setScheduleMessages] = useState<any[]>([]);

    const [searchFrom, setSearchFrom] = useState<Date | null>(null);
    const [searchTo, setSearchTo] = useState<Date | null>(null);
    const [showSearchFromPicker, setShowSearchFromPicker] = useState(false);
    const [showSearchToPicker, setShowSearchToPicker] = useState(false);

    const usersInitialisedRef = React.useRef(false);

    useEffect(() => {
        if (!adminId) return;
        const qUsers = query(collection(db, 'users'), where('adminId', '==', adminId));
        const unsub = onSnapshot(qUsers, (snap) => {
            const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            setUsers(list);
            // Preserve existing selection if user still exists.
            // Auto-select only on first initial load — do not auto-change selection on subsequent updates (like after save/delete).
            if (!usersInitialisedRef.current) {
                if (!selectedUserId && list.length > 0) {
                    setSelectedUserId(list[0].id);
                }
                usersInitialisedRef.current = true;
            } else {
                // If previously selected user disappeared (deleted) -> fallback to first
                if (selectedUserId && !list.some(u => u.id === selectedUserId) && list.length > 0) {
                    setSelectedUserId(list[0].id);
                }
                // Otherwise, keep current selection untouched
            }
            setUsersLoading(false);
        }, (err) => {
            console.warn('Failed to subscribe to users', err);
            setUsersLoading(false);
        });
        return unsub;
    }, [adminId]);

    // if navigated with a selected user id param, set it
    const route = useRoute<any>();
    useEffect(() => {
        const sel = route.params?.selectedUserId;
        if (sel) setSelectedUserId(sel);
    }, [route.params]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u => ((u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q)));
    }, [users, searchQuery]);

    // Load active schedules from user_schedules collection for selected user
    useEffect(() => {
        setSchedulesLoading(true);
        if (!selectedUserId) { setSchedules([]); setSchedulesLoading(false); return; }

        // Cleanup expired messages first
        (async () => {
            try {
                await cleanupExpiredScheduleMessages(selectedUserId);
            } catch (err) {
                console.warn('Cleanup failed:', err);
            }
        })();

        const now = new Date();
        const q = query(collection(db, 'user_schedules'), where('userId', '==', selectedUserId), where('visibleTo', '>=', now));
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map((d) => {
                const data = (d.data() as any) || {};
                return {
                    id: d.id,
                    ...data,
                    visibleFrom: data.visibleFrom && typeof data.visibleFrom.toDate === 'function' ? data.visibleFrom.toDate() : (data.visibleFrom ? new Date(data.visibleFrom) : null),
                    visibleTo: data.visibleTo && typeof data.visibleTo.toDate === 'function' ? data.visibleTo.toDate() : (data.visibleTo ? new Date(data.visibleTo) : null),
                    from: data.from ? new Date(data.from) : null,
                    to: data.to ? new Date(data.to) : null,
                };
            }).filter((item) => {
                // Filter out schedules where the `to` time has passed (expired)
                if (item.to && item.to < now) return false;
                return true;
            });
            setSchedules(list);
            setSchedulesLoading(false);
        }, (err) => {
            console.warn('Failed to subscribe to user schedules', err);
            setSchedulesLoading(false);
        });
        return unsub;
    }, [selectedUserId]);

    // when a schedule is selected, listen for any admin-pushed messages tied to that schedule
    useEffect(() => {
        if (!selectedUserId || !selectedScheduleId) { setScheduleMessages([]); setMessageTextEdit(''); return; }
        const unsub = listenAdminPushesForSchedule(selectedUserId, selectedScheduleId, (msgs) => setScheduleMessages(msgs));
        // fallback: if no messages returned via scheduleId but the schedule has a messageId (older entries), fetch by that id
        (async () => {
            try {
                const sch = schedules.find(s => s.id === selectedScheduleId);
                if (sch && sch.messageId && (!sch.messageId.includes || typeof sch.messageId === 'string')) {
                    // wait a small tick for listener
                    await new Promise(res => setTimeout(res, 300));
                    if ((!scheduleMessages || scheduleMessages.length === 0)) {
                        const mDoc = await getDoc(doc(db, 'special_messages', sch.messageId));
                        if (mDoc.exists()) setScheduleMessages([{ id: mDoc.id, ...(mDoc.data() as any) }]);
                        else setScheduleMessages([]);
                    }
                } else {
                    setScheduleMessages([]);
                }
            } catch (err) {
                console.warn('fallback fetch message by id failed', err);
            }
        })();
        return unsub;
    }, [selectedUserId, selectedScheduleId, schedules]);

    // keep inline textbox in sync with loaded scheduleMessages or schedule.messageId
    useEffect(() => {
        (async () => {
            try {
                if (!selectedScheduleId) { setMessageTextEdit(''); return; }
                if (scheduleMessages && scheduleMessages.length > 0) {
                    setMessageTextEdit(scheduleMessages[0].message || '');
                    return;
                }
                const sch = schedules.find(s => s.id === selectedScheduleId);
                if (sch && sch.messageId) {
                    const mDoc = await getDoc(doc(db, 'special_messages', sch.messageId));
                    if (mDoc.exists()) setMessageTextEdit((mDoc.data() as any).message || '');
                    else setMessageTextEdit('');
                } else {
                    setMessageTextEdit('');
                }
            } catch (err) {
                console.warn('failed to populate messageTextEdit', err);
                setMessageTextEdit('');
            }
        })();
    }, [selectedScheduleId, scheduleMessages, schedules]);

    const filteredSchedules = useMemo(() => {
        if (!searchFrom && !searchTo) return schedules;
        return schedules.filter((sch: any) => {
            try {
                const f = sch.from ? new Date(sch.from) : null;
                const t = sch.to ? new Date(sch.to) : null;
                if (!f || !t) return false;
                if (searchFrom && searchTo) return f >= searchFrom && t <= searchTo;
                if (searchFrom) return f >= searchFrom;
                if (searchTo) return t <= searchTo;
                return true;
            } catch {
                return false;
            }
        });
    }, [schedules, searchFrom, searchTo]);

    const handleAddPointToList = () => {
        if (!selectedPoint) return;
        const coords = SAMPLE_POINTS[selectedPoint];
        if (!coords) return;
        setCurrentPoints((p) => [...p, { name: selectedPoint, x: coords.x, y: coords.y }]);
        setSelectedPoint(null);
        setDropdownOpen(false);
    };

    const handleSaveSchedule = async () => {
        if (!adminId || !selectedUserId) return Alert.alert('Error', 'Select a user');
        if (currentPoints.length === 0) return Alert.alert('No points', 'Please add at least one point');

        const newFrom = Date.parse(fromDate.toISOString());
        const newTo = Date.parse(toDate.toISOString());
        const overlaps = schedules.some((s: any) => {
            const existingFrom = s.from ? Date.parse(s.from) : null;
            const existingTo = s.to ? Date.parse(s.to) : null;
            if (!existingFrom || !existingTo) return false;
            return newFrom < existingTo && existingFrom < newTo;
        });
        if (overlaps) return Alert.alert('Overlap', 'This schedule overlaps an existing schedule.');

        // visibility end must have been validated at picker time; if not present, block save
        if (!visibilityTo) { Alert.alert('Invalid visibility', 'Please set visibility end'); return; }

        setSaving(true);
        try {
            // create schedule document in user_schedules collection
            const payload: any = {
                userId: selectedUserId,
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                points: currentPoints,
                createdAt: new Date().toISOString(),
                createdBy: adminId,
                visibleFrom: new Date(),
                visibleTo: new Date(visibilityTo),
            };
            const ref = await addDoc(collection(db, 'user_schedules'), payload);
            const scheduleId = ref.id;

            // if a message was entered, send it to the user and attach to the schedule (and set expireAt for message TTL)
            if (messageText && messageText.trim()) {
                try {
                    if (!selectedUserId) throw new Error('No user selected');
                    if (selectedUserId === adminId) throw new Error('Cannot send admin message to self');
                    const msgId = await sendAdminMessageToUser({ adminId: adminId || '', userId: selectedUserId, message: messageText.trim(), adminName: auth.currentUser?.displayName || '', scheduleId: scheduleId, expireAt: new Date(visibilityTo) });
                    // attach messageId to schedule doc
                    await updateDoc(doc(db, 'user_schedules', scheduleId), { messageId: msgId }).catch((e) => console.warn('attach msgId failed', e));
                    setMessageText('');
                    setShowMessageBox(false);
                } catch (err) {
                    console.error('send admin msg err', err);
                    Alert.alert('Message error', (err as any).message || 'Failed to send message to user');
                }
            }
            setCurrentPoints([]);
            setShowAdd(false);
            Alert.alert('Saved', 'Special points saved for user');
        } catch (err) {
            console.error('save special err', err);
            Alert.alert('Error', 'Failed to save points');
        } finally {
            setSaving(false);
        }
    };

    const deleteSchedule = async (scheduleId: string) => {
        if (!selectedUserId) return;
        try {
            const toRemove = schedules.find((s) => s.id === scheduleId);
            let messageDeletedCount = 0;
            let messageDeleteErrors: string[] = [];

            console.log(`\n=== DELETING SCHEDULE ${scheduleId} ===`);
            console.log(`Schedule data:`, toRemove);

            // Delete all messages associated with this schedule FIRST
            if (selectedUserId) {
                try {
                    console.log(`\nAttempting to delete messages by scheduleId=${scheduleId} for userId=${selectedUserId}`);
                    messageDeletedCount = await deleteMessagesByScheduleId(selectedUserId, scheduleId);
                    console.log(`Successfully deleted ${messageDeletedCount} messages by scheduleId`);
                } catch (e) {
                    const errMsg = `Schedule query failed: ${(e as any).message}`;
                    messageDeleteErrors.push(errMsg);
                    console.error(`Error deleting by scheduleId:`, e);
                }
            }

            // Also delete by messageId if it exists (backward compatibility for older schedules without scheduleId field)
            if (toRemove?.messageId) {
                try {
                    console.log(`\nAlso deleting message by messageId: ${toRemove.messageId}`);
                    await deleteMessageById(toRemove.messageId);
                    messageDeletedCount++;
                    console.log(`Successfully deleted message by messageId`);
                } catch (e) {
                    const errMsg = `MessageId ${toRemove.messageId}: ${(e as any).message}`;
                    messageDeleteErrors.push(errMsg);
                    console.error(`Failed to delete by messageId:`, e);
                }
            }

            // Now delete the schedule document
            console.log(`\nDeleting schedule document: ${scheduleId}`);
            await deleteDoc(doc(db, 'user_schedules', scheduleId));
            console.log(`Successfully deleted schedule ${scheduleId}`);
            console.log(`=== END SCHEDULE DELETION ===\n`);

            const updated = schedules.filter((s) => s.id !== scheduleId);
            setSchedules(updated);

            const msg = messageDeleteErrors.length > 0
                ? `Schedule deleted (${messageDeletedCount} messages deleted, but ${messageDeleteErrors.length} failed)`
                : `Schedule and ${messageDeletedCount} associated message(s) deleted`;
            Alert.alert('Deleted', msg);

            if (messageDeleteErrors.length > 0) {
                console.error('Message deletion errors:', messageDeleteErrors);
            }
        } catch (err) {
            console.error('delete special err', err);
            Alert.alert('Error', `Failed to delete schedule: ${(err as any).message}`);
        }
    };

    const saveEdits = async () => {
        if (!selectedUserId || !selectedScheduleId) return;
        const idx = schedules.findIndex((s) => s.id === selectedScheduleId);
        if (idx === -1) return;
        const newFrom = editingFrom ? editingFrom.toISOString() : schedules[idx].from;
        const newTo = editingTo ? editingTo.toISOString() : schedules[idx].to;
        const overlaps = schedules.some((s: any) => {
            if (s.id === selectedScheduleId) return false;
            const existingFrom = s.from ? Date.parse(s.from) : null;
            const existingTo = s.to ? Date.parse(s.to) : null;
            if (!existingFrom || !existingTo) return false;
            return Date.parse(newFrom) < existingTo && existingFrom < Date.parse(newTo);
        });
        if (overlaps) return Alert.alert('Overlap', 'Updated times overlap an existing schedule.');

        const updatedLocal = schedules.map((s) => (s.id === selectedScheduleId ? { ...s, from: newFrom, to: newTo, points: editingPoints, visibleTo: editingVisibilityTo ? editingVisibilityTo : s.visibleTo } : s));
        try {
            // prepare payload to update schedule doc
            const payload: any = { from: newFrom, to: newTo, points: editingPoints };
            if (editingVisibilityTo) payload.visibleTo = editingVisibilityTo;

            // update schedule document in user_schedules
            await updateDoc(doc(db, 'user_schedules', selectedScheduleId), payload).catch(async (e) => {
                console.warn('failed update schedule doc', e);
            });

            setSchedules(updatedLocal);

            // Manage inline message textbox: create/update/delete based on its content
            try {
                const existing = scheduleMessages && scheduleMessages.length > 0 ? scheduleMessages[0] : (schedules[idx] && schedules[idx].messageId ? { id: schedules[idx].messageId } : null);
                const text = messageTextEdit && messageTextEdit.trim() ? messageTextEdit.trim() : '';
                if (text) {
                    // create or update
                    if (existing && existing.id) {
                        await updateMessageById(existing.id, text);
                    } else {
                        const expireAtDate = editingVisibilityTo ? new Date(editingVisibilityTo) : (schedules[idx] && schedules[idx].visibleTo ? new Date(schedules[idx].visibleTo) : null);
                        const msgId = await sendAdminMessageToUser({ adminId: adminId || '', userId: selectedUserId || '', message: text, adminName: auth.currentUser?.displayName || '', scheduleId: selectedScheduleId || undefined, expireAt: expireAtDate || undefined });
                        // attach messageId to schedule doc
                        await updateDoc(doc(db, 'user_schedules', selectedScheduleId), { messageId: msgId }).catch((e) => console.warn('attach msgId failed', e));
                        const updatedWithMsg = updatedLocal.map((s) => (s.id === selectedScheduleId ? { ...s, messageId: msgId } : s));
                        setSchedules(updatedWithMsg);
                    }
                } else {
                    // cleared — delete existing message if present
                    if (existing && existing.id) {
                        await deleteMessageById(existing.id);
                        // remove messageId from schedule doc
                        await updateDoc(doc(db, 'user_schedules', selectedScheduleId), { messageId: null }).catch((e) => console.warn('failed remove msgId', e));
                        const updatedSchedules = updatedLocal.map((s) => (s.id === selectedScheduleId ? { ...s, messageId: null } : s));
                        setSchedules(updatedSchedules);
                        setScheduleMessages([]);
                    }
                }
                setMessageTextEdit('');
                setShowMessageBoxEdit(false);
            } catch (err) {
                console.error('send admin edit msg err', err);
                Alert.alert('Message error', (err as any).message || 'Failed to send message to user');
            }
            Alert.alert('Saved', 'Schedule updated');
        } catch (err) {
            console.error('edit special err', err);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const formatTime = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={s.wrap}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text style={s.title}>Special Treatment Points</Text>
                                <Text style={s.muted}>Assign points to a specific sub-user.</Text>
                            </View>
                            <BellIcon count={badgeCount} onPress={() => { nav.navigate('AdminMessageList'); }} />
                        </View>

                        {/* User selector */}
                        <Text style={[s.label, { marginTop: 12 }]}>Select user</Text>
                        <TextInput
                            placeholder="Search users by name or email"
                            placeholderTextColor="#6b7280"
                            style={s.searchInput}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {users.length === 0 ? (
                            usersLoading ? (
                                <View style={{ paddingVertical: 24 }}>
                                    <ActivityIndicator size="small" color="#94a3b8" />
                                </View>
                            ) : (
                                <Text style={s.muted}>No sub users.</Text>
                            )
                        ) : (
                            <FlatList
                                data={filteredUsers}
                                keyExtractor={(item) => item.id}
                                style={{ marginTop: 8, maxHeight: 220 }}
                                renderItem={({ item }) => (
                                    <Pressable
                                        onPress={() => { setSelectedUserId(item.id); setSelectedScheduleId(null); setEditingPoints([]); }}
                                        style={[s.userListItem, selectedUserId === item.id ? s.userListItemActive : null]}
                                    >
                                        <View>
                                            <Text style={s.userName}>{item.name || '(no name)'}</Text>
                                            <Text style={s.userEmail}>{item.email}</Text>
                                        </View>
                                        <Text style={s.selectText}>{selectedUserId === item.id ? 'Selected' : 'Select'}</Text>
                                    </Pressable>
                                )}
                            />
                        )}

                        <Pressable style={s.addBtn} onPress={() => setShowAdd((v) => !v)} disabled={!selectedUserId}>
                            <Text style={s.addBtnText}>{showAdd ? 'Hide' : 'Add Points'}</Text>
                        </Pressable>

                        {showAdd && (
                            <View style={s.form}>
                                <Text style={s.label}>From</Text>
                                <Pressable onPress={() => setShowFromPicker(true)} style={s.timeInput}>
                                    <Text style={{ color: '#fff' }}>{fromDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </Pressable>
                                {showFromPicker && (
                                    <DateTimePicker value={fromDate} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowFromPicker(false); if (d) setFromDate(d); }} />
                                )}

                                <Text style={s.label}>To</Text>
                                <Pressable onPress={() => setShowToPicker(true)} style={s.timeInput}>
                                    <Text style={{ color: '#fff' }}>{toDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </Pressable>
                                {showToPicker && (
                                    <DateTimePicker value={toDate} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowToPicker(false); if (d) setToDate(d); }} />
                                )}

                                <View style={{ marginTop: 12 }} />
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Pressable style={s.plus} onPress={() => setDropdownOpen((v) => !v)}>
                                        <Text style={s.plusText}>＋</Text>
                                    </Pressable>
                                    <Pressable style={s.messageBtn} onPress={() => setShowMessageBox((v) => !v)}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#e5e7eb" />
                                    </Pressable>
                                    <Pressable style={s.messageBtn} onPress={() => setShowVisibilityBox((v) => !v)}>
                                        <Ionicons name="time-outline" size={20} color="#e5e7eb" />
                                    </Pressable>
                                </View>
                                {showVisibilityBox && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={s.label}>Visibility window (default 1 day)</Text>
                                        <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                                            <Pressable style={s.timeInput} onPress={() => setShowVisToDateNative(true)}>
                                                <Text style={{ color: '#fff' }}>{visibilityTo.toLocaleString()}</Text>
                                            </Pressable>
                                        </View>
                                        {showVisToDateNative && (
                                            <DateTimePicker value={visibilityTo} mode={Platform.OS === 'android' ? 'date' : 'datetime'} display="default" onChange={(_, d) => {
                                                setShowVisToDateNative(false);
                                                if (!d) return; // cancelled
                                                if (Platform.OS === 'android') {
                                                    // Date-only selected: ensure not past date; allow today but require time selection
                                                    const selectedDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                                                    const todayOnly = new Date();
                                                    todayOnly.setHours(0,0,0,0);
                                                    if (selectedDateOnly < todayOnly.getTime()) {
                                                        Alert.alert('Invalid date', 'Cannot pick a past date');
                                                        return;
                                                    }
                                                    const prev = visibilityTo || new Date();
                                                    const newDt = new Date(prev);
                                                    newDt.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                                    setVisibilityTo(newDt);
                                                    // always open time picker so user picks proper time (especially if today)
                                                    setShowVisToTimeNative(true);
                                                } else {
                                                    // iOS returns full datetime
                                                    const chosen = new Date(d);
                                                    if (chosen.getTime() <= Date.now()) {
                                                        Alert.alert('Invalid date/time', 'Visibility end must be in the future');
                                                        return;
                                                    }
                                                    setVisibilityTo(chosen);
                                                }
                                            }} />
                                        )}
                                        {showVisToTimeNative && (
                                            <DateTimePicker value={visibilityTo} mode={'time'} display="default" onChange={(_, d) => { setShowVisToTimeNative(false); if (!d) return; const prev = visibilityTo || new Date(); const newDt = new Date(prev); newDt.setHours(d.getHours(), d.getMinutes(), 0, 0); if (newDt.getTime() <= Date.now()) { Alert.alert('Invalid time', 'Visibility end cannot be in the past'); return; } setVisibilityTo(newDt); }} />
                                        )}
                                    </View>
                                )}
                                {dropdownOpen && (
                                    <View style={s.dropdown}>
                                        <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
                                            {Object.keys(SAMPLE_POINTS).map((name) => (
                                                <Pressable key={name} onPress={() => setSelectedPoint(name)} style={[s.dropdownItem, selectedPoint === name ? s.dropdownItemActive : null]}>
                                                    <Text style={{ color: '#fff' }}>{name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                                {selectedPoint && (
                                    <View style={s.selectedRow}>
                                        <Text style={{ color: '#fff' }}>{selectedPoint}</Text>
                                        <Pressable style={s.smallAddBtn} onPress={handleAddPointToList}>
                                            <Text style={{ color: '#fff' }}>Add</Text>
                                        </Pressable>
                                    </View>
                                )}

                                {showMessageBox && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={s.label}>Message to user (optional)</Text>
                                        <ScrollView style={{ maxHeight: 120, marginTop: 8 }} keyboardShouldPersistTaps="handled">
                                            <TextInput multiline placeholder="Enter message to user" placeholderTextColor="#6b7280" value={messageText} onChangeText={setMessageText} style={{ backgroundColor: '#0b1220', color: '#fff', padding: 10, borderRadius: 8, minHeight: 80 }} />
                                        </ScrollView>
                                    </View>
                                )}

                                <Text style={s.label}>Points to add</Text>
                                <ScrollView style={{ maxHeight: 140, marginTop: 8 }} keyboardShouldPersistTaps="handled">
                                    <View style={{ gap: 8 }}>
                                        {currentPoints.map((p, i) => (
                                            <View key={`${p.name}-${i}`} style={s.pointRow}>
                                                <Text style={{ color: '#fff' }}>{p.name} ({Math.round(p.x * 100)},{Math.round(p.y * 100)})</Text>
                                            </View>
                                        ))}
                                    </View>
                                </ScrollView>

                                <Pressable style={s.saveBtn} onPress={handleSaveSchedule} disabled={saving}>
                                    <Text style={s.saveText}>{saving ? 'Saving...' : 'Save Points'}</Text>
                                </Pressable>
                            </View>
                        )}

                        {!showAdd && (
                            <>
                                <Text style={[s.label, { marginTop: 20 }]}>Search schedules</Text>
                                <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                    <Pressable onPress={() => setShowSearchFromPicker(true)} style={[s.timeInput, { flex: 1, marginRight: 8 }]}>
                                        <Text style={{ color: '#fff' }}>{searchFrom ? searchFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'From'}</Text>
                                    </Pressable>
                                    <Pressable onPress={() => setShowSearchToPicker(true)} style={[s.timeInput, { flex: 1 }]}>
                                        <Text style={{ color: '#fff' }}>{searchTo ? searchTo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'To'}</Text>
                                    </Pressable>
                                    <Pressable onPress={() => { setSearchFrom(null); setSearchTo(null); }} style={[s.smallAddBtn, { backgroundColor: '#111827', marginLeft: 8, paddingHorizontal: 12 }]}>
                                        <Text style={{ color: '#fff' }}>Clear</Text>
                                    </Pressable>
                                </View>
                                {showSearchFromPicker && (
                                    <DateTimePicker value={searchFrom || new Date()} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowSearchFromPicker(false); if (d) setSearchFrom(d); }} />
                                )}
                                {showSearchToPicker && (
                                    <DateTimePicker value={searchTo || new Date()} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowSearchToPicker(false); if (d) setSearchTo(d); }} />
                                )}

                                <Text style={[s.label, { marginTop: 12 }]}>Schedules</Text>
                                {filteredSchedules.length === 0 ? (
                                    schedulesLoading ? (
                                        <View style={{ paddingVertical: 24 }}>
                                            <ActivityIndicator size="small" color="#94a3b8" />
                                        </View>
                                    ) : (
                                        <Text style={s.muted}>No schedules yet.</Text>
                                    )
                                ) : (
                                    <FlatList
                                        data={filteredSchedules}
                                        keyExtractor={(item) => item.id}
                                        style={{ marginTop: 8 }}
                                        renderItem={({ item }) => (
                                            <View style={s.scheduleListItem}>
                                                <Pressable onPress={() => {
                                                    setSelectedScheduleId(item.id);
                                                    setEditingFrom(item.from ? new Date(item.from) : new Date());
                                                    setEditingTo(item.to ? new Date(item.to) : new Date());
                                                    setEditingPoints(item.points ? [...item.points] : []);
                                                    setEditingVisibilityFrom(item.visibleFrom ? new Date(item.visibleFrom) : null);
                                                    setEditingVisibilityTo(item.visibleTo ? new Date(item.visibleTo) : null);
                                                }} style={{ flex: 1 }}>
                                                    <Text style={{ color: '#fff', fontWeight: '700' }}>{formatTime(item.from)} - {formatTime(item.to)}</Text>
                                                </Pressable>
                                                <Pressable onPress={() => {
                                                    Alert.alert('Delete schedule', 'Delete this schedule?', [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { text: 'Delete', style: 'destructive', onPress: () => deleteSchedule(item.id) },
                                                    ]);
                                                }} style={s.smallDeleteBtn}>
                                                    <Text style={s.smallDeleteText}>Delete</Text>
                                                </Pressable>
                                            </View>
                                        )}
                                    />
                                )}

                                {selectedScheduleId && (
                                    <View style={s.detailPanel}>
                                        <Text style={[s.label, { marginTop: 12 }]}>Edit Schedule</Text>
                                        <Text style={s.label}>From</Text>
                                        <Pressable onPress={() => setShowFromPicker(true)} style={s.timeInput}>
                                            <Text style={{ color: '#fff' }}>{editingFrom ? editingFrom.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                                        </Pressable>
                                        {showFromPicker && (
                                            <DateTimePicker value={editingFrom || new Date()} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowFromPicker(false); if (d) setEditingFrom(d); }} />
                                        )}
                                        <Text style={s.label}>To</Text>
                                        <Pressable onPress={() => setShowToPicker(true)} style={s.timeInput}>
                                            <Text style={{ color: '#fff' }}>{editingTo ? editingTo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                                        </Pressable>
                                        {showToPicker && (
                                            <DateTimePicker value={editingTo || new Date()} mode="time" is24Hour={false} display="default" onChange={(_, d) => { setShowToPicker(false); if (d) setEditingTo(d); }} />
                                        )}
                                        <Text style={[s.label, { marginTop: 12 }]}>Points</Text>
                                        <ScrollView style={{ maxHeight: 180 }} keyboardShouldPersistTaps="handled">
                                            {editingPoints.map((p, idx) => (
                                                <View key={`${selectedScheduleId}-pt-${idx}`} style={s.pointRowWithDelete}>
                                                    <Text style={{ color: '#fff' }}>{p.name} ({Math.round(p.x * 100)},{Math.round(p.y * 100)})</Text>
                                                    <Pressable onPress={() => { const copy = [...editingPoints]; copy.splice(idx, 1); setEditingPoints(copy); }} style={s.pointDeleteBtn}>
                                                        <Text style={s.pointDeleteText}>Remove</Text>
                                                    </Pressable>
                                                </View>
                                            ))}
                                        </ScrollView>
                                        <Text style={s.label}>Add point</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <Pressable style={s.plus} onPress={() => setDropdownOpen((v) => !v)}>
                                                <Text style={s.plusText}>＋</Text>
                                            </Pressable>
                                            <Pressable style={s.messageBtn} onPress={() => setShowMessageBoxEdit((v) => !v)}>
                                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#e5e7eb" />
                                            </Pressable>
                                            <Pressable style={s.messageBtn} onPress={() => setShowEditingVisPanel((v) => !v)}>
                                                <Ionicons name="time-outline" size={20} color="#e5e7eb" />
                                            </Pressable>
                                        </View>
                                        {showEditingVisPanel && (
                                            <View style={{ marginTop: 12 }}>
                                                <Text style={s.label}>Visibility window</Text>
                                                <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                                                    <Pressable style={s.timeInput} onPress={() => setShowEditingVisToDateNative(true)}>
                                                        <Text style={{ color: '#fff' }}>{(editingVisibilityTo || new Date(Date.now() + 1000 * 60 * 60 * 24)).toLocaleString()}</Text>
                                                    </Pressable>
                                                </View>
                                                {showEditingVisToDateNative && (
                                                    <DateTimePicker value={editingVisibilityTo || new Date(Date.now() + 1000 * 60 * 60 * 24)} mode={Platform.OS === 'android' ? 'date' : 'datetime'} display="default" onChange={(_, d) => {
                                                        setShowEditingVisToDateNative(false);
                                                        if (!d) return; // cancelled
                                                        if (Platform.OS === 'android') {
                                                            const selectedDateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                                                            const todayOnly = new Date();
                                                            todayOnly.setHours(0,0,0,0);
                                                            if (selectedDateOnly < todayOnly.getTime()) {
                                                                Alert.alert('Invalid date', 'Cannot pick a past date');
                                                                return;
                                                            }
                                                            const prev = editingVisibilityTo || new Date();
                                                            const newDt = new Date(prev);
                                                            newDt.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                                                            setEditingVisibilityTo(newDt);
                                                            setShowEditingVisToTimeNative(true);
                                                        } else {
                                                            const chosen = new Date(d);
                                                            if (chosen.getTime() <= Date.now()) {
                                                                Alert.alert('Invalid date/time', 'Visibility end must be in the future');
                                                                return;
                                                            }
                                                            setEditingVisibilityTo(chosen);
                                                        }
                                                    }} />
                                                )}
                                                {showEditingVisToTimeNative && (
                                                    <DateTimePicker value={editingVisibilityTo || new Date(Date.now() + 1000 * 60 * 60 * 24)} mode={'time'} display="default" onChange={(_, d) => { setShowEditingVisToTimeNative(false); if (!d) return; const prev = editingVisibilityTo || new Date(); const newDt = new Date(prev); newDt.setHours(d.getHours(), d.getMinutes(), 0, 0); if (newDt.getTime() <= Date.now()) { Alert.alert('Invalid time', 'Visibility end cannot be in the past'); return; } setEditingVisibilityTo(newDt); }} />
                                                )}
                                            </View>
                                        )}
                                        {dropdownOpen && (
                                            <View style={s.dropdown}>
                                                <ScrollView style={{ maxHeight: 160 }} keyboardShouldPersistTaps="handled">
                                                    {Object.keys(SAMPLE_POINTS).map((name) => (
                                                        <Pressable key={name} onPress={() => setSelectedPoint(name)} style={[s.dropdownItem, selectedPoint === name ? s.dropdownItemActive : null]}>
                                                            <Text style={{ color: '#fff' }}>{name}</Text>
                                                        </Pressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                        {selectedPoint && (
                                            <View style={s.selectedRow}>
                                                <Text style={{ color: '#fff' }}>{selectedPoint}</Text>
                                                <Pressable style={s.smallAddBtn} onPress={() => {
                                                    if (!selectedPoint) return;
                                                    const coords = SAMPLE_POINTS[selectedPoint];
                                                    if (!coords) return;
                                                    setEditingPoints((p: any) => [...p, { name: selectedPoint, x: coords.x, y: coords.y }]);
                                                    setSelectedPoint(null);
                                                    setDropdownOpen(false);
                                                }}>
                                                    <Text style={{ color: '#fff' }}>Add</Text>
                                                </Pressable>
                                            </View>
                                        )}

                                        {/* Inline message textbox — prefilled when a schedule is selected. Clearing this field and saving will delete the message. */}

                                        <View style={{ marginTop: 12 }}>
                                            <Text style={s.label}>Message to user (optional)</Text>
                                            <ScrollView style={{ maxHeight: 120, marginTop: 8 }} keyboardShouldPersistTaps="handled">
                                                <TextInput multiline placeholder="Enter message to user" placeholderTextColor="#6b7280" value={messageTextEdit} onChangeText={setMessageTextEdit} style={{ backgroundColor: '#0b1220', color: '#fff', padding: 10, borderRadius: 8, minHeight: 80 }} />
                                            </ScrollView>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                            <Pressable style={[s.saveBtn, { flex: 1, marginRight: 8 }]} onPress={saveEdits}>
                                                <Text style={s.saveText}>Save Changes</Text>
                                            </Pressable>
                                            <Pressable style={[s.smallDeleteBtn, { flex: 0.4 }]} onPress={() => { setSelectedScheduleId(null); setEditingPoints([]); }}>
                                                <Text style={s.smallDeleteText}>Close</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
    title: { color: '#e5e7eb', fontSize: 22, fontWeight: '800' },
    muted: { color: '#94a3b8', marginTop: 4 },
    addBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center' },
    addBtnText: { color: '#fff', fontWeight: '700' },
    form: { marginTop: 12, backgroundColor: '#121622', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
    label: { color: '#94a3b8', marginTop: 8, marginBottom: 6 },
    timeInput: { backgroundColor: '#0b1220', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1f2937' },
    plus: { marginTop: 12, alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 22, backgroundColor: '#111827' },
    plusText: { color: '#fff', fontSize: 28 },
    dropdown: { marginTop: 8, backgroundColor: '#0b1220', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#1f2937' },
    dropdownItem: { paddingVertical: 10, paddingHorizontal: 8 },
    dropdownItemActive: { backgroundColor: '#1f2937', borderRadius: 8 },
    selectedRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    smallAddBtn: { backgroundColor: '#16a34a', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    pointRow: { backgroundColor: '#0d1320', padding: 8, borderRadius: 8 },
    saveBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#06b6d4', alignItems: 'center' },
    saveText: { color: '#012', fontWeight: '700' },
    smallDeleteBtn: { backgroundColor: '#7f1d1d', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    smallDeleteText: { color: '#fff', fontWeight: '700' },
    pointRowWithDelete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0d1320', padding: 8, borderRadius: 8, marginTop: 6 },
    pointDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    pointDeleteText: { color: '#fff', fontWeight: '700' },
    scheduleListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    detailPanel: { marginTop: 12, backgroundColor: '#0f1724', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
    userChip: { backgroundColor: '#121622', borderWidth: 1, borderColor: '#1f2937', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
    userChipActive: { backgroundColor: '#1f2a3a' },
    searchInput: { marginTop: 8, backgroundColor: '#0b1220', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', color: '#e5e7eb' },
    userListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, backgroundColor: '#121622', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', marginTop: 8 },
    userListItemActive: { borderColor: '#4f46e5', backgroundColor: '#162033' },
    messageBtn: { marginTop: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
    userName: { color: '#e5e7eb', fontWeight: '700' },
    userEmail: { color: '#94a3b8', marginTop: 2 },
    selectText: { color: '#94a3b8', fontWeight: '600' },
});
