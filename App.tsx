import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
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
