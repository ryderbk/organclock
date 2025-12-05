import React, { useState } from 'react';
import { SafeAreaView, View, TextInput, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { auth } from '@/config/firebase';
import { sendMessageForSpecial } from '@/services/messageService';

export default function RequestTreatment() {
    const nav = useNavigation<any>();
    const [text, setText] = useState('');
    const user = auth.currentUser;

    const handleSend = async () => {
        if (!user) return Alert.alert('Not signed in');
        if (!text.trim()) return Alert.alert('Empty', 'Please enter a message');
        try {
            // send message; service will resolve adminId from user record
            await sendMessageForSpecial({ userId: user.uid, message: text.trim(), userName: user.displayName || user.email || '' });
            Alert.alert('Sent', 'Your request has been sent to admin');
            setText('');
            nav.goBack();
        } catch (err) {
            console.error('send err', err);
            Alert.alert('Error', 'Failed to send message');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.title}>Request Special Treatment</Text>
                <TextInput
                    multiline
                    placeholder="Describe your request"
                    placeholderTextColor="#6b7280"
                    value={text}
                    onChangeText={setText}
                    style={s.input}
                />
                <View style={s.row}>
                    <Pressable style={[s.action, { backgroundColor: '#7f1d1d' }]} onPress={() => nav.goBack()}>
                        <Text style={s.actionText}>Cancel</Text>
                    </Pressable>
                    <Pressable style={[s.action, { backgroundColor: '#06b6d4' }]} onPress={handleSend}>
                        <Text style={s.actionText}>Send</Text>
                    </Pressable>
                </View>
                <Pressable style={s.link} onPress={() => nav.navigate('RequestedMessages')}>
                    <Text style={{ color: '#94a3b8' }}>Requested Msg</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    wrap: { padding: 24, flex: 1 },
    title: { color: '#e5e7eb', fontSize: 18, fontWeight: '800', marginBottom: 8 },
    input: { backgroundColor: '#0b1220', color: '#fff', padding: 12, borderRadius: 10, minHeight: 140, textAlignVertical: 'top' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    action: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 6 },
    actionText: { color: '#fff', fontWeight: '700' },
    link: { marginTop: 16, alignItems: 'center' },
});
