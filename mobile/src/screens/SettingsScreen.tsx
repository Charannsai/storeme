import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DashboardTabParamList } from '../types';
import { Feather } from '@expo/vector-icons';
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
                <ActivityIndicator size="large" color="#0F172A" />
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
                            <Feather name="file" size={20} color="#6B7280" style={{ marginBottom: 4 }} />
                            <Text style={styles.statValue}>{stats?.file_count || 0}</Text>
                            <Text style={styles.statLabel}>Files</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Feather name="image" size={20} color="#10B981" style={{ marginBottom: 4 }} />
                            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats?.image_count || 0}</Text>
                            <Text style={styles.statLabel}>Photos</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Feather name="video" size={20} color="#F59E0B" style={{ marginBottom: 4 }} />
                            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats?.video_count || 0}</Text>
                            <Text style={styles.statLabel}>Videos</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={[styles.section, { marginTop: 40 }]}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
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
        backgroundColor: '#F9FAFB',
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
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 24,
        fontWeight: '700',
        color: '#0F172A',
    },
    userInfo: {},
    userEmail: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
    },
    userId: {
        fontSize: 13,
        color: '#6B7280',
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statsSize: {
        fontSize: 24,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    statsLimit: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        marginBottom: 24,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#0F172A',
        borderRadius: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginTop: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
        color: '#111827',
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
    },
    logoutButton: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 12,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },
    logoutHint: {
        fontSize: 13,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 20,
    },
});
