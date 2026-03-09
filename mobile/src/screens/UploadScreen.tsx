import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Switch, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { addToQueue, getQueue } from '../services/uploadQueue';
import { UploadQueueItem } from '../types';

export default function UploadScreen() {
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoSync, setAutoSync] = useState(false);
    const [syncingLibrary, setSyncingLibrary] = useState(false);

    useEffect(() => {
        refreshQueue();
        const interval = setInterval(refreshQueue, 3000);
        loadAutoSyncState();
        return () => clearInterval(interval);
    }, []);

    const loadAutoSyncState = async () => {
        const val = await AsyncStorage.getItem('auto_sync_enabled');
        if (val === 'true') {
            setAutoSync(true);
        }
    };

    const toggleAutoSync = async (enabled: boolean) => {
        try {
            if (enabled) {
                let permissionInfo;
                try {
                    // Explictly ask for granular permissions to avoid Audio crashes if possible
                    permissionInfo = await MediaLibrary.requestPermissionsAsync(false, ['photo', 'video']);
                } catch (e: any) {
                    // Expo Go explicitly blocks this entirely on newer Android builds 
                    // without a custom EAS development build.
                    if (e.message?.includes('Expo Go')) {
                        Alert.alert(
                            'Expo Go Limitation',
                            'Due to recent Android security changes, the Expo Go app can no longer access the background media library on your phone.\n\nPlease use "Select Files Manually" to choose photos, or compile a full development build to use Auto-Sync.'
                        );
                        return;
                    }
                    throw e;
                }

                console.log('MediaLibrary Permission:', permissionInfo);

                // Allow both 'granted' and 'undetermined' (in case of Expo Go quirks) 
                if (permissionInfo && permissionInfo.status !== 'granted' && !permissionInfo.granted) {
                    Alert.alert(
                        'Permission needed',
                        `We need access to your photos and videos to auto-sync. Status was: ${permissionInfo.status}`
                    );
                    return;
                }
            }

            setAutoSync(enabled);
            await AsyncStorage.setItem('auto_sync_enabled', enabled ? 'true' : 'false');

            if (enabled) {
                runAutoSync();
            }
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

            // Get assets created after our last sync point
            const { assets } = await MediaLibrary.getAssetsAsync({
                first: 50, // Process in batches
                sortBy: [MediaLibrary.SortBy.creationTime], // Newest first
                mediaType: [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
            });

            const timestampCutoff = parseInt(lastSyncedAt);
            let syncedCount = 0;

            // Simple queue mechanism (this should ideally be a background task, but good for active app)
            for (const asset of assets) {
                if (asset.creationTime > timestampCutoff) {
                    const type = asset.mediaType === 'video' ? 'video' : 'image';
                    await addToQueue({
                        uri: asset.uri,
                        filename: asset.filename || `auto_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
                        type,
                        size: 0, // We can't always get size from asset immediately without extra calls
                    });
                    syncedCount++;
                }
            }

            if (assets.length > 0) {
                // Save the newest asset's timestamp
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

        // If auto sync is on, trigger an occasional scan when they are on this screen
        if (autoSync && !syncingLibrary && Math.random() > 0.8) {
            runAutoSync();
        }
    };

    const pickMedia = async () => {
        try {
            setLoading(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'],
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled && result.assets) {
                for (const asset of result.assets) {
                    const type = asset.type === 'video' ? 'video' : 'image';
                    await addToQueue({
                        uri: asset.uri,
                        filename: asset.fileName || `manual_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
                        type,
                        size: asset.fileSize || 0,
                    });
                }
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
            <Image source={{ uri: item.uri }} style={styles.queueThumb} />
            <View style={styles.queueInfo}>
                <Text style={styles.queueName} numberOfLines={1}>{item.filename}</Text>

                <View style={styles.statusRow}>
                    <View style={[
                        styles.statusDot,
                        {
                            backgroundColor:
                                item.status === 'completed' ? '#10B981' :
                                    item.status === 'failed' ? '#EF4444' :
                                        item.status === 'uploading' ? '#3B82F6' : '#F59E0B'
                        }
                    ]} />
                    <Text style={[
                        styles.queueStatus,
                        {
                            color: item.status === 'completed' ? '#10B981' :
                                item.status === 'failed' ? '#EF4444' : '#6B7280'
                        }
                    ]}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                {!!item.error && (
                    <Text style={styles.errorText} numberOfLines={1}>{item.error}</Text>
                )}
            </View>
            {item.status === 'uploading' && <ActivityIndicator size="small" color="#0F172A" />}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Upload</Text>
            </View>

            <View style={styles.content}>

                <View style={styles.syncCard}>
                    <View style={styles.syncCardHeader}>
                        <View style={styles.syncIconContainer}>
                            <Feather name="refresh-cw" size={20} color="#0F172A" style={syncingLibrary ? styles.spinning : undefined} />
                        </View>
                        <View style={styles.syncCardText}>
                            <Text style={styles.syncCardTitle}>Background Backup</Text>
                            <Text style={styles.syncCardDesc}>Automatically sync camera roll</Text>
                        </View>
                        <Switch
                            value={autoSync}
                            onValueChange={toggleAutoSync}
                            trackColor={{ false: "#E5E7EB", true: "#0F172A" }}
                            thumbColor={"#FFFFFF"}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.uploadButton} onPress={pickMedia} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <>
                            <Feather name="image" size={32} color="#0F172A" style={{ marginBottom: 12 }} />
                            <Text style={styles.uploadText}>Select Files Manually</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.queueTitle}>Upload Queue ({queue.length})</Text>
            </View>

            <FlatList
                data={queue}
                keyExtractor={item => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="check-circle" size={32} color="#D1D5DB" style={{ marginBottom: 12 }} />
                        <Text style={styles.emptyText}>All files are synced</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.5,
    },
    content: {
        padding: 24,
    },
    syncCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    syncCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    spinning: {
        // Pseudo logic for spinning, requires Animated in real usage but static for MVP
    },
    syncCardText: {
        flex: 1,
    },
    syncCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 2,
    },
    syncCardDesc: {
        fontSize: 13,
        color: '#6B7280',
    },
    uploadButton: {
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#CBD5E1',
        marginBottom: 32,
    },
    uploadText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    queueTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    queueThumb: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        marginRight: 16,
    },
    queueInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    queueName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    queueStatus: {
        fontSize: 12,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 11,
        color: '#EF4444',
        marginTop: 4,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 32,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
        textAlign: 'center',
    },
});
