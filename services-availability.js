/**
 * Cleric Availability & Schedule Management
 * Manages working hours, availability slots, and booking prevention
 *
 * Features:
 * - Weekly availability schedules per cleric
 * - Time-based availability checks
 * - Block time management (holidays, breaks, maintenance)
 * - Available slot generation
 * - Double-booking prevention
 * - localStorage persistence
 *
 * Usage:
 * 1. Set availability: setAvailability(clericId, dayOfWeek, startTime, endTime)
 * 2. Check if available: isClericAvailable(clericId, date, time, duration)
 * 3. Get available slots: getAvailableSlots(clericId, date, duration)
 * 4. Block time: blockTime(clericId, date, startTime, endTime, reason)
 */

// ============================================================
// CONSTANTS & CONFIGURATION
// ============================================================
const AVAILABILITY_CONFIG = {
  STORAGE_KEY: 'babaJiAvailability',
  BLOCKED_TIMES_KEY: 'babaJiBlockedTimes',
  SLOT_DURATION_MINUTES: 30, // Minimum slot granularity
  MAX_ADVANCE_BOOKING_DAYS: 90, // Can't book more than 90 days ahead
  MIN_BOOKING_HOURS_AHEAD: 2, // Must book at least 2 hours in advance
  TIMEZONE: 'UTC', // Change if needed: 'America/New_York', 'Europe/London', etc.
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ============================================================
// DATA STRUCTURES & INITIALIZATION
// ============================================================

/**
 * Availability Data Structure:
 * {
 *   clericId: string,
 *   dayOfWeek: number (0-6, Sunday-Saturday),
 *   startTime: string (HH:MM, 24h format),
 *   endTime: string (HH:MM, 24h format),
 *   isAvailable: boolean
 * }
 */

/**
 * Blocked Time Data Structure:
 * {
 *   clericId: string,
 *   date: string (YYYY-MM-DD),
 *   startTime: string (HH:MM, 24h format),
 *   endTime: string (HH:MM, 24h format),
 *   reason: string (e.g., 'Holiday', 'Personal Break', 'Maintenance'),
 *   createdAt: timestamp
 * }
 */

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate time format (HH:MM in 24h format)
 * @param {string} time - Time string to validate
 * @returns {boolean} - True if valid
 */
function isValidTimeFormat(time) {
  if (typeof time !== 'string') return false;
  const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
  return regex.test(time);
}

/**
 * Validate day of week (0-6)
 * @param {number} dayOfWeek - Day to validate
 * @returns {boolean} - True if valid
 */
function isValidDayOfWeek(dayOfWeek) {
  return Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6;
}

/**
 * Validate date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid
 */
function isValidDateFormat(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date);
}

/**
 * Parse time string to minutes since midnight
 * @param {string} time - Time in HH:MM format
 * @returns {number} - Minutes since midnight
 */
function timeToMinutes(time) {
  if (!isValidTimeFormat(time)) throw new Error(`Invalid time format: ${time}`);
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight back to HH:MM format
 * @param {number} minutes - Minutes since midnight
 * @returns {string} - Time in HH:MM format
 */
function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Check if time1 is before time2
 * @param {string} time1 - First time in HH:MM format
 * @param {string} time2 - Second time in HH:MM format
 * @returns {boolean} - True if time1 < time2
 */
function isTimeBefore(time1, time2) {
  return timeToMinutes(time1) < timeToMinutes(time2);
}

/**
 * Check if time is within range [startTime, endTime)
 * @param {string} time - Time to check
 * @param {string} startTime - Range start
 * @param {string} endTime - Range end
 * @returns {boolean} - True if within range
 */
function isTimeInRange(time, startTime, endTime) {
  const timeMin = timeToMinutes(time);
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  return timeMin >= startMin && timeMin < endMin;
}

/**
 * Add minutes to a time string
 * @param {string} time - Time in HH:MM format
 * @param {number} minutesToAdd - Minutes to add
 * @returns {string} - New time in HH:MM format
 */
function addMinutesToTime(time, minutesToAdd) {
  let totalMinutes = timeToMinutes(time) + minutesToAdd;
  // Handle day overflow (shouldn't happen in valid scenarios)
  totalMinutes = totalMinutes % (24 * 60);
  return minutesToTime(totalMinutes);
}

// ============================================================
// STORAGE UTILITIES
// ============================================================

/**
 * Get availability data from localStorage
 * @returns {object} - Availability data keyed by clericId
 */
function getAvailabilityData() {
  try {
    const data = localStorage.getItem(AVAILABILITY_CONFIG.STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading availability data:', error);
    return {};
  }
}

/**
 * Save availability data to localStorage
 * @param {object} data - Availability data to save
 * @returns {boolean} - True if successful
 */
function saveAvailabilityData(data) {
  try {
    localStorage.setItem(AVAILABILITY_CONFIG.STORAGE_KEY, JSON.stringify(data));
    console.log('Availability data saved to localStorage');
    return true;
  } catch (error) {
    console.error('Error saving availability data:', error);
    return false;
  }
}

/**
 * Get blocked times from localStorage
 * @returns {array} - Array of blocked time entries
 */
function getBlockedTimesData() {
  try {
    const data = localStorage.getItem(AVAILABILITY_CONFIG.BLOCKED_TIMES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading blocked times data:', error);
    return [];
  }
}

/**
 * Save blocked times to localStorage
 * @param {array} blockedTimes - Array of blocked time entries
 * @returns {boolean} - True if successful
 */
function saveBlockedTimesData(blockedTimes) {
  try {
    localStorage.setItem(AVAILABILITY_CONFIG.BLOCKED_TIMES_KEY, JSON.stringify(blockedTimes));
    console.log('Blocked times data saved to localStorage');
    return true;
  } catch (error) {
    console.error('Error saving blocked times data:', error);
    return false;
  }
}

// ============================================================
// AVAILABILITY MANAGEMENT
// ============================================================

/**
 * Set or update availability for a cleric on a specific day
 * @param {string} clericId - Unique cleric identifier
 * @param {number} dayOfWeek - Day (0-6, Sunday-Saturday)
 * @param {string} startTime - Start time (HH:MM, 24h)
 * @param {string} endTime - End time (HH:MM, 24h)
 * @returns {object} - Result with success status and message
 */
function setAvailability(clericId, dayOfWeek, startTime, endTime) {
  // Validation
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }
  if (!isValidDayOfWeek(dayOfWeek)) {
    return { success: false, error: `Invalid day of week: ${dayOfWeek}` };
  }
  if (!isValidTimeFormat(startTime)) {
    return { success: false, error: `Invalid startTime format: ${startTime}` };
  }
  if (!isValidTimeFormat(endTime)) {
    return { success: false, error: `Invalid endTime format: ${endTime}` };
  }
  if (!isTimeBefore(startTime, endTime)) {
    return { success: false, error: 'startTime must be before endTime' };
  }

  try {
    const data = getAvailabilityData();
    if (!data[clericId]) {
      data[clericId] = {};
    }

    const key = `day_${dayOfWeek}`;
    data[clericId][key] = {
      dayOfWeek,
      startTime,
      endTime,
      isAvailable: true,
      updatedAt: new Date().toISOString()
    };

    saveAvailabilityData(data);
    console.log(`Availability set for cleric ${clericId} on ${DAY_NAMES[dayOfWeek]}: ${startTime}-${endTime}`);

    return {
      success: true,
      message: `Availability updated for ${DAY_NAMES[dayOfWeek]}`
    };
  } catch (error) {
    console.error('Error setting availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get weekly availability schedule for a cleric
 * @param {string} clericId - Unique cleric identifier
 * @returns {object} - Weekly schedule with slots for each day
 */
function getAvailability(clericId) {
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }

  try {
    const data = getAvailabilityData();
    const clericData = data[clericId] || {};

    // Build weekly schedule
    const schedule = {};
    for (let day = 0; day < 7; day++) {
      const key = `day_${day}`;
      schedule[DAY_NAMES[day]] = clericData[key] || {
        dayOfWeek: day,
        startTime: null,
        endTime: null,
        isAvailable: false
      };
    }

    return {
      success: true,
      clericId,
      schedule,
      rawData: clericData
    };
  } catch (error) {
    console.error('Error getting availability:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a day as unavailable
 * @param {string} clericId - Unique cleric identifier
 * @param {number} dayOfWeek - Day to mark unavailable
 * @returns {object} - Result with success status
 */
function setDayUnavailable(clericId, dayOfWeek) {
  if (!isValidDayOfWeek(dayOfWeek)) {
    return { success: false, error: `Invalid day of week: ${dayOfWeek}` };
  }

  try {
    const data = getAvailabilityData();
    if (!data[clericId]) {
      data[clericId] = {};
    }

    const key = `day_${dayOfWeek}`;
    if (data[clericId][key]) {
      data[clericId][key].isAvailable = false;
    }

    saveAvailabilityData(data);
    console.log(`Day ${DAY_NAMES[dayOfWeek]} marked unavailable for cleric ${clericId}`);

    return {
      success: true,
      message: `${DAY_NAMES[dayOfWeek]} marked as unavailable`
    };
  } catch (error) {
    console.error('Error marking day unavailable:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// AVAILABILITY CHECKING
// ============================================================

/**
 * Check if a cleric is available for a booking at a specific time
 * @param {string} clericId - Unique cleric identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} time - Start time in HH:MM format
 * @param {number} durationMinutes - Duration of booking in minutes
 * @returns {object} - Result with availability status and details
 */
function isClericAvailable(clericId, date, time, durationMinutes) {
  // Validation
  if (!clericId || typeof clericId !== 'string') {
    return { available: false, error: 'Invalid clericId' };
  }
  if (!isValidDateFormat(date)) {
    return { available: false, error: `Invalid date format: ${date}` };
  }
  if (!isValidTimeFormat(time)) {
    return { available: false, error: `Invalid time format: ${time}` };
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return { available: false, error: 'Duration must be positive integer (minutes)' };
  }

  try {
    // Check if booking is too far in advance
    const bookingDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDifference = Math.floor((bookingDate - today) / (1000 * 60 * 60 * 24));

    if (daysDifference > AVAILABILITY_CONFIG.MAX_ADVANCE_BOOKING_DAYS) {
      return {
        available: false,
        reason: 'TOO_FAR_ADVANCE',
        message: `Can only book up to ${AVAILABILITY_CONFIG.MAX_ADVANCE_BOOKING_DAYS} days in advance`
      };
    }

    // Check if booking is too soon (needs minimum lead time)
    if (daysDifference === 0) {
      const now = new Date();
      const bookingDateTime = new Date(date + 'T' + time);
      const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);

      if (hoursUntilBooking < AVAILABILITY_CONFIG.MIN_BOOKING_HOURS_AHEAD) {
        return {
          available: false,
          reason: 'TOO_SOON',
          message: `Must book at least ${AVAILABILITY_CONFIG.MIN_BOOKING_HOURS_AHEAD} hours in advance`
        };
      }
    }

    // Get day of week for the date
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // Check weekly availability
    const availData = getAvailability(clericId);
    if (!availData.success) {
      return { available: false, error: availData.error };
    }

    const daySchedule = availData.schedule[DAY_NAMES[dayOfWeek]];
    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.startTime) {
      return {
        available: false,
        reason: 'NOT_AVAILABLE_DAY',
        message: `${DAY_NAMES[dayOfWeek]} is not an available day for this cleric`
      };
    }

    // Check if time slot fits within available hours
    const endTime = addMinutesToTime(time, durationMinutes);
    if (!isTimeInRange(time, daySchedule.startTime, daySchedule.endTime)) {
      return {
        available: false,
        reason: 'OUTSIDE_HOURS',
        message: `Requested time ${time} is outside available hours (${daySchedule.startTime}-${daySchedule.endTime})`
      };
    }

    // Check if entire duration fits
    if (timeToMinutes(endTime) > timeToMinutes(daySchedule.endTime)) {
      return {
        available: false,
        reason: 'EXCEEDS_HOURS',
        message: `Booking would exceed closing time at ${daySchedule.endTime}`
      };
    }

    // Check for blocked times
    const blockedTimes = getBlockedTimesData();
    const conflicts = blockedTimes.filter(block => {
      return block.clericId === clericId &&
             block.date === date &&
             !(timeToMinutes(endTime) <= timeToMinutes(block.startTime) ||
               timeToMinutes(time) >= timeToMinutes(block.endTime));
    });

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      return {
        available: false,
        reason: 'TIME_BLOCKED',
        message: `Time slot is blocked: ${conflict.reason}`,
        blockedDetails: conflict
      };
    }

    return {
      available: true,
      message: 'Cleric is available for this time slot',
      slot: {
        date,
        startTime: time,
        endTime,
        durationMinutes
      }
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { available: false, error: error.message };
  }
}

// ============================================================
// AVAILABLE SLOTS GENERATION
// ============================================================

/**
 * Get available time slots for a cleric on a specific date
 * @param {string} clericId - Unique cleric identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} slotDurationMinutes - Duration each slot should be
 * @returns {object} - Result with array of available slots
 */
function getAvailableSlots(clericId, date, slotDurationMinutes = 60) {
  // Validation
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }
  if (!isValidDateFormat(date)) {
    return { success: false, error: `Invalid date format: ${date}` };
  }
  if (!Number.isInteger(slotDurationMinutes) || slotDurationMinutes <= 0) {
    return { success: false, error: 'slotDurationMinutes must be positive integer' };
  }

  try {
    // Get day of week
    const dateObj = new Date(date + 'T00:00:00Z');
    const dayOfWeek = dateObj.getUTCDay();

    // Get availability
    const availData = getAvailability(clericId);
    if (!availData.success) {
      return availData;
    }

    const daySchedule = availData.schedule[DAY_NAMES[dayOfWeek]];
    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.startTime) {
      return {
        success: true,
        date,
        slots: [],
        message: 'No availability for this day'
      };
    }

    // Get blocked times
    const blockedTimes = getBlockedTimesData();
    const dayBlocks = blockedTimes.filter(block =>
      block.clericId === clericId && block.date === date
    );

    // Generate slots
    const slots = [];
    let currentTime = daySchedule.startTime;

    while (isTimeInRange(currentTime, daySchedule.startTime, daySchedule.endTime)) {
      const endTime = addMinutesToTime(currentTime, slotDurationMinutes);

      // Check if slot would exceed day's end time
      if (timeToMinutes(endTime) > timeToMinutes(daySchedule.endTime)) {
        break;
      }

      // Check for conflicts with blocked times
      const isBlocked = dayBlocks.some(block =>
        !(timeToMinutes(endTime) <= timeToMinutes(block.startTime) ||
          timeToMinutes(currentTime) >= timeToMinutes(block.endTime))
      );

      if (!isBlocked) {
        // Check minimum lead time for today
        let isAvailable = true;
        if (date === new Date().toISOString().split('T')[0]) {
          const now = new Date();
          const slotDateTime = new Date(date + 'T' + currentTime);
          const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);
          if (hoursUntilSlot < AVAILABILITY_CONFIG.MIN_BOOKING_HOURS_AHEAD) {
            isAvailable = false;
          }
        }

        if (isAvailable) {
          slots.push({
            startTime: currentTime,
            endTime,
            available: true,
            durationMinutes: slotDurationMinutes
          });
        }
      }

      currentTime = addMinutesToTime(currentTime, AVAILABILITY_CONFIG.SLOT_DURATION_MINUTES);
    }

    return {
      success: true,
      clericId,
      date,
      dayOfWeek: DAY_NAMES[dayOfWeek],
      totalSlots: slots.length,
      slots,
      workingHours: {
        start: daySchedule.startTime,
        end: daySchedule.endTime
      }
    };
  } catch (error) {
    console.error('Error getting available slots:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// BLOCKED TIME MANAGEMENT
// ============================================================

/**
 * Block a time slot (for holidays, breaks, maintenance, etc.)
 * @param {string} clericId - Unique cleric identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {string} reason - Reason for blocking (e.g., 'Holiday', 'Personal Break')
 * @returns {object} - Result with success status
 */
function blockTime(clericId, date, startTime, endTime, reason = 'Not specified') {
  // Validation
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }
  if (!isValidDateFormat(date)) {
    return { success: false, error: `Invalid date format: ${date}` };
  }
  if (!isValidTimeFormat(startTime)) {
    return { success: false, error: `Invalid startTime format: ${startTime}` };
  }
  if (!isValidTimeFormat(endTime)) {
    return { success: false, error: `Invalid endTime format: ${endTime}` };
  }
  if (!isTimeBefore(startTime, endTime)) {
    return { success: false, error: 'startTime must be before endTime' };
  }
  if (!reason || typeof reason !== 'string') {
    return { success: false, error: 'Reason is required' };
  }

  try {
    const blockedTimes = getBlockedTimesData();

    // Check for overlapping blocks
    const overlaps = blockedTimes.filter(block => {
      return block.clericId === clericId &&
             block.date === date &&
             !(timeToMinutes(endTime) <= timeToMinutes(block.startTime) ||
               timeToMinutes(startTime) >= timeToMinutes(block.endTime));
    });

    if (overlaps.length > 0) {
      return {
        success: false,
        error: `Time slot overlaps with existing block: ${overlaps[0].reason}`
      };
    }

    // Add new block
    blockedTimes.push({
      clericId,
      date,
      startTime,
      endTime,
      reason,
      createdAt: new Date().toISOString()
    });

    saveBlockedTimesData(blockedTimes);
    console.log(`Time blocked for cleric ${clericId} on ${date}: ${startTime}-${endTime} (${reason})`);

    return {
      success: true,
      message: `Time blocked: ${reason}`,
      block: {
        clericId,
        date,
        startTime,
        endTime,
        reason
      }
    };
  } catch (error) {
    console.error('Error blocking time:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unblock a specific time slot
 * @param {string} clericId - Unique cleric identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} startTime - Start time in HH:MM format
 * @returns {object} - Result with success status
 */
function unblockTime(clericId, date, startTime) {
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }
  if (!isValidDateFormat(date)) {
    return { success: false, error: `Invalid date format: ${date}` };
  }
  if (!isValidTimeFormat(startTime)) {
    return { success: false, error: `Invalid startTime format: ${startTime}` };
  }

  try {
    let blockedTimes = getBlockedTimesData();
    const originalLength = blockedTimes.length;

    blockedTimes = blockedTimes.filter(block =>
      !(block.clericId === clericId && block.date === date && block.startTime === startTime)
    );

    if (blockedTimes.length === originalLength) {
      return { success: false, error: 'Block not found' };
    }

    saveBlockedTimesData(blockedTimes);
    console.log(`Time unblocked for cleric ${clericId} on ${date} at ${startTime}`);

    return {
      success: true,
      message: 'Block removed'
    };
  } catch (error) {
    console.error('Error unblocking time:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all blocked times for a cleric
 * @param {string} clericId - Unique cleric identifier (optional, returns all if not provided)
 * @returns {object} - Result with array of blocked times
 */
function getBlockedTimes(clericId = null) {
  try {
    let blockedTimes = getBlockedTimesData();

    if (clericId) {
      if (typeof clericId !== 'string') {
        return { success: false, error: 'Invalid clericId' };
      }
      blockedTimes = blockedTimes.filter(block => block.clericId === clericId);
    }

    // Sort by date and time
    blockedTimes.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

    return {
      success: true,
      clericId: clericId || 'all',
      count: blockedTimes.length,
      blocks: blockedTimes
    };
  } catch (error) {
    console.error('Error getting blocked times:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Clear all blocked times for a cleric on a specific date
 * @param {string} clericId - Unique cleric identifier
 * @param {string} date - Date in YYYY-MM-DD format
 * @returns {object} - Result with success status
 */
function clearBlockedTimesForDate(clericId, date) {
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }
  if (!isValidDateFormat(date)) {
    return { success: false, error: `Invalid date format: ${date}` };
  }

  try {
    let blockedTimes = getBlockedTimesData();
    const originalLength = blockedTimes.length;

    blockedTimes = blockedTimes.filter(block =>
      !(block.clericId === clericId && block.date === date)
    );

    const removedCount = originalLength - blockedTimes.length;
    saveBlockedTimesData(blockedTimes);

    console.log(`Cleared ${removedCount} blocks for cleric ${clericId} on ${date}`);

    return {
      success: true,
      message: `Cleared ${removedCount} time blocks`,
      removedCount
    };
  } catch (error) {
    console.error('Error clearing blocked times:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Reset all availability and blocked times (for testing/development)
 * USE WITH CAUTION - This deletes all data
 */
function resetAllData() {
  try {
    localStorage.removeItem(AVAILABILITY_CONFIG.STORAGE_KEY);
    localStorage.removeItem(AVAILABILITY_CONFIG.BLOCKED_TIMES_KEY);
    console.warn('All availability and blocked times data has been reset');
    return { success: true, message: 'All data cleared' };
  } catch (error) {
    console.error('Error resetting data:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get statistics for a cleric's availability
 * @param {string} clericId - Unique cleric identifier
 * @returns {object} - Statistics about availability
 */
function getAvailabilityStats(clericId) {
  if (!clericId || typeof clericId !== 'string') {
    return { success: false, error: 'Invalid clericId' };
  }

  try {
    const availData = getAvailability(clericId);
    if (!availData.success) return availData;

    let availableDays = 0;
    let totalHours = 0;

    for (const dayName of DAY_NAMES) {
      const day = availData.schedule[dayName];
      if (day && day.isAvailable && day.startTime) {
        availableDays++;
        const minutes = timeToMinutes(day.endTime) - timeToMinutes(day.startTime);
        totalHours += minutes / 60;
      }
    }

    const blockedData = getBlockedTimes(clericId);
    const futureBlocks = blockedData.blocks.filter(block => block.date >= new Date().toISOString().split('T')[0]);

    return {
      success: true,
      clericId,
      stats: {
        availableDaysPerWeek: availableDays,
        totalHoursPerWeek: totalHours.toFixed(2),
        totalBlockedDays: futureBlocks.length,
        blockedReasons: [...new Set(futureBlocks.map(b => b.reason))]
      }
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// EXPORT
// ============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Availability Management
    setAvailability,
    getAvailability,
    setDayUnavailable,

    // Availability Checking
    isClericAvailable,
    getAvailableSlots,

    // Blocked Times
    blockTime,
    unblockTime,
    getBlockedTimes,
    clearBlockedTimesForDate,

    // Utilities
    resetAllData,
    getAvailabilityStats,

    // Internal utilities (for testing)
    timeToMinutes,
    minutesToTime,
    isValidTimeFormat,
    isValidDateFormat,
    isValidDayOfWeek,
    DAY_NAMES,
    AVAILABILITY_CONFIG
  };
}
