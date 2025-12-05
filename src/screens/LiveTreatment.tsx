// import React, { useState, useEffect } from 'react';
import {View, Image, TouchableOpacity, StyleSheet, Text, LayoutChangeEvent, ScrollView} from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { ActivityIndicator } from 'react-native';
// Points will be loaded dynamically from the current user's livePointsSchedules field (populated by admin)

export default function LiveTreatment() {
    const [loading, setLoading] = useState(true);
    const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
    const [imgLayout, setImgLayout] = useState({ width: 0, height: 0 });
    const [imgNatural, setImgNatural] = useState({ width: 0, height: 0 });
    const [blink, setBlink] = useState(true);

    const [schedules, setSchedules] = useState<any[]>([]);
    const [selectedScheduleIndex, setSelectedScheduleIndex] = useState<number | null>(null);
    const [pointsData, setPointsData] = useState<{ x:number; y:number; name?:string }[]>([]);

    const uid = auth.currentUser?.uid;

    // Toggle blink every 500ms
    useEffect(() => {
        const interval = setInterval(() => {
            setBlink((prev) => !prev);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Subscribe to current user's doc to read schedules pushed by admin
    useEffect(() => {
        if (!uid) return;
        const uRef = doc(db, 'users', uid);
        const unsub = onSnapshot(uRef, (snap) => {
            setLoading(false);
            if (!snap.exists()) {
                setSchedules([]);
                setPointsData([]);
                setSelectedScheduleIndex(null);
                return;
            }
            const data = snap.data() as any;
            const sch = data.livePointsSchedules || [];
            setSchedules(sch);
            if (selectedScheduleIndex !== null) {
                if (!sch[selectedScheduleIndex]) {
                    setSelectedScheduleIndex(null);
                    setPointsData([]);
                    setHighlightIndex(null);
                } else {
                    setPointsData(sch[selectedScheduleIndex].points || []);
                }
            }
        }, (err) => {
            setLoading(false);
            console.warn('failed to subscribe to user schedules', err);
        });
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
        setHighlightIndex((prev) =>
            prev === null ? 0 : (prev + 1) % pointsData.length
        );
    };

    const handlePrevious = () => {
        if (!pointsData || pointsData.length === 0) return;
        setHighlightIndex((prev) =>
            prev === null ? pointsData.length - 1 : (prev - 1 + pointsData.length) % pointsData.length
        );
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

        if (containerW === 0 || containerH === 0 || imgW === 0 || imgH === 0) {
            return { cx: 0, cy: 0 };
        }

        const scale = Math.min(containerW / imgW, containerH / imgH);
        const realImgW = imgW * scale;
        const realImgH = imgH * scale;
        const offsetX = (containerW - realImgW) / 2;
        const offsetY = (containerH - realImgH) / 2;

        const cx = offsetX + p.x * realImgW;
        const cy = offsetY + p.y * realImgH;

        return { cx, cy };
    };

    const currentPoint = highlightIndex !== null ? pointsData[highlightIndex] : null;

    const formatTime = (iso?: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <View style={styles.imageWrapper}>
                <View onLayout={onImageLayout} style={styles.imageContainer}>
                    <Image
                        source={require('@/assets/images/human-info.jpg')}
                        style={styles.image}
                        resizeMode="contain"
                        onLoad={onImageLoad}
                    />
                    {imgLayout.width > 0 && imgLayout.height > 0 && (
                        <Svg
                            style={StyleSheet.absoluteFill}
                            width={imgLayout.width}
                            height={imgLayout.height}
                        >
                            {pointsData.map((p, index) => {
                                const { cx, cy } = getPointPosition(p);
                                const isActive = index === highlightIndex;
                                return (
                                    <Circle
                                        key={index}
                                        cx={cx}
                                        cy={cy}
                                        r={isActive && blink ? 3 : 2}
                                        fill={isActive && blink ? (colors[selectedScheduleIndex ?? 0] || '#22c55e') : '#e5e7eb'}
                                        opacity={0.9}
                                    />
                                );
                            })}
                        </Svg>
                    )}
                </View>
            </View>

            {/* Palette - horizontal scrollable circles */}
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
                    <Text style={styles.noSchedulesText}>No live schedules</Text>
                )}
            </ScrollView>

            {/* Show selected schedule time below image (fixed area) */}
            <View style={styles.infoRow}>
                {selectedScheduleIndex !== null && schedules[selectedScheduleIndex] && (
                    <Text style={styles.selectedTimeText}>{formatTime(schedules[selectedScheduleIndex].from)} - {formatTime(schedules[selectedScheduleIndex].to)}</Text>
                )}

                {/* Coordinates text (fixed) */}
                {currentPoint && (
                    <Text style={styles.coordinateText}>
                        {currentPoint.name ? `${currentPoint.name} — ` : ''} Coordinates: x = {currentPoint.x}, y = {currentPoint.y}
                    </Text>
                )}
            </View>

            {/* Navigation buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.navButton} onPress={handlePrevious}>
                    <Text style={styles.navText}>Prev</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navButton} onPress={handleNext}>
                    <Text style={styles.navText}>Next</Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0d12',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingBottom: 24,
        paddingTop: 12,
    },
    imageWrapper: {
        height: '60%',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    imageContainer: {
        width: '90%',
        aspectRatio: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    coordinateText: {
        marginTop: 12,
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    paletteRow: { height: 64 },
    loadingContainer: { height: 64, alignItems: 'center', justifyContent: 'center' },
    colorDot: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8, borderWidth: 2, borderColor: '#0b0d12' },
    colorDotActive: { borderColor: '#fff' },
    noSchedulesText: { color: '#94a3b8' },
    selectedTimeText: { color: '#fff', marginTop: 8, fontWeight: '700' },
    infoRow: { width: '100%', alignItems: 'center', marginTop: 8 },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '60%',
        marginTop: 12,
        marginBottom: 12,
    },
    navButton: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    navText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        marginBottom: 20,
    },
    closeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});





// import cv2
// import numpy as np
// import json
//
// # === CONFIGURATION ===
// INPUT_IMAGE = "human-info.jpg"
// OUTPUT_IMAGE = "output_with_points.jpg"
// OUTPUT_JSON = "points.json"
//
// # === STEP 1: Load and preprocess ===
// img = cv2.imread(INPUT_IMAGE)
// if img is None:
//     raise FileNotFoundError(f"Image not found: {INPUT_IMAGE}")
//
// gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
//
// # Optional: define a body mask (exclude labels/text areas)
// # Here, you can manually define a polygon around the body
// # Example: polygon coordinates (x, y) of body region
// h, w = gray.shape
// body_mask = np.zeros((h, w), dtype=np.uint8)
// body_polygon = np.array([
//     [int(0.1*w), int(0.1*h)],
//     [int(0.9*w), int(0.1*h)],
//     [int(0.9*w), int(0.95*h)],
//     [int(0.1*w), int(0.95*h)]
// ])
// cv2.fillPoly(body_mask, [body_polygon], 255)
//
// # Invert because lines are black
// inv = cv2.bitwise_not(gray)
//
// # Adaptive threshold to isolate thin lines
// thresh = cv2.adaptiveThreshold(inv, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
//     cv2.THRESH_BINARY, 11, 2)
//
// # Optional morphological operations to refine
// kernel = np.ones((2, 2), np.uint8)
// thin = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
//
// # Mask out areas outside body
// thin = cv2.bitwise_and(thin, body_mask)
//
// # === STEP 2: Edge and contour detection ===
// edges = cv2.Canny(thin, 50, 150)
// contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
//
// points = []
//
// MIN_DIST = 15  # minimum distance between points in pixels
//
// def is_far_enough(px, py):
// for pt in points:
// dx = px - pt['px']
// dy = py - pt['py']
// if np.hypot(dx, dy) < MIN_DIST:
// return False
// return True
//
// for cnt in contours:
// if len(cnt) < 5:
// continue
// x, y, ww, hh = cv2.boundingRect(cnt)
// if ww > 80 or hh > 80 or (ww < 5 and hh < 5):
// continue
//
// # Approximate endpoints (min and max points)
// xs = cnt[:, 0, 0]
// ys = cnt[:, 0, 1]
// tip_candidates = [(xs.min(), ys[xs.argmin()]), (xs.max(), ys[xs.argmax()])]
//
// for (px, py) in tip_candidates:
//     if is_far_enough(px, py):
// points.append({
//     "x": round(px / w, 4),
//     "y": round(py / h, 4),
//     "px": px,  # store for distance check
// "py": py
// })
// cv2.circle(img, (int(px), int(py)), 3, (0, 0, 255), -1)
//
// # Remove temporary pixel coordinates before saving JSON
// for pt in points:
// pt.pop('px')
// pt.pop('py')
//
// # === STEP 3: Save outputs ===
// cv2.imwrite(OUTPUT_IMAGE, img)
// with open(OUTPUT_JSON, "w") as f:
// json.dump(points, f, indent=2)
//
// print(f"✅ Detection complete!\nPoints saved to {OUTPUT_JSON}\nPreview saved to {OUTPUT_IMAGE}")
// print(f"Total points detected: {len(points)}")
