// import React, { useState, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    Alert,
    FlatList,
    TouchableOpacity,
    Platform,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import React, { useEffect, useState, useMemo } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth, db } from '@/config/firebase';
import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';

// Sample points mapping (pointName -> normalized coordinates)
const SAMPLE_POINTS: Record<string, { x: number; y: number }> = {
    'Point A': { x: 0.25, y: 0.2 },
    'Point B': { x: 0.5, y: 0.35 },
    'Point C': { x: 0.72, y: 0.5 },
    'Point D': { x: 0.4, y: 0.65 },
};

export default function AdminLivePoints() {
    const adminId = auth.currentUser?.uid;
    const [schedules, setSchedules] = useState<any[]>([]);

    const [showAdd, setShowAdd] = useState(false);
    const [fromDate, setFromDate] = useState<Date>(new Date());
    const [toDate, setToDate] = useState<Date>(new Date(Date.now() + 1000 * 60 * 30));
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState<string | null>(null);
    const [currentPoints, setCurrentPoints] = useState<{ name: string; x: number; y: number }[]>([]);
    const [saving, setSaving] = useState(false);
    const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
    const [deletingPoint, setDeletingPoint] = useState<{ scheduleId: string; index: number } | null>(null);

    // schedule editing state
    const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
    const [editingFrom, setEditingFrom] = useState<Date | null>(null);
    const [editingTo, setEditingTo] = useState<Date | null>(null);
    const [editingPoints, setEditingPoints] = useState<{ name: string; x: number; y: number }[]>([]);

    // Search/filter state
    const [searchFrom, setSearchFrom] = useState<Date | null>(null);
    const [searchTo, setSearchTo] = useState<Date | null>(null);
    const [showSearchFromPicker, setShowSearchFromPicker] = useState(false);
    const [showSearchToPicker, setShowSearchToPicker] = useState(false);

    const filteredSchedules = useMemo(() => {
        if (!searchFrom && !searchTo) return schedules;
        return schedules.filter((sch: any) => {
            try {
                const f = sch.from ? new Date(sch.from) : null;
                const t = sch.to ? new Date(sch.to) : null;
                if (!f || !t) return false;
                if (searchFrom && searchTo) {
                    return f >= searchFrom && t <= searchTo;
                }
                if (searchFrom) return f >= searchFrom;
                if (searchTo) return t <= searchTo;
                return true;
            } catch (e) {
                return false;
            }
        });
    }, [schedules, searchFrom, searchTo]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load existing schedules for this admin (if any)
        if (!adminId) { setLoading(false); return; }
        (async () => {
            try {
                const adminDocRef = doc(db, 'admin_live_points', adminId);
                const snap = await getDoc(adminDocRef);
                if (snap && snap.exists()) {
                    const data = snap.data() as any;
                    setSchedules(data.schedules || []);
                }
            } catch (err: any) {
                console.warn('Failed to load admin live points', err);
                if (err && err.message && err.message.toLowerCase().includes('permission')) {
                    Alert.alert('Permission error', 'Missing or insufficient permission to read live points. Check Firestore security rules.');
                }
            } finally {
                setLoading(false);
            }
        })();
    }, [adminId]);

    const handleAddPointToList = () => {
        if (!selectedPoint) return;
        const coords = SAMPLE_POINTS[selectedPoint];
        if (!coords) return;
        setCurrentPoints((p) => [...p, { name: selectedPoint, x: coords.x, y: coords.y }]);
        setSelectedPoint(null);
        setDropdownOpen(false);
    };

    const handleSaveSchedule = async () => {
        if (!adminId) return Alert.alert('Error', 'Admin not found');
        if (currentPoints.length === 0) return Alert.alert('No points', 'Please add at least one point');

        // overlap prevention
        const newFrom = Date.parse(fromDate.toISOString());
        const newTo = Date.parse(toDate.toISOString());
        const overlaps = schedules.some((s:any) => {
            const existingFrom = s.from ? Date.parse(s.from) : null;
            const existingTo = s.to ? Date.parse(s.to) : null;
            if (!existingFrom || !existingTo) return false;
            return newFrom < existingTo && existingFrom < newTo;
        });
        if (overlaps) {
            return Alert.alert('Overlap', 'This schedule overlaps an existing schedule. Pick a different time range.');
        }

        setSaving(true);
        try {
            const newSchedule = {
                id: `${Date.now()}`,
                from: fromDate.toISOString(),
                to: toDate.toISOString(),
                points: currentPoints,
                createdAt: new Date().toISOString(),
            };
            const newSchedules = [...schedules, newSchedule];

            // Save to admin_live_points collection (doc id = adminId)
            await setDoc(doc(db, 'admin_live_points', adminId), { schedules: newSchedules, updatedAt: serverTimestamp() }, { merge: true });

            // Push to all subusers under this admin
            const q = query(collection(db, 'users'), where('adminId', '==', adminId));
            const snap = await getDocs(q);
            const updates: Promise<any>[] = [];
            snap.forEach((d) => {
                const userRef = doc(db, 'users', d.id);
                updates.push(updateDoc(userRef, { livePointsSchedules: newSchedules }));
            });
            // Also update admin user doc
            updates.push(updateDoc(doc(db, 'users', adminId), { livePointsSchedules: newSchedules }).catch(() => null));

            await Promise.all(updates);

            setSchedules(newSchedules);
            setCurrentPoints([]);
            setShowAdd(false);
            Alert.alert('Saved', 'Points saved and pushed to sub-users.');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to save points');
        } finally {
            setSaving(false);
        }
    };

    const deleteSchedule = async (scheduleId: string) => {
        if (!adminId) return;
        setDeletingScheduleId(scheduleId);
        try {
            const newSchedules = schedules.filter(s => s.id !== scheduleId);
            await setDoc(doc(db, 'admin_live_points', adminId), { schedules: newSchedules, updatedAt: serverTimestamp() }, { merge: true });

            const q = query(collection(db, 'users'), where('adminId', '==', adminId));
            const snap = await getDocs(q);
            const updates: Promise<any>[] = [];
            snap.forEach((d) => {
                const userRef = doc(db, 'users', d.id);
                updates.push(updateDoc(userRef, { livePointsSchedules: newSchedules }).catch(() => null));
            });
            await Promise.all(updates);
            setSchedules(newSchedules);
            Alert.alert('Deleted', 'Schedule removed and changes pushed to sub-users.');
        } catch (err) {
            console.error('deleteSchedule error', err);
            Alert.alert('Error', 'Failed to delete schedule');
        } finally {
            setDeletingScheduleId(null);
        }
    };

    const deletePointFromSchedule = async (scheduleId: string, index: number) => {
        if (!adminId) return;
        setDeletingPoint({ scheduleId, index });
        try {
            const newSchedules = schedules.map(s => {
                if (s.id !== scheduleId) return s;
                const points = Array.isArray(s.points) ? [...s.points] : [];
                points.splice(index, 1);
                return { ...s, points };
            });

            await setDoc(doc(db, 'admin_live_points', adminId), { schedules: newSchedules, updatedAt: serverTimestamp() }, { merge: true });

            const q = query(collection(db, 'users'), where('adminId', '==', adminId));
            const snap = await getDocs(q);
            const updates: Promise<any>[] = [];
            snap.forEach((d) => {
                const userRef = doc(db, 'users', d.id);
                updates.push(updateDoc(userRef, { livePointsSchedules: newSchedules }).catch(() => null));
            });
            await Promise.all(updates);
            setSchedules(newSchedules);
            Alert.alert('Updated', 'Point removed and changes pushed to sub-users.');
        } catch (err) {
            console.error('deletePointFromSchedule error', err);
            Alert.alert('Error', 'Failed to remove point');
        } finally {
            setDeletingPoint(null);
        }
    };

    const formatTime = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Live Treatment Points</Text>
                <Text style={s.muted}>Create time-based point sets and push to your sub-users.</Text>

                <Pressable style={s.addBtn} onPress={() => setShowAdd((v) => !v)}>
                    <Text style={s.addBtnText}>Add Points</Text>
                </Pressable>

                {showAdd && (
                    <View style={s.form}>
                        <Text style={s.label}>From</Text>
                        <Pressable onPress={() => setShowFromPicker(true)} style={s.timeInput}>
                            <Text style={{ color: '#fff' }}>{fromDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </Pressable>
                        {showFromPicker && (
                            <DateTimePicker
                                value={fromDate}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={(_, d) => {
                                    setShowFromPicker(false);
                                    if (d) setFromDate(d);
                                }}
                            />
                        )}

                        <Text style={s.label}>To</Text>
                        <Pressable onPress={() => setShowToPicker(true)} style={s.timeInput}>
                            <Text style={{ color: '#fff' }}>{toDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                        </Pressable>
                        {showToPicker && (
                            <DateTimePicker
                                value={toDate}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={(_, d) => {
                                    setShowToPicker(false);
                                    if (d) setToDate(d);
                                }}
                            />
                        )}

                        <View style={{ marginTop: 12 }} />

                        <Pressable style={s.plus} onPress={() => setDropdownOpen((v) => !v)}>
                            <Text style={s.plusText}>＋</Text>
                        </Pressable>

                        {dropdownOpen && (
                            <View style={s.dropdown}>
                                <ScrollView style={{ maxHeight: 160 }}>
                                    {Object.keys(SAMPLE_POINTS).map((name) => (
                                        <Pressable
                                            key={name}
                                            onPress={() => setSelectedPoint(name)}
                                            style={[s.dropdownItem, selectedPoint === name ? s.dropdownItemActive : null]}
                                        >
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

                        <View style={{ marginTop: 12 }} />

                        <Text style={s.label}>Points to add</Text>
                        <ScrollView style={{ maxHeight: 140, marginTop: 8 }}>
                            <View style={{ gap: 8 }}>
                                {currentPoints.map((p, i) => (
                                    <View key={`${p.name}-${i}`} style={s.pointRow}>
                                        <Text style={{ color: '#fff' }}>{p.name} ({Math.round(p.x*100)},{Math.round(p.y*100)})</Text>
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
                            <DateTimePicker
                                value={searchFrom || new Date()}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={(_, d) => { setShowSearchFromPicker(false); if (d) setSearchFrom(d); }}
                            />
                        )}
                        {showSearchToPicker && (
                            <DateTimePicker
                                value={searchTo || new Date()}
                                mode="time"
                                is24Hour={false}
                                display="default"
                                onChange={(_, d) => { setShowSearchToPicker(false); if (d) setSearchTo(d); }}
                            />
                        )}

                        <Text style={[s.label, { marginTop: 12 }]}>Schedules</Text>
                        {filteredSchedules.length === 0 ? (
                            loading ? (
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
                                    <DateTimePicker
                                        value={editingFrom || new Date()}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={(_, d) => { setShowFromPicker(false); if (d) setEditingFrom(d); }}
                                    />
                                )}

                                <Text style={s.label}>To</Text>
                                <Pressable onPress={() => setShowToPicker(true)} style={s.timeInput}>
                                    <Text style={{ color: '#fff' }}>{editingTo ? editingTo.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                                </Pressable>
                                {showToPicker && (
                                    <DateTimePicker
                                        value={editingTo || new Date()}
                                        mode="time"
                                        is24Hour={false}
                                        display="default"
                                        onChange={(_, d) => { setShowToPicker(false); if (d) setEditingTo(d); }}
                                    />
                                )}

                                <Text style={[s.label, { marginTop: 12 }]}>Points</Text>
                                <ScrollView style={{ maxHeight: 180 }}>
                                    {editingPoints.map((p, idx) => (
                                        <View key={`${selectedScheduleId}-pt-${idx}`} style={s.pointRowWithDelete}>
                                            <Text style={{ color: '#fff' }}>{p.name} ({Math.round(p.x*100)},{Math.round(p.y*100)})</Text>
                                            <View style={{ flexDirection: 'row' }}>
                                                <Pressable onPress={() => {
                                                    const copy = [...editingPoints];
                                                    copy.splice(idx, 1);
                                                    setEditingPoints(copy);
                                                }} style={s.pointDeleteBtn}>
                                                    <Text style={s.pointDeleteText}>Remove</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>

                                <Text style={s.label}>Add point</Text>
                                <Pressable style={s.plus} onPress={() => setDropdownOpen((v) => !v)}>
                                    <Text style={s.plusText}>＋</Text>
                                </Pressable>
                                {dropdownOpen && (
                                    <View style={s.dropdown}>
                                        <ScrollView style={{ maxHeight: 160 }}>
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
                                            setEditingPoints((p:any) => [...p, { name: selectedPoint, x: coords.x, y: coords.y }]);
                                            setSelectedPoint(null);
                                            setDropdownOpen(false);
                                        }}>
                                            <Text style={{ color: '#fff' }}>Add</Text>
                                        </Pressable>
                                    </View>
                                )}

                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                                    <Pressable style={[s.saveBtn, { flex: 1, marginRight: 8 }]} onPress={async () => {
                                        const scheduleIndex = schedules.findIndex(s => s.id === selectedScheduleId);
                                        if (scheduleIndex === -1) return Alert.alert('Error', 'Schedule not found');

                                        const newFrom = editingFrom ? editingFrom.toISOString() : schedules[scheduleIndex].from;
                                        const newTo = editingTo ? editingTo.toISOString() : schedules[scheduleIndex].to;

                                        const overlaps = schedules.some((s:any) => {
                                            if (s.id === selectedScheduleId) return false;
                                            const existingFrom = s.from ? Date.parse(s.from) : null;
                                            const existingTo = s.to ? Date.parse(s.to) : null;
                                            if (!existingFrom || !existingTo) return false;
                                            return Date.parse(newFrom) < existingTo && existingFrom < Date.parse(newTo);
                                        });
                                        if (overlaps) return Alert.alert('Overlap', 'Updated times overlap an existing schedule.');

                                        const updated = schedules.map(s => s.id === selectedScheduleId ? { ...s, from: newFrom, to: newTo, points: editingPoints } : s);
                                        try {
                                            await setDoc(doc(db, 'admin_live_points', adminId), { schedules: updated, updatedAt: serverTimestamp() }, { merge: true });
                                            const q = query(collection(db, 'users'), where('adminId', '==', adminId));
                                            const snap = await getDocs(q);
                                            const updates: Promise<any>[] = [];
                                            snap.forEach((d) => updates.push(updateDoc(doc(db, 'users', d.id), { livePointsSchedules: updated }).catch(() => null)));
                                            await Promise.all(updates);
                                            setSchedules(updated);
                                            Alert.alert('Saved', 'Schedule updated and pushed to sub-users');
                                        } catch (err) {
                                            console.error('save edits err', err);
                                            Alert.alert('Error', 'Failed to save changes');
                                        }

                                    }}>
                                        <Text style={s.saveText}>Save Changes</Text>
                                    </Pressable>

                                    <Pressable style={[s.smallDeleteBtn, { flex: 0.4 }]} onPress={() => {
                                        setSelectedScheduleId(null);
                                        setEditingPoints([]);
                                    }}>
                                        <Text style={s.smallDeleteText}>Close</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                    </>
                )}
            </View>
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
    scheduleTab: { backgroundColor: '#121622', padding: 12, marginRight: 8, borderRadius: 10, borderWidth: 1, borderColor: '#1f2937' },
    scheduleCard: { width: 220, backgroundColor: '#121622', padding: 12, marginRight: 8, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: '#1f2937' },
    smallDeleteBtn: { backgroundColor: '#7f1d1d', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    smallDeleteText: { color: '#fff', fontWeight: '700' },
    pointRowWithDelete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0d1320', padding: 8, borderRadius: 8, marginTop: 6 },
    pointDeleteBtn: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    pointDeleteText: { color: '#fff', fontWeight: '700' },
    scheduleListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
    detailPanel: { marginTop: 12, backgroundColor: '#0f1724', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937' },
});
