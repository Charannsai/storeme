import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardTabParamList } from '../types';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

type Props = { navigation: NativeStackNavigationProp<DashboardTabParamList, 'Settings'>; };

export default function SettingsScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            const res = await api.get('/api/storage');
            if (res.data.success) { setStats(res.data.data); }
        } catch {
            console.log('Failed to fetch storage stats');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    try { await api.post('/api/auth/logout'); } catch { } finally {
                        await AsyncStorage.removeItem('access_token');
                        await AsyncStorage.removeItem('refresh_token');
                        await AsyncStorage.removeItem('user');
                        (navigation.getParent() as any)?.replace('Auth');
                    }
                },
            },
        ]);
    };

    const storagePercent = stats ? Math.min((stats.repo_size_mb || 0) / 1024 * 100, 100) : 0;

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#3B82F6" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(user?.email?.[0] || 'U').toUpperCase()}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userEmail}>{user?.email || 'Unknown User'}</Text>
                        <Text style={styles.userId}>ID: {user?.id?.substring(0, 8)}...</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Storage Usage</Text>
                <View style={styles.card}>
                    <View style={styles.statsHeader}>
                        <Text style={styles.statsSize}>{stats?.repo_size_display || '0 B'}</Text>
                        <Text style={styles.statsLimit}>of ~1 GB Github limit</Text>
                    </View>

                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${storagePercent}%`, backgroundColor: storagePercent > 90 ? '#EF4444' : '#3B82F6' }]} />
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: '#F1F5F9' }]}>
                                <Feather name="file" size={18} color="#64748B" />
                            </View>
                            <Text style={styles.statValue}>{stats?.file_count || 0}</Text>
                            <Text style={styles.statLabel}>Files</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
                                <Feather name="image" size={18} color="#10B981" />
                            </View>
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats?.image_count || 0}</Text>
                            <Text style={styles.statLabel}>Photos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <View style={[styles.statIconBg, { backgroundColor: '#FFFBEB' }]}>
                                <Feather name="video" size={18} color="#F59E0B" />
                            </View>
                            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats?.video_count || 0}</Text>
                            <Text style={styles.statLabel}>Videos</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.section, { marginTop: 40 }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Feather name="log-out" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
                <Text style={styles.logoutHint}>Your files remain safely stored in your GitHub repository.</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centered: { justifyContent: 'center', alignItems: 'center' },
    content: { paddingBottom: 100 }, // Space for TabBar

    header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FAFAFA', marginBottom: 20 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },

    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

    card: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
        borderWidth: 1, borderColor: '#F1F5F9',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
    },

    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    avatarText: { fontSize: 26, fontWeight: '700', color: '#2563EB' },
    userInfo: {},
    userEmail: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    userId: { fontSize: 14, color: '#64748B' },

    statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    statsSize: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    statsLimit: { fontSize: 14, color: '#64748B', fontWeight: '500' },

    progressBar: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, marginBottom: 28, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 6 },

    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statValue: { fontSize: 20, fontWeight: '700', marginBottom: 4, color: '#1E293B' },
    statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },

    logoutButton: {
        backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
        borderRadius: 16, padding: 18, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', marginBottom: 16,
    },
    logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
    logoutHint: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
});
