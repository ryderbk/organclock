import React from 'react';
import { SafeAreaView, View, Text, Pressable, StyleSheet } from 'react-native';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const email = auth.currentUser?.email;

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.title}>Profile</Text>
        <View style={s.card}>
          <Text style={s.muted}>Signed in as</Text>
          <Text style={s.email}>{email}</Text>
        </View>
        <Pressable onPress={() => signOut(auth)} style={s.signout}>
          <Text style={s.signoutText}>Sign Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0d12' },
  wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
  title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 16 },
  muted: { color: '#94a3b8' },
  email: { color: '#e5e7eb', fontSize: 18, fontWeight: '600', marginTop: 4 },
  signout: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', backgroundColor: '#ef4444' },
  signoutText: { color: '#ffffff', fontWeight: '600' },
});
