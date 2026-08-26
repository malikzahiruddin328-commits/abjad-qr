/**
 * services-reviews.js
 * Handles cleric ratings and reviews for Baba Ji QR system
 * Manages review submission, storage, approval, and rating calculations
 */

const STORAGE_KEY = 'babaJiReviews';
const CLERICS_KEY = 'babaJiClerics';

/**
 * Review Data Structure
 * @typedef {Object} Review
 * @property {string} id - Unique review ID (timestamp-based)
 * @property {string} clericId - ID of the cleric being reviewed
 * @property {string} customerId - Customer ID or email
 * @property {string} bookingId - Associated booking ID
 * @property {number} rating - Rating 1-5 stars
 * @property {string} title - Review title
 * @property {string} comment - Review comment
 * @property {string} createdAt - ISO timestamp
 * @property {string} status - 'pending', 'approved', or 'rejected'
 * @property {string} [rejectionReason] - Reason for rejection if applicable
 */

/**
 * Initialize localStorage for reviews if not exists
 */
function initializeReviewsStorage() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }
}

/**
 * Get all reviews from storage
 * @returns {Review[]}
 */
function getAllReviews() {
  initializeReviewsStorage();
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch (error) {
    console.error('Error parsing reviews from storage:', error);
    return [];
  }
}

/**
 * Save reviews to storage
 * @param {Review[]} reviews
 */
function saveReviews(reviews) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch (error) {
    console.error('Error saving reviews to storage:', error);
    throw new Error('Failed to save review to storage');
  }
}

/**
 * Validate review input
 * @param {Object} reviewData
 * @returns {Object} {isValid: boolean, errors: string[]}
 */
function validateReviewInput(reviewData) {
  const errors = [];

  if (!reviewData.clericId || typeof reviewData.clericId !== 'string') {
    errors.push('Valid clericId is required');
  }

  if (!reviewData.customerId || typeof reviewData.customerId !== 'string') {
    errors.push('Valid customerId or email is required');
  }

  if (!reviewData.bookingId || typeof reviewData.bookingId !== 'string') {
    errors.push('Valid bookingId is required');
  }

  if (!reviewData.rating || reviewData.rating < 1 || reviewData.rating > 5) {
    errors.push('Rating must be between 1 and 5 stars');
  }

  if (!reviewData.title || typeof reviewData.title !== 'string' || reviewData.title.trim().length === 0) {
    errors.push('Review title is required');
  }

  if (reviewData.title.trim().length > 100) {
    errors.push('Review title must be 100 characters or less');
  }

  if (!reviewData.comment || typeof reviewData.comment !== 'string' || reviewData.comment.trim().length === 0) {
    errors.push('Review comment is required');
  }

  if (reviewData.comment.trim().length > 1000) {
    errors.push('Review comment must be 1000 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if booking is completed (must exist in bookings storage)
 * @param {string} bookingId
 * @returns {boolean}
 */
function isBookingCompleted(bookingId) {
  try {
    const bookings = JSON.parse(localStorage.getItem('babaJiBookings')) || [];
    const booking = bookings.find(b => b.id === bookingId);
    return booking && booking.status === 'completed';
  } catch (error) {
    console.error('Error checking booking status:', error);
    return false;
  }
}

/**
 * Check if review already exists for this booking
 * @param {string} clericId
 * @param {string} customerId
 * @param {string} bookingId
 * @returns {boolean}
 */
function reviewAlreadyExists(clericId, customerId, bookingId) {
  const reviews = getAllReviews();
  return reviews.some(
    review =>
      review.clericId === clericId &&
      review.customerId === customerId &&
      review.bookingId === bookingId
  );
}

/**
 * Submit a new review
 * @param {string} clericId
 * @param {string} customerId
 * @param {string} bookingId
 * @param {number} rating
 * @param {string} title
 * @param {string} comment
 * @returns {Object} {success: boolean, review?: Review, error?: string}
 */
function submitReview(clericId, customerId, bookingId, rating, title, comment) {
  // Validate input
  const validation = validateReviewInput({
    clericId,
    customerId,
    bookingId,
    rating: parseInt(rating),
    title,
    comment
  });

  if (!validation.isValid) {
    return {
      success: false,
      error: validation.errors.join('; ')
    };
  }

  // Check if booking is completed
  if (!isBookingCompleted(bookingId)) {
    return {
      success: false,
      error: 'Can only review completed bookings'
    };
  }

  // Check for duplicate reviews
  if (reviewAlreadyExists(clericId, customerId, bookingId)) {
    return {
      success: false,
      error: 'Review already exists for this booking'
    };
  }

  // Create review object
  const review = {
    id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    clericId,
    customerId,
    bookingId,
    rating: parseInt(rating),
    title: title.trim(),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  // Save review
  const reviews = getAllReviews();
  reviews.push(review);
  saveReviews(reviews);

  // Update cleric statistics
  updateClericRating(clericId);

  return {
    success: true,
    review
  };
}

/**
 * Get all reviews for a specific cleric
 * @param {string} clericId
 * @param {string} [statusFilter] - Filter by status ('approved', 'pending', 'rejected')
 * @returns {Review[]}
 */
function getClericReviews(clericId, statusFilter = null) {
  const reviews = getAllReviews();
  let clericReviews = reviews.filter(review => review.clericId === clericId);

  if (statusFilter) {
    clericReviews = clericReviews.filter(review => review.status === statusFilter);
  }

  return clericReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get approved reviews for a cleric (public-facing)
 * @param {string} clericId
 * @returns {Review[]}
 */
function getPublicClericReviews(clericId) {
  return getClericReviews(clericId, 'approved');
}

/**
 * Calculate average rating for a cleric
 * @param {string} clericId
 * @returns {number} Average rating (0 if no reviews)
 */
function getClericRating(clericId) {
  const reviews = getClericReviews(clericId, 'approved');

  if (reviews.length === 0) {
    return 0;
  }

  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return parseFloat((sum / reviews.length).toFixed(2));
}

/**
 * Get cleric review statistics
 * @param {string} clericId
 * @returns {Object} {averageRating, totalReviews, reviewCounts}
 */
function getClericReviewStats(clericId) {
  const allReviews = getClericReviews(clericId);
  const approvedReviews = getClericReviews(clericId, 'approved');

  const reviewCounts = {
    5: approvedReviews.filter(r => r.rating === 5).length,
    4: approvedReviews.filter(r => r.rating === 4).length,
    3: approvedReviews.filter(r => r.rating === 3).length,
    2: approvedReviews.filter(r => r.rating === 2).length,
    1: approvedReviews.filter(r => r.rating === 1).length
  };

  return {
    averageRating: getClericRating(clericId),
    totalReviews: approvedReviews.length,
    totalSubmitted: allReviews.length,
    reviewCounts,
    pending: allReviews.filter(r => r.status === 'pending').length,
    rejected: allReviews.filter(r => r.status === 'rejected').length
  };
}

/**
 * Get a single review by ID
 * @param {string} reviewId
 * @returns {Review|null}
 */
function getReviewById(reviewId) {
  const reviews = getAllReviews();
  return reviews.find(review => review.id === reviewId) || null;
}

/**
 * Approve a review
 * @param {string} reviewId
 * @returns {Object} {success: boolean, review?: Review, error?: string}
 */
function approveReview(reviewId) {
  const reviews = getAllReviews();
  const reviewIndex = reviews.findIndex(review => review.id === reviewId);

  if (reviewIndex === -1) {
    return {
      success: false,
      error: 'Review not found'
    };
  }

  if (reviews[reviewIndex].status === 'approved') {
    return {
      success: false,
      error: 'Review is already approved'
    };
  }

  reviews[reviewIndex].status = 'approved';
  reviews[reviewIndex].approvedAt = new Date().toISOString();

  saveReviews(reviews);

  // Update cleric rating
  updateClericRating(reviews[reviewIndex].clericId);

  return {
    success: true,
    review: reviews[reviewIndex]
  };
}

/**
 * Reject a review
 * @param {string} reviewId
 * @param {string} reason
 * @returns {Object} {success: boolean, review?: Review, error?: string}
 */
function rejectReview(reviewId, reason = '') {
  const reviews = getAllReviews();
  const reviewIndex = reviews.findIndex(review => review.id === reviewId);

  if (reviewIndex === -1) {
    return {
      success: false,
      error: 'Review not found'
    };
  }

  if (reviews[reviewIndex].status === 'rejected') {
    return {
      success: false,
      error: 'Review is already rejected'
    };
  }

  reviews[reviewIndex].status = 'rejected';
  reviews[reviewIndex].rejectionReason = reason.trim();
  reviews[reviewIndex].rejectedAt = new Date().toISOString();

  saveReviews(reviews);

  // Update cleric rating
  updateClericRating(reviews[reviewIndex].clericId);

  return {
    success: true,
    review: reviews[reviewIndex]
  };
}

/**
 * Delete a review
 * @param {string} reviewId
 * @returns {Object} {success: boolean, error?: string}
 */
function deleteReview(reviewId) {
  const reviews = getAllReviews();
  const reviewIndex = reviews.findIndex(review => review.id === reviewId);

  if (reviewIndex === -1) {
    return {
      success: false,
      error: 'Review not found'
    };
  }

  const clericId = reviews[reviewIndex].clericId;
  reviews.splice(reviewIndex, 1);

  saveReviews(reviews);

  // Update cleric rating
  updateClericRating(clericId);

  return {
    success: true
  };
}

/**
 * Update cleric statistics in clerics storage
 * @param {string} clericId
 */
function updateClericRating(clericId) {
  try {
    const clerics = JSON.parse(localStorage.getItem(CLERICS_KEY)) || [];
    const clericIndex = clerics.findIndex(c => c.id === clericId);

    if (clericIndex !== -1) {
      const stats = getClericReviewStats(clericId);
      clerics[clericIndex].averageRating = stats.averageRating;
      clerics[clericIndex].totalReviews = stats.totalReviews;
      clerics[clericIndex].recentReviews = getClericReviews(clericId, 'approved').slice(0, 5);

      localStorage.setItem(CLERICS_KEY, JSON.stringify(clerics));
    }
  } catch (error) {
    console.error('Error updating cleric rating:', error);
  }
}

/**
 * Get customer reviews (all reviews by a customer)
 * @param {string} customerId
 * @returns {Review[]}
 */
function getCustomerReviews(customerId) {
  const reviews = getAllReviews();
  return reviews
    .filter(review => review.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Check if customer already reviewed a booking
 * @param {string} customerId
 * @param {string} bookingId
 * @returns {boolean}
 */
function hasCustomerReviewedBooking(customerId, bookingId) {
  const reviews = getAllReviews();
  return reviews.some(
    review => review.customerId === customerId && review.bookingId === bookingId
  );
}

/**
 * Get pending reviews (for admin dashboard)
 * @returns {Review[]}
 */
function getPendingReviews() {
  const reviews = getAllReviews();
  return reviews
    .filter(review => review.status === 'pending')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Get review count by status
 * @returns {Object} {pending, approved, rejected}
 */
function getReviewCounts() {
  const reviews = getAllReviews();
  return {
    pending: reviews.filter(r => r.status === 'pending').length,
    approved: reviews.filter(r => r.status === 'approved').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    total: reviews.length
  };
}

/**
 * Export review data for admin/analytics
 * @returns {Object}
 */
function exportReviewData() {
  return {
    reviews: getAllReviews(),
    counts: getReviewCounts(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Clear all reviews (admin only - use with caution)
 * @param {string} confirmationKey - Must be 'CLEAR_ALL_REVIEWS' to proceed
 * @returns {Object} {success: boolean, cleared: number}
 */
function clearAllReviews(confirmationKey) {
  if (confirmationKey !== 'CLEAR_ALL_REVIEWS') {
    return {
      success: false,
      error: 'Invalid confirmation key'
    };
  }

  const reviews = getAllReviews();
  const count = reviews.length;

  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

  // Reset all cleric ratings
  try {
    const clerics = JSON.parse(localStorage.getItem(CLERICS_KEY)) || [];
    clerics.forEach(cleric => {
      cleric.averageRating = 0;
      cleric.totalReviews = 0;
      cleric.recentReviews = [];
    });
    localStorage.setItem(CLERICS_KEY, JSON.stringify(clerics));
  } catch (error) {
    console.error('Error resetting cleric ratings:', error);
  }

  return {
    success: true,
    cleared: count
  };
}

// Export all functions
export {
  // Core review functions
  submitReview,
  getClericReviews,
  getPublicClericReviews,
  getClericRating,
  getClericReviewStats,
  approveReview,
  rejectReview,
  deleteReview,
  // Query functions
  getReviewById,
  getCustomerReviews,
  hasCustomerReviewedBooking,
  getPendingReviews,
  getReviewCounts,
  // Admin functions
  exportReviewData,
  clearAllReviews,
  // Storage functions
  getAllReviews,
  initializeReviewsStorage,
  // Validation functions
  validateReviewInput
};
