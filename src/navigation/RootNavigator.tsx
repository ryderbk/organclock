import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged, User, signOut } from '@firebase/auth';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import Home from '@/screens/Home';
import LiveTreatment from '@/screens/LiveTreatment';
import SpecialTreatment from '@/screens/SpecialTreatment';
import SpecialTreatmentMenu from '@/screens/SpecialTreatmentMenu';
import RequestTreatment from '@/screens/RequestTreatment';
import RequestedMessages from '@/screens/RequestedMessages';
import AdminPushedMessages from '@/screens/AdminPushedMessages';
import AdminMessageList from '@/screens/AdminMessageList';
import AdminMessageDetail from '@/screens/AdminMessageDetail';
import LogActivity from '@/screens/LogActivity';
import LogHistory from '@/screens/LogHistory';
import Profile from '@/screens/Profile';
import Login from '@/screens/auth/Login';
import Register from '@/screens/auth/Register';
import AdminHome from '@/screens/AdminHome';
import AdminSubUsers from '@/screens/AdminSubUsers';
import AdminLivePoints from '@/screens/AdminLivePoints';
import AdminSpecialPoints from '@/screens/AdminSpecialPoints';
import { Text, View, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

type Role = 'admin' | 'user';

function UserStackNavigator() {
    const Stack = createNativeStackNavigator();
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="LiveTreatment" component={LiveTreatment} />
            <Stack.Screen name="SpecialTreatmentMenu" component={SpecialTreatmentMenu} />
            <Stack.Screen name="SpecialTreatment" component={SpecialTreatment} />
            <Stack.Screen name="AdminPushedMessages" component={AdminPushedMessages} />
            <Stack.Screen name="RequestTreatment" component={RequestTreatment} />
            <Stack.Screen name="RequestedMessages" component={RequestedMessages} />
        </Stack.Navigator>
    );
}

function UserTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: { backgroundColor: '#121622', borderTopColor: '#1f2937', height: 64 },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarIcon: ({ color, size, focused }) => {
                    let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
                    if (route.name === 'HomeTab') icon = focused ? 'time' : 'time-outline';
                    if (route.name === 'Log Activity') icon = focused ? 'create' : 'create-outline';
                    if (route.name === 'Log History') icon = focused ? 'list' : 'list-outline';
                    if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
                    return <Ionicons name={icon} color={color} size={size} />;
                },
                tabBarLabel: ({ color, children }) => (
                    <Text style={{ color, fontSize: 12, marginBottom: 6 }}>{children}</Text>
                ),
            })}
        >
            <Tab.Screen name="HomeTab" component={UserStackNavigator} options={{ title: 'Home' }} />
            <Tab.Screen name="Log Activity" component={LogActivity} />
            <Tab.Screen name="Log History" component={LogHistory} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
}

function AdminStackNavigator() {
    const AdminStack = createNativeStackNavigator();
    return (
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>
            <AdminStack.Screen name="AdminHome" component={AdminHome} />
            <AdminStack.Screen name="AdminSubUsers" component={AdminSubUsers} />
            <AdminStack.Screen name="AdminLivePoints" component={AdminLivePoints} />
            <AdminStack.Screen name="AdminSpecialPoints" component={AdminSpecialPoints} />
            <AdminStack.Screen name="AdminMessageList" component={AdminMessageList} />
            <AdminStack.Screen name="AdminMessageDetail" component={AdminMessageDetail} />
        </AdminStack.Navigator>
    );
}

function AdminTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: { backgroundColor: '#121622', borderTopColor: '#1f2937', height: 64 },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: '#94a3b8',
                tabBarIcon: ({ color, size, focused }) => {
                    let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
                    if (route.name === 'AdminTab') icon = focused ? 'home' : 'home-outline';
                    if (route.name === 'Profile') icon = focused ? 'person' : 'person-outline';
                    return <Ionicons name={icon} color={color} size={size} />;
                },
                tabBarLabel: ({ color, children }) => (
                    <Text style={{ color, fontSize: 12, marginBottom: 6 }}>{children}</Text>
                ),
            })}
        >
            <Tab.Screen name="AdminTab" component={AdminStackNavigator} options={{ title: 'Home' }} />
            <Tab.Screen name="Profile" component={Profile} />
        </Tab.Navigator>
    );
}

export default function RootNavigator() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<Role | null>(null);
    const [configError, setConfigError] = useState(false);

    useEffect(() => {
        if (!auth || !db) {
            setConfigError(true);
            setLoading(false);
            return;
        }
        
        const unsub = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            setLoading(false);
            if (u && db) {
                const userRef = doc(db, 'users', u.uid);
                const snap = await getDoc(userRef);
                if (!snap.exists()) {
                    await setDoc(userRef, {
                        email: u.email || '',
                        name: u.displayName || (u.email ? u.email.split('@')[0] : ''),
                        role: 'user',
                        adminId: null,
                        createdAt: serverTimestamp(),
                    });
                    setRole('user');
                } else {
                    const data = snap.data() as any;
                    // If account was disabled by admin, immediately sign the user out
                    if (data.disabled) {
                        try {
                            await signOut(auth);
                        } catch (err) {
                            console.error('Error signing out disabled user', err);
                        }
                        Alert.alert('Account disabled', 'Your account has been disabled. Contact your administrator.');
                        setRole(null);
                        return;
                    }

                    setRole((data.role as Role) || 'user');
                }
            } else {
                setRole(null);
            }
        });
        return unsub;
    }, []);

    if (configError) {
        return (
            <View style={styles.configError}>
                <Ionicons name="settings-outline" size={64} color="#6366f1" />
                <Text style={styles.configTitle}>Firebase Setup Required</Text>
                <Text style={styles.configText}>
                    To use this app, please configure your Firebase credentials in the environment variables.
                </Text>
                <Text style={styles.configHint}>
                    Set EXPO_PUBLIC_FIREBASE_* variables in your .env file
                </Text>
            </View>
        );
    }

    if (loading || (user && role === null)) {
        return <Text style={styles.loading}>Loading...</Text>;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                role === 'admin' ? (
                    <>
                        <Stack.Screen name="AdminApp" component={AdminTabs} />
                    </>
                ) : (
                    <Stack.Screen name="App" component={UserTabs} />
                )
            ) : (
                <>
                    <Stack.Screen name="Login" component={Login} />
                    <Stack.Screen name="Register" component={Register} />
                </>
            )}
        </Stack.Navigator>
    );
}

const styles = StyleSheet.create({
    loading: { color: '#e5e7eb', textAlign: 'center', marginTop: 64 },
    configError: { 
        flex: 1, 
        backgroundColor: '#0b0d12', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 32,
    },
    configTitle: { 
        color: '#e5e7eb', 
        fontSize: 24, 
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 16,
        textAlign: 'center',
    },
    configText: { 
        color: '#94a3b8', 
        fontSize: 16, 
        textAlign: 'center',
        lineHeight: 24,
    },
    configHint: { 
        color: '#6366f1', 
        fontSize: 14, 
        textAlign: 'center',
        marginTop: 24,
        fontFamily: 'monospace',
    },
});
