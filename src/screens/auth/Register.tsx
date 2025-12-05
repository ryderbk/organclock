import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/config/firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, getDocs, getDoc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';

export default function Register() {
    const nav = useNavigation<any>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [attempted, setAttempted] = useState(false);
    const [authError, setAuthError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const emailEmpty = attempted && email.trim().length === 0;
    const passwordEmpty = attempted && password.length === 0;
    const confirmPasswordEmpty = attempted && confirmPassword.length === 0;
    const nameEmpty = attempted && name.trim().length === 0;
    const adminEmailEmpty = attempted && adminEmail.trim().length === 0;

    const onRegister = async () => {
        setAttempted(true);
        setAuthError('');
        if (email.trim().length === 0 || password.length === 0 || name.trim().length === 0 || adminEmail.trim().length === 0) return;
        if (password !== confirmPassword) { setAuthError('Passwords do not match'); return; }
        try {
            setLoading(true);
            const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const uid = cred.user.uid;

            let adminId: string | null = null;
            // adminEmail is required now
            const q = query(collection(db, 'users'), where('email', '==', adminEmail.trim().toLowerCase()), where('role', '==', 'admin'));
            const snap = await getDocs(q);
            const adminDoc = snap.docs[0];
            if (adminDoc) adminId = adminDoc.id;
            else throw new Error('Admin email not found');

            await setDoc(doc(db, 'users', uid), {
                email: email.trim().toLowerCase(),
                name: name.trim(),
                role: 'user',
                adminId: adminId || null,
                createdAt: serverTimestamp(),
            });

            // If registered under an admin, copy their livePointsSchedules into the new user
            try {
                const adminPointsRef = doc(db, 'admin_live_points', adminId);
                const adminSnap = await getDoc(adminPointsRef);
                if (adminSnap && adminSnap.exists()) {
                    const data = adminSnap.data() as any;
                    let schedules = data.schedules || [];
                    // sanitize timestamps (in case older docs used serverTimestamp)
                    schedules = schedules.map((sch: any) => {
                        const s = { ...sch };
                        if (s.createdAt && s.createdAt.toDate) {
                            s.createdAt = s.createdAt.toDate().toISOString();
                        } else if (s.createdAt && typeof s.createdAt === 'object' && s.createdAt.seconds) {
                            s.createdAt = new Date(s.createdAt.seconds * 1000).toISOString();
                        }
                        return s;
                    });
                    await updateDoc(doc(db, 'users', uid), { livePointsSchedules: schedules }).catch(() => null);
                }
            } catch (err) {
                console.warn('Failed to copy admin schedules to new user', err);
            }
        } catch (e: any) {
            const code: string = e?.code || '';
            let msg = e?.message || 'Unable to sign up';
            if (code.includes('email-already-in-use')) msg = 'Email already in use';
            else if (code.includes('invalid-email')) msg = 'Invalid email address';
            else if (code.includes('weak-password')) msg = 'Password is too weak';
            setAuthError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.wrap}>
                <Text style={s.heading}>Create Account</Text>

                {authError ? (
                    <View style={s.errorBanner}>
                        <Text style={s.errorBannerText}>{authError}</Text>
                    </View>
                ) : null}

                <Text style={s.muted}>Name</Text>
                <TextInput
                    value={name}
                    onChangeText={(t) => {
                        setName(t);
                        if (authError) setAuthError('');
                    }}
                    autoCapitalize="words"
                    placeholder={nameEmpty ? 'Name required' : 'Jane Doe'}
                    placeholderTextColor={nameEmpty ? '#ef4444' : '#6b7280'}
                    style={[s.input, nameEmpty && s.inputError]}
                />

                <Text style={[s.muted, { marginTop: 16 }]}>Email</Text>
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
                        textContentType="newPassword"
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

                <Text style={[s.muted, { marginTop: 16 }]}>Confirm Password</Text>
                <View style={s.inputWrap}>
                    <TextInput
                        value={confirmPassword}
                        onChangeText={(t) => {
                            setConfirmPassword(t);
                            if (authError) setAuthError('');
                        }}
                        secureTextEntry={!showConfirmPassword}
                        autoComplete="off"
                        textContentType="none"
                        placeholder={confirmPasswordEmpty ? 'Confirm password' : '••••••••'}
                        placeholderTextColor={confirmPasswordEmpty ? '#ef4444' : '#6b7280'}
                        style={[s.input, s.inputWithIcon, confirmPasswordEmpty && s.inputError]}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Toggle show confirm password"
                        onPressIn={() => setShowConfirmPassword(true)}
                        onPressOut={() => setShowConfirmPassword(false)}
                        hitSlop={8}
                        style={s.eyeBtn}
                    >
                        <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#94a3b8" />
                    </Pressable>
                </View>

                <Text style={[s.muted, { marginTop: 16 }]}>Admin Email (required)</Text>
                <TextInput
                    value={adminEmail}
                    onChangeText={setAdminEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="admin@example.com"
                    placeholderTextColor="#6b7280"
                    style={[s.input, adminEmailEmpty && s.inputError]}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    importantForAutofill="no"
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
    inputError: { borderColor: '#ef4444' },
    inputWrap: { position: 'relative' },
    inputWithIcon: { paddingRight: 44 },
    eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', width: 28 },
    btn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#ffffff', fontWeight: '600' },
    errorBanner: { backgroundColor: '#0b0d12', borderWidth: 1, borderColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 16 },
    errorBannerText: { color: '#ef4444' },
});
