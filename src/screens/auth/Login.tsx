import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';

export default function Login() {
  const nav = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login failed', e.message ?? 'Check your credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.heading}>Welcome Back</Text>

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

        <Pressable onPress={onLogin} disabled={loading} style={[s.btn, { backgroundColor: loading ? '#374151' : '#4f46e5' }]}>
          <Text style={s.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </Pressable>

        <Pressable onPress={() => nav.navigate('Register' as never)} style={{ marginTop: 16 }}>
          <Text style={{ color: '#818cf8' }}>Create an account</Text>
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
