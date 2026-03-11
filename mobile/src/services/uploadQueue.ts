import AsyncStorage from '@react-native-async-storage/async-storage';
import { UploadQueueItem } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
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
    // Gather up to 15 pending items per batch sync (previously 5) safely using binary streams
    const pendingItems = queue
        .filter(i => i.status === 'pending' || i.status === 'failed')
        .slice(0, 15);

    if (pendingItems.length === 0) return;

    const formData = new FormData();
    const metadataArray: any[] = [];
    const payloadItems: typeof pendingItems = [];

    // Process files locally first
    for (const item of pendingItems) {
        await updateQueueItemStatus(item.id, 'uploading');

        const timestamp = Date.now();
        const hashString = Math.random().toString(36).substring(2, 8);
        const ext = item.filename.split('.').pop() || 'jpg';
        const newFilename = `${timestamp}_${hashString}.${ext}`;

        // Pass direct file streams to network instead of loading multiple 15MB base64 strings
        formData.append('files', {
            uri: item.uri,
            name: newFilename,
            type: item.type === 'video' ? 'video/mp4' : 'image/jpeg',
        } as any);

        metadataArray.push({
            originalId: item.id,
            filename: newFilename,
            file_type: item.type,
            size: item.size,
            hash: `${timestamp}_${hashString}`,
            album: item.album,
        });
        payloadItems.push(item);
    }

    formData.append('metadata', JSON.stringify(metadataArray));

    if (metadataArray.length > 0) {
        try {
            // Upload the batch array directly using multiform binary
            await api.post('/api/files/batch-binary', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000, // 2 minutes config for heavy video files
            });

            // Mark completed & clean up
            for (const file of metadataArray) {
                await updateQueueItemStatus(file.originalId, 'completed');
                await removeFromQueue(file.originalId);
            }
        } catch (err: any) {
            // If the batch network request fails, mark all grouped items as failed natively
            let errorMsg = err?.response?.data?.error || err.message;
            console.error('Batch Form upload error:', errorMsg);
            for (const file of metadataArray) {
                await updateQueueItemStatus(file.originalId, 'failed', errorMsg);
            }
        }
    }
}
