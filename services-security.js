/**
 * Security Utilities
 * Password hashing, session management, input validation
 *
 * Note: These are for frontend/Node.js use
 * Production should use bcrypt on backend + HTTPS only
 */

const SECURITY_CONFIG = {
  // Session management
  SESSION_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days
  SESSION_REFRESH_THRESHOLD: 7 * 24 * 60 * 60 * 1000, // Refresh if older than 7 days
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes

  // Password validation
  MIN_PASSWORD_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true,

  // Rate limiting
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 10,

  // Data validation
  MAX_EMAIL_LENGTH: 254,
  MAX_NAME_LENGTH: 100,
  MAX_MESSAGE_LENGTH: 10000
};

/**
 * Password Hashing (Demo - Use bcrypt in production)
 * This is a simple PBKDF2-like approach suitable for frontend demo
 * Production MUST use bcrypt/argon2 on backend
 */
class PasswordManager {
  static async hash(password, salt = null) {
    if (!salt) {
      salt = this.generateSalt();
    }

    // Simple hash for demo (NOT for production)
    // Use CryptoJS or similar if available
    let hash = password;
    for (let i = 0; i < 1000; i++) {
      hash = this._simpleHash(hash + salt);
    }
    return `${salt}$${hash}`;
  }

  static async verify(password, hash) {
    const [salt, storedHash] = hash.split('$');
    const computedHash = await this.hash(password, salt);
    return computedHash === hash;
  }

  static generateSalt() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  static _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  static validatePassword(password) {
    const errors = [];

    if (password.length < SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters`);
    }

    if (SECURITY_CONFIG.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (SECURITY_CONFIG.REQUIRE_NUMBERS && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (SECURITY_CONFIG.REQUIRE_SPECIAL && !/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Session Management
 */
class SessionManager {
  static createSession(userData, type = 'admin') {
    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      userId: userData.id || userData.email,
      type, // 'admin' or 'cleric'
      createdAt: Date.now(),
      expiresAt: Date.now() + SECURITY_CONFIG.SESSION_EXPIRY,
      lastActivity: Date.now(),
      ipAddress: this.getClientIP(),
      userAgent: navigator?.userAgent || 'unknown'
    };

    // Store in localStorage with encryption (basic)
    const key = type === 'admin' ? 'babaJiAdminSession' : 'babaJiClericSession';
    localStorage.setItem(key, JSON.stringify(session));

    return session;
  }

  static validateSession(type = 'admin') {
    const key = type === 'admin' ? 'babaJiAdminSession' : 'babaJiClericSession';
    const sessionStr = localStorage.getItem(key);

    if (!sessionStr) return null;

    try {
      const session = JSON.parse(sessionStr);

      // Check expiry
      if (Date.now() >= session.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      // Refresh session if needed
      if (Date.now() - session.createdAt > SECURITY_CONFIG.SESSION_REFRESH_THRESHOLD) {
        session.createdAt = Date.now();
        session.expiresAt = Date.now() + SECURITY_CONFIG.SESSION_EXPIRY;
        localStorage.setItem(key, JSON.stringify(session));
      }

      // Update last activity
      session.lastActivity = Date.now();

      return session;
    } catch (e) {
      console.error('Session validation error:', e);
      return null;
    }
  }

  static destroySession(type = 'admin') {
    const key = type === 'admin' ? 'babaJiAdminSession' : 'babaJiClericSession';
    localStorage.removeItem(key);
  }

  static generateSessionId() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }

  static getClientIP() {
    // In browser, this is not available. Return placeholder.
    // In production, get from request headers on backend
    return 'browser-client';
  }
}

/**
 * Input Validation
 */
class InputValidator {
  static validateEmail(email) {
    if (email.length > SECURITY_CONFIG.MAX_EMAIL_LENGTH) {
      return { valid: false, error: 'Email too long' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  static validateName(name) {
    if (name.length > SECURITY_CONFIG.MAX_NAME_LENGTH) {
      return { valid: false, error: 'Name too long' };
    }

    if (name.length < 2) {
      return { valid: false, error: 'Name too short' };
    }

    // Prevent XSS: disallow HTML tags
    if (/<[^>]*>/.test(name)) {
      return { valid: false, error: 'Name contains invalid characters' };
    }

    return { valid: true };
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    // Remove HTML tags
    return input
      .replace(/<[^>]*>/g, '')
      .replace(/["']/g, '\\$&') // Escape quotes
      .trim();
  }

  static validatePhoneNumber(phone) {
    // Remove non-digits
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length < 10 || cleaned.length > 15) {
      return { valid: false, error: 'Invalid phone number length' };
    }

    return { valid: true, formatted: cleaned };
  }

  static validateURL(url) {
    try {
      new URL(url);
      return { valid: true };
    } catch (e) {
      return { valid: false, error: 'Invalid URL' };
    }
  }
}

/**
 * Rate Limiting
 */
class RateLimiter {
  static constructor() {
    this.attempts = {};
  }

  static checkLimit(key) {
    const now = Date.now();
    if (!this.attempts[key]) {
      this.attempts[key] = [];
    }

    // Clean old attempts
    this.attempts[key] = this.attempts[key].filter(
      time => now - time < SECURITY_CONFIG.RATE_LIMIT_WINDOW
    );

    // Check limit
    if (this.attempts[key].length >= SECURITY_CONFIG.RATE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, retryAfter: SECURITY_CONFIG.RATE_LIMIT_WINDOW };
    }

    // Add current attempt
    this.attempts[key].push(now);
    return { allowed: true };
  }

  static reset(key) {
    delete this.attempts[key];
  }
}

const rateLimiter = new RateLimiter();

/**
 * Login Attempt Tracking
 */
class LoginTracker {
  static recordAttempt(email, success = false) {
    const key = `login_${email}`;
    let tracker = JSON.parse(localStorage.getItem(key) || '{}');

    if (success) {
      tracker = { attempts: 0, lockedUntil: null };
    } else {
      tracker.attempts = (tracker.attempts || 0) + 1;
      if (tracker.attempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
        tracker.lockedUntil = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION;
      }
    }

    localStorage.setItem(key, JSON.stringify(tracker));
    return tracker;
  }

  static isLocked(email) {
    const key = `login_${email}`;
    const tracker = JSON.parse(localStorage.getItem(key) || '{}');

    if (tracker.lockedUntil && Date.now() < tracker.lockedUntil) {
      return true;
    }

    if (tracker.lockedUntil && Date.now() >= tracker.lockedUntil) {
      localStorage.removeItem(key);
      return false;
    }

    return false;
  }

  static getRemainingLockTime(email) {
    const key = `login_${email}`;
    const tracker = JSON.parse(localStorage.getItem(key) || '{}');

    if (!tracker.lockedUntil) return 0;

    const remaining = tracker.lockedUntil - Date.now();
    return remaining > 0 ? remaining : 0;
  }
}

/**
 * EXPORT
 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PasswordManager,
    SessionManager,
    InputValidator,
    RateLimiter: rateLimiter,
    LoginTracker,
    SECURITY_CONFIG
  };
}
