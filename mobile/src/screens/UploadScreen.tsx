import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Switch, Alert, Animated, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addToQueue, getQueue } from '../services/uploadQueue';
import { UploadQueueItem } from '../types';

export default function UploadScreen() {
    const insets = useSafeAreaInsets();
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [syncingLibrary, setSyncingLibrary] = useState(false);

    // Animation for spinning icon
    const spinValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        refreshQueue();
        const interval = setInterval(refreshQueue, 3000);
        loadAutoSyncState();
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (syncingLibrary) {
            Animated.loop(
                Animated.timing(spinValue, { toValue: 1, duration: 1000, useNativeDriver: true })
            ).start();
        } else {
            spinValue.setValue(0);
            spinValue.stopAnimation();
        }
    }, [syncingLibrary]);

    const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const loadAutoSyncState = async () => {
        const val = await AsyncStorage.getItem('auto_sync_enabled');
        if (val === 'true') {
            setAutoSync(true);
        }
    };

    const toggleAutoSync = async (enabled: boolean) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (enabled) {
                let permissionInfo;
                try {
                    permissionInfo = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
                } catch (e: any) {
                    if (e.message?.includes('Expo Go')) {
                        Alert.alert('Expo Go Limitation', 'Expo Go cannot access background media. Use a dev build or select manually.');
                        return;
                    }
                    throw e;
                }
                if (permissionInfo && permissionInfo.status !== 'granted' && !permissionInfo.granted) {
                    Alert.alert('Permission needed', `We need access to your photos. Status: ${permissionInfo.status}`);
                    return;
                }
            }

            setAutoSync(enabled);
            await AsyncStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');
            if (enabled) runAutoSync();
        } catch (e: any) {
            console.error('Toggle Auto Sync Error:', e);
            Alert.alert('Error', `Failed to toggle sync: ${e.message || e}`);
        }
    };

    const runAutoSync = async () => {
        if (syncingLibrary) return;
        setSyncingLibrary(true);
        try {
            const lastSyncedAt = await AsyncStorage.getItem('last_sync_timestamp') || '0';
            const { assets } = await MediaLibrary.getAssetsAsync({
                first: 50, sortBy: [MediaLibrary.SortBy.creationTime], mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
            });

            const timestampCutoff = parseInt(lastSyncedAt);
            let syncedCount = 0;

            for (const asset of assets) {
                if (asset.creationTime > timestampCutoff) {
                    const type = asset.mediaType === 'video' ? 'video' : 'image';
                    await addToQueue({ uri: asset.uri, filename: asset.filename || `auto_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, type, size: 0 });
                    syncedCount++;
                }
            }
            if (assets.length > 0) {
                await AsyncStorage.setItem('last_sync_timestamp', assets[0].creationTime.toString());
            }
            if (syncedCount > 0) refreshQueue();
        } catch (err) {
            console.error('Auto sync error', err);
        } finally {
            setSyncingLibrary(false);
        }
    };

    const refreshQueue = async () => {
        const q = await getQueue();
        setQueue(q.sort((a, b) => b.created_at - a.created_at));
        if (autoSync && !syncingLibrary && Math.random() > 0.8) {
            runAutoSync();
        }
    };

    const pickMedia = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setLoading(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'], allowsMultipleSelection: true, quality: 1,
            });

            if (!result.canceled && result.assets) {
                for (const asset of result.assets) {
                    const type = asset.type === 'video' ? 'video' : 'image';
                    await addToQueue({ uri: asset.uri, filename: asset.fileName || `manual_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`, type, size: asset.fileSize || 0 });
                }
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                await refreshQueue();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: UploadQueueItem }) => (
        <View style={styles.queueItem}>
            <Image source={{ uri: item.uri }} style={styles.queueThumb} cachePolicy="memory-disk" />
            <View style={styles.queueInfo}>
                <Text style={styles.queueName} numberOfLines={1}>{item.filename}</Text>
                <View style={styles.statusRow}>
                    <View style={[
                        styles.statusDot,
                        { backgroundColor: item.status === 'completed' ? '#10B981' : item.status === 'failed' ? '#EF4444' : item.status === 'uploading' ? '#3B82F6' : '#F59E0B' }
                    ]} />
                    <Text style={[
                        styles.queueStatus,
                        { color: item.status === 'completed' ? '#10B981' : item.status === 'failed' ? '#EF4444' : '#64748B' }
                    ]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>
                {!!item.error && <Text style={styles.errorText} numberOfLines={1}>{item.error}</Text>}
            </View>
            {item.status === 'uploading' && <ActivityIndicator size="small" color="#3B82F6" />}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
            <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
                <Text style={styles.headerTitle}>Upload</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.syncCard}>
                    <View style={styles.syncCardHeader}>
                        <View style={styles.syncIconContainer}>
                            <Animated.View style={{ transform: [{ rotate: spin }] }}>
                                <Feather name="refresh-cw" size={20} color="#3B82F6" />
                            </Animated.View>
                        </View>
                        <View style={styles.syncCardText}>
                            <Text style={styles.syncCardTitle}>Background Backup</Text>
                            <Text style={styles.syncCardDesc}>Automatically sync camera roll</Text>
                        </View>
                        <Switch
                            value={autoSync} onValueChange={toggleAutoSync}
                            trackColor={{ false: "#E2E8F0", true: "#3B82F6" }} thumbColor={"#FFFFFF"}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.uploadButton} onPress={pickMedia} disabled={loading} activeOpacity={0.7}>
                    {loading ? (
                        <ActivityIndicator color="#3B82F6" size="large" />
                    ) : (
                        <>
                            <View style={styles.uploadIconCircle}>
                                <Feather name="images" size={32} color="#3B82F6" />
                            </View>
                            <Text style={styles.uploadTextTitle}>Select files manually</Text>
                            <Text style={styles.uploadTextSub}>Choose photos or videos to upload</Text>
                        </>
                    )}
                </TouchableOpacity>

                {queue.length > 0 && <Text style={styles.queueTitle}>Upload Queue ({queue.length})</Text>}
            </View>

            <FlatList
                data={queue}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Feather name="check-circle" size={36} color="#10B981" />
                        </View>
                        <Text style={styles.emptyTitle}>All files are synced</Text>
                        <Text style={styles.emptySubtitle}>Your gallery is fully up to date.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: { paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#FAFAFA' },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
    content: { padding: 20 },

    syncCard: {
        backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    syncCardHeader: { flexDirection: 'row', alignItems: 'center' },
    syncIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    syncCardText: { flex: 1 },
    syncCardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    syncCardDesc: { fontSize: 14, color: '#64748B' },

    uploadButton: {
        backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center', justifyContent: 'center',
        borderStyle: 'dashed', borderWidth: 2, borderColor: '#CBD5E1', marginBottom: 24,
    },
    uploadIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    uploadTextTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
    uploadTextSub: { fontSize: 14, color: '#64748B' },

    queueTitle: { fontSize: 15, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },

    queueItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        padding: 12, borderRadius: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
        borderWidth: 1, borderColor: '#F1F5F9'
    },
    queueThumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F1F5F9', marginRight: 16 },
    queueInfo: { flex: 1, justifyContent: 'center' },
    queueName: { fontSize: 15, fontWeight: '600', color: '#1E293B', marginBottom: 6 },
    statusRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    queueStatus: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    errorText: { fontSize: 12, color: '#EF4444', marginTop: 4 },

    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
    emptySubtitle: { fontSize: 15, color: '#64748B' },
});
