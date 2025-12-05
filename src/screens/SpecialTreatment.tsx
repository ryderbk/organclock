// import React, { useEffect, useState } from 'react';
import React, { useEffect, useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Text, LayoutChangeEvent, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { auth, db } from '@/config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { listenAdminPushesForUser } from '@/services/messageService';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function SpecialTreatment() {
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
    const [imgNatural, setImgNatural] = useState({ width: 0, height: 0 });
    const [blink, setBlink] = useState(true);

    const [adminMessages, setAdminMessages] = useState<any[]>([]);
    const [showAdminMessages, setShowAdminMessages] = useState(false);
    const nav = useNavigation<any>();

    useEffect(() => {
        // subscribe to messages for current user
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const unsub = listenAdminPushesForUser(uid, (list) => {
            setAdminMessages(list);
        });
        return () => { if (typeof unsub === 'function') unsub(); };
    }, [auth.currentUser?.uid]);

    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number | null>(null);
    const [pointsData, setPointsData] = useState<{ x:number; y:number; name?:string }[]>([]);

    const uid = auth.currentUser?.uid;

    useEffect(() => {
        const interval = setInterval(() => setBlink((p) => !p), 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!uid) return;
        setLoading(true);

        const now = new Date();
        // Query: only check visibleTo >= now (reduces to 2-field index)
        // visibleFrom check done in JS to avoid 3-field index requirement
        const q = query(collection(db, 'user_schedules'), where('userId', '==', uid), where('visibleTo', '>=', now));
        const unsub = onSnapshot(q, (snap) => {
            setLoading(false);
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
                // Client-side filtering for visibleFrom
                if (item.visibleFrom && item.visibleFrom > now) return false;
                // Filter out schedules where the `to` time has passed (expired)
                if (item.to && item.to < now) return false;
                return true;
            });
            setSchedules(list);
            if (selectedScheduleIndex !== null) {
                if (!list[selectedScheduleIndex]) {
                    setSelectedScheduleIndex(null);
                    setPointsData([]);
                    setHighlightIndex(null);
                } else {
                    setPointsData(list[selectedScheduleIndex].points || []);
                }
            }
        }, () => { setLoading(false); });
        return unsub;
    }, [uid, selectedScheduleIndex]);

    const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899'];

    const selectSchedule = (idx:number) => {
        setSelectedScheduleIndex(idx);
        const sch = schedules[idx];
        setPointsData((sch && sch.points) ? sch.points : []);
        setHighlightIndex(null);
    };

    const handleNext = () => {
        if (!pointsData || pointsData.length === 0) return;
        setHighlightIndex((prev) => prev === null ? 0 : (prev + 1) % pointsData.length);
    };

    const handlePrevious = () => {
        if (!pointsData || pointsData.length === 0) return;
        setHighlightIndex((prev) => prev === null ? pointsData.length - 1 : (prev - 1 + pointsData.length) % pointsData.length);
    };

    const onImageLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        setImgLayout({ width, height });
    };

    const onImageLoad = (e: any) => {
        const { width, height } = e.nativeEvent.source;
        setImgNatural({ width, height });
    };

    const getPointPosition = (p: { x: number; y: number }) => {
        const { width: containerW, height: containerH } = imgLayout;
        const { width: imgW, height: imgH } = imgNatural;
        if (containerW === 0 || containerH === 0 || imgW === 0 || imgH === 0) return { cx: 0, cy: 0 };
        const scale = Math.min(containerW / imgW, containerH / imgH);
        const realImgW = imgW * scale;
        const realImgH = imgH * scale;
        const offsetX = (containerW - realImgW) / 2;
        const offsetY = (containerH - realImgH) / 2;
        return { cx: offsetX + p.x * realImgW, cy: offsetY + p.y * realImgH };
    };

    const currentPoint = highlightIndex !== null ? pointsData[highlightIndex] : null;

    const formatTime = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={{ width: '100%', paddingHorizontal: 16, marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 999 }}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                        // debug: confirm press
                        Alert.alert('Debug', 'Message icon pressed');
                        if (!adminMessages || adminMessages.length === 0) {
                            Alert.alert('Messages', 'No messages from admin');
                            return;
                        }
                        nav.navigate('AdminPushedMessages');
                    }}
                    style={{ padding: 12, borderRadius: 20, backgroundColor: 'transparent' }}
                >
                    <Ionicons name="chatbubble-ellipses-outline" size={24} color="#e5e7eb" />
                </TouchableOpacity>
            </View>

            {showAdminMessages && (
                <View style={[styles.adminMsgPanel, { elevation: 10 }] } pointerEvents="auto">
                    <ScrollView style={{ maxHeight: 240, padding: 12 }} keyboardShouldPersistTaps="handled">
                        {adminMessages.length === 0 ? (
                            <Text style={{ color: '#94a3b8' }}>No messages from admin.</Text>
                        ) : (
                            adminMessages.map((m) => (
                                <View key={m.id} style={{ backgroundColor: '#0f1724', padding: 10, borderRadius: 8, marginBottom: 8 }}>
                                    <Text style={{ color: '#e5e7eb' }}>{m.adminName ? `${m.adminName}: ` : ''}{m.message}</Text>
                                    <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 12 }}>{new Date(m.createdAt).toLocaleString()}</Text>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}

            <View style={styles.imageWrapper}>
                <View onLayout={onImageLayout} style={styles.imageContainer}>
                    <Image source={require('@/assets/images/human-info.jpg')} style={styles.image} resizeMode="contain" onLoad={onImageLoad} />
                    {imgLayout.width > 0 && imgLayout.height > 0 && (
                        <Svg style={StyleSheet.absoluteFill} width={imgLayout.width} height={imgLayout.height}>
                            {pointsData.map((p, index) => {
                                const { cx, cy } = getPointPosition(p);
                                const isActive = index === highlightIndex;
                                return (
                                    <Circle key={index} cx={cx} cy={cy} r={isActive && blink ? 3 : 2} fill={isActive && blink ? (colors[selectedScheduleIndex ?? 0] || '#22c55e') : '#e5e7eb'} opacity={0.9} />
                                );
                            })}
                        </Svg>
                    )}
                </View>
            </View>

            <ScrollView horizontal contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }} style={styles.paletteRow} showsHorizontalScrollIndicator={false}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#94a3b8" />
                    </View>
                ) : schedules.length > 0 ? (
                    schedules.map((sch, idx) => (
                        <TouchableOpacity key={sch.id || idx} onPress={() => selectSchedule(idx)} style={[styles.colorDot, selectedScheduleIndex === idx ? styles.colorDotActive : null, { backgroundColor: colors[idx % colors.length] }]} />
                    ))
                ) : (
                    <Text style={styles.noSchedulesText}>No special points scheduled</Text>
                )}
            </ScrollView>

            <View style={styles.infoRow}>
                {selectedScheduleIndex !== null && schedules[selectedScheduleIndex] && (
                    <Text style={styles.selectedTimeText}>{formatTime(schedules[selectedScheduleIndex].from)} - {formatTime(schedules[selectedScheduleIndex].to)}</Text>
                )}
                {currentPoint && (
                    <Text style={styles.coordinateText}>
                        {currentPoint.name ? `${currentPoint.name} — ` : ''} Coordinates: x = {currentPoint.x}, y = {currentPoint.y}
                    </Text>
                )}
            </View>

            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.navButton} onPress={handlePrevious}><Text style={styles.navText}>Prev</Text></TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={handleNext}><Text style={styles.navText}>Next</Text></TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b0d12', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: 24, paddingTop: 12 },
    imageWrapper: { height: '60%', justifyContent: 'center', alignItems: 'center', width: '100%' },
    imageContainer: { width: '90%', aspectRatio: 0.5, alignItems: 'center', justifyContent: 'center' },
    image: { width: '100%', height: '100%' },
    coordinateText: { marginTop: 12, color: '#fff', fontSize: 14, fontWeight: '500' },
    adminMsgPanel: { position: 'absolute', top: 56, right: 12, left: 12, backgroundColor: '#071025', borderRadius: 10, zIndex: 40, borderWidth: 1, borderColor: '#142032' },
    paletteRow: { height: 64 },
    loadingContainer: { height: 64, alignItems: 'center', justifyContent: 'center' },
    colorDot: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8, borderWidth: 2, borderColor: '#0b0d12' },
    colorDotActive: { borderColor: '#fff' },
    noSchedulesText: { color: '#94a3b8' },
    selectedTimeText: { color: '#fff', marginTop: 8, fontWeight: '700' },
    infoRow: { width: '100%', alignItems: 'center', marginTop: 8 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '60%', marginTop: 12, marginBottom: 12 },
    navButton: { backgroundColor: '#22c55e', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    navText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    closeButton: { backgroundColor: '#ef4444', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, marginBottom: 20 },
    closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
