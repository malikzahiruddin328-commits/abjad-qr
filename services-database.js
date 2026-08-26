/**
 * Database Abstraction Layer
 * Provides a unified interface for services to use any database backend
 *
 * Usage:
 * 1. Choose a database adapter (Firebase, MongoDB, PostgreSQL)
 * 2. Initialize: const db = new FirebaseAdapter(config)
 * 3. Services automatically use it:
 *    - sendEmail() logs to db.create('emailLogs', {...})
 *    - submitReview() saves to db.create('reviews', {...})
 *    - etc.
 *
 * All adapters implement the same interface:
 *   - create(collection, data) → Promise<{id, ...data}>
 *   - read(collection, id) → Promise<data>
 *   - update(collection, id, data) → Promise<{id, ...data}>
 *   - delete(collection, id) → Promise<boolean>
 *   - query(collection, filter) → Promise<[{id, ...data}]>
 *   - queryOne(collection, filter) → Promise<data>
 */

// ============================================================
// DATABASE INTERFACE (All adapters implement this)
// ============================================================

class DatabaseAdapter {
  async create(collection, data) {
    throw new Error('create() must be implemented');
  }

  async read(collection, id) {
    throw new Error('read() must be implemented');
  }

  async update(collection, id, data) {
    throw new Error('update() must be implemented');
  }

  async delete(collection, id) {
    throw new Error('delete() must be implemented');
  }

  async query(collection, filter) {
    throw new Error('query() must be implemented');
  }

  async queryOne(collection, filter) {
    throw new Error('queryOne() must be implemented');
  }
}

// ============================================================
// FIREBASE ADAPTER
// ============================================================
/**
 * Firebase Realtime Database adapter
 *
 * Setup:
 * 1. Create Firebase project: https://firebase.google.com
 * 2. Get config from Firebase Console > Project Settings
 * 3. Initialize:
 *    const db = new FirebaseAdapter({
 *      apiKey: '...',
 *      projectId: 'babaji-prod',
 *      databaseURL: 'https://babaji-prod.firebaseio.com'
 *    })
 */
class FirebaseAdapter extends DatabaseAdapter {
  constructor(config) {
    super();
    this.config = config;
    this.baseURL = config.databaseURL || 'https://babaji-prod.firebaseio.com';
  }

  async _fetch(path, method = 'GET', data = null) {
    const url = `${this.baseURL}/${path}.json?auth=${this.config.apiKey}`;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (data) options.body = JSON.stringify(data);

    try {
      const res = await fetch(url, options);
      return res.json();
    } catch (error) {
      console.error(`Firebase ${method} ${path} failed:`, error);
      throw error;
    }
  }

  async create(collection, data) {
    const timestamp = new Date().toISOString();
    const record = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const result = await this._fetch(collection, 'POST', record);
    return { id: result.name, ...record };
  }

  async read(collection, id) {
    return this._fetch(`${collection}/${id}`);
  }

  async update(collection, id, data) {
    const record = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    await this._fetch(`${collection}/${id}`, 'PATCH', record);
    return { id, ...record };
  }

  async delete(collection, id) {
    await this._fetch(`${collection}/${id}`, 'DELETE');
    return true;
  }

  async query(collection, filter = {}) {
    const data = await this._fetch(collection);
    if (!data) return [];

    const results = [];
    for (const [id, record] of Object.entries(data)) {
      // Basic filtering by key=value
      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if (record[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) results.push({ id, ...record });
    }
    return results;
  }

  async queryOne(collection, filter = {}) {
    const results = await this.query(collection, filter);
    return results[0] || null;
  }
}

// ============================================================
// MONGODB ADAPTER
// ============================================================
/**
 * MongoDB adapter (via backend API)
 *
 * Setup:
 * 1. Create MongoDB cluster: https://mongodb.com/cloud/atlas
 * 2. Deploy backend API (Node.js + Express):
 *    - POST /api/db/:collection - create
 *    - GET /api/db/:collection/:id - read
 *    - PATCH /api/db/:collection/:id - update
 *    - DELETE /api/db/:collection/:id - delete
 *    - GET /api/db/:collection?filter=value - query
 * 3. Initialize:
 *    const db = new MongoDBAdapter({
 *      baseURL: 'https://api.babaji.com',
 *      apiKey: 'secret-key-here'
 *    })
 */
class MongoDBAdapter extends DatabaseAdapter {
  constructor(config) {
    super();
    this.baseURL = config.baseURL || 'http://localhost:3000/api/db';
    this.apiKey = config.apiKey;
  }

  async _fetch(path, method = 'GET', data = null) {
    const url = `${this.baseURL}/${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    };
    if (data) options.body = JSON.stringify(data);

    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (error) {
      console.error(`MongoDB ${method} ${path} failed:`, error);
      throw error;
    }
  }

  async create(collection, data) {
    const timestamp = new Date().toISOString();
    const record = {
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    return this._fetch(collection, 'POST', record);
  }

  async read(collection, id) {
    return this._fetch(`${collection}/${id}`);
  }

  async update(collection, id, data) {
    const record = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    return this._fetch(`${collection}/${id}`, 'PATCH', record);
  }

  async delete(collection, id) {
    await this._fetch(`${collection}/${id}`, 'DELETE');
    return true;
  }

  async query(collection, filter = {}) {
    const params = new URLSearchParams(filter).toString();
    return this._fetch(`${collection}?${params}`);
  }

  async queryOne(collection, filter = {}) {
    const results = await this.query(collection, filter);
    return results[0] || null;
  }
}

// ============================================================
// SUPABASE ADAPTER
// ============================================================
/**
 * Supabase adapter (PostgreSQL backend)
 *
 * Setup:
 * 1. Create Supabase project: https://supabase.com
 * 2. Initialize:
 *    const db = new SupabaseAdapter({
 *      projectUrl: 'https://project.supabase.co',
 *      anonKey: 'eyJ...'
 *    })
 */
class SupabaseAdapter extends DatabaseAdapter {
  constructor(config) {
    super();
    this.projectUrl = config.projectUrl;
    this.anonKey = config.anonKey;
  }

  async _fetch(path, method = 'GET', data = null) {
    const url = `${this.projectUrl}/rest/v1/${path}`;
    const options = {
      method,
      headers: {
        'apikey': this.anonKey,
        'Authorization': `Bearer ${this.anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    if (data) options.body = JSON.stringify(data);

    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (error) {
      console.error(`Supabase ${method} ${path} failed:`, error);
      throw error;
    }
  }

  async create(collection, data) {
    const timestamp = new Date().toISOString();
    const record = {
      ...data,
      created_at: timestamp,
      updated_at: timestamp
    };
    return this._fetch(collection, 'POST', record);
  }

  async read(collection, id) {
    const result = await this._fetch(`${collection}?id=eq.${id}`);
    return result[0] || null;
  }

  async update(collection, id, data) {
    const record = {
      ...data,
      updated_at: new Date().toISOString()
    };
    return this._fetch(`${collection}?id=eq.${id}`, 'PATCH', record);
  }

  async delete(collection, id) {
    await this._fetch(`${collection}?id=eq.${id}`, 'DELETE');
    return true;
  }

  async query(collection, filter = {}) {
    let path = collection;
    if (Object.keys(filter).length > 0) {
      const conditions = Object.entries(filter)
        .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
        .join('&');
      path = `${collection}?${conditions}`;
    }
    return this._fetch(path);
  }

  async queryOne(collection, filter = {}) {
    const results = await this.query(collection, filter);
    return results[0] || null;
  }
}

// ============================================================
// LOCAL STORAGE ADAPTER (for demo/offline)
// ============================================================
/**
 * localStorage adapter - fallback for testing or offline mode
 *
 * Initialize:
 *    const db = new LocalStorageAdapter()
 */
class LocalStorageAdapter extends DatabaseAdapter {
  async create(collection, data) {
    const id = Math.random().toString(36).substring(2, 15);
    const timestamp = new Date().toISOString();
    const record = {
      id,
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const key = `babaji_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(record);
    localStorage.setItem(key, JSON.stringify(existing));

    return record;
  }

  async read(collection, id) {
    const key = `babaji_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    return existing.find(r => r.id === id) || null;
  }

  async update(collection, id, data) {
    const key = `babaji_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const index = existing.findIndex(r => r.id === id);
    if (index === -1) return null;

    const record = {
      ...existing[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    existing[index] = record;
    localStorage.setItem(key, JSON.stringify(existing));

    return record;
  }

  async delete(collection, id) {
    const key = `babaji_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter(r => r.id !== id);
    localStorage.setItem(key, JSON.stringify(filtered));
    return true;
  }

  async query(collection, filter = {}) {
    const key = `babaji_${collection}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');

    if (Object.keys(filter).length === 0) return existing;

    return existing.filter(record => {
      for (const [key, value] of Object.entries(filter)) {
        if (record[key] !== value) return false;
      }
      return true;
    });
  }

  async queryOne(collection, filter = {}) {
    const results = await this.query(collection, filter);
    return results[0] || null;
  }
}

// ============================================================
// GLOBAL DATABASE INSTANCE
// ============================================================

let globalDatabase = new LocalStorageAdapter(); // Default to localStorage

function initializeDatabase(adapter) {
  globalDatabase = adapter;
  console.log(`[Database] Initialized: ${adapter.constructor.name}`);
}

function getDatabase() {
  return globalDatabase;
}

// ============================================================
// EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DatabaseAdapter,
    FirebaseAdapter,
    MongoDBAdapter,
    SupabaseAdapter,
    LocalStorageAdapter,
    initializeDatabase,
    getDatabase
  };
}
