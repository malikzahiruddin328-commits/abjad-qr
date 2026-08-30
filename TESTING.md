# Baba Ji Platform — Complete Testing Guide

## System Overview

This is a complete cleric marketplace platform with:
- **Talisman Tool** (index.html) — Abjad calculator, QR code generator, 99 names library
- **Lobby** (baba-ji-lobby-mockups.html) — Cleric discovery, booking system, live sermon display
- **Admin Panel** (admin.html) — Event management
- **Cleric Manager** (cleric-manager.html) — Approve/reject/manage clerics
- **Authentication** — Separate admin and cleric login systems with 30-day sessions (for testing)
- **Booking System** — End-to-end booking → payment → confirmation
- **Payment Integration** — Stripe test mode
- **Email Notifications** — Logged to console (ready for Gmail MCP / SendGrid integration)
- **Webhook Simulator** (webhook-simulator.html) — Test payment webhooks

---

## Quick Start Testing

### 1. Access the Platform
- **Live URL:** https://malikzahiruddin328-commits.github.io/abjad-qr/
- **Lobby:** baba-ji-lobby-mockups.html
- **Talisman:** index.html
- **Admin:** admin-login.html
- **Cleric Sign-up:** cleric-login.html
- **Testing Hub:** webhook-simulator.html

### 2. Test Credentials

**Admin Access:**
- Password: whatever you set on `admin-setup.html`. There is no default and no published password.
- Session: 30 days (testing mode)

**Test Cleric Account:**
- Email: `test@cleric.com`
- Password: `password123`
- Specialty: Any (set during signup)
- Hourly Rate: $50 (adjustable)

**Stripe Test Card:**
- Number: `4242 4242 4242 4242`
- Expiry: Any future date (12/26)
- CVC: Any 3 digits (123)

---

## End-to-End Testing Workflow

### Step 1: Create Cleric Account
1. Go to [Cleric Login](cleric-login.html)
2. Click "Sign up"
3. Fill in:
   - Name: e.g., "Shaikh Ahmad"
   - Email: e.g., "shaikh@example.com"
   - Specialty: Choose one (Quranic Studies, Islamic Law, etc.)
   - Password: Min 8 characters
   - Hourly Rate: $30-200
4. Submit — Account created locally

**Expected:** Stored in localStorage under `babaJiClerics`

---

### Step 2: Admin Approves Cleric
1. Go to [Admin Login](admin-login.html)
2. Enter the password you set on `admin-setup.html`
3. Navigate to [Cleric Manager](cleric-manager.html)
4. Click "Approve" on the pending cleric

**Expected:** 
- Status changes to "Approved"
- Console shows approval email would be sent
- Cleric can now accept bookings

---

### Step 3: Browse & Book Session
1. Go to [Lobby](baba-ji-lobby-mockups.html)
2. Scroll to "Available Scholars"
3. Find your approved cleric or existing scholars
4. Click "Book Session"
5. Fill booking form:
   - Date: Any future date
   - Time: 24-hour format (14:00)
   - Duration: 30, 60, 90, or 120 minutes
   - Topic/Question: Your inquiry
6. Submit

**Expected:** Booking saved to localStorage, redirects to checkout

---

### Step 4: Complete Payment
1. On [Checkout](checkout.html) page
2. Fill payment details:
   - Email: Your email
   - Name: Your full name
   - Card: `4242 4242 4242 4242` (test card)
   - Expiry: `12/26`
   - CVC: `123`
3. Click "Pay"

**Expected:**
- Success message
- Console shows booking confirmation email
- Payment record saved
- Redirects to lobby

---

### Step 5: Simulate Webhooks
1. Go to [Webhook Simulator](webhook-simulator.html)
2. Click "Simulate Payment Success"
3. Check Event Log for webhook event
4. Open DevTools console to see email logs

**Expected:**
- Event appears in log
- Console shows webhook processing
- Shows what emails would be sent to customer & cleric

---

## Feature Breakdown

### 🔐 Authentication
- **Admin:** 30-day session, localStorage-based
- **Cleric:** 30-day session, separate authentication
- **Customer:** No login required (book as guest)
- Session check on every protected page

### 📅 Event Management
- Admin can add/edit live sermons
- Events persist in localStorage
- Events load in lobby carousel
- Export/import events as JSON

### 👨‍🎓 Cleric Management
- Clerics register with name, email, specialty, rate
- Admin must approve before accepting bookings
- Status: Pending → Approved or Rejected
- View all clerics, filter by status

### 💳 Booking & Payment
- Create booking with date, time, duration, topic
- Calculate total cost (rate × hours)
- Stripe test mode integration
- Payment records stored with booking reference
- Confirmation emails logged to console

### 📧 Email Notifications (Ready for Integration)
**Booking Confirmation:** Customer & Cleric
```
To: customer@example.com & cleric@example.com
Subject: New Booking Confirmation
- Cleric name, date, time, duration, topic
- Payment status
```

**Payment Confirmation:** Customer & Cleric
```
To: customer@example.com & cleric@example.com
Subject: Payment Received
- Amount, booking details
- Payment ID & Stripe token
```

**Cleric Approval:** New Cleric
```
To: cleric@example.com
Subject: Your Baba Ji Account Approved
- Account is now active
- Can accept bookings
- Next steps
```

### 🌐 Live Features
- **Talisman Tool:** Abjad calculator, QR codes, 99 names library with tabs
- **Lobby:** Traditional aesthetic (cream/navy/gold), cleric grid, sermon carousel
- **Language Support:** English, Urdu, Hindi, Bengali, Malay, Indonesian
- **Responsive Design:** Mobile, tablet, desktop

---

## Service Status: ALL COMPLETE ✅

### Core Services Built (6/6)
- ✅ **Email Service** (services-email.js) — Gmail MCP, SendGrid, Mailgun
- ✅ **SMS Service** (services-sms.js) — Twilio integration
- ✅ **Security** (services-security.js) — Passwords, sessions, rate limiting
- ✅ **Reviews** (services-reviews.js) — Ratings, admin moderation
- ✅ **Reminders** (services-reminders.js) — 4 reminder types, hourly processing
- ✅ **Webhooks** (services-webhooks.js) — Stripe payment events with audit logging
- ✅ **Availability** (services-availability.js) — Cleric schedules, time blocking
- ✅ **2FA** (auth-2fa.html) — TOTP with recovery codes

### Next: Integration into HTML Pages

#### Checkout Flow
- [ ] Import services-email.js, services-webhooks.js
- [ ] On payment success: call `sendEmail('paymentConfirmation', {...})`
- [ ] On payment webhook: process via `processWebhookEvent()`
- [ ] Show booking confirmation

#### Cleric Dashboard
- [ ] Import services-availability.js
- [ ] Add "Set Working Hours" form
- [ ] Call `setAvailability(clericId, dayOfWeek, startTime, endTime)`
- [ ] Display weekly schedule

#### Booking Modal
- [ ] Import services-availability.js
- [ ] Call `getAvailableSlots(clericId, date, 60)` to populate time picker
- [ ] On booking: call `sendEmail('bookingConfirmation', {...})`
- [ ] Call `RemindersService.scheduleReminder(bookingId, 'BEFORE_24H', {...})`

#### Admin Cleric Approval
- [ ] On approve: call `sendEmail('clericApproval', {cleric})`
- [ ] On reject: send rejection email

#### Review System
- [ ] Add review form in booking history
- [ ] On submit: call `submitReview(clericId, customerId, bookingId, ...)`
- [ ] Admin dashboard: show `getPendingReviews()`
- [ ] On approve: `approveReview(reviewId)` updates rating

### Production Deployment

#### Email & SMS Setup
- [ ] Set SENDGRID_API_KEY or MAILGUN credentials
- [ ] Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- [ ] Test email/SMS sending in staging

#### Backend Database
- [ ] Move from localStorage to database (Firebase, MongoDB, PostgreSQL)
- [ ] Update storage layer in each service
- [ ] Maintain same function signatures for drop-in replacement

#### Webhook Server
- [ ] Deploy services-webhooks.js on backend
- [ ] Set STRIPE_WEBHOOK_SECRET from Stripe dashboard
- [ ] Endpoint: POST /api/webhooks/stripe
- [ ] Set webhook URL in Stripe dashboard

#### Security Hardening (Production)
- [ ] Replace PasswordManager with bcrypt on backend
- [ ] Use HTTPS only + secure cookies
- [ ] Implement CSRF protection
- [ ] Add API authentication for webhooks
- [ ] Rate limiting per user/IP

### Optional Enhancements
- [ ] WhatsApp confirmations (Twilio)
- [ ] Calendar integration (Google Calendar, Outlook)
- [ ] Video call integration (Zoom, Google Meet)
- [ ] Advanced availability analytics

---

## File Structure

```
abjad-qr/
├── index.html                      # Talisman calculator
├── baba-ji-lobby-mockups.html      # Main lobby
├── admin-login.html                # Admin auth
├── admin.html                      # Event management
├── cleric-login.html               # Cleric auth & signup
├── cleric-dashboard.html           # Cleric profile
├── cleric-manager.html             # Admin cleric management
├── checkout.html                   # Payment page
├── webhook-simulator.html          # Testing hub
├── events.json                     # Live sermon data
├── demo-99-names.html              # 99 names reference
├── tools/
│   └── pre-push-guard.sh           # GitHub Pages safety
└── TESTING.md                      # This file
```

---

## Troubleshooting

### Sessions Expiring?
- Sessions now set to 30 days for testing
- Stored in localStorage/sessionStorage
- Clear browser storage to reset

### Emails Not Showing?
- Open DevTools (F12) → Console tab
- All email logs appear there
- For production, integrate actual email service

### Payment Not Working?
- Use Stripe test card: `4242 4242 4242 4242`
- Check browser console for errors
- Booking must be in localStorage first

### Cleric Not Appearing?
- Must sign up first via cleric-login.html
- Must be approved by admin in cleric-manager.html
- Check browser localStorage for clerics list

---

## API Reference (localStorage Keys)

```javascript
// Clerics
localStorage.getItem('babaJiClerics')           // Array of cleric objects

// Bookings
localStorage.getItem('babaJiBookings')          // Array of booking objects

// Payments
localStorage.getItem('babaJiPayments')          // Array of payment records

// Events
localStorage.getItem('babaJiEvents')            // Array of live sermon events

// Admin Session
localStorage.getItem('babaJiAdminSession')      // Session object with expiry

// Cleric Session
localStorage.getItem('babaJiClericSession')     // Session object with expiry
```

---

## Next Steps

1. **Test the full flow** above (Steps 1-5)
2. **Verify emails** in browser console
3. **Test webhook simulator** (Step 5)
4. **Deploy backend** for real email/webhook handling
5. **Migrate to database** from localStorage
6. **Add SMS/WhatsApp** notifications
7. **Go live** to production

---

## Support

For integration help, check:
- Cleric-manager.html — sendNotificationEmail() function
- Checkout.html — sendPaymentConfirmationEmail() function
- Webhook-simulator.html — Test event structure
- Events.json — Sample data format

All email stubs include TODO comments for production integration.
