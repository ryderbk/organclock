import React, { useState } from 'react';
import { SafeAreaView, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import AnalogClock from '@/components/AnalogClock';
import { useNavigation } from '@react-navigation/native';

export default function Home() {
    const nav = useNavigation<any>();

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <AnalogClock />
            </View>

            {/* Button slightly above bottom navigation bar */}
            <View style={styles.buttonWrapper}>
                <TouchableOpacity
                    style={styles.liveButton}
                    onPress={() => nav.navigate('LiveTreatment')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>Live Treatment</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.liveButton, { backgroundColor: '#0ea5e9', marginTop: 10 }]}
                    onPress={() => nav.navigate('SpecialTreatmentMenu')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.buttonText}>Special Treatment</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0b0d12' },
    container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    buttonWrapper: {
        position: 'absolute',
        bottom: 80, // slightly above bottom tab bar
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    liveButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 30,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
