/**
 * Automated Reminders Service
 * Handles scheduling and sending reminders for bookings with clerics
 * Integrates with email and SMS services
 */

const STORAGE_KEY = 'babaJiReminders';
const PROCESSING_INTERVAL = 3600000; // Check every hour (1h in ms)
const REMINDER_TYPES = {
  BEFORE_24H: 'before_24h',
  BEFORE_1H: 'before_1h',
  REQUEST_REVIEW: 'request_review',
  FOLLOW_UP: 'follow_up'
};

const REMINDER_CONFIG = {
  [REMINDER_TYPES.BEFORE_24H]: {
    offsetMs: 24 * 60 * 60 * 1000, // 24 hours before
    recipient: ['customer', 'cleric'],
    template: 'before_24h'
  },
  [REMINDER_TYPES.BEFORE_1H]: {
    offsetMs: 60 * 60 * 1000, // 1 hour before
    recipient: ['customer', 'cleric'],
    template: 'before_1h'
  },
  [REMINDER_TYPES.REQUEST_REVIEW]: {
    offsetMs: 6 * 60 * 60 * 1000, // 6 hours after
    recipient: ['customer'],
    template: 'request_review'
  },
  [REMINDER_TYPES.FOLLOW_UP]: {
    offsetMs: 7 * 24 * 60 * 60 * 1000, // 7 days after
    recipient: ['customer'],
    template: 'follow_up'
  }
};

const MESSAGE_TEMPLATES = {
  before_24h: (data) => `Your session with ${data.clericName} is tomorrow at ${data.sessionTime}. Topic: ${data.topic}`,
  before_1h: (data) => `Your session with ${data.clericName} starts in 1 hour. Join now: ${data.joinLink}`,
  request_review: (data) => `How was your session with ${data.clericName}? Leave a review → ${data.reviewLink}`,
  follow_up: (data) => `Book another session with ${data.clericName}! → ${data.bookingLink}`
};

/**
 * Initialize reminders processing
 * Starts periodic check for due reminders
 */
function initializeRemindersProcessor() {
  if (typeof window !== 'undefined') {
    // Process reminders immediately on init
    processReminders();
    // Set up periodic processing
    setInterval(processReminders, PROCESSING_INTERVAL);
  }
}

/**
 * Schedule a reminder for a booking
 * @param {string} bookingId - Unique booking identifier
 * @param {string} reminderType - Type of reminder (REMINDER_TYPES)
 * @param {object} bookingData - Booking details (clericName, sessionTime, topic, etc.)
 * @returns {object} Created reminder object
 */
function scheduleReminder(bookingId, reminderType, bookingData) {
  if (!Object.values(REMINDER_TYPES).includes(reminderType)) {
    throw new Error(`Invalid reminder type: ${reminderType}`);
  }

  if (!bookingId || !bookingData) {
    throw new Error('bookingId and bookingData are required');
  }

  const config = REMINDER_CONFIG[reminderType];
  const bookingTime = new Date(bookingData.sessionTime).getTime();
  const scheduledTime = bookingTime - config.offsetMs;

  if (scheduledTime < Date.now()) {
    console.warn(`Scheduled time for ${reminderType} is in the past for booking ${bookingId}`);
  }

  const reminder = {
    id: `${bookingId}_${reminderType}`,
    bookingId,
    reminderType,
    scheduledTime,
    sent: false,
    createdAt: Date.now(),
    bookingData: {
      clericName: bookingData.clericName,
      clericEmail: bookingData.clericEmail,
      clericPhone: bookingData.clericPhone,
      customerName: bookingData.customerName,
      customerEmail: bookingData.customerEmail,
      customerPhone: bookingData.customerPhone,
      sessionTime: bookingData.sessionTime,
      topic: bookingData.topic,
      joinLink: bookingData.joinLink || '',
      reviewLink: bookingData.reviewLink || '',
      bookingLink: bookingData.bookingLink || ''
    }
  };

  // Store in localStorage
  const reminders = getScheduledReminders();
  const existingIndex = reminders.findIndex(r => r.id === reminder.id);

  if (existingIndex >= 0) {
    reminders[existingIndex] = reminder;
  } else {
    reminders.push(reminder);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
  } catch (error) {
    console.error('Failed to store reminder:', error);
  }

  return reminder;
}

/**
 * Get all scheduled reminders
 * @returns {array} Array of reminder objects
 */
function getScheduledReminders() {
  try {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to retrieve reminders:', error);
    return [];
  }
}

/**
 * Get pending reminders (not yet sent)
 * @returns {array} Array of unsent reminder objects
 */
function getPendingReminders() {
  return getScheduledReminders().filter(reminder => !reminder.sent);
}

/**
 * Get due reminders (scheduled time has passed)
 * @returns {array} Array of due reminder objects
 */
function getDueReminders() {
  const now = Date.now();
  return getPendingReminders().filter(reminder => reminder.scheduledTime <= now);
}

/**
 * Send a single reminder
 * @param {object} reminder - Reminder object
 * @returns {Promise<boolean>} Success status
 */
async function sendReminder(reminder) {
  const { bookingId, reminderType, bookingData } = reminder;
  const config = REMINDER_CONFIG[reminderType];

  if (!config) {
    console.error(`Unknown reminder type: ${reminderType}`);
    return false;
  }

  const messageTemplate = MESSAGE_TEMPLATES[config.template];
  if (!messageTemplate) {
    console.error(`Missing message template for: ${config.template}`);
    return false;
  }

  const message = messageTemplate(bookingData);
  const recipients = config.recipient;

  let emailsSent = false;
  let smsSent = false;

  try {
    // Send emails to recipients
    for (const recipientType of recipients) {
      const email = bookingData[`${recipientType}Email`];
      if (email && typeof sendEmail === 'function') {
        try {
          await sendEmail({
            to: email,
            subject: getEmailSubject(reminderType),
            body: message,
            bookingId,
            reminderType
          });
          emailsSent = true;
        } catch (error) {
          console.error(`Failed to send email to ${recipientType}:`, error);
        }
      }
    }

    // Send SMS to recipients
    for (const recipientType of recipients) {
      const phone = bookingData[`${recipientType}Phone`];
      if (phone && typeof sendSMS === 'function') {
        try {
          await sendSMS({
            to: phone,
            message: message,
            bookingId,
            reminderType
          });
          smsSent = true;
        } catch (error) {
          console.error(`Failed to send SMS to ${recipientType}:`, error);
        }
      }
    }

    // Mark as sent if at least one notification was successful
    if (emailsSent || smsSent) {
      updateReminderStatus(reminder.id, true);
      logReminderSent(reminder, message);
      return true;
    }
  } catch (error) {
    console.error(`Failed to send reminder ${reminder.id}:`, error);
  }

  return false;
}

/**
 * Process all due reminders
 * Checks which reminders are due and sends them
 * @returns {Promise<number>} Count of reminders sent
 */
async function processReminders() {
  const dueReminders = getDueReminders();

  if (dueReminders.length === 0) {
    return 0;
  }

  console.log(`Processing ${dueReminders.length} due reminders`);

  let sentCount = 0;
  for (const reminder of dueReminders) {
    const success = await sendReminder(reminder);
    if (success) {
      sentCount++;
    }
  }

  return sentCount;
}

/**
 * Cancel a scheduled reminder
 * @param {string} bookingId - Booking ID
 * @param {string} reminderType - Type of reminder
 * @returns {boolean} Whether reminder was found and deleted
 */
function cancelReminder(bookingId, reminderType) {
  const reminders = getScheduledReminders();
  const initialLength = reminders.length;

  const filtered = reminders.filter(
    reminder => !(reminder.bookingId === bookingId && reminder.reminderType === reminderType)
  );

  if (filtered.length < initialLength) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Failed to cancel reminder:', error);
      return false;
    }
  }

  return false;
}

/**
 * Cancel all reminders for a booking
 * @param {string} bookingId - Booking ID
 * @returns {number} Count of cancelled reminders
 */
function cancelAllReminders(bookingId) {
  const reminders = getScheduledReminders();
  const filtered = reminders.filter(reminder => reminder.bookingId !== bookingId);
  const cancelledCount = reminders.length - filtered.length;

  if (cancelledCount > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to cancel all reminders:', error);
    }
  }

  return cancelledCount;
}

/**
 * Update reminder status
 * @private
 * @param {string} reminderId - Reminder ID
 * @param {boolean} sent - Sent status
 */
function updateReminderStatus(reminderId, sent) {
  const reminders = getScheduledReminders();
  const reminder = reminders.find(r => r.id === reminderId);

  if (reminder) {
    reminder.sent = sent;
    reminder.sentAt = sent ? Date.now() : null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Failed to update reminder status:', error);
    }
  }
}

/**
 * Get email subject for reminder type
 * @private
 * @param {string} reminderType - Type of reminder
 * @returns {string} Email subject
 */
function getEmailSubject(reminderType) {
  const subjects = {
    [REMINDER_TYPES.BEFORE_24H]: 'Upcoming Session Tomorrow',
    [REMINDER_TYPES.BEFORE_1H]: 'Your Session Starts in 1 Hour',
    [REMINDER_TYPES.REQUEST_REVIEW]: 'Share Your Feedback',
    [REMINDER_TYPES.FOLLOW_UP]: 'Book Your Next Session'
  };
  return subjects[reminderType] || 'Session Reminder';
}

/**
 * Log reminder sent event
 * @private
 * @param {object} reminder - Reminder object
 * @param {string} message - Message sent
 */
function logReminderSent(reminder, message) {
  if (typeof console === 'undefined') return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    reminderType: reminder.reminderType,
    bookingId: reminder.bookingId,
    cleric: reminder.bookingData.clericName,
    customer: reminder.bookingData.customerName,
    message: message
  };

  console.log('Reminder sent:', logEntry);

  // Store in browser's session log if available
  if (window && window.reminderLogs) {
    window.reminderLogs.push(logEntry);
  }
}

/**
 * Get statistics on reminders
 * @returns {object} Reminder statistics
 */
function getReminderStats() {
  const reminders = getScheduledReminders();
  const now = Date.now();

  const stats = {
    total: reminders.length,
    pending: 0,
    sent: 0,
    due: 0,
    upcoming: 0,
    byType: {}
  };

  for (const reminder of reminders) {
    // Count by status
    if (reminder.sent) {
      stats.sent++;
    } else {
      stats.pending++;
      if (reminder.scheduledTime <= now) {
        stats.due++;
      } else {
        stats.upcoming++;
      }
    }

    // Count by type
    if (!stats.byType[reminder.reminderType]) {
      stats.byType[reminder.reminderType] = 0;
    }
    stats.byType[reminder.reminderType]++;
  }

  return stats;
}

/**
 * Clear all reminders (use with caution)
 * @param {boolean} confirmedDeletion - Must pass true to confirm deletion
 * @returns {number} Count of cleared reminders
 */
function clearAllReminders(confirmedDeletion = false) {
  if (!confirmedDeletion) {
    console.warn('clearAllReminders requires confirmedDeletion=true');
    return 0;
  }

  const reminders = getScheduledReminders();
  const count = reminders.length;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to clear reminders:', error);
  }

  return count;
}

/**
 * Export public API
 */
const RemindersService = {
  // Constants
  REMINDER_TYPES,

  // Initialization
  initialize: initializeRemindersProcessor,

  // Scheduling
  scheduleReminder,
  cancelReminder,
  cancelAllReminders,

  // Retrieval
  getScheduledReminders,
  getPendingReminders,
  getDueReminders,

  // Processing
  processReminders,
  sendReminder,

  // Utilities
  getReminderStats,
  clearAllReminders
};

// Export for use in Node.js or browsers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RemindersService;
}

// Also expose globally in browser
if (typeof window !== 'undefined') {
  window.RemindersService = RemindersService;
}
