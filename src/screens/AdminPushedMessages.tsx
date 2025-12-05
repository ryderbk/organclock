import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, FlatList, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '@/config/firebase';
import { listenAdminPushesForUser } from '@/services/messageService';

export default function AdminPushedMessages() {
    const nav = useNavigation<any>();
    const [messages, setMessages] = useState<any[]>([]);
    const userId = auth.currentUser?.uid;

    useEffect(() => {
        if (!userId) return;
        const unsub = listenAdminPushesForUser(userId, (list) => setMessages(list));
        return unsub;
    }, [userId]);

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <View style={s.headerRow}>
                    <Text style={s.title}>Messages from Admin</Text>
                    <Pressable onPress={() => nav.goBack()} style={s.closeBtn}>
                        <Text style={s.closeText}>Close</Text>
                    </Pressable>
                </View>

                <FlatList
                    data={messages}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                        <View style={s.item}>
                            <Text style={s.admin}>{item.adminName || 'Admin'}</Text>
                            <Text style={s.msg}>{item.message}</Text>
                            <Text style={s.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={s.empty}>No messages from admin.</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { padding: 16, flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    title: { color: '#e5e7eb', fontSize: 18, fontWeight: '800' },
    closeBtn: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
    closeText: { color: '#fff', fontWeight: '700' },
    item: { backgroundColor: '#121622', padding: 12, borderRadius: 10, marginBottom: 10 },
    admin: { color: '#94a3b8', fontWeight: '700', marginBottom: 6 },
    msg: { color: '#e5e7eb' },
    meta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
    empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
