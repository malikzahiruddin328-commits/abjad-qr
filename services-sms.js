/**
 * SMS Service Integration via Twilio
 * Sends SMS notifications for bookings, payments, reminders, and reviews
 *
 * Setup:
 * 1. Sign up at https://www.twilio.com
 * 2. Set environment variables:
 *    - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 *    - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 *    - TWILIO_PHONE_NUMBER: Your Twilio phone number (e.g., +1234567890)
 */

const SMS_CONFIG = {
  // PRODUCTION: Set these environment variables
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || null,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || null,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || null,

  // Base URL for Twilio API
  TWILIO_API_URL: 'https://api.twilio.com/2010-04-01/Accounts',
};

/**
 * SMS Templates (max 160 characters each for standard SMS)
 * Each template is a function that returns the SMS message text
 */
const SMS_TEMPLATES = {
  bookingConfirmation: (data) => {
    // Customer notification
    const msg = `Your booking with ${data.cleric} is confirmed for ${data.date} at ${data.time}. Booking ID: ${data.bookingId}. Reply HELP for support.`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  bookingConfirmationCleric: (data) => {
    // Cleric notification
    const msg = `New booking: ${data.customer} on ${data.date} at ${data.time} (${data.duration}min, ${data.topic}). Booking ID: ${data.bookingId}`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  paymentConfirmation: (data) => {
    const msg = `Payment received: $${data.amount}. Booking ID: ${data.bookingId}. Session confirmed. Reply HELP for support.`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  sessionReminder: (data) => {
    const msg = `Reminder: Session with ${data.cleric} tomorrow at ${data.time} (${data.topic}). Booking ID: ${data.bookingId}. Reply CANCEL to reschedule.`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  sessionReminderCleric: (data) => {
    const msg = `Session reminder: ${data.customer} tomorrow at ${data.time} (${data.topic}). Booking ID: ${data.bookingId}. Reply READY when you're on.`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  sessionComplete: (data) => {
    const msg = `Session complete! Thanks for booking with ${data.cleric}. Reply REVIEW to rate your experience or visit https://babaji.com`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  },

  refundNotification: (data) => {
    const msg = `Refund processed: $${data.amount} to your payment method. Booking ID: ${data.bookingId}. Allow 3-5 business days to appear.`;
    return msg.length > 160 ? msg.substring(0, 157) + '...' : msg;
  }
};

/**
 * Twilio API Request Builder
 */
function buildTwilioAuth() {
  const credentials = `${SMS_CONFIG.TWILIO_ACCOUNT_SID}:${SMS_CONFIG.TWILIO_AUTH_TOKEN}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Send SMS via Twilio
 * @param {string} phoneNumber - Recipient phone number (E.164 format, e.g., +1234567890)
 * @param {string} templateName - Name of the SMS template
 * @param {object} data - Data to populate the template
 * @returns {Promise<boolean>} - True if sent successfully
 */
async function sendSMSViaTwilio(phoneNumber, templateName, data) {
  if (!SMS_CONFIG.TWILIO_ACCOUNT_SID || !SMS_CONFIG.TWILIO_AUTH_TOKEN || !SMS_CONFIG.TWILIO_PHONE_NUMBER) {
    console.warn('Twilio credentials not configured. Falling back to console logging.');
    return false;
  }

  const template = SMS_TEMPLATES[templateName];
  if (!template) {
    console.error(`SMS template not found: ${templateName}`);
    return false;
  }

  const messageBody = template(data);

  try {
    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      console.error(`Invalid phone number format: ${phoneNumber}. Must be E.164 format (e.g., +1234567890)`);
      return false;
    }

    const body = new URLSearchParams();
    body.append('From', SMS_CONFIG.TWILIO_PHONE_NUMBER);
    body.append('To', phoneNumber);
    body.append('Body', messageBody);

    const response = await fetch(
      `${SMS_CONFIG.TWILIO_API_URL}/${SMS_CONFIG.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': buildTwilioAuth(),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(`SMS sent to ${phoneNumber}: ${result.sid}`);
      return true;
    } else {
      const error = await response.json();
      console.error(`Twilio error (${response.status}):`, error);
      return false;
    }
  } catch (error) {
    console.error('Twilio send failed:', error.message);
    return false;
  }
}

/**
 * Main SMS Send Function (with fallback to console)
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} templateName - Name of the SMS template
 * @param {object} data - Data to populate the template
 * @returns {Promise<boolean>} - True if sent (or logged in fallback mode)
 */
async function sendSMS(phoneNumber, templateName, data) {
  console.log(`[SMS] Queued: ${templateName} → ${phoneNumber}`);
  console.log('[SMS] Data:', data);

  // Try Twilio first
  if (SMS_CONFIG.TWILIO_ACCOUNT_SID && SMS_CONFIG.TWILIO_AUTH_TOKEN) {
    return sendSMSViaTwilio(phoneNumber, templateName, data);
  }

  // Fallback: Log to console (for testing/development)
  const template = SMS_TEMPLATES[templateName];
  if (template) {
    const messageBody = template(data);
    console.log(`[SMS FALLBACK] Would send to ${phoneNumber}:`);
    console.log(`Message (${messageBody.length} chars): ${messageBody}`);
    return true; // Pretend it was sent for testing
  } else {
    console.error(`[SMS FALLBACK] Template not found: ${templateName}`);
    return false;
  }
}

/**
 * Send SMS to Multiple Recipients
 * @param {string[]} phoneNumbers - Array of phone numbers
 * @param {string} templateName - Name of the SMS template
 * @param {object} data - Data to populate the template
 * @returns {Promise<boolean>} - True if all sent successfully
 */
async function sendSMSBatch(phoneNumbers, templateName, data) {
  if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    console.error('Invalid phone numbers array');
    return false;
  }

  console.log(`[SMS Batch] Sending ${templateName} to ${phoneNumbers.length} recipients`);

  const results = await Promise.all(
    phoneNumbers.map(phoneNumber => sendSMS(phoneNumber, templateName, data))
  );

  const successful = results.filter(r => r).length;
  console.log(`[SMS Batch] Success: ${successful}/${phoneNumbers.length}`);

  return results.every(r => r); // True only if all succeeded
}

/**
 * Send SMS to Customer and Cleric
 * Convenience function for booking confirmations
 * @param {string} customerPhone - Customer phone number
 * @param {string} clericPhone - Cleric phone number
 * @param {object} data - Booking data
 * @returns {Promise<boolean>}
 */
async function sendBookingConfirmationToAll(customerPhone, clericPhone, data) {
  const customerResult = await sendSMS(customerPhone, 'bookingConfirmation', data);
  const clericResult = await sendSMS(clericPhone, 'bookingConfirmationCleric', data);

  return customerResult && clericResult;
}

/**
 * Send Session Reminders to Customer and Cleric
 * @param {string} customerPhone - Customer phone number
 * @param {string} clericPhone - Cleric phone number
 * @param {object} data - Session data
 * @returns {Promise<boolean>}
 */
async function sendSessionRemindersToAll(customerPhone, clericPhone, data) {
  const customerResult = await sendSMS(customerPhone, 'sessionReminder', data);
  const clericResult = await sendSMS(clericPhone, 'sessionReminderCleric', data);

  return customerResult && clericResult;
}

/**
 * Format phone number to E.164 format
 * Converts various formats to +1234567890
 * @param {string} phoneNumber - Phone number in various formats
 * @param {string} countryCode - Optional country code (e.g., 'US', 'GB')
 * @returns {string} - Formatted phone number in E.164 format
 */
function formatPhoneNumber(phoneNumber, countryCode = 'US') {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');

  // Handle country codes
  let formatted = cleaned;
  if (countryCode === 'US' || countryCode === 'CA') {
    // North America
    if (cleaned.length === 10) {
      formatted = `1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formatted = cleaned;
    }
  } else if (countryCode === 'GB') {
    if (cleaned.startsWith('0')) {
      formatted = `44${cleaned.substring(1)}`;
    } else if (!cleaned.startsWith('44')) {
      formatted = `44${cleaned}`;
    }
  }
  // Add '+' prefix
  return formatted.startsWith('+') ? formatted : `+${formatted}`;
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid E.164 format
 */
function isValidPhoneNumber(phoneNumber) {
  // E.164 format: +[country code][number]
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
}

// ============================================================
// EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendSMS,
    sendSMSBatch,
    sendBookingConfirmationToAll,
    sendSessionRemindersToAll,
    formatPhoneNumber,
    isValidPhoneNumber,
    SMS_TEMPLATES,
    SMS_CONFIG
  };
}
