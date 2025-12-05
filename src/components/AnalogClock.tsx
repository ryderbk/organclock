import React, { useEffect, useMemo, useState } from 'react';
import Svg, { Circle, Line, Image, ClipPath, Defs } from 'react-native-svg';
import { View, Text, StyleSheet, Dimensions, SafeAreaView } from 'react-native';

export default function AnalogClock({
                                        size = Math.min(Dimensions.get('window').width * 0.9, Dimensions.get('window').height * 0.6),
                                    }: {
    size?: number;
}) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const i = setInterval(() => setNow(new Date()), 100);
        return () => clearInterval(i);
    }, []);

    const { secAngle, minAngle, hourAngle } = useMemo(() => {
        const ms = now.getMilliseconds();
        const s = now.getSeconds() + ms / 1000;
        const m = now.getMinutes() + s / 60;
        const h = (now.getHours() % 12) + m / 60;
        return {
            secAngle: (Math.PI / 30) * s,
            minAngle: (Math.PI / 30) * m,
            hourAngle: (Math.PI / 6) * h,
        };
    }, [now]);

    const r = size / 2;
    const cx = r,
        cy = r;

    const hand = (angle: number, length: number, stroke: string, width: number) => (
        <Line
            x1={cx}
            y1={cy}
            x2={cx + length * Math.sin(angle)}
            y2={cy - length * Math.cos(angle)}
            stroke={stroke}
            strokeWidth={width}
            strokeLinecap="round"
        />
    );

    return (
        <SafeAreaView style={styles.safe}>
            <View style={[styles.center, styles.container]}>
                <Svg width={size} height={size}>
                    <Defs>
                        <ClipPath id="circleClip">
                            <Circle cx={cx} cy={cy} r={r - 6} />
                        </ClipPath>
                    </Defs>

                    {/* Background Image */}
                    <Image
                        href={require('../assets/images/organ-clock.png')}
                        width={size}
                        height={size}
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="url(#circleClip)"
                    />

                    {/* Hands */}
                    {hand(hourAngle, r * 0.45, '#e5e7eb', 6)}
                    {hand(minAngle, r * 0.65, '#a5b4fc', 4)}
                    {hand(secAngle, r * 0.75, '#ef4444', 2)}

                    {/* Center Dot */}
                    <Circle cx={cx} cy={cy} r={6} fill="#e5e7eb" />
                </Svg>

                {/* Digital Time & Date */}
                <Text style={styles.time}>{now.toLocaleTimeString()}</Text>
                <Text style={styles.date}>{now.toDateString()}</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0b0d12',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    center: {
        alignItems: 'center',
    },
    time: {
        color: '#e5e7eb',
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
    },
    date: {
        color: '#94a3b8',
        marginTop: 4,
    },
});
