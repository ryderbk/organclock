import React from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SpecialTreatmentMenu() {
    const nav = useNavigation<any>();
    return (
        <SafeAreaView style={s.safe}>
            <View style={s.container}>
                <Text style={s.title}>Special Treatment</Text>
                <View style={{ height: 18 }} />
                <Pressable style={s.btn} onPress={() => nav.navigate('RequestTreatment')}>
                    <Text style={s.btnText}>Request Treatment</Text>
                </Pressable>
                <Pressable style={s.btn} onPress={() => nav.navigate('SpecialTreatment')}>
                    <Text style={s.btnText}>Special Treatment PT</Text>
                </Pressable>
                <Pressable style={s.btn} onPress={() => nav.navigate('RequestedMessages')}>
                    <Text style={s.btnText}>Requested Msg</Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
    title: { color: '#e5e7eb', fontSize: 20, fontWeight: '800', marginBottom: 12 },
    btn: { width: '80%', paddingVertical: 14, backgroundColor: '#4f46e5', borderRadius: 12, alignItems: 'center', marginVertical: 8 },
    btnText: { color: '#fff', fontWeight: '700' },
});
