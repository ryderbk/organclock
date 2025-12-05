import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet } from 'react-native';
import { subscribeLogs, ActivityLog } from '@/services/logService';
import { auth } from '@/config/firebase';

export default function LogHistory() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const uid = auth.currentUser?.uid;

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeLogs(uid, setLogs);
    return unsub;
  }, [uid]);

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.title}>Log History</Text>
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <Text style={s.cardTitle}>{item.activity}</Text>
              <Text style={s.cardMuted}>{item.notes}</Text>
              <Text style={s.cardFoot}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          )}
          ListEmptyComponent={() => (
            <Text style={s.cardMuted}>No logs yet. Add one from the Log Activity tab.</Text>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0d12' },
  wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
  title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  card: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 16 },
  cardTitle: { color: '#e5e7eb', fontWeight: '600' },
  cardMuted: { color: '#94a3b8', marginTop: 4 },
  cardFoot: { color: '#94a3b8', marginTop: 8, fontSize: 12 },
});
