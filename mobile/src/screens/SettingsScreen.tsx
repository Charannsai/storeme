import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar, Switch, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';

import { RootStackParamList, UploadQueueItem } from '../types';
import api from '../services/api';
import { addToQueue, getQueue } from '../services/uploadQueue';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>; };

export default function SettingsScreen({ navigation }: Props) {
    const insets = useSafeAreaInsets();

    // Settings state
    const [stats, setStats] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [loadingStats, setLoadingStats] = useState(true);

    // Upload state
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [loadingUpload, setLoadingUpload] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [syncingLibrary, setSyncingLibrary] = useState(false);
    const spinValue = useRef(new Animated.Value(0)).current;

    const fetchStats = useCallback(async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) setUser(JSON.parse(storedUser));
            const res = await api.get('/api/storage');
            if (res.data.success) { setStats(res.data.data); }
        } catch {
            console.log('Failed to fetch storage stats');
        } finally {
            setLoadingStats(false);
        }
    }, []);

    const refreshQueue = async () => {
        const q = await getQueue();
        setQueue(q.sort((a, b) => b.created_at - a.created_at));
        if (autoSync && !syncingLibrary && Math.random() > 0.8) {
            runAutoSync();
        }
    };

    const loadAutoSyncState = async () => {
        const val = await AsyncStorage.getItem('auto_sync_enabled');
        if (val === 'true') setAutoSync(true);
    };

    useEffect(() => {
        fetchStats();
        refreshQueue();
        loadAutoSyncState();
        const interval = setInterval(refreshQueue, 3000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    useEffect(() => {
        if (syncingLibrary) {
            Animated.loop(Animated.timing(spinValue, { toValue: 1, duration: 1000, useNativeDriver: true })).start();
        } else {
            spinValue.setValue(0);
            spinValue.stopAnimation();
        }
    }, [syncingLibrary]);

    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    // Auto Sync Logic
    const toggleAutoSync = async (enabled: boolean) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (enabled) {
                let permissionInfo;
                try { permissionInfo = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']); }
                catch (e: any) {
                    if (e.message?.includes('Expo Go')) { Alert.alert('Expo Go Limitation', 'Expo Go cannot access background media. Use a dev build or select manually.'); return; }
                    throw e;
                }
                if (permissionInfo && permissionInfo.status !== 'granted' && !permissionInfo.granted) {
                    Alert.alert('Permission needed', `We need access to your photos. Status: ${permissionInfo.status}`); return;
                }
            }
            setAutoSync(enabled);
            await AsyncStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
            if (enabled) runAutoSync();
        } catch (e: any) {
            Alert.alert('Error', `Failed to toggle sync: ${e.message || e}`);
        }
    };

    const runAutoSync = async () => {
        if (syncingLibrary) return;
        setSyncingLibrary(true);
        try {
            const lastSyncedAt = await AsyncStorage.getItem('last_sync_timestamp') || '0';
            const { assets } = await MediaLibrary.getAssetsAsync({ first: 50, sortBy: [MediaLibrary.SortBy.creationTime], mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video] });
            const timestampCutoff = parseInt(lastSyncedAt);
            let syncedCount = 0;
            for (const asset of assets) {
                if (asset.creationTime > timestampCutoff) {
                    const type = asset.mediaType === 'video' ? 'video' : 'image';
                    await addToQueue({ uri: asset.uri, filename: asset.filename || `auto_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, type, size: 0 });
                    syncedCount++;
                }
            }
            if (assets.length > 0) await AsyncStorage.setItem('last_sync_timestamp', assets[0].creationTime.toString());
            if (syncedCount > 0) refreshQueue();
        } catch (err) { }
        finally { setSyncingLibrary(false); }
    };

    const pickMedia = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setLoadingUpload(true);
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 1 });
            if (!result.canceled && result.assets) {
                for (const asset of result.assets) {
                    const type = asset.type === 'video' ? 'video' : 'image';
                    await addToQueue({ uri: asset.uri, filename: asset.fileName || `manual_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, type, size: asset.fileSize || 0 });
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await refreshQueue();
            }
        } catch (err) { }
        finally { setLoadingUpload(false); }
    };

    const handleLogout = async () => {
        Alert.alert('Log Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Log Out', style: 'destructive',
                onPress: async () => {
                    try { await api.post('/api/auth/logout'); } catch { } finally {
                        await AsyncStorage.clear();
                        (navigation.getParent() as any)?.replace('Auth');
                    }
                },
            },
        ]);
    };

    const storagePercent = stats ? Math.min((stats.repo_size_mb || 0) / 1024 * 100, 100) : 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                    <Feather name="arrow-left" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ACCOUNT */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.card}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{(user?.email?.[0] || 'U').toUpperCase()}</Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.userEmail}>{user?.email || 'Unknown User'}</Text>
                                <Text style={styles.userId}>ID: {user?.id?.substring(0, 8)}...</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Feather name="log-out" size={18} color="#EF4444" style={{ marginRight: 8 }} />
                            <Text style={styles.logoutText}>Log Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* UPLOAD & SYNC */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Upload & Backup</Text>

                    <View style={[styles.card, { padding: 0 }]}>
                        <View style={styles.syncCardHeader}>
                            <View style={styles.syncIconContainer}>
                                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                    <Feather name="refresh-cw" size={20} color="#3B82F6" />
                                </Animated.View>
                            </View>
                            <View style={styles.syncCardText}>
                                <Text style={styles.syncCardTitle}>Background Sync</Text>
                                <Text style={styles.syncCardDesc}>Auto-backup camera roll</Text>
                            </View>
                            <Switch value={autoSync} onValueChange={toggleAutoSync} trackColor={{ false: "#E2E8F0", true: "#3B82F6" }} thumbColor={"#FFFFFF"} />
                        </View>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.manualUploadBtn} onPress={pickMedia} disabled={loadingUpload} activeOpacity={0.7}>
                            {loadingUpload ? <ActivityIndicator color="#3B82F6" /> : <Feather name="upload-cloud" size={20} color="#3B82F6" style={{ marginRight: 10 }} />}
                            <Text style={styles.manualUploadText}>Select files manually</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* QUEUE */}
                {queue.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Transfer Queue ({queue.length})</Text>
                        {queue.slice(0, 10).map((item) => (
                            <View key={item.id} style={styles.queueItem}>
                                <Image source={{ uri: item.uri }} style={styles.queueThumb} cachePolicy="memory-disk" />
                                <View style={styles.queueInfo}>
                                    <Text style={styles.queueName} numberOfLines={1}>{item.filename}</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.statusDot, { backgroundColor: item.status === 'completed' ? '#10B981' : item.status === 'failed' ? '#EF4444' : item.status === 'uploading' ? '#3B82F6' : '#F59E0B' }]} />
                                        <Text style={[styles.queueStatus, { color: item.status === 'completed' ? '#10B981' : item.status === 'failed' ? '#EF4444' : '#64748B' }]}>{item.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                {item.status === 'uploading' && <ActivityIndicator size="small" color="#3B82F6" />}
                            </View>
                        ))}
                        {queue.length > 10 && <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 8 }}>+ {queue.length - 10} more items</Text>}
                    </View>
                )}

                {/* STORAGE */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Storage Usage</Text>
                    {loadingStats ? (
                        <View style={[styles.card, { alignItems: 'center', padding: 40 }]}><ActivityIndicator size="large" color="#3B82F6" /></View>
                    ) : (
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
                                    <View style={[styles.statIconBg, { backgroundColor: '#F1F5F9' }]}><Feather name="file" size={18} color="#64748B" /></View>
                                    <Text style={styles.statValue}>{stats?.file_count || 0}</Text>
                                    <Text style={styles.statLabel}>Files</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}><Feather name="image" size={18} color="#10B981" /></View>
                                    <Text style={[styles.statValue, { color: '#10B981' }]}>{stats?.image_count || 0}</Text>
                                    <Text style={styles.statLabel}>Photos</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <View style={[styles.statIconBg, { backgroundColor: '#FFFBEB' }]}><Feather name="video" size={18} color="#F59E0B" /></View>
                                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats?.video_count || 0}</Text>
                                    <Text style={styles.statLabel}>Videos</Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    content: { paddingBottom: 100 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#FAFAFA', marginBottom: 8 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    iconBtn: { width: 40, height: 40, backgroundColor: '#F1F5F9', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    section: { paddingHorizontal: 20, marginBottom: 28 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },

    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    avatarText: { fontSize: 22, fontWeight: '700', color: '#2563EB' },
    userInfo: { flex: 1 },
    userEmail: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 2 },
    userId: { fontSize: 13, color: '#64748B' },

    logoutButton: { backgroundColor: '#FEF2F2', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },

    syncCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    syncIconContainer: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    syncCardText: { flex: 1 },
    syncCardTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    syncCardDesc: { fontSize: 13, color: '#64748B' },

    divider: { height: 1, backgroundColor: '#F1F5F9' },

    manualUploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#FFFFFF', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    manualUploadText: { fontSize: 15, fontWeight: '700', color: '#3B82F6' },

    queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    queueThumb: { width: 44, height: 44, borderRadius: 10, marginRight: 12, backgroundColor: '#F1F5F9' },
    queueInfo: { flex: 1, justifyContent: 'center' },
    queueName: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 6, height: 6, borderRadius: 4, marginRight: 6 },
    queueStatus: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

    statsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    statsSize: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    statsLimit: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    progressBar: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 6, marginBottom: 24, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 6 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
    statItem: { alignItems: 'center', flex: 1 },
    statIconBg: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    statValue: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: '#1E293B' },
    statLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },
});
