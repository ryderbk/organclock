import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet, FlatList, Pressable, Alert, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { db } from '@/config/firebase';
import { auth } from '@/config/firebase';
import { onSnapshot, orderBy, query, where, collection, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminSubUsers() {
    const adminId = auth.currentUser?.uid;
    const [users, setUsers] = useState<any[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!adminId) return;
        const q = query(collection(db, 'users'), where('adminId', '==', adminId), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
            setLoading(false);
        }, (err) => {
            console.warn('Failed to subscribe to sub-users', err);
            setLoading(false);
        });
        return unsub;
    }, [adminId]);

    const confirmDelete = (id: string, name?: string) => {
        Alert.alert(
            'Delete sub-user',
            `Are you sure you want to delete ${name || 'this user'}? This will prevent them from signing in.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteSubUser(id) },
            ]
        );
    };

    const deleteSubUser = async (id: string) => {
        if (!id) return;
        try {
            setDeletingId(id);
            const userRef = doc(db, 'users', id);
            await updateDoc(userRef, {
                disabled: true,
                adminId: null,
                deletedAt: serverTimestamp(),
            });
            // If you have a backend/cloud function that revokes user's auth tokens or deletes the auth user,
            // call it here. Updating the users collection will cause the app to sign out disabled users (see RootNavigator).
        } catch (err) {
            Alert.alert('Error', 'Failed to delete sub-user.');
            console.error(err);
        } finally {
            setDeletingId(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={s.item}>
            <View>
                <Text style={s.itemTitle}>{item.name || '(no name)'} </Text>
                <Text style={s.itemMuted}>{item.email}</Text>
            </View>

            <Pressable
                onPress={() => confirmDelete(item.id, item.name)}
                disabled={deletingId === item.id}
                style={deletingId === item.id ? [s.deleteBtn, s.btnDisabled] : s.deleteBtn}
            >
                <Text style={s.deleteText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Sub Users</Text>
                <Text style={s.muted}>List of users linked to your admin account.</Text>

                <FlatList
                    style={{ marginTop: 24 }}
                    data={users}
                    keyExtractor={(i) => i.id}
                    renderItem={renderItem}
                    ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                    ListEmptyComponent={() => (
                        loading ? (
                            <View style={{ paddingVertical: 24 }}>
                                <ActivityIndicator size="small" color="#94a3b8" />
                            </View>
                        ) : (
                            <Text style={s.muted}>No sub users yet.</Text>
                        )
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0 },
    wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
    title: { color: '#e5e7eb', fontSize: 22, fontWeight: '800' },
    muted: { color: '#94a3b8', marginTop: 4, marginBottom: 12 },
    item: { backgroundColor: '#121622', borderRadius: 12, borderWidth: 1, borderColor: '#1f2937', padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemTitle: { color: '#e5e7eb', fontWeight: '600' },
    itemMuted: { color: '#94a3b8', marginTop: 2 },
    deleteBtn: { backgroundColor: '#7f1d1d', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
    deleteText: { color: '#fff', fontWeight: '600' },
    btnDisabled: { opacity: 0.6 },
});
