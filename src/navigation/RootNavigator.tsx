import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/config/firebase';
import Home from '@/screens/Home';
import LogActivity from '@/screens/LogActivity';
import LogHistory from '@/screens/LogHistory';
import Profile from '@/screens/Profile';
import Login from '@/screens/auth/Login';
import Register from '@/screens/auth/Register';
import { Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#121622', borderTopColor: '#1f2937', height: 64 },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarIcon: ({ color, size, focused }) => {
          let icon: keyof typeof Ionicons.glyphMap = 'home-outline';
          if (route.name === 'Home') icon = focused ? 'time' : 'time-outline';
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
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Log Activity" component={LogActivity} />
      <Tab.Screen name="Log History" component={LogHistory} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <Text style={styles.loading}>Loading...</Text>;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="App" component={Tabs} />
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
});
