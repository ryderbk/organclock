import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, View, Text, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { subscribeLogs, ActivityLog } from '@/services/logService';
import { auth } from '@/config/firebase';
// import { useState, useEffect, useMemo } from 'react';

type GroupedLogs = {
    date: string;
    logs: ActivityLog[];
    isExpanded: boolean;
};

export default function LogHistory() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [expandedDates, setExpandedDates] = useState<{ [key: string]: boolean }>({});
    const [expandedLogs, setExpandedLogs] = useState<{ [logId: string]: boolean }>({});
    const [loading, setLoading] = useState(true);
    const uid = auth.currentUser?.uid;
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!uid) return;
        const unsub = subscribeLogs(uid, (l) => { setLogs(l); setLoading(false); });
        return unsub;
    }, [uid]);

    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: ActivityLog[] } = {};
        logs.forEach(log => {
            const date = new Date(log.timestamp).toLocaleDateString();
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(log);
        });

        return Object.entries(groups)
            .map(([date, logs]) => ({
                date,
                logs,
                isExpanded: !!expandedDates[date]
            }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [logs, expandedDates]);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => ({
            ...prev,
            [date]: !prev[date]
        }));
    };

    const toggleLog = (logId: string) => {
        setExpandedLogs(prev => ({
            ...prev,
            [logId]: !prev[logId]
        }));
    };

    const renderLogItem = ({ item }: { item: ActivityLog }) => {
        const isExpanded = expandedLogs[item.id];
        return (
            <Pressable style={s.logItem} onPress={() => toggleLog(item.id)}>
                <Text style={s.cardTitle}>{item.activity}</Text>
                <Text style={s.cardFoot}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                {isExpanded && (
                    <Text style={s.cardMuted}>{item.notes}</Text>
                )}
            </Pressable>
        );
    };

    const renderDateGroup = ({ item }: { item: GroupedLogs }) => (
        <View style={s.dateGroup}>
            <Pressable style={s.dateHeader} onPress={() => toggleDate(item.date)}>
                <Text style={s.dateText}>{item.date}</Text>
                <Text style={s.expandIcon}>{item.isExpanded ? '▼' : '▶'}</Text>
            </Pressable>
            {item.isExpanded && (
                <FlatList
                    data={item.logs}
                    keyExtractor={(log) => log.id}
                    renderItem={renderLogItem}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={s.separator} />}
                />
            )}
        </View>
    );

    return (
        <SafeAreaView style={s.safe}>
            <View style={[s.wrap, { paddingTop: insets.top + 16 }]}>
                <Text style={s.title}>Log History</Text>
                <FlatList
                    data={groupedLogs}
                    keyExtractor={(item) => item.date}
                    renderItem={renderDateGroup}
                    contentContainerStyle={s.listContent}
                    ItemSeparatorComponent={() => <View style={s.groupSeparator} />}
                    ListEmptyComponent={() => (
                        loading ? (
                            <View style={{ paddingVertical: 24 }}>
                                <ActivityIndicator size="small" color="#94a3b8" />
                            </View>
                        ) : (
                            <Text style={s.cardMuted}>No logs yet. Add one from the Log Activity tab.</Text>
                        )
                    )}
                />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0b0d12'
    },
    wrap: {
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: 16
    },
    title: {
        color: '#e5e7eb',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16
    },
    listContent: {
        paddingBottom: 24
    },
    dateGroup: {
        backgroundColor: '#121622',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#1f2937',
        overflow: 'hidden'
    },
    dateHeader: {
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    dateText: {
        color: '#e5e7eb',
        fontSize: 16,
        fontWeight: '600'
    },
    expandIcon: {
        color: '#e5e7eb',
        fontSize: 14
    },
    logItem: {
        padding: 16,
        backgroundColor: '#1f293788'
    },
    separator: {
        height: 1,
        backgroundColor: '#1f2937'
    },
    groupSeparator: {
        height: 12
    },
    cardTitle: {
        color: '#e5e7eb',
        fontWeight: '600'
    },
    cardMuted: {
        color: '#94a3b8',
        marginTop: 4
    },
    cardFoot: {
        color: '#94a3b8',
        marginTop: 4,
        fontSize: 12
    }
});
