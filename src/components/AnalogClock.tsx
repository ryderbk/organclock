import React, { useEffect, useMemo, useState } from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { View, Text, StyleSheet } from 'react-native';

export default function AnalogClock({ size = 260 }: { size?: number }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const { secAngle, minAngle, hourAngle } = useMemo(() => {
    const s = now.getSeconds();
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    return {
      secAngle: (Math.PI / 30) * s,
      minAngle: (Math.PI / 30) * m,
      hourAngle: (Math.PI / 6) * h,
    };
  }, [now]);

  const r = size / 2;
  const cx = r, cy = r;

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
    <View style={styles.center}>
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={r - 6} stroke="#1f2937" strokeWidth={6} fill="#121622" />
        {[...Array(60)].map((_, i) => {
          const a = (Math.PI / 30) * i;
          const inner = i % 5 === 0 ? r - 20 : r - 12;
          const outer = r - 6;
          return (
            <Line
              key={i}
              x1={cx + inner * Math.sin(a)}
              y1={cy - inner * Math.cos(a)}
              x2={cx + outer * Math.sin(a)}
              y2={cy - outer * Math.cos(a)}
              stroke={i % 5 === 0 ? '#e5e7eb' : '#374151'}
              strokeWidth={i % 5 === 0 ? 3 : 1}
            />
          );
        })}
        {hand(hourAngle, r * 0.45, '#e5e7eb', 6)}
        {hand(minAngle, r * 0.65, '#a5b4fc', 4)}
        {hand(secAngle, r * 0.75, '#ef4444', 2)}
        <Circle cx={cx} cy={cy} r={4} fill="#6366f1" />
      </Svg>
      <Text style={styles.time}>{now.toLocaleTimeString()}</Text>
      <Text style={styles.date}>{now.toDateString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  time: { color: '#e5e7eb', marginTop: 16, fontSize: 18, fontWeight: '600' },
  date: { color: '#94a3b8', marginTop: 4 },
});
