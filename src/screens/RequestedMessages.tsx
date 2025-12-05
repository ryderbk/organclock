// import React, { useEffect, useState } from 'react';
import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, FlatList, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { auth } from '@/config/firebase';
import { listenUserRequests, deleteMessageById } from '@/services/messageService';

export default function RequestedMessages() {
    const [messages, setMessages] = useState<any[]>([]);
    const userId = auth.currentUser?.uid;

    useEffect(() => {
        if (!userId) return;
        const unsub = listenUserRequests(userId, (list) => setMessages(list));
        return unsub;
    }, [userId]);

    const handleDelete = (id: string) => {
        Alert.alert('Delete', 'Delete this message?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMessageById(id); } },
        ]);
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Your Requests</Text>
                <FlatList
                    data={messages}
                    keyExtractor={(i) => i.id}
                    renderItem={({ item }) => (
                        <View style={s.item}>
                            <Text style={s.msg}>{item.message}</Text>
                            <Text style={s.meta}>{new Date(item.createdAt).toLocaleString()}</Text>
                            <Pressable style={s.del} onPress={() => handleDelete(item.id)}>
                                <Text style={{ color: '#fff' }}>Delete</Text>
                            </Pressable>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={s.empty}>No requests yet.</Text>}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { padding: 24, flex: 1 },
    title: { color: '#e5e7eb', fontSize: 18, fontWeight: '800', marginBottom: 12 },
    item: { backgroundColor: '#121622', padding: 12, borderRadius: 10, marginBottom: 10 },
    msg: { color: '#e5e7eb' },
    meta: { color: '#94a3b8', marginTop: 6, fontSize: 12 },
    del: { marginTop: 8, backgroundColor: '#ef4444', paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    empty: { color: '#94a3b8', textAlign: 'center', marginTop: 24 },
});
