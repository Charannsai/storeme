import AsyncStorage from '@react-native-async-storage/async-storage';
import { UploadQueueItem } from '../types';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import api from './api';

const QUEUE_KEY = '@storeme_upload_queue';

/**
 * Get all items from the queue
 */
export async function getQueue(): Promise<UploadQueueItem[]> {
    try {
        const data = await AsyncStorage.getItem(QUEUE_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

/**
 * Add a new media file to the upload queue
 */
export async function addToQueue(item: Omit<UploadQueueItem, 'id' | 'status' | 'created_at'>) {
    const queue = await getQueue();

    const newItem: UploadQueueItem = {
        ...item,
        id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        status: 'pending',
        created_at: Date.now(),
    };

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, newItem]));
    return newItem;
}

/**
 * Remove an item from the queue
 */
export async function removeFromQueue(id: string) {
    const queue = await getQueue();
    const filtered = queue.filter(item => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

/**
 * Update an item's status in the queue
 */
export async function updateQueueItemStatus(id: string, status: UploadQueueItem['status'], error?: string) {
    const queue = await getQueue();
    const updated = queue.map(item =>
        item.id === id ? { ...item, status, error } : item
    );
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

/**
 * Process the queue (upload pending files)
 */
export async function processQueue() {
    const queue = await getQueue();
    // Find up to 5 pending or failed items
    const pendingItems = queue
        .filter(i => i.status === 'pending' || i.status === 'failed')
        .slice(0, 5);

    if (pendingItems.length === 0) return;

    for (const item of pendingItems) {
        try {
            await updateQueueItemStatus(item.id, 'uploading');

            let finalUri = item.uri;

            // Compress images before upload
            if (item.type === 'image') {
                const manipResult = await ImageManipulator.manipulateAsync(
                    item.uri,
                    [{ resize: { width: 1920 } }], // Resize down max width
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
                );
                finalUri = manipResult.uri;
            }

            // Read file as base64
            const base64 = await FileSystem.readAsStringAsync(finalUri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Generate names
            const timestamp = Date.now();
            const hashString = Math.random().toString(36).substring(2, 8);
            const ext = item.filename.split('.').pop() || 'jpg';
            const newFilename = `${timestamp}_${hashString}.${ext}`;

            // Upload via API
            await api.post('/api/files', {
                filename: newFilename,
                file_type: item.type,
                size: item.size,
                content: base64,
                hash: `${timestamp}_${hashString}`,
            });

            // Mark completed & clean up
            await updateQueueItemStatus(item.id, 'completed');
            await removeFromQueue(item.id);
        } catch (err: any) {
            console.error(`Error processing queue item ${item.id}:`, err);
            // Mark as failed
            await updateQueueItemStatus(item.id, 'failed', err?.response?.data?.error || err.message);
        }
    }
}
