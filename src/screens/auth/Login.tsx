import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function Login() {
    const nav = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const emailEmpty = attempted && email.trim().length === 0;
    const passwordEmpty = attempted && password.length === 0;
    const disable = loading;

    const onLogin = async () => {
        setAttempted(true);
        setAuthError('');
        if (email.trim().length === 0 || password.length === 0) return;
        try {
            setLoading(true);
            await signInWithEmailAndPassword(auth, email.trim(), password);
        } catch (e: any) {
            const code: string = e?.code || '';
            const invalid =
                code.includes('invalid-credential') ||
                code.includes('wrong-password') ||
                code.includes('user-not-found') ||
                code.includes('invalid-email');
            setAuthError(invalid ? 'Invalid email or password' : (e?.message || 'Unable to sign in'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.heading}>Welcome Back</Text>

                {authError ? (
                    <View style={s.errorBanner}>
                        <Text style={s.errorBannerText}>{authError}</Text>
                    </View>
                ) : null}

                <Text style={s.muted}>Email</Text>
                <TextInput
                    value={email}
                    onChangeText={(t) => {
                        setEmail(t);
                        if (authError) setAuthError('');
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                    placeholder={emailEmpty ? 'Email required' : 'you@example.com'}
                    placeholderTextColor={emailEmpty ? '#ef4444' : '#6b7280'}
                    style={[s.input, emailEmpty && s.inputError]}
                />

                <Text style={[s.muted, { marginTop: 16 }]}>Password</Text>
                <View style={s.inputWrap}>
                    <TextInput
                        value={password}
                        onChangeText={(t) => {
                            setPassword(t);
                            if (authError) setAuthError('');
                        }}
                        secureTextEntry={!showPassword}
                        autoComplete="password"
                        textContentType="password"
                        placeholder={passwordEmpty ? 'Password required' : '••••••••'}
                        placeholderTextColor={passwordEmpty ? '#ef4444' : '#6b7280'}
                        style={[s.input, s.inputWithIcon, passwordEmpty && s.inputError]}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Hold to show password"
                        onPressIn={() => setShowPassword(true)}
                        onPressOut={() => setShowPassword(false)}
                        hitSlop={8}
                        style={s.eyeBtn}
                    >
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                    </Pressable>
                </View>

                <Pressable onPress={onLogin} disabled={disable} style={[s.btn, { backgroundColor: disable ? '#374151' : '#4f46e5' }]}>
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
    inputError: { borderColor: '#ef4444' },
    inputWrap: { position: 'relative' },
    inputWithIcon: { paddingRight: 44 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 28 },
    btn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#ffffff', fontWeight: '600' },
    errorBanner: { backgroundColor: '#0b0d12', borderWidth: 1, borderColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 16 },
    errorBannerText: { color: '#ef4444' },
});
