# Database Migration Guide

All platform services now support pluggable database backends. Switch from localStorage to any database with one line of code.

## Quick Start

### 1. Choose Your Database

**Option A: Firebase (Recommended for Quick Start)**
```javascript
// In your main app file (e.g., index.html or app.js)
import { initializeDatabase, FirebaseAdapter } from './services-database.js'

const db = new FirebaseAdapter({
  apiKey: 'your-firebase-api-key',
  projectId: 'babaji-prod',
  databaseURL: 'https://babaji-prod.firebaseio.com'
})
initializeDatabase(db)
```

**Option B: Supabase (PostgreSQL)**
```javascript
import { initializeDatabase, SupabaseAdapter } from './services-database.js'

const db = new SupabaseAdapter({
  projectUrl: 'https://abcdef.supabase.co',
  anonKey: 'eyJ...'
})
initializeDatabase(db)
```

**Option C: MongoDB (via Backend API)**
```javascript
import { initializeDatabase, MongoDBAdapter } from './services-database.js'

const db = new MongoDBAdapter({
  baseURL: 'https://api.babaji.com',
  apiKey: 'secret-key'
})
initializeDatabase(db)
```

**Option D: Stay with localStorage (Demo)**
```javascript
// Default - no setup needed
```

### 2. Services Automatically Use Database

All services automatically detect and use the initialized database:

```javascript
// Email service logs to database
sendEmail('customer@example.com', 'paymentConfirmation', {...})
// → Saved to db.emailLogs collection

// Reviews saved to database
submitReview(clericId, customerId, bookingId, 5, 'Great!', '...')
// → Saved to db.reviews collection

// Availability saved to database
setAvailability(clericId, 0, '09:00', '17:00')
// → Saved to db.availability collection
```

## Architecture

### Database Adapter Interface

All adapters implement this interface:

```javascript
class DatabaseAdapter {
  async create(collection, data)        // Create new record
  async read(collection, id)            // Read one record
  async update(collection, id, data)    // Update record
  async delete(collection, id)          // Delete record
  async query(collection, filter)       // Find multiple
  async queryOne(collection, filter)    // Find one
}
```

### Collections Created Automatically

| Collection | Service | Purpose |
|------------|---------|---------|
| `emailLogs` | Email Service | Audit trail of all emails sent |
| `reviews` | Reviews | User reviews (pending & approved) |
| `availability` | Availability | Cleric working hours |
| `blockedTimes` | Availability | Cleric vacation/break blocks |
| `reminders` | Reminders | Scheduled booking reminders |
| `webhookLogs` | Webhooks | Stripe event audit trail |
| `bookings` | Checkout | Payment & booking records |
| `clerics` | Cleric-Login | Cleric profiles |
| `customers` | Checkout | Customer data |

## Migration Steps by Service

### Email Service → Database
**File:** `services-email-db.js` (already supports database)

Before:
```javascript
sendEmail('customer@example.com', 'paymentConfirmation', {...})
// Email logged to console only
```

After:
```javascript
import { initializeDatabase, FirebaseAdapter } from './services-database.js'
initializeDatabase(new FirebaseAdapter({...}))

sendEmail('customer@example.com', 'paymentConfirmation', {...})
// Email logged to console AND saved to database
```

### Reviews Service → Database
Update `services-reviews.js`:

```javascript
// Import database
import { getDatabase } from './services-database.js'

async function submitReview(clericId, customerId, bookingId, rating, title, comment) {
  const db = getDatabase()
  
  // Validate...
  
  // Save to database
  const review = {
    clericId,
    customerId,
    bookingId,
    rating,
    title,
    comment,
    status: 'pending',
    createdAt: new Date().toISOString()
  }
  
  return db.create('reviews', review)
}
```

### Availability Service → Database
Update `services-availability.js`:

```javascript
import { getDatabase } from './services-database.js'

async function setAvailability(clericId, dayOfWeek, startTime, endTime) {
  const db = getDatabase()
  
  // Validate...
  
  return db.create('availability', {
    clericId,
    dayOfWeek,
    startTime,
    endTime
  })
}

async function getAvailability(clericId) {
  const db = getDatabase()
  return db.query('availability', { clericId })
}
```

### Reminders Service → Database
Update `services-reminders.js`:

```javascript
import { getDatabase } from './services-database.js'

async function scheduleReminder(bookingId, type, data) {
  const db = getDatabase()
  
  const reminder = {
    bookingId,
    type,
    scheduledFor: calculateNextReminder(type, data.bookingTime),
    sent: false,
    data
  }
  
  return db.create('reminders', reminder)
}

async function processReminders() {
  const db = getDatabase()
  const now = new Date().toISOString()
  
  const pending = await db.query('reminders', { sent: false })
  
  for (const reminder of pending) {
    if (reminder.scheduledFor <= now) {
      // Send email/SMS...
      await db.update('reminders', reminder.id, { sent: true, sentAt: now })
    }
  }
}
```

### Webhooks Service → Database
Update `services-webhooks.js`:

```javascript
import { getDatabase } from './services-database.js'

async function processWebhookEvent(event) {
  const db = getDatabase()
  
  // Log event
  await db.create('webhookLogs', {
    eventType: event.type,
    eventId: event.id,
    status: 'received',
    timestamp: new Date().toISOString(),
    rawData: event
  })
  
  // Process event...
  
  // Update log
  await db.update('webhookLogs', eventId, {
    status: 'processed',
    processedAt: new Date().toISOString()
  })
}
```

## Backend API Example (Node.js + Express)

If using MongoDB or custom backend:

```javascript
// server.js
const express = require('express')
const { MongoClient } = require('mongodb')

const app = express()
app.use(express.json())

let db
MongoClient.connect(process.env.MONGO_URL, (err, client) => {
  db = client.db('babaji')
})

// Database adapter routes
app.post('/api/db/:collection', async (req, res) => {
  const { collection } = req.params
  const result = await db.collection(collection).insertOne({
    ...req.body,
    createdAt: new Date()
  })
  res.json({ id: result.insertedId, ...req.body })
})

app.get('/api/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params
  const result = await db.collection(collection).findOne({ _id: id })
  res.json(result)
})

app.patch('/api/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params
  await db.collection(collection).updateOne(
    { _id: id },
    { $set: { ...req.body, updatedAt: new Date() } }
  )
  res.json({ id, ...req.body })
})

app.delete('/api/db/:collection/:id', async (req, res) => {
  const { collection, id } = req.params
  await db.collection(collection).deleteOne({ _id: id })
  res.json({ deleted: true })
})

app.get('/api/db/:collection', async (req, res) => {
  const { collection } = req.params
  const filter = req.query
  const results = await db.collection(collection).find(filter).toArray()
  res.json(results)
})

app.listen(3000, () => console.log('API server running'))
```

## Testing the Migration

### Step 1: Test with localStorage (Default)
```javascript
// No setup needed
sendEmail('test@example.com', 'bookingConfirmation', {...})
// ✓ Logs to console only
```

### Step 2: Test with Firebase
```javascript
import { initializeDatabase, FirebaseAdapter } from './services-database.js'

const db = new FirebaseAdapter({
  apiKey: 'test-key',
  projectId: 'test-project',
  databaseURL: 'https://test.firebaseio.com'
})
initializeDatabase(db)

sendEmail('test@example.com', 'bookingConfirmation', {...})
// ✓ Logs to console AND saves to Firebase
// Check Firebase Console > Realtime Database > emailLogs
```

### Step 3: Deploy to Production
```javascript
const db = new FirebaseAdapter({
  apiKey: process.env.FIREBASE_API_KEY,
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DB_URL
})
initializeDatabase(db)
```

## Rollback Plan

If you need to revert to localStorage:
```javascript
// Automatic fallback
import { getDatabase } from './services-database.js'
// getDatabase() returns LocalStorageAdapter by default

// Or explicitly:
import { initializeDatabase, LocalStorageAdapter } from './services-database.js'
initializeDatabase(new LocalStorageAdapter())
```

## Common Issues & Fixes

### Database Not Initialized
**Error:** Services still using localStorage after setup

**Fix:** Call `initializeDatabase()` BEFORE importing services:
```javascript
// Correct order:
import { initializeDatabase, FirebaseAdapter } from './services-database.js'
initializeDatabase(new FirebaseAdapter({...}))

import { sendEmail } from './services-email.js'
sendEmail(...)
```

### Firebase Permission Denied
**Error:** 403 Forbidden writing to Firebase

**Fix:** Update Firebase Realtime Database rules:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

For development:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### MongoDB Connection Failed
**Error:** Cannot connect to backend API

**Fix:** Verify backend is running and CORS enabled:
```javascript
// In your backend:
app.use(cors({
  origin: 'https://babaji.com',
  credentials: true
}))
```

## Production Checklist

- [ ] Database service initialized in main app file
- [ ] All services tested with real database
- [ ] Environment variables set (API keys, URLs)
- [ ] Database backup enabled
- [ ] Audit logging active
- [ ] Rate limiting on API endpoints
- [ ] Database indexes created for common queries
- [ ] Retention policies set (delete old logs after 90 days)

## Performance Tuning

### Firebase Realtime Database
- Add indexes: Firebase Console > Rules > Indexes
- For email logs: index on `{ timestamp: 1, status: 1 }`
- For reviews: index on `{ clericId: 1, status: 1 }`

### MongoDB
```javascript
// Create indexes
db.collection('emailLogs').createIndex({ timestamp: 1, status: 1 })
db.collection('reviews').createIndex({ clericId: 1, status: 1 })
db.collection('availability').createIndex({ clericId: 1 })
```

### Supabase PostgreSQL
```sql
-- Create indexes
CREATE INDEX emailLogs_timestamp_status ON emailLogs(created_at, status);
CREATE INDEX reviews_cleric_status ON reviews(cleric_id, status);
CREATE INDEX availability_cleric ON availability(cleric_id);
```

## Support

For database-specific issues:
- **Firebase:** https://firebase.google.com/docs/database
- **Supabase:** https://supabase.com/docs
- **MongoDB:** https://docs.mongodb.com
