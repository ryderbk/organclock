import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, FlatList, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '@/config/firebase';
import { listenAdminMessagesGrouped } from '@/services/messageService';

export default function AdminMessageList() {
    const nav = useNavigation<any>();
    const adminId = auth.currentUser?.uid;
    const [grouped, setGrouped] = useState<any[]>([]);

    useEffect(() => {
        if (!adminId) return;
        const unsub = listenAdminMessagesGrouped(adminId, (g) => setGrouped(g));
        return unsub;
    }, [adminId]);

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Requests</Text>
                <FlatList
                    data={grouped}
                    keyExtractor={(i) => i.userId}
                    renderItem={({ item }) => (
                        <Pressable style={s.userRow} onPress={() => nav.navigate('AdminMessageDetail', { userId: item.userId, name: item.name, email: item.email })}>
                            <View>
                                <Text style={s.name}>{item.name || '(no name)'}</Text>
                                <Text style={s.email}>{item.email}</Text>
                            </View>
                            <Text style={s.count}>{item.count}</Text>
                        </Pressable>
                    )}
                    ListEmptyComponent={<Text style={s.empty}>No requests.</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { padding: 16, flex: 1 },
    title: { color: '#e5e7eb', fontSize: 18, fontWeight: '800', marginBottom: 8 },
    userRow: { backgroundColor: '#121622', padding: 12, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    name: { color: '#e5e7eb', fontWeight: '700' },
    email: { color: '#94a3b8', marginTop: 4 },
    count: { color: '#fff', backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, fontWeight: '700' },
    empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
