import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function Register() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert('Registration failed', e.message ?? 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.heading}>Create Account</Text>

        <Text style={s.muted}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
        />

        <Text style={[s.muted, { marginTop: 16 }]}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={s.input}
        />

        <Pressable onPress={onRegister} disabled={loading} style={[s.btn, { backgroundColor: loading ? '#374151' : '#4f46e5' }]}>
          <Text style={s.btnText}>{loading ? 'Creating...' : 'Sign Up'}</Text>
        </Pressable>

        <Pressable onPress={() => nav.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#818cf8' }}>Back to sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0d12' },
  wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 24, justifyContent: 'center' },
  heading: { color: '#e5e7eb', fontSize: 28, fontWeight: '800', marginBottom: 32 },
  muted: { color: '#94a3b8', marginBottom: 8 },
  input: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 16, color: '#e5e7eb' },
  btn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: '600' },
});
