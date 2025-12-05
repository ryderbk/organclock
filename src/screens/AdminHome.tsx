import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, Pressable, Platform, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function AdminHome() {
    const nav = useNavigation<any>();
    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Admin Home</Text>
                <Text style={s.muted}>This is a placeholder admin dashboard.</Text>
                <Pressable onPress={() => nav.navigate('AdminSubUsers')} style={s.btn}>
                    <Text style={s.btnText}>Manage Sub Users</Text>
                </Pressable>

                <Pressable onPress={() => nav.navigate('AdminLivePoints')} style={[s.btn, { marginTop: 12, backgroundColor: '#06b6d4', borderColor: '#06b6d4' }]}>
                    <Text style={s.btnText}>Live Treatment Points</Text>
                </Pressable>

                <Pressable onPress={() => nav.navigate('AdminSpecialPoints')} style={[s.btn, { marginTop: 12, backgroundColor: '#0ea5e9', borderColor: '#0ea5e9' }]}>
                    <Text style={s.btnText}>Special Treatment Points</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
    title: { color: '#e5e7eb', fontSize: 22, fontWeight: '800', marginBottom: 8 },
    muted: { color: '#94a3b8', marginBottom: 24 },
    btn: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#4f46e5' },
    btnText: { color: '#fff', fontWeight: '600' },
});
