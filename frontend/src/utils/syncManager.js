import { getPendingSnags, removeOfflineSnag } from './offlineStorage';
import { snagAPI } from '../api';
import toast from 'react-hot-toast';

let isSyncing = false;

export const triggerSync = async () => {
    if (isSyncing) return;
    
    const pending = await getPendingSnags();
    if (pending.length === 0) return;

    isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync_status', { detail: true }));
    const toastId = toast.loading(`📡 Syncing ${pending.length} offline snags...`);

    let successCount = 0;

    try {
        for (const snag of pending) {
            try {
                const fd = new FormData();
                
                // Helper to convert DataURL to Blob
                const dataURLtoBlob = (dataurl) => {
                    if (typeof dataurl !== 'string' || !dataurl.startsWith('data:')) return dataurl;
                    try {
                        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                            bstr = atob(arr[1]);
                        let n = bstr.length, u8arr = new Uint8Array(n);
                        while (n--) u8arr[n] = bstr.charCodeAt(n);
                        return new Blob([u8arr], { type: mime });
                    } catch (e) {
                        return dataurl;
                    }
                };

                Object.entries(snag).forEach(([k, v]) => {
                    if (k !== 'id' && k !== 'imagePreview' && k !== 'savedAt' && k !== 'syncStatus' && v) {
                        fd.append(k, v);
                    }
                });

                if (snag.imageFile) {
                    const blob = dataURLtoBlob(snag.imageFile);
                    fd.append('image', blob, `sync_${Date.now()}.jpg`);
                }

                await snagAPI.create(fd);

                await removeOfflineSnag(snag.id);
                successCount++;
                
                window.dispatchEvent(new CustomEvent('snag_synced', { detail: snag }));
            } catch (err) {
                const errMsg = err.response?.data?.message || err.message || 'Unknown error';
                window._lastSyncError = errMsg;
                console.error(`❌ SyncManager: Failed to sync snag ${snag.id}:`, errMsg, err);
                toast.error(`❌ Snag ${snag.snag_code || snag.id} fail: ${errMsg}`);
            }
        }
    } finally {
        isSyncing = false;
        window.dispatchEvent(new CustomEvent('sync_status', { detail: false }));
        if (successCount > 0) {
            toast.success(`✅ Successfully synced ${successCount} snags!`, { id: toastId });
        } else {
            const lastError = window._lastSyncError || 'Sync failed or interrupted. Check console.';
            toast.error(`❌ ${lastError}`, { id: toastId });
        }
    }
};
