import { processQueue } from './uploadQueue';

let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start the background sync worker.
 * Checks the queue every 30 seconds.
 */
export function startSyncWorker() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }

    syncInterval = setInterval(async () => {
        if (isSyncing) return;

        try {
            isSyncing = true;
            await processQueue();
        } catch {
            console.warn("Sync worker encountered an error");
        } finally {
            isSyncing = false;
        }
    }, 30000); // 30 seconds
}

export function stopSyncWorker() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}
