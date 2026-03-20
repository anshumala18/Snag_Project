// IndexedDB offline queue for snag images captured while offline
const DB_NAME = 'SnagOfflineDB';
const DB_VERSION = 1;
const STORE = 'pendingSnags';

const openDB = () =>
    new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });

// Save a snag to offline queue
export const saveOfflineSnag = async (snagData) => {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const entry = { ...snagData, savedAt: new Date().toISOString(), syncStatus: 'pending' };
    return new Promise((res, rej) => {
        const req = store.add(entry);
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
};

// Get all pending offline snags
export const getPendingSnags = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    return new Promise((res, rej) => {
        const req = store.getAll();
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
    });
};

// Remove synced snag from queue
export const removeOfflineSnag = async (id) => {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    return new Promise((res, rej) => {
        const req = store.delete(id);
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
};

// Count pending items
export const getPendingCount = async () => {
    const items = await getPendingSnags();
    return items.length;
};

// Clear entire queue
export const clearOfflineSnags = async () => {
    const db = await openDB();
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    return new Promise((res, rej) => {
        const req = store.clear();
        req.onsuccess = () => res();
        req.onerror = () => rej(req.error);
    });
};
