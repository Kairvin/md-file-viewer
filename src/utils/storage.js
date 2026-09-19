/**
 * High-Capacity Local Storage Engine (IndexedDB)
 * Replaces the 5MB browser localStorage limit, supporting 50MB+ Word (.docx),
 * PowerPoint (.pptx) presentations, embedded images, and playground drafts.
 */

const DB_NAME = 'MDReviewProDB';
const DB_VERSION = 1;

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      console.warn('IndexedDB is not supported in this environment.');
      resolve(null);
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store 1: Documents & Presentations (metadata, raw buffer/HTML, format)
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }

      // Store 2: Playground Drafts & In-Place Edits
      if (!db.objectStoreNames.contains('drafts')) {
        db.createObjectStore('drafts', { keyPath: 'key' });
      }

      // Store 3: General App Settings & Active State
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('Failed to open IndexedDB:', event.target.error);
      resolve(null);
    };
  });

  return dbPromise;
}

// In-memory fallback if IndexedDB is blocked
const memoryFallback = new Map();

/**
 * Get item from specified store
 */
export async function getStorageItem(storeName, key) {
  try {
    const db = await openDatabase();
    if (!db) {
      return memoryFallback.get(`${storeName}:${key}`) ?? null;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value ?? request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn(`Error getting ${storeName}/${key}:`, err);
    return memoryFallback.get(`${storeName}:${key}`) ?? null;
  }
}

/**
 * Set item in specified store
 */
export async function setStorageItem(storeName, key, value) {
  try {
    const db = await openDatabase();
    if (!db) {
      memoryFallback.set(`${storeName}:${key}`, value);
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const data = typeof value === 'object' && value !== null && !Array.isArray(value)
        ? { ...value, key }
        : { key, value };

      const request = store.put(data);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => {
        console.error(`Error writing ${storeName}/${key}:`, event.target.error);
        reject(event.target.error);
      };
    });
  } catch (err) {
    console.warn(`Error saving ${storeName}/${key}:`, err);
    memoryFallback.set(`${storeName}:${key}`, value);
  }
}

/**
 * Delete item from specified store
 */
export async function removeStorageItem(storeName, key) {
  try {
    const db = await openDatabase();
    if (!db) {
      memoryFallback.delete(`${storeName}:${key}`);
      return;
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn(`Error removing ${storeName}/${key}:`, err);
  }
}

/**
 * Get all items from specified store
 */
export async function getAllStorageItems(storeName) {
  try {
    const db = await openDatabase();
    if (!db) {
      return Array.from(memoryFallback.values());
    }

    return new Promise((resolve) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn(`Error fetching all from ${storeName}:`, err);
    return [];
  }
}

// Playground draft helpers
export async function savePlaygroundDraft(documentKey, content) {
  if (!documentKey) return;
  await setStorageItem('drafts', `draft_${documentKey}`, {
    key: `draft_${documentKey}`,
    html: typeof content === 'string' ? content : JSON.stringify(content),
    data: content,
    updatedAt: Date.now()
  });
}

export async function getPlaygroundDraft(documentKey) {
  if (!documentKey) return null;
  const item = await getStorageItem('drafts', `draft_${documentKey}`);
  if (!item) return null;
  if (item.data !== undefined) return item.data;
  return item.html || (typeof item === 'string' ? item : null);
}

export async function clearPlaygroundDraft(documentKey) {
  if (!documentKey) return;
  await removeStorageItem('drafts', `draft_${documentKey}`);
}
