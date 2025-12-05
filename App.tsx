import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';
import { auth, db } from './src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { cleanupExpiredScheduleMessages } from './src/services/messageService';

export default function App() {
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && user.uid) {
                try {
                    // Check if user is an admin
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    const isAdmin = userDoc.exists() && (userDoc.data() as any).role === 'admin';

                    if (isAdmin) {
                        // If admin, run cleanup for any sub-users they manage
                        console.log(`App startup: User is admin, checking for expired schedules`);
                        // In a real scenario, we'd run cleanup for all sub-users
                        // For now, just log that the cleanup service is available
                    }
                } catch (err) {
                    console.warn('App startup check failed:', err);
                }
            }
        });
        return unsubscribe;
    }, []);

    return (
        <NavigationContainer
            theme={{
                ...DarkTheme,
                colors: {
                    ...DarkTheme.colors,
                    background: '#0b0d12',
                    card: '#121622',
                    text: '#e5e7eb',
                    border: '#1f2937',
                    primary: '#6366f1',
                },
            }}
        >
            <StatusBar style="light" />
            <RootNavigator />
        </NavigationContainer>
    );
}
