// App-wide constants

export const APP_NAME = 'VEXA';
export const APP_TAGLINE = 'Real-time service marketplace';

// Animation durations (ms)
export const ANIMATION = {
  SPLASH_DURATION: 2500,
  FADE_IN: 300,
  FADE_OUT: 200,
  SLIDE_IN: 350,
  BUTTON_PRESS: 100,
  CARD_PRESS: 150,
} as const;

// Job modification limits
export const JOB_LIMITS = {
  MAX_MODIFICATIONS_PER_JOB: 3,
  MAX_PRICE_INCREASE_PERCENT: 30,
  MAX_IMAGES_PER_MODIFICATION: 5,
  MAX_IMAGES_PER_JOB: 10,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  BIDS_LIMIT: 50,
} as const;

// Rating
export const RATING = {
  MIN: 1,
  MAX: 5,
} as const;

// Socket events
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // User
  USER_JOIN: 'user:join',

  // Bidding
  JOIN_BIDDING_ROOM: 'bidding:join',
  LEAVE_BIDDING_ROOM: 'bidding:leave',
  NEW_BID: 'bid:new',
  BID_UPDATE: 'job:bidUpdate',
  BIDDING_CLOSED: 'bidding:closed',

  // Job updates
  JOB_NEW: 'job:new',
  JOB_STATUS_CHANGE: 'job:statusChange',
  MODIFICATION_SUBMITTED: 'job:modificationSubmitted',
  MODIFICATION_RESPONDED: 'job:modificationResponded',

  // Notifications
  NEW_NOTIFICATION: 'notification:new',
} as const;
