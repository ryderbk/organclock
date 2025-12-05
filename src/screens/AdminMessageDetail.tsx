import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { auth } from '@/config/firebase';
import { listenMessagesForUser, deleteMessageById } from '@/services/messageService';

export default function AdminMessageDetail() {
    const nav = useNavigation<any>();
    const route = useRoute<any>();
    const { userId, name, email } = route.params || {};
    const adminId = auth.currentUser?.uid;
    const [messages, setMessages] = useState<any[]>([]);

    useEffect(() => {
        if (!adminId || !userId) return;
        const unsub = listenMessagesForUser(adminId, userId, (list) => setMessages(list));
        return unsub;
    }, [adminId, userId]);

    const handleResolve = (id: string) => {
        Alert.alert('Resolve', 'Mark as resolved and remove?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resolve', style: 'default', onPress: async () => { await deleteMessageById(id); } },
        ]);
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>{name || '(no name)'} — {email}</Text>
                <FlatList
                    data={messages}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                        <View style={s.item}>
                            <Text style={s.msg}>{item.message}</Text>
                            <Text style={s.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                            <View style={{ flexDirection: 'row', marginTop: 8 }}>
                                <Pressable style={[s.action, { backgroundColor: '#4f46e5' }]} onPress={() => nav.navigate('AdminSpecialPoints', { selectedUserId: userId })}>
                                    <Text style={s.actionText}>Add PT</Text>
                                </Pressable>
                                <Pressable style={[s.action, { backgroundColor: '#16a34a', marginLeft: 8 }]} onPress={() => handleResolve(item.id)}>
                                    <Text style={s.actionText}>Resolve</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={s.empty}>No messages for this user.</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { padding: 16, flex: 1 },
    title: { color: '#e5e7eb', fontSize: 16, fontWeight: '800', marginBottom: 12 },
    item: { backgroundColor: '#121622', padding: 12, borderRadius: 10, marginBottom: 10 },
    msg: { color: '#e5e7eb' },
    meta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
    action: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
    actionText: { color: '#fff', fontWeight: '700' },
    empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
