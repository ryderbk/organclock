import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BellIcon({ count = 0, onPress }: { count?: number; onPress?: () => void }) {
    return (
        <Pressable style={s.wrap} onPress={onPress}>
            <Ionicons name="notifications-outline" size={24} color="#e5e7eb" />
            {count > 0 && (
                <View style={s.badge}>
                    <Text style={s.badgeText}>{count}</Text>
                </View>
            )}
        </Pressable>
    );
}

const s = StyleSheet.create({
    wrap: { padding: 6 },
    badge: { position: 'absolute', right: 0, top: -4, backgroundColor: '#ef4444', minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
