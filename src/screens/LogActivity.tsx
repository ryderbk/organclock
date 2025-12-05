import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Modal, Animated, Easing } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { addLog } from '@/services/logService';
import { auth } from '@/config/firebase';

const ACTIVITIES = ['Eat', 'Sleep', 'Workout', 'Study', 'Other'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

export default function LogActivity() {
    const [activity, setActivity] = useState<string>('');
    const [notes, setNotes] = useState<string>('');

    // Stable reference time
    const baseNowRef = useRef(new Date());
    const baseNow = baseNowRef.current;

    // Selected datetime (committed)
    const [year, setYear] = useState<number>(baseNow.getFullYear());
    const [month, setMonth] = useState<number>(baseNow.getMonth());
    const [day, setDay] = useState<number>(baseNow.getDate());
    const [hour, setHour] = useState<number>(baseNow.getHours());
    const [minute, setMinute] = useState<number>(baseNow.getMinutes());

    // Date/time modal state
    const [showDTModal, setShowDTModal] = useState(false);
    const [mYear, setMYear] = useState<number>(year);
    const [mMonth, setMMonth] = useState<number>(month);
    const [mDay, setMDay] = useState<number>(day);
    const [mHour, setMHour] = useState<number>(hour);
    const [mMinute, setMMinute] = useState<number>(minute);

    // Activity modal state
    const [showActModal, setShowActModal] = useState(false);

    // Animations
    const dtAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible
    const actAnim = useRef(new Animated.Value(0)).current;
    const toastAnim = useRef(new Animated.Value(0)).current; // 0 hidden, 1 visible

    // Toast state
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const toastTimer = useRef<any>(null);
    const [isSaving, setIsSaving] = useState<boolean>(false);

    const uid = auth.currentUser?.uid;

    const isTodayM = mYear === baseNow.getFullYear() && mMonth === baseNow.getMonth() && mDay === baseNow.getDate();

    const years = useMemo(() => {
        const current = baseNow.getFullYear();
        const pastSpan = 5; // years in the past the user can select
        const futureSpan = 5; // years in the future the user can select
        const start = current - pastSpan;
        const length = pastSpan + futureSpan + 1;
        return Array.from({ length }, (_, i) => start + i);
    }, [baseNow]);

    const months = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => i);
    }, []);

    const days = useMemo(() => {
        const dim = daysInMonth(mYear, mMonth);
        return Array.from({ length: dim }, (_, i) => i + 1);
    }, [mYear, mMonth]);

    const hours = useMemo(() => {
        return Array.from({ length: 24 }, (_, i) => i);
    }, []);

    const minutes = useMemo(() => {
        return Array.from({ length: 60 }, (_, i) => i);
    }, []);

    // Clamp modal dependent fields to valid ranges when parents change
    useEffect(() => {
        if (mMonth < 0) setMMonth(0);
        if (mMonth > 11) setMMonth(11);
    }, [mYear, mMonth]);

    useEffect(() => {
        const dim = daysInMonth(mYear, mMonth);
        if (mDay < 1) setMDay(1);
        if (mDay > dim) setMDay(dim);
    }, [mYear, mMonth, mDay]);

    useEffect(() => {
        if (mHour < 0) setMHour(0);
        if (mHour > 23) setMHour(23);
    }, [mYear, mMonth, mDay, mHour]);

    useEffect(() => {
        if (mMinute < 0) setMMinute(0);
        if (mMinute > 59) setMMinute(59);
    }, [mYear, mMonth, mDay, mHour, mMinute]);

    const selectedTs = new Date(year, month, day, hour, minute, 0, 0).getTime();
    const canSave = !!uid && !!activity && notes.trim().length > 0 && !isSaving;

    const animateIn = (val: Animated.Value) => {
        Animated.timing(val, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };
    const animateOut = (val: Animated.Value, cb?: () => void) => {
        Animated.timing(val, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => cb && cb());
    };

    const openDTModal = () => {
        setMYear(year);
        setMMonth(month);
        setMDay(day);
        setMHour(hour);
        setMMinute(minute);
        setShowDTModal(true);
        requestAnimationFrame(() => animateIn(dtAnim));
    };
    const closeDTModal = () => animateOut(dtAnim, () => setShowDTModal(false));

    const confirmDTModal = () => {
        setYear(mYear);
        setMonth(mMonth);
        setDay(mDay);
        setHour(mHour);
        setMinute(mMinute);
        closeDTModal();
    };

    const openActModal = () => {
        setShowActModal(true);
        requestAnimationFrame(() => animateIn(actAnim));
    };
    const closeActModal = () => animateOut(actAnim, () => setShowActModal(false));

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        if (toastTimer.current) clearTimeout(toastTimer.current as any);
        setToast({ type, message });
        Animated.timing(toastAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        toastTimer.current = setTimeout(() => {
            Animated.timing(toastAnim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setToast(null));
        }, 2000);
    };

    const onSave = async () => {
        if (!uid) return;
        if (isSaving) return;
        setIsSaving(true);
        const ts = new Date(year, month, day, hour, minute, 0, 0).getTime();
        try {
            await addLog(uid, activity, notes.trim(), ts);
            setNotes('');
            setActivity('');
            setYear(baseNow.getFullYear());
            setMonth(baseNow.getMonth());
            setDay(baseNow.getDate());
            setHour(baseNow.getHours());
            setMinute(baseNow.getMinutes());
            showToast('success', 'Activity saved');
        } catch (e: any) {
            showToast('error', e?.message || 'Failed to save');
        } finally {
            setIsSaving(false);
        }
    };

    const formatSelected = () => {
        const d = new Date(year, month, day, hour, minute, 0, 0);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = MONTH_LABELS[d.getMonth()];
        const yyyy = d.getFullYear();
        const HH = String(d.getHours()).padStart(2, '0');
        const MM = String(d.getMinutes()).padStart(2, '0');
        return `${dd} ${mm} ${yyyy}, ${HH}:${MM}`;
    };

    const insets = useSafeAreaInsets();
    return (
        <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
            <View style={[s.wrap, { paddingTop: 16 }]}>
                <Text style={s.title}>Log Activity</Text>

                <Text style={s.muted}>Choose an activity</Text>
                <Pressable onPress={openActModal} style={[s.inputBox, s.inputRow]} accessibilityRole="button">
                    <Text style={[s.inputText, !activity && { color: '#6b7280' }]}>{activity || 'Select activity'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#94a3b8" />
                </Pressable>

                {activity ? (
                    <View style={{ marginTop: 24 }}>
                        <Text style={s.muted}>When</Text>
                        <Pressable onPress={openDTModal} style={[s.inputBox, s.inputRow]} accessibilityRole="button">
                            <Text style={s.inputText}>{formatSelected()}</Text>
                            <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
                        </Pressable>
                    </View>
                ) : null}

                {activity ? (
                    <View style={{ marginTop: 24 }}>
                        <Text style={s.muted}>Notes</Text>
                        <TextInput
                            value={notes}
                            onChangeText={setNotes}
                            placeholder={`Details about ${activity.toLowerCase()}...`}
                            placeholderTextColor="#6b7280"
                            multiline
                            style={s.textarea}
                        />
                    </View>
                ) : null}

                <Pressable onPress={onSave} disabled={!canSave} style={[s.btn, canSave ? s.btnPrimary : s.btnSecondary]}>
                    <Text style={s.btnText}>{isSaving ? 'Saving...' : 'Save Log'}</Text>
                </Pressable>
            </View>

            {/* Activity Modal */}
            <Modal visible={showActModal} transparent animationType="none" onRequestClose={closeActModal}>
                <Animated.View style={[s.modalBackdrop, { opacity: actAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                    <Animated.View
                        style={[
                            s.modalCard,
                            {
                                paddingBottom: 12 + insets.bottom,
                                transform: [{ translateY: actAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                                opacity: actAnim,
                            },
                        ]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <Ionicons name="create-outline" size={18} color="#94a3b8" />
                            <Text style={[s.muted, { marginLeft: 8 }]}>Select activity</Text>
                        </View>

                        {ACTIVITIES.map((a) => {
                            const selected = a === activity;
                            return (
                                <Pressable
                                    key={a}
                                    onPress={() => {
                                        setActivity(a);
                                        closeActModal();
                                    }}
                                    style={[s.optionItem, selected && s.optionItemSelected]}
                                >
                                    <Text style={[s.optionText, selected && s.optionTextSelected]}>{a}</Text>
                                    {selected ? <Ionicons name="checkmark" size={16} color="#a5b4fc" /> : null}
                                </Pressable>
                            );
                        })}

                        <Pressable onPress={closeActModal} style={[s.btn, s.btnSecondary, { marginTop: 12 }]}>
                            <Text style={s.btnText}>Cancel</Text>
                        </Pressable>
                    </Animated.View>
                </Animated.View>
            </Modal>

            {/* Date/Time Modal */}
            <Modal visible={showDTModal} transparent animationType="none" onRequestClose={closeDTModal}>
                <Animated.View style={[s.modalBackdrop, { opacity: dtAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                    <Animated.View
                        style={[
                            s.modalCard,
                            {
                                paddingBottom: 12 + insets.bottom,
                                transform: [{ translateY: dtAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
                                opacity: dtAnim,
                            },
                        ]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="calendar-outline" size={18} color="#94a3b8" />
                            <Text style={[s.muted, { marginLeft: 8 }]}>Select date & time</Text>
                        </View>
                        <Text style={[s.muted, { marginBottom: 16, marginTop: 4 }]}>You can pick past or future dates</Text>

                        <View style={s.row}>
                            <View style={s.col}>
                                <View style={s.pickerBox}>
                                    <Picker selectedValue={mYear} onValueChange={(v) => setMYear(Number(v))} style={{ color: '#e5e7eb' }} dropdownIconColor="#e5e7eb">
                                        {years.map((y) => (
                                            <Picker.Item key={y} label={String(y)} value={y} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={s.col}>
                                <View style={s.pickerBox}>
                                    <Picker selectedValue={mMonth} onValueChange={(v) => setMMonth(Number(v))} style={{ color: '#e5e7eb' }} dropdownIconColor="#e5e7eb">
                                        {months.map((m) => (
                                            <Picker.Item key={m} label={MONTH_LABELS[m]} value={m} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={s.col}>
                                <View style={s.pickerBox}>
                                    <Picker selectedValue={mDay} onValueChange={(v) => setMDay(Number(v))} style={{ color: '#e5e7eb' }} dropdownIconColor="#e5e7eb">
                                        {days.map((d) => (
                                            <Picker.Item key={d} label={String(d)} value={d} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                        </View>

                        <View style={[s.row, { marginTop: 12 }]}>
                            <View style={s.col}>
                                <View style={s.pickerBox}>
                                    <Picker selectedValue={mHour} onValueChange={(v) => setMHour(Number(v))} style={{ color: '#e5e7eb' }} dropdownIconColor="#e5e7eb">
                                        {hours.map((h) => (
                                            <Picker.Item key={h} label={String(h).padStart(2, '0')} value={h} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={s.col}>
                                <View style={s.pickerBox}>
                                    <Picker selectedValue={mMinute} onValueChange={(v) => setMMinute(Number(v))} style={{ color: '#e5e7eb' }} dropdownIconColor="#e5e7eb">
                                        {minutes.map((m) => (
                                            <Picker.Item key={m} label={String(m).padStart(2, '0')} value={m} />
                                        ))}
                                    </Picker>
                                </View>
                            </View>
                            <View style={[s.col, { opacity: 0 }]}>
                                <View style={s.pickerBox}>
                                    <View />
                                </View>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', marginTop: 16 }}>
                            <Pressable onPress={closeDTModal} style={[s.btn, s.btnSecondary, { flex: 1, marginRight: 8 }]}>
                                <Text style={s.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={confirmDTModal} style={[s.btn, s.btnPrimary, { flex: 1, marginLeft: 8 }]}>
                                <Text style={s.btnText}>Set</Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </Animated.View>
            </Modal>

            {/* Toast */}
            {toast ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        s.toast,
                        {
                            bottom: 16 + insets.bottom,
                            opacity: toastAnim,
                            transform: [
                                { translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                                { scale: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                            ],
                            borderColor: toast.type === 'success' ? '#22c55e' : toast.type === 'error' ? '#ef4444' : '#1f2937',
                        },
                    ]}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {toast.type === 'success' && <Ionicons name="checkmark-circle" size={18} color="#22c55e" />}
                        {toast.type === 'error' && <Ionicons name="warning" size={18} color="#ef4444" />}
                        {toast.type === 'info' && <Ionicons name="information-circle" size={18} color="#60a5fa" />}
                        <Text style={[s.inputText, { marginLeft: 8 }]}>{toast.message}</Text>
                    </View>
                </Animated.View>
            ) : null}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
    title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 16 },
    muted: { color: '#94a3b8', marginBottom: 8 },
    pickerBox: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937' },
    textarea: { minHeight: 140, backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 16, color: '#e5e7eb', textAlignVertical: 'top' },
    btn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1 },
    btnPrimary: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    btnSecondary: { backgroundColor: '#111827', borderColor: '#1f2937' },
    btnText: { color: '#ffffff', fontWeight: '600' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    col: { width: '32%' },
    inputBox: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', paddingVertical: 14, paddingHorizontal: 16 },
    inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    inputText: { color: '#e5e7eb' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: '#0b0d12', paddingHorizontal: 16, paddingVertical: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderColor: '#1f2937' },
    optionItem: { paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#0c111b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    optionItemSelected: { backgroundColor: '#111827', borderColor: '#4f46e5' },
    optionText: { color: '#e5e7eb', fontSize: 14 },
    optionTextSelected: { color: '#a5b4fc', fontWeight: '600' },
    toast: { position: 'absolute', left: 16, right: 16, backgroundColor: '#0b0d12', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1 },
});
