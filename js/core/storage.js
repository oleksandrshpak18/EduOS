/**
 * EduStorage: Асинхронний шар сховища на базі IndexedDB
 * Підтримує таблиці: profiles, vfs_nodes, learning_progress, audit_logs.
 * Має автоматичний fallback до LocalStorage, якщо IndexedDB недоступний.
 */
class EduStorage {
  constructor() {
    this.dbName = 'EduOS_DB';
    this.version = 1;
    this.db = null;
    this.useLocalStorageFallback = false;
  }

  async init() {
    if (!('indexedDB' in window)) {
      console.warn('[EduStorage] IndexedDB not supported. Falling back to localStorage.');
      this.useLocalStorageFallback = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Таблиця профілів учнів
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'profileId' });
        }

        // Таблиця файлової системи (VFS)
        if (!db.objectStoreNames.contains('vfs_nodes')) {
          const store = db.createObjectStore('vfs_nodes', { keyPath: 'id' });
          store.createIndex('by_profile', 'profileId', { unique: false });
          store.createIndex('by_parent', ['profileId', 'parentId'], { unique: false });
        }

        // Прогрес практичних робіт
        if (!db.objectStoreNames.contains('learning_progress')) {
          const store = db.createObjectStore('learning_progress', { keyPath: 'id' });
          store.createIndex('by_profile', 'profileId', { unique: false });
        }

        // Журнал аудиту дій учня
        if (!db.objectStoreNames.contains('audit_logs')) {
          const store = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_profile', 'profileId', { unique: false });
          store.createIndex('by_timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('[EduStorage] IndexedDB open error:', event.target.error);
        this.useLocalStorageFallback = true;
        resolve();
      };
    });
  }

  async put(storeName, value) {
    if (this.useLocalStorageFallback || !this.db) {
      const key = `${storeName}_${value.id || value.profileId}`;
      localStorage.setItem(key, JSON.stringify(value));
      return value;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve(value);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async get(storeName, key) {
    if (this.useLocalStorageFallback || !this.db) {
      const item = localStorage.getItem(`${storeName}_${key}`);
      return item ? JSON.parse(item) : null;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getAll(storeName) {
    if (this.useLocalStorageFallback || !this.db) {
      const results = [];
      const prefix = `${storeName}_`;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix)) {
          results.push(JSON.parse(localStorage.getItem(k)));
        }
      }
      return results;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async getByIndex(storeName, indexName, value) {
    if (this.useLocalStorageFallback || !this.db) {
      const all = await this.getAll(storeName);
      return all.filter((item) => {
        if (Array.isArray(indexName)) {
          return indexName.every((idx, i) => item[idx] === value[i]);
        }
        return item[indexName] === value;
      });
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const req = index.getAll(value);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async delete(storeName, key) {
    if (this.useLocalStorageFallback || !this.db) {
      localStorage.removeItem(`${storeName}_${key}`);
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async deleteBulk(storeName, keys) {
    if (this.useLocalStorageFallback || !this.db) {
      keys.forEach((key) => localStorage.removeItem(`${storeName}_${key}`));
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      keys.forEach((key) => store.delete(key));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  async clearStore(storeName) {
    if (this.useLocalStorageFallback || !this.db) {
      const prefix = `${storeName}_`;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k.startsWith(prefix)) toRemove.push(k);
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
      return;
    }

    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }
}

export const storage = new EduStorage();
