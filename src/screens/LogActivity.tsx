import React, { useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { addLog } from '@/services/logService';
import { auth } from '@/config/firebase';

const ACTIVITIES = ['Eat', 'Sleep', 'Workout', 'Study', 'Other'];

export default function LogActivity() {
  const [activity, setActivity] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const uid = auth.currentUser?.uid;

  const canSave = !!uid && activity.length > 0 && notes.trim().length > 0;

  const onSave = async () => {
    if (!uid) return;
    try {
      await addLog(uid, activity, notes.trim());
      setNotes('');
      setActivity('');
      Alert.alert('Saved', 'Your activity has been logged.');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to save');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.wrap}>
        <Text style={s.title}>Log Activity</Text>
        <Text style={s.muted}>Choose an activity</Text>
        <View style={s.pickerBox}>
          <Picker
            selectedValue={activity}
            onValueChange={(v) => setActivity(v)}
            dropdownIconColor="#e5e7eb"
            style={{ color: '#e5e7eb' }}
          >
            <Picker.Item label="Select activity" value="" />
            {ACTIVITIES.map((a) => (
              <Picker.Item key={a} label={a} value={a} />
            ))}
          </Picker>
        </View>

        {activity ? (
          <View style={{ marginTop: 24 }}>
            <Text style={s.muted}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={`Details about ${activity.toLowerCase()}...`}
              placeholderTextColor="#6b7280"
              multiline
              style={s.textarea}
            />
          </View>
        ) : null}

        <Pressable onPress={onSave} disabled={!canSave} style={[s.btn, { backgroundColor: canSave ? '#4f46e5' : '#374151' }]}>
          <Text style={s.btnText}>Save Log</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0d12' },
  wrap: { flex: 1, paddingHorizontal: 24, paddingVertical: 16 },
  title: { color: '#e5e7eb', fontSize: 20, fontWeight: '700', marginBottom: 16 },
  muted: { color: '#94a3b8', marginBottom: 8 },
  pickerBox: { backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937' },
  textarea: { minHeight: 140, backgroundColor: '#121622', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 16, color: '#e5e7eb', textAlignVertical: 'top' },
  btn: { marginTop: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  btnText: { color: '#ffffff', fontWeight: '600' },
});
