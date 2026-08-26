# Baba Ji Platform — Service Integration Guide

## Architecture Overview

The platform is built using modular services that integrate through a central messaging/event system. All services store data in localStorage (for demo) and are ready to connect to backend APIs.

```
User Flows
    ↓
HTML Pages (cleric-login.html, checkout.html, etc)
    ↓
Services Layer (6 core services)
    ↓
Storage Layer (localStorage for demo, ready for backend)
```

---

## Core Services

### 1. Email Service (`services-email.js`)
**Purpose:** Send transactional emails to users

**Providers:**
- Gmail MCP (recommended) — Use your Gmail account
- SendGrid — Set `SENDGRID_API_KEY` env var
- Mailgun — Set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`
- Fallback: Console.log (for testing)

**Email Templates:**
```javascript
sendEmail(to, templateName, data)

Templates available:
- bookingConfirmation(booking, cleric, customer)
- paymentConfirmation(payment, booking, customer)
- clericApproval(cleric)
- bookingReminder(booking, cleric, customer)
- refundNotification(payment, customer)
- sessionComplete(booking, cleric, customer)
```

**Integration Points:**
- checkout.html → `sendEmail('customer@...', 'paymentConfirmation', {payment, booking})`
- cleric-manager.html → `sendEmail('cleric@...', 'clericApproval', {cleric})`
- Reminders system → Auto-calls on schedule

---

### 2. SMS Service (`services-sms.js`)
**Purpose:** Send SMS notifications to customers & clerics

**Provider:**
- Twilio — Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Fallback: Console.log

**SMS Templates (all ≤160 chars):**
```javascript
sendSMS(phoneNumber, templateName, data)

Templates:
- bookingConfirmation → Customer SMS
- bookingConfirmationCleric → Cleric SMS
- paymentConfirmation → Payment receipt
- sessionReminder → 24h before
- sessionReminderCleric → Cleric reminder
- sessionComplete → Review request
- refundNotification → Refund confirmation
```

**Integration Points:**
- booking-modal.html → Send confirmation on booking
- checkout.html → Send confirmation on payment
- reminders-service.js → Auto-sends scheduled reminders

---

### 3. Security Service (`services-security.js`)
**Purpose:** Password hashing, session management, input validation

**Classes:**
```javascript
// Password management
PasswordManager.validatePassword(pwd) → {valid, errors}
PasswordManager.hash(password) → hash
PasswordManager.verify(password, hash) → boolean

// Session management
SessionManager.createSession(userData, type) → session
SessionManager.validateSession(type) → session or null
SessionManager.destroySession(type)

// Input validation
InputValidator.validateEmail(email) → {valid, error?}
InputValidator.validateName(name) → {valid, error?}
InputValidator.validatePhoneNumber(phone) → {valid, formatted}
InputValidator.sanitizeInput(input) → string

// Rate limiting
RateLimiter.checkLimit(key) → {allowed, retryAfter?}

// Login tracking
LoginTracker.recordAttempt(email, success)
LoginTracker.isLocked(email) → boolean
LoginTracker.getRemainingLockTime(email) → ms
```

**Integration Points:**
- admin-login.html → Use RateLimiter & LoginTracker
- cleric-login.html → Use InputValidator & PasswordManager
- All forms → Sanitize inputs before saving

---

### 4. Review System (`services-reviews.js`)
**Purpose:** Cleric ratings, reviews, moderation

**Functions:**
```javascript
submitReview(clericId, customerId, bookingId, rating, title, comment)
  → {valid, error?} // Validates & prevents duplicates

getClericRating(clericId) → {average, count, breakdown}
getClericReviews(clericId, status?) → [{id, rating, title, comment, ...}]
getPublicClericReviews(clericId) → // Only approved reviews
getPendingReviews() → // Admin dashboard

approveReview(reviewId) → updates cleric stats
rejectReview(reviewId, reason)
deleteReview(reviewId)
```

**Business Rules:**
- Only review after booking is completed
- Duplicate check per booking
- Rating: 1-5 stars
- Title: ≤100 chars
- Comment: ≤1000 chars
- Admin must approve before public display
- Auto-updates cleric averageRating & totalReviews

**Integration Points:**
- booking-complete.html → `submitReview()`
- cleric-profile.html → Display `getPublicClericReviews()`
- admin-dashboard.html → `getPendingReviews()` for moderation

---

### 5. Availability Calendar (`services-availability.js`)
**Purpose:** Manage cleric working hours and block times

**Functions:**
```javascript
setAvailability(clericId, dayOfWeek, startTime, endTime)
  // Set working hours for a day (0-6, 0=Sunday)

getAvailability(clericId) → [{day, start, end}, ...]
isClericAvailable(clericId, date, time, duration) → boolean
getAvailableSlots(clericId, date, duration) → ['14:00', '15:00', ...]

blockTime(clericId, date, startTime, endTime, reason)
  // Block off time (sick, busy, etc)

getBlockedTimes(clericId) → [{date, start, end, reason}, ...]
```

**Storage:**
```
localStorage['babaJiAvailability'] = [{clericId, dayOfWeek, startTime, endTime}, ...]
localStorage['babaJiBlockedTimes'] = [{clericId, date, startTime, endTime, reason}, ...]
```

**Integration Points:**
- cleric-dashboard.html → Set working hours
- booking-modal.html → Show available times
- getAvailableSlots() → Populate time picker

---

### 6. Reminders System (`services-reminders.js`)
**Purpose:** Automated booking reminders at multiple intervals

**Reminder Types:**
```
BEFORE_24H  → 24 hours before session
BEFORE_1H   → 1 hour before session
REQUEST_REVIEW → 6 hours after (ask for review)
FOLLOW_UP   → 7 days after (book again)
```

**Functions:**
```javascript
RemindersService.scheduleReminder(bookingId, type, data)
  // Call on booking confirmation - schedules all 4 reminders

RemindersService.processReminders()
  // Hourly check for due reminders - auto-sends email + SMS

RemindersService.getDueReminders() → [{...}, ...]
RemindersService.cancelReminder(bookingId, type?)
```

**Integration Points:**
- booking-confirmation.html → `scheduleReminder()` on success
- App startup → `RemindersService.initialize()` to start hourly processor
- checkout.html → Pass booking data to create reminders

---

## Data Flow Examples

### Example 1: Cleric Signup → Approval → Booking

```
1. Cleric signs up (cleric-login.html)
   → PasswordManager.validatePassword()
   → InputValidator.validateEmail()
   → Save to localStorage['babaJiClerics']

2. Admin approves (cleric-manager.html)
   → update cleric.status = 'approved'
   → sendEmail(cleric.email, 'clericApproval', {cleric})
   → sendSMS(cleric.phone, 'clericApproval', {cleric})

3. Customer books with cleric (booking-modal.html)
   → validate date/time availability
   → isClericAvailable(clericId, date, time, duration)
   → getAvailableSlots() for time picker
   → Create booking
   → sendEmail(customer.email, 'bookingConfirmation', {booking, cleric})
   → sendSMS(customer.phone, 'bookingConfirmation', {booking, cleric})
   → RemindersService.scheduleReminder(bookingId, 'BEFORE_24H', {...})
```

### Example 2: Payment → Webhook → Emails

```
1. Customer pays (checkout.html)
   → Stripe processes payment
   → Webhook received

2. Webhook handler (services-webhooks.js)
   → verifyWebhookSignature()
   → processWebhookEvent('charge.succeeded')
   → sendEmail(customer.email, 'paymentConfirmation', {payment})
   → sendSMS(customer.phone, 'paymentConfirmation', {payment})
   → sendEmail(cleric.email, 'paymentConfirmation', {payment})
   → Update booking.paymentStatus = 'completed'
```

### Example 3: Booking Complete → Reminder → Review

```
1. After session completes (auto-triggered 6 hours later)
   → RemindersService.processReminders()
   → Found reminder BEFORE_24H due → sendEmail(), sendSMS()
   → sendEmail(customer.email, 'sessionComplete', {booking})
   → sendEmail(cleric.email, 'sessionComplete', {booking})

2. Customer reviews (review-modal.html)
   → InputValidator.sanitizeInput(comment)
   → submitReview(clericId, customerId, bookingId, 5, 'Great!', '...')
   → Review saved to localStorage['babaJiReviews']
   → Admin sees in getPendingReviews()
   → Admin approves → updates cleric.averageRating

3. 7 days later, follow-up reminder fires
   → sendEmail(customer.email, 'follow_up', {cleric})
   → Encourage rebooking
```

---

## Setup Instructions

### For Development/Testing

1. **Email Service**
   - All emails logged to console.log()
   - No setup needed

2. **SMS Service**
   - All SMS logged to console.log()
   - No setup needed

3. **Reminders**
   - Call `RemindersService.initialize()` on app startup
   - Reminders auto-process hourly

4. **Reviews & Availability**
   - Fully functional in localStorage
   - No external setup needed

### For Production

1. **Email Service**
   - Option A: Connect Gmail MCP (use your Gmail account)
   - Option B: Set `SENDGRID_API_KEY` environment variable
   - Option C: Set `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`

2. **SMS Service**
   - Set Twilio env vars:
     - `TWILIO_ACCOUNT_SID`
     - `TWILIO_AUTH_TOKEN`
     - `TWILIO_PHONE_NUMBER`

3. **Webhooks**
   - Deploy `services-webhooks.js` on backend
   - Set Stripe webhook endpoint to: `https://yourdomain.com/webhooks/stripe`
   - Store `STRIPE_WEBHOOK_SECRET` (from Stripe dashboard)
   - Verify signatures with `verifyWebhookSignature()`

4. **Database Migration**
   - Replace localStorage with real database
   - Update storage calls in each service
   - Keep the same function signatures for easy swapping

5. **Security Hardening**
   - Replace `PasswordManager` demo hash with bcrypt on backend
   - Use HTTPS only
   - Store sessions in secure HTTP-only cookies
   - Implement CSRF protection

---

## File Structure

```
services/
├── services-email.js       # Email templates + providers
├── services-sms.js         # SMS templates + Twilio
├── services-security.js    # Passwords, sessions, validation
├── services-reviews.js     # Ratings & moderation
├── services-availability.js # Working hours & blocking
└── services-reminders.js   # Automated reminders

Pages/
├── cleric-login.html       # Signup/login (uses security service)
├── cleric-dashboard.html   # Profile (uses availability service)
├── booking-modal.html      # Book session (uses availability service)
├── checkout.html           # Payment (triggers email/SMS)
├── cleric-manager.html     # Admin approval (uses email service)
└── cleric-profile.html     # Public profile (uses review service)
```

---

## Testing Checklist

- [ ] Email templates render correctly
- [ ] SMS messages are ≤160 chars
- [ ] Reminders fire at correct times
- [ ] Reviews cannot be duplicated
- [ ] Availability slots calculate correctly
- [ ] Security validation works (passwords, emails, phones)
- [ ] Rate limiting works (5 attempts → 15 min lockout)
- [ ] Webhooks verify signatures correctly
- [ ] All data persists in localStorage

---

## Next Steps

1. ✅ Services built (email, SMS, security, reviews, availability, reminders)
2. ✅ 2FA implemented (auth-2fa.html)
3. ⬜ Integrate services into existing pages
4. ⬜ Add backend for webhook handlers
5. ⬜ Set up email/SMS providers (Gmail MCP, Twilio)
6. ⬜ Migrate from localStorage to database
7. ⬜ Add video call integration (Zoom/Google Meet)
8. ⬜ Deploy to production

---

## Support & Documentation

- **Email Issues:** Check browser console for `[Gmail MCP]`, `[SendGrid]`, or `[Mailgun]` logs
- **SMS Issues:** Check `TWILIO_*` env vars are set, phone number is E.164 format
- **Reminders:** Call `RemindersService.getReminderStats()` to see pending count
- **Reviews:** Check `localStorage['babaJiReviews']` for all reviews
- **Availability:** Check `localStorage['babaJiAvailability']` for working hours

---

Generated: 2026-08-26
Platform: Baba Ji Cleric Marketplace
