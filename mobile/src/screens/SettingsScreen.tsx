import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardTabParamList } from '../types';
import api from '../services/api';

type Props = {
    navigation: NativeStackNavigationProp<DashboardTabParamList, 'Settings'>;
};

export default function SettingsScreen({ navigation }: Props) {
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));

            const res = await api.get('/api/storage');
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch {
            console.log('Failed to fetch storage stats');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('/api/auth/logout');
                        } catch {
                            // Ignore failure
                        } finally {
                            await AsyncStorage.removeItem('access_token');
                            await AsyncStorage.removeItem('refresh_token');
                            await AsyncStorage.removeItem('user');

                            // We need to direct to auth, but since we are nested in tabs, we trigger a reset from App root
                            // Realistically we use a Context or a root nav access
                            // But for expo we'll just force restart logic or pass to parent nav
                            (navigation.getParent() as any)?.replace('Auth');
                        }
                    },
                },
            ]
        );
    };

    const storagePercent = stats ? Math.min((stats.repo_size_mb || 0) / 1024 * 100, 100) : 0;

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {(user?.email?.[0] || 'U').toUpperCase()}
                        </Text>
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
                        <Text style={styles.statsLimit}>of ~1 GB limit</Text>
                    </View>

                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${storagePercent}%` }]} />
                    </View>

                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#f0f0f5' }]}>{stats?.file_count || 0}</Text>
                            <Text style={styles.statLabel}>Files</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats?.image_count || 0}</Text>
                            <Text style={styles.statLabel}>Photos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats?.video_count || 0}</Text>
                            <Text style={styles.statLabel}>Videos</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.section, { marginTop: 40 }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>
                <Text style={styles.logoutHint}>
                    Your files remain safely stored in your GitHub repository.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#12121a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f0f0f5',
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#8b8ba3',
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#1a1a2e',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '800',
        color: '#fff',
    },
    userInfo: {},
    userEmail: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f0f0f5',
        marginBottom: 4,
    },
    userId: {
        fontSize: 13,
        color: '#8b8ba3',
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statsSize: {
        fontSize: 20,
        fontWeight: '800',
        color: '#f0f0f5',
    },
    statsLimit: {
        fontSize: 13,
        color: '#8b8ba3',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#12121a',
        borderRadius: 4,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#8b5cf6',
        borderRadius: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#8b8ba3',
    },
    logoutButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    logoutText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '700',
    },
    logoutHint: {
        fontSize: 13,
        color: '#8b8ba3',
        textAlign: 'center',
    },
});
