/**
 * Stripe Webhook Service
 * Handles Stripe webhook events: payments, refunds, subscriptions
 *
 * Production Integration:
 * 1. Set STRIPE_WEBHOOK_SECRET environment variable from Stripe dashboard
 * 2. Set STRIPE_WEBHOOK_ENDPOINT in your backend (e.g., /api/webhooks/stripe)
 * 3. Call processWebhookEvent() from your webhook receiver
 *
 * Requires:
 * - services-email.js (sendEmail, sendEmailBatch)
 * - services-sms.js (sendSMS) - or mock it if SMS not ready
 * - Crypto library (Node.js built-in or frontend crypto-js)
 */

// ============================================================
// CONFIGURATION
// ============================================================
const WEBHOOK_CONFIG = {
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || null,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 5000, // 5 seconds between retries
  WEBHOOK_LOG_RETENTION_DAYS: 90,
  AUDIT_LOG_KEY: 'babaji_webhook_audit_log'
};

// Webhook event type constants
const WEBHOOK_EVENTS = {
  CHARGE_SUCCEEDED: 'charge.succeeded',
  CHARGE_FAILED: 'charge.failed',
  CHARGE_REFUNDED: 'charge.refunded',
  SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed'
};

// ============================================================
// WEBHOOK SIGNATURE VERIFICATION (Crypto)
// ============================================================

/**
 * Verify Stripe webhook signature
 * Matches Stripe's HMAC-SHA256 verification
 *
 * Usage:
 *   const isValid = verifyWebhookSignature(rawBody, stripeSignature, secret);
 *
 * Note: In Express, you must use express.raw() middleware for rawBody:
 *   app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
 *     const isValid = verifyWebhookSignature(req.body, req.headers['stripe-signature'], secret);
 *   })
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.error('Webhook verification failed: missing signature or secret');
    return false;
  }

  try {
    // Extract timestamp and signed_hash from Stripe signature header
    // Format: t=<timestamp>,v1=<hash>
    const parts = signature.split(',');
    let timestamp = null;
    let hash = null;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') hash = value;
    }

    if (!timestamp || !hash) {
      console.error('Webhook verification failed: invalid signature format');
      return false;
    }

    // Reconstruct the signed content: timestamp.payload
    const signedContent = `${timestamp}.${payload}`;

    // Generate HMAC-SHA256
    const crypto = require('crypto');
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(expectedHash)
    );

    // Optional: Check timestamp is recent (prevent replay attacks)
    // Allow 5 minutes of clock skew
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = 5 * 60;
    if (Math.abs(currentTime - parseInt(timestamp)) > maxAge) {
      console.warn('Webhook verification warning: signature timestamp too old');
      return false;
    }

    return isValid;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

/**
 * Browser-compatible signature verification (if needed)
 * Note: For browser, you'd typically receive pre-verified events from backend
 */
async function verifyWebhookSignatureBrowser(payload, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const parts = signature.split(',');
    let timestamp = null;
    let hash = null;

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') hash = value;
    }

    if (!timestamp || !hash) return false;

    const signedContent = `${timestamp}.${payload}`;
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(signedContent)
    );

    const expectedHash = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return expectedHash === hash;
  } catch (error) {
    console.error('Browser webhook verification error:', error);
    return false;
  }
}

// ============================================================
// WEBHOOK EVENT HANDLERS
// ============================================================

/**
 * Handle charge.succeeded event
 * - Payment completed successfully
 * - Update booking status to "confirmed"
 * - Send confirmation emails to customer and cleric
 * - Send SMS reminder
 */
async function handleChargeSucceeded(event) {
  const charge = event.data.object;
  const bookingId = charge.metadata?.bookingId;
  const customerId = charge.customer;
  const chargeId = charge.id;
  const amount = charge.amount / 100; // Convert cents to dollars
  const customerEmail = charge.receipt_email || charge.customer_email;

  console.log('[Webhook] Processing charge.succeeded:', {
    chargeId,
    bookingId,
    amount,
    customerEmail,
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Fetch booking details from database/localStorage
    const booking = await fetchBooking(bookingId);
    if (!booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    // 2. Fetch customer details
    const customer = await fetchCustomer(customerId) || {
      id: customerId,
      email: customerEmail,
      name: 'Valued Customer'
    };

    // 3. Fetch cleric details
    const cleric = await fetchCleric(booking.clericId);
    if (!cleric) {
      throw new Error(`Cleric not found: ${booking.clericId}`);
    }

    // 4. Update booking status
    await updateBookingStatus(bookingId, {
      status: 'confirmed',
      paymentId: chargeId,
      paymentStatus: 'succeeded',
      paidAt: new Date().toISOString(),
      amount: amount
    });

    // 5. Send confirmation emails
    await sendEmail(
      customer.email,
      'paymentConfirmation',
      {
        payment: {
          id: chargeId,
          amount,
          status: 'succeeded',
          date: new Date().toISOString(),
          bookingId
        },
        booking,
        customer
      }
    );

    // Send to cleric as well
    await sendEmail(
      cleric.email,
      'bookingConfirmation',
      {
        booking,
        cleric,
        customer
      }
    );

    // 6. Send SMS confirmation (if phone available)
    if (customer.phone) {
      await sendSMS(
        customer.phone,
        `Baba Ji: Payment confirmed! Your booking with ${cleric.name} on ${booking.date} at ${booking.time} is confirmed. Reply STOP to opt out.`
      );
    }

    // 7. Log webhook processing success
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_SUCCEEDED, 'success', {
      bookingId,
      chargeId,
      amount,
      customerEmail
    });

    return {
      success: true,
      event: event.id,
      bookingId,
      message: 'Charge succeeded - confirmation sent'
    };
  } catch (error) {
    console.error('[Webhook Error] charge.succeeded:', error);
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_SUCCEEDED, 'failed', {
      error: error.message,
      bookingId
    });
    throw error;
  }
}

/**
 * Handle charge.failed event
 * - Payment was declined
 * - Send failure notification to customer
 * - Keep booking status as "pending_payment"
 */
async function handleChargeFailed(event) {
  const charge = event.data.object;
  const bookingId = charge.metadata?.bookingId;
  const customerId = charge.customer;
  const chargeId = charge.id;
  const failureReason = charge.failure_message || 'Payment was declined';
  const customerEmail = charge.receipt_email || charge.customer_email;

  console.log('[Webhook] Processing charge.failed:', {
    chargeId,
    bookingId,
    failureReason,
    customerEmail,
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Fetch booking and customer
    const booking = await fetchBooking(bookingId);
    const customer = await fetchCustomer(customerId) || {
      id: customerId,
      email: customerEmail,
      name: 'Valued Customer'
    };

    // 2. Update booking status (keep as pending_payment)
    await updateBookingStatus(bookingId, {
      status: 'pending_payment',
      paymentStatus: 'failed',
      failureReason,
      failedAt: new Date().toISOString()
    });

    // 3. Send failure notification email
    await sendEmail(
      customer.email,
      'paymentFailed',
      {
        customer,
        booking,
        reason: failureReason,
        chargeId
      }
    );

    // 4. Send SMS notification
    if (customer.phone) {
      await sendSMS(
        customer.phone,
        `Baba Ji: Payment failed - ${failureReason}. Please retry or contact support@babaji.com`
      );
    }

    // 5. Log webhook event
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_FAILED, 'success', {
      bookingId,
      chargeId,
      reason: failureReason
    });

    return {
      success: true,
      event: event.id,
      bookingId,
      message: 'Charge failed - customer notified'
    };
  } catch (error) {
    console.error('[Webhook Error] charge.failed:', error);
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_FAILED, 'failed', {
      error: error.message,
      bookingId
    });
    throw error;
  }
}

/**
 * Handle charge.refunded event
 * - Refund was issued
 * - Update booking status
 * - Send refund confirmation to customer
 */
async function handleChargeRefunded(event) {
  const charge = event.data.object;
  const chargeId = charge.id;
  const bookingId = charge.metadata?.bookingId;
  const customerId = charge.customer;
  const refundAmount = charge.amount_refunded / 100; // cents to dollars
  const customerEmail = charge.receipt_email || charge.customer_email;

  console.log('[Webhook] Processing charge.refunded:', {
    chargeId,
    bookingId,
    refundAmount,
    customerEmail,
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Fetch booking and customer
    const booking = await fetchBooking(bookingId);
    const customer = await fetchCustomer(customerId) || {
      id: customerId,
      email: customerEmail,
      name: 'Valued Customer'
    };

    // 2. Update booking status
    const newStatus = refundAmount >= (charge.amount / 100) ? 'refunded' : 'partially_refunded';
    await updateBookingStatus(bookingId, {
      status: newStatus,
      refundStatus: 'processed',
      refundAmount,
      refundedAt: new Date().toISOString()
    });

    // 3. Send refund confirmation email
    await sendEmail(
      customer.email,
      'refundNotification',
      {
        payment: {
          id: chargeId,
          amount: refundAmount,
          bookingId
        },
        customer
      }
    );

    // 4. Send SMS refund notification
    if (customer.phone) {
      await sendSMS(
        customer.phone,
        `Baba Ji: Refund of $${refundAmount.toFixed(2)} has been processed. Allow 3-5 business days.`
      );
    }

    // 5. Log webhook event
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_REFUNDED, 'success', {
      bookingId,
      chargeId,
      refundAmount,
      status: newStatus
    });

    return {
      success: true,
      event: event.id,
      bookingId,
      message: 'Refund processed - customer notified'
    };
  } catch (error) {
    console.error('[Webhook Error] charge.refunded:', error);
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.CHARGE_REFUNDED, 'failed', {
      error: error.message,
      bookingId
    });
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * - Recurring booking subscription changed
 * - Handle plan changes, cancellations
 */
async function handleSubscriptionUpdated(event) {
  const subscription = event.data.object;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer;
  const status = subscription.status; // active, past_due, canceled, etc.

  console.log('[Webhook] Processing customer.subscription.updated:', {
    subscriptionId,
    customerId,
    status,
    timestamp: new Date().toISOString()
  });

  try {
    // 1. Fetch customer details
    const customer = await fetchCustomer(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // 2. Update subscription status in database
    await updateSubscription(subscriptionId, {
      status,
      lastUpdated: new Date().toISOString(),
      metadata: subscription.metadata
    });

    // 3. Send appropriate notification based on status
    let template = 'subscriptionUpdated';
    if (status === 'canceled') {
      template = 'subscriptionCanceled';
    } else if (status === 'past_due') {
      template = 'subscriptionPastDue';
    }

    await sendEmail(customer.email, template, {
      subscription,
      customer,
      status
    });

    // 4. Log webhook event
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED, 'success', {
      subscriptionId,
      customerId,
      status
    });

    return {
      success: true,
      event: event.id,
      subscriptionId,
      message: 'Subscription updated - customer notified'
    };
  } catch (error) {
    console.error('[Webhook Error] customer.subscription.updated:', error);
    await logWebhookEvent(event.id, WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED, 'failed', {
      error: error.message,
      subscriptionId
    });
    throw error;
  }
}

// ============================================================
// EVENT ROUTING & PROCESSING
// ============================================================

/**
 * Main webhook processor
 * Routes events to appropriate handlers with retry logic
 */
async function processWebhookEvent(event, retryCount = 0) {
  const eventId = event.id;
  const eventType = event.type;

  console.log('[Webhook] Processing event:', {
    id: eventId,
    type: eventType,
    attempt: retryCount + 1,
    timestamp: new Date().toISOString()
  });

  try {
    // Route to appropriate handler
    let result;
    switch (eventType) {
      case WEBHOOK_EVENTS.CHARGE_SUCCEEDED:
        result = await handleChargeSucceeded(event);
        break;
      case WEBHOOK_EVENTS.CHARGE_FAILED:
        result = await handleChargeFailed(event);
        break;
      case WEBHOOK_EVENTS.CHARGE_REFUNDED:
        result = await handleChargeRefunded(event);
        break;
      case WEBHOOK_EVENTS.SUBSCRIPTION_UPDATED:
        result = await handleSubscriptionUpdated(event);
        break;
      case WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED:
      case WEBHOOK_EVENTS.INVOICE_PAYMENT_FAILED:
        // Treat invoice payments similarly to charges
        result = await handleInvoicePayment(event);
        break;
      default:
        console.warn('[Webhook] Unknown event type:', eventType);
        await logWebhookEvent(eventId, eventType, 'ignored', {
          reason: 'Unknown event type'
        });
        return { success: true, message: 'Event type not handled' };
    }

    return result;
  } catch (error) {
    console.error('[Webhook] Processing error:', error);

    // Retry logic
    if (retryCount < WEBHOOK_CONFIG.MAX_RETRIES) {
      console.log(`[Webhook] Retrying event ${eventId}... (attempt ${retryCount + 2}/${WEBHOOK_CONFIG.MAX_RETRIES + 1})`);

      await new Promise(resolve =>
        setTimeout(resolve, WEBHOOK_CONFIG.RETRY_DELAY_MS * (retryCount + 1))
      );

      return processWebhookEvent(event, retryCount + 1);
    }

    // Max retries exceeded
    await logWebhookEvent(eventId, eventType, 'failed_max_retries', {
      error: error.message,
      retryCount
    });

    throw new Error(`Webhook processing failed after ${WEBHOOK_CONFIG.MAX_RETRIES} retries: ${error.message}`);
  }
}

/**
 * Handle invoice payment events (similar to charges)
 */
async function handleInvoicePayment(event) {
  const invoice = event.data.object;
  const isSuccessful = event.type === WEBHOOK_EVENTS.INVOICE_PAYMENT_SUCCEEDED;

  console.log('[Webhook] Processing invoice payment:', {
    invoiceId: invoice.id,
    successful: isSuccessful,
    amount: invoice.total / 100
  });

  // Similar processing to charges
  // This is a simplified version - expand as needed
  await logWebhookEvent(event.id, event.type, 'success', {
    invoiceId: invoice.id,
    successful: isSuccessful
  });

  return {
    success: true,
    event: event.id,
    message: `Invoice payment ${isSuccessful ? 'succeeded' : 'failed'}`
  };
}

// ============================================================
// WEBHOOK EVENT LOGGING & AUDIT TRAIL
// ============================================================

/**
 * Log webhook events for audit trail and debugging
 * Stores in localStorage for frontend or database for backend
 */
async function logWebhookEvent(eventId, eventType, status, metadata = {}) {
  const logEntry = {
    id: eventId,
    type: eventType,
    status, // 'success', 'failed', 'failed_max_retries', 'ignored'
    timestamp: new Date().toISOString(),
    metadata
  };

  // Log to console
  console.log('[Webhook Audit]', logEntry);

  try {
    // Backend: Store in database
    if (typeof window === 'undefined') {
      // Node.js environment
      await storeWebhookLogDatabase(logEntry);
    } else {
      // Browser environment: Use localStorage
      const logs = JSON.parse(
        localStorage.getItem(WEBHOOK_CONFIG.AUDIT_LOG_KEY) || '[]'
      );
      logs.unshift(logEntry);

      // Keep only last 1000 entries
      const trimmed = logs.slice(0, 1000);
      localStorage.setItem(WEBHOOK_CONFIG.AUDIT_LOG_KEY, JSON.stringify(trimmed));
    }

    return logEntry;
  } catch (error) {
    console.error('[Webhook Audit] Failed to log event:', error);
    // Don't throw - logging failure shouldn't break webhook processing
  }
}

/**
 * Get webhook audit logs
 */
function getWebhookLogs(limit = 100) {
  try {
    if (typeof window === 'undefined') {
      // Backend: Fetch from database
      return fetchWebhookLogsDatabase(limit);
    } else {
      // Browser: Get from localStorage
      const logs = JSON.parse(
        localStorage.getItem(WEBHOOK_CONFIG.AUDIT_LOG_KEY) || '[]'
      );
      return logs.slice(0, limit);
    }
  } catch (error) {
    console.error('[Webhook Audit] Failed to retrieve logs:', error);
    return [];
  }
}

/**
 * Clear old webhook logs (retention policy)
 */
async function cleanupWebhookLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - WEBHOOK_CONFIG.WEBHOOK_LOG_RETENTION_DAYS);

  try {
    if (typeof window === 'undefined') {
      // Backend: Delete from database
      await deleteWebhookLogsDatabase(cutoffDate);
    } else {
      // Browser: Filter localStorage
      const logs = JSON.parse(
        localStorage.getItem(WEBHOOK_CONFIG.AUDIT_LOG_KEY) || '[]'
      );
      const filtered = logs.filter(
        log => new Date(log.timestamp) > cutoffDate
      );
      localStorage.setItem(WEBHOOK_CONFIG.AUDIT_LOG_KEY, JSON.stringify(filtered));
    }
  } catch (error) {
    console.error('[Webhook Audit] Cleanup failed:', error);
  }
}

// ============================================================
// DATA FETCHING (Backend/Database Stubs)
// These should be implemented to fetch from your actual database
// ============================================================

async function fetchBooking(bookingId) {
  // TODO: Implement database fetch
  // return await db.bookings.findById(bookingId);
  console.log('[Database] Fetching booking:', bookingId);
  return null;
}

async function fetchCustomer(customerId) {
  // TODO: Implement database fetch
  // return await db.customers.findById(customerId);
  console.log('[Database] Fetching customer:', customerId);
  return null;
}

async function fetchCleric(clericId) {
  // TODO: Implement database fetch
  // return await db.clerics.findById(clericId);
  console.log('[Database] Fetching cleric:', clericId);
  return null;
}

async function updateBookingStatus(bookingId, updates) {
  // TODO: Implement database update
  // return await db.bookings.update(bookingId, updates);
  console.log('[Database] Updating booking:', bookingId, updates);
  return { success: true };
}

async function updateSubscription(subscriptionId, updates) {
  // TODO: Implement database update
  // return await db.subscriptions.update(subscriptionId, updates);
  console.log('[Database] Updating subscription:', subscriptionId, updates);
  return { success: true };
}

async function storeWebhookLogDatabase(logEntry) {
  // TODO: Implement database insert
  // return await db.webhookLogs.insert(logEntry);
  console.log('[Database] Storing webhook log:', logEntry);
}

async function fetchWebhookLogsDatabase(limit) {
  // TODO: Implement database query
  // return await db.webhookLogs.find().sort({timestamp: -1}).limit(limit);
  console.log('[Database] Fetching webhook logs (limit:', limit + ')');
  return [];
}

async function deleteWebhookLogsDatabase(beforeDate) {
  // TODO: Implement database delete
  // return await db.webhookLogs.deleteMany({timestamp: {$lt: beforeDate}});
  console.log('[Database] Deleting webhook logs before:', beforeDate);
}

// ============================================================
// SMS SERVICE STUB
// Placeholder for SMS notifications (sendSMS from services-sms.js)
// ============================================================

async function sendSMS(phone, message) {
  // TODO: Import from services-sms.js when available
  // return await sendSMS(phone, message);
  console.log('[SMS Stub]', { phone, message });
  // For now, just log it
  return true;
}

// ============================================================
// EMAIL SERVICE INTEGRATION
// Assumes services-email.js is loaded
// ============================================================

// Check if sendEmail is available (from services-email.js)
async function sendEmail(to, templateName, data) {
  try {
    if (typeof module !== 'undefined' && module.exports) {
      // Node.js environment
      const emailService = require('./services-email.js');
      return await emailService.sendEmail(to, templateName, data);
    } else if (typeof window !== 'undefined' && window.sendEmail) {
      // Browser environment
      return await window.sendEmail(to, templateName, data);
    } else {
      console.warn('[Email] Email service not available, logging instead');
      console.log(`[Email Stub] Sending ${templateName} to ${to}:`, data);
      return true;
    }
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    throw error;
  }
}

// Email templates specific to webhooks
const WEBHOOK_EMAIL_TEMPLATES = {
  paymentFailed: (customer, booking, reason) => ({
    subject: '❌ Payment Failed — Baba Ji',
    html: `
      <h2>Payment Could Not Be Processed</h2>
      <p>Dear ${customer.name},</p>
      <p>Unfortunately, your payment was declined with the following reason:</p>
      <p><strong>${reason}</strong></p>

      <h3>What to do:</h3>
      <ol>
        <li>Check that your card details are correct</li>
        <li>Verify your card has sufficient funds</li>
        <li>Try again with a different payment method</li>
        <li>Contact your bank if you continue to experience issues</li>
      </ol>

      <p>Your booking is still reserved. <a href="https://babaji.com/checkout.html">Retry Payment →</a></p>
      <p>Need help? Contact support@babaji.com</p>
    `
  }),

  subscriptionCanceled: (customer, subscription) => ({
    subject: '⏸ Subscription Canceled — Baba Ji',
    html: `
      <h2>Your Subscription Has Been Canceled</h2>
      <p>Dear ${customer.name},</p>
      <p>Your recurring booking subscription has been canceled effective immediately.</p>

      <h3>What happens now:</h3>
      <ul>
        <li>No further charges will be made</li>
        <li>Your existing bookings remain valid</li>
        <li>You can book new sessions anytime</li>
      </ul>

      <p>We'd love to have you back. <a href="https://babaji.com">Book a Session →</a></p>
    `
  }),

  subscriptionPastDue: (customer, subscription) => ({
    subject: '⚠ Payment Past Due — Baba Ji',
    html: `
      <h2>Subscription Payment Past Due</h2>
      <p>Dear ${customer.name},</p>
      <p>We were unable to process your subscription payment.</p>

      <p>Please update your payment method to continue your bookings.</p>
      <p><a href="https://babaji.com/account/billing">Update Payment Method →</a></p>
    `
  })
};

// ============================================================
// EXPORT FOR NODE.JS
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Core functions
    verifyWebhookSignature,
    verifyWebhookSignatureBrowser,
    processWebhookEvent,

    // Event handlers
    handleChargeSucceeded,
    handleChargeFailed,
    handleChargeRefunded,
    handleSubscriptionUpdated,

    // Logging & audit
    logWebhookEvent,
    getWebhookLogs,
    cleanupWebhookLogs,

    // Configuration
    WEBHOOK_CONFIG,
    WEBHOOK_EVENTS,
    WEBHOOK_EMAIL_TEMPLATES
  };
}

// ============================================================
// BROWSER INTEGRATION
// ============================================================
if (typeof window !== 'undefined') {
  window.webhookService = {
    verifyWebhookSignature,
    verifyWebhookSignatureBrowser,
    processWebhookEvent,
    logWebhookEvent,
    getWebhookLogs,
    cleanupWebhookLogs,
    WEBHOOK_EVENTS,
    WEBHOOK_CONFIG
  };
}
