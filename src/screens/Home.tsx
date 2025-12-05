import React from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import AnalogClock from '@/components/AnalogClock';

export default function Home() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Home</Text>
        <AnalogClock size={280} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0d12' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 24 },
});
