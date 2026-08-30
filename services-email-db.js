/**
 * Email Service with Database Integration
 * Uses database adapter for audit logging and persistence
 *
 * Usage: this file is loaded as a plain script, NOT as an ES module.
 *   <script src="services-database.js"></script>
 *   <script src="services-email-db.js"></script>
 * sendEmail() is then a global. The `import {...} from` form shown here
 * previously does not work in any page in this repo and was never used.
 *
 * // Database logs all emails automatically
 * await sendEmail('customer@example.com', 'paymentConfirmation', {...})
 */

// Import database
let db;
try {
  db = getDatabase?.() || null;
} catch (e) {
  db = null;
}

// `process` does not exist in a browser, and checkout.html loads this file with a
// plain <script src>. An unguarded process.env read here throws ReferenceError at
// load time, which leaves the EMAIL_CONFIG const permanently in its temporal dead
// zone - so sendEmail() still exists (function declarations hoist) but every call
// to it rejects with "Cannot access 'EMAIL_CONFIG' before initialization".
// Guarded exactly the way the getDatabase lookup above is.
const ENV = (typeof process !== 'undefined' && process.env) ? process.env : {};

const EMAIL_CONFIG = {
  SENDGRID_API_KEY: ENV.SENDGRID_API_KEY || null,
  MAILGUN_API_KEY: ENV.MAILGUN_API_KEY || null,
  MAILGUN_DOMAIN: ENV.MAILGUN_DOMAIN || null,
  GMAIL_ACCOUNT: 'support@babaji.com',
  FROM_EMAIL: 'noreply@babaji.com',
  FROM_NAME: 'Baba Ji',
};

// Templates take ONE object and destructure it. They previously declared
// positional parameters - (payment, booking, customer) - while all three call
// sites invoke them as template(data) with a single object, so every template
// but the first parameter received undefined and threw on first property access.
const EMAIL_TEMPLATES = {
  bookingConfirmation: ({ booking, cleric, customer }) => ({
    subject: '✓ Booking Confirmed — Baba Ji',
    html: `
      <h2>Booking Confirmed</h2>
      <p>Dear ${customer.name},</p>
      <p>Your booking with <strong>${cleric.name}</strong> has been confirmed.</p>

      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Cleric:</strong> ${cleric.name} (${cleric.specialty})</li>
        <li><strong>Date:</strong> ${booking.date}</li>
        <li><strong>Time:</strong> ${booking.time}</li>
        <li><strong>Duration:</strong> ${booking.duration} minutes</li>
        <li><strong>Topic:</strong> ${booking.topic}</li>
        <li><strong>Rate:</strong> $${cleric.rate}/hour</li>
        <li><strong>Total:</strong> $${(cleric.rate * (booking.duration / 60)).toFixed(2)}</li>
      </ul>

      <p>A reminder will be sent 24 hours before your session.</p>
      <p>If you need to reschedule, please contact ${cleric.email}</p>
    `
  }),

  paymentConfirmation: ({ payment, booking, customer }) => ({
    subject: '💳 Payment Received — Baba Ji',
    html: `
      <h2>Payment Confirmed</h2>
      <p>Dear ${customer.name},</p>
      <p>Thank you for your payment of <strong>$${payment.amount} USD</strong>.</p>

      <h3>Payment Details:</h3>
      <ul>
        <li><strong>Payment ID:</strong> ${payment.id}</li>
        <li><strong>Amount:</strong> $${payment.amount}</li>
        <li><strong>Status:</strong> ${payment.status}</li>
        <li><strong>Date:</strong> ${new Date(payment.date).toLocaleString()}</li>
      </ul>

      <h3>Booking Reference:</h3>
      <p>Booking ID: ${payment.bookingId}</p>

      <p>Your session is confirmed and ready. Look for a reminder 24 hours before your scheduled time.</p>
    `
  }),

  clericApproval: ({ cleric }) => ({
    subject: '🎉 Your Baba Ji Account is Approved!',
    html: `
      <h2>Welcome to Baba Ji</h2>
      <p>Dear ${cleric.name},</p>
      <p>Great news! Your account has been reviewed and <strong>approved</strong>.</p>

      <h3>What's Next:</h3>
      <ol>
        <li>Log in to your <a href="https://babaji.com/cleric-dashboard.html">Cleric Dashboard</a></li>
        <li>Set your availability calendar</li>
        <li>Customize your profile</li>
        <li>Start accepting bookings!</li>
      </ol>

      <h3>Your Profile:</h3>
      <ul>
        <li><strong>Specialty:</strong> ${cleric.specialty}</li>
        <li><strong>Hourly Rate:</strong> $${cleric.rate}</li>
        <li><strong>Email:</strong> ${cleric.email}</li>
      </ul>

      <p>If you have any questions, reply to this email or contact support@babaji.com</p>
    `
  }),

  bookingReminder: ({ booking, cleric, customer }) => ({
    subject: '⏰ Reminder: Your Session Tomorrow with ' + cleric.name,
    html: `
      <h2>Session Reminder</h2>
      <p>Dear ${customer.name},</p>
      <p>Your session with <strong>${cleric.name}</strong> is scheduled for <strong>tomorrow at ${booking.time}</strong>.</p>

      <h3>Session Details:</h3>
      <ul>
        <li><strong>Cleric:</strong> ${cleric.name}</li>
        <li><strong>Time:</strong> ${booking.time}</li>
        <li><strong>Duration:</strong> ${booking.duration} minutes</li>
        <li><strong>Topic:</strong> ${booking.topic}</li>
      </ul>

      <p>Be prepared to join at the scheduled time. If you need to cancel or reschedule, contact ${cleric.email} as soon as possible.</p>
    `
  }),

  refundNotification: ({ payment, customer }) => ({
    subject: '💰 Refund Processed — Baba Ji',
    html: `
      <h2>Refund Processed</h2>
      <p>Dear ${customer.name},</p>
      <p>A refund of <strong>$${payment.amount}</strong> has been processed to your original payment method.</p>

      <h3>Refund Details:</h3>
      <ul>
        <li><strong>Amount:</strong> $${payment.amount}</li>
        <li><strong>Payment ID:</strong> ${payment.id}</li>
        <li><strong>Date Processed:</strong> ${new Date().toLocaleString()}</li>
      </ul>

      <p>Please allow 3-5 business days for the funds to appear in your account.</p>
    `
  }),

  sessionComplete: ({ booking, cleric, customer }) => ({
    subject: '✨ Session Complete — Leave a Review',
    html: `
      <h2>How was your session?</h2>
      <p>Dear ${customer.name},</p>
      <p>Thank you for your session with <strong>${cleric.name}</strong>!</p>

      <p>We'd love to hear about your experience. <a href="https://babaji.com">Leave a review →</a></p>

      <h3>Session Summary:</h3>
      <ul>
        <li><strong>Cleric:</strong> ${cleric.name}</li>
        <li><strong>Date:</strong> ${booking.date}</li>
        <li><strong>Topic:</strong> ${booking.topic}</li>
      </ul>

      <p>If you'd like to book another session, visit your <a href="https://babaji.com">dashboard</a>.</p>
    `
  })
};

async function sendViaGmailMCP(to, templateName, data) {
  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return false;
  }

  const emailData = template(data);

  try {
    console.log('[Gmail MCP] Sending email:', {
      to,
      subject: emailData.subject,
      from: EMAIL_CONFIG.FROM_EMAIL,
    });

    // Log to database
    if (db) {
      await db.create('emailLogs', {
        to,
        templateName,
        subject: emailData.subject,
        status: 'sent',
        provider: 'gmail_mcp',
        timestamp: new Date().toISOString()
      });
    }

    return true;
  } catch (error) {
    console.error('Gmail MCP send failed:', error);

    if (db) {
      await db.create('emailLogs', {
        to,
        templateName,
        subject: emailData.subject,
        status: 'failed',
        provider: 'gmail_mcp',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return false;
  }
}

async function sendViaSendGrid(to, templateName, data) {
  if (!EMAIL_CONFIG.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured');
    return false;
  }

  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return false;
  }

  const emailData = template(data);

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${EMAIL_CONFIG.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: EMAIL_CONFIG.FROM_EMAIL, name: EMAIL_CONFIG.FROM_NAME },
        subject: emailData.subject,
        content: [{ type: 'text/html', value: emailData.html }]
      })
    });

    if (response.ok) {
      console.log(`Email sent to ${to} via SendGrid`);

      if (db) {
        await db.create('emailLogs', {
          to,
          templateName,
          subject: emailData.subject,
          status: 'sent',
          provider: 'sendgrid',
          timestamp: new Date().toISOString()
        });
      }

      return true;
    } else {
      const error = await response.text();
      console.error('SendGrid error:', error);

      if (db) {
        await db.create('emailLogs', {
          to,
          templateName,
          subject: emailData.subject,
          status: 'failed',
          provider: 'sendgrid',
          error,
          timestamp: new Date().toISOString()
        });
      }

      return false;
    }
  } catch (error) {
    console.error('SendGrid send failed:', error);

    if (db) {
      await db.create('emailLogs', {
        to,
        templateName,
        subject: emailData.subject,
        status: 'failed',
        provider: 'sendgrid',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return false;
  }
}

async function sendViaMailgun(to, templateName, data) {
  if (!EMAIL_CONFIG.MAILGUN_API_KEY || !EMAIL_CONFIG.MAILGUN_DOMAIN) {
    console.warn('Mailgun credentials not configured');
    return false;
  }

  const template = EMAIL_TEMPLATES[templateName];
  if (!template) {
    console.error(`Template not found: ${templateName}`);
    return false;
  }

  const emailData = template(data);

  try {
    const formData = new FormData();
    formData.append('from', `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`);
    formData.append('to', to);
    formData.append('subject', emailData.subject);
    formData.append('html', emailData.html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${EMAIL_CONFIG.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa('api:' + EMAIL_CONFIG.MAILGUN_API_KEY)
        },
        body: formData
      }
    );

    if (response.ok) {
      console.log(`Email sent to ${to} via Mailgun`);

      if (db) {
        await db.create('emailLogs', {
          to,
          templateName,
          subject: emailData.subject,
          status: 'sent',
          provider: 'mailgun',
          timestamp: new Date().toISOString()
        });
      }

      return true;
    } else {
      const error = await response.text();
      console.error('Mailgun error:', error);

      if (db) {
        await db.create('emailLogs', {
          to,
          templateName,
          subject: emailData.subject,
          status: 'failed',
          provider: 'mailgun',
          error,
          timestamp: new Date().toISOString()
        });
      }

      return false;
    }
  } catch (error) {
    console.error('Mailgun send failed:', error);

    if (db) {
      await db.create('emailLogs', {
        to,
        templateName,
        subject: emailData.subject,
        status: 'failed',
        provider: 'mailgun',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    return false;
  }
}

async function sendEmail(to, templateName, data) {
  console.log(`Email queued: ${templateName} → ${to}`);

  if (EMAIL_CONFIG.GMAIL_ACCOUNT) {
    return sendViaGmailMCP(to, templateName, data);
  }

  if (EMAIL_CONFIG.SENDGRID_API_KEY) {
    return sendViaSendGrid(to, templateName, data);
  }

  if (EMAIL_CONFIG.MAILGUN_API_KEY && EMAIL_CONFIG.MAILGUN_DOMAIN) {
    return sendViaMailgun(to, templateName, data);
  }

  console.log(`[EMAIL FALLBACK] Would send ${templateName} to ${to}`);

  if (db) {
    await db.create('emailLogs', {
      to,
      templateName,
      status: 'logged_to_console',
      provider: 'fallback',
      timestamp: new Date().toISOString()
    });
  }

  return true;
}

async function sendEmailBatch(recipients, templateName, data) {
  const results = await Promise.all(
    recipients.map(to => sendEmail(to, templateName, data))
  );
  return results.every(r => r);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    sendEmail,
    sendEmailBatch,
    EMAIL_TEMPLATES,
    EMAIL_CONFIG
  };
}
