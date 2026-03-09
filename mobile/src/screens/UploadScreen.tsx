import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { addToQueue, getQueue } from '../services/uploadQueue';
import { UploadQueueItem } from '../types';

export default function UploadScreen() {
    const [queue, setQueue] = useState<UploadQueueItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        refreshQueue();
        // Poll the queue to show live updates, since SyncWorker updates it asynchronously
        const interval = setInterval(refreshQueue, 3000);
        return () => clearInterval(interval);
    }, []);

    const refreshQueue = async () => {
        const q = await getQueue();
        // Sort so newest or pending are near top
        setQueue(q.sort((a, b) => b.created_at - a.created_at));
    };

    const pickMedia = async () => {
        try {
            setLoading(true);
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 1,
            });

            if (!result.canceled && result.assets) {
                for (const asset of result.assets) {
                    const type = asset.type === 'video' ? 'video' : 'image';

                    await addToQueue({
                        uri: asset.uri,
                        filename: asset.fileName || `media_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
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
                                item.status === 'completed' ? '#10b981' :
                                    item.status === 'failed' ? '#ef4444' :
                                        item.status === 'uploading' ? '#8b5cf6' : '#f59e0b'
                        }
                    ]} />
                    <Text style={styles.queueStatus}>
                        {item.status.toUpperCase()}
                    </Text>
                </View>

                {!!item.error && (
                    <Text style={styles.errorText} numberOfLines={1}>{item.error}</Text>
                )}
            </View>
            {item.status === 'uploading' && <ActivityIndicator size="small" color="#8b5cf6" />}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Upload</Text>
            </View>

            <View style={styles.content}>
                <TouchableOpacity style={styles.uploadButton} onPress={pickMedia} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.uploadIcon}>📸</Text>
                            <Text style={styles.uploadText}>Select Photos & Videos</Text>
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
                    <Text style={styles.emptyText}>Queue is empty</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0f',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#12121a',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#f0f0f5',
    },
    content: {
        padding: 24,
    },
    uploadButton: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: '#a78bfa',
        marginBottom: 32,
    },
    uploadIcon: {
        fontSize: 48,
        marginBottom: 16,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    queueTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f0f0f5',
        marginBottom: 8,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    queueItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a2e',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    queueThumb: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#12121a',
        marginRight: 16,
    },
    queueInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    queueName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f0f0f5',
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
        color: '#8b8ba3',
    },
    errorText: {
        fontSize: 11,
        color: '#ef4444',
        marginTop: 4,
    },
    emptyText: {
        fontSize: 14,
        color: '#8b8ba3',
        textAlign: 'center',
        marginTop: 20,
    },
});
