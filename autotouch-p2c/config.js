// ============================================================
// AutoTouch P2C Sniper — Configuration
// ============================================================
// Adjust coordinates, timings, and filters for your device.
// All coordinate values are in POINTS (not pixels).
// Use AutoTouch screenshot helper to calibrate.
// ============================================================

const CONFIG = {
  // ── Device ──────────────────────────────────────────────
  device: {
    // Screen resolution in points (logical, not physical)
    // iPhone 14 Pro Max example: 430 x 932
    screenWidth: 430,
    screenHeight: 932,
  },

  // ── Telegram App Regions ───────────────────────────────
  telegram: {
    // Region where the P2C bot chat content is displayed
    chatRegion: { x: 0, y: 90, width: 430, height: 750 },
    // "Back" button position (top-left arrow)
    backButton: { x: 30, y: 55 },
    // Text input field position
    inputField: { x: 215, y: 875 },
    // Send button position
    sendButton: { x: 400, y: 875 },
  },

  // ── P2C Bot Interface ──────────────────────────────────
  p2c: {
    // Inline keyboard button regions (approximate positions)
    // These are for a typical P2C bot layout
    buttons: {
      // "Buy" / "Купить" button area
      buy: { x: 110, y: 520, width: 200, height: 45 },
      // "Sell" / "Продать" button area
      sell: { x: 320, y: 520, width: 200, height: 45 },
      // Deal list area (scrollable)
      dealList: { x: 0, y: 200, width: 430, height: 500 },
      // First deal in the list
      firstDeal: { x: 215, y: 250 },
      // Second deal in the list
      secondDeal: { x: 215, y: 350 },
      // Third deal in the list
      thirdDeal: { x: 215, y: 450 },
      // "Accept" / "Принять" deal button
      acceptDeal: { x: 215, y: 600 },
      // "Confirm" / "Подтвердить" button
      confirmDeal: { x: 215, y: 700 },
      // Refresh / reload deals list
      refresh: { x: 215, y: 160 },
    },

    // Color anchors for detecting bot state
    colors: {
      // Green "Buy" button color (hex)
      buyButton: 0x34C759,
      // Active deal highlight color
      activeDeal: 0x007AFF,
      // "Accept" button color
      acceptButton: 0x34C759,
      // Error/unavailable color
      unavailable: 0xFF3B30,
      // Loading indicator color
      loading: 0x8E8E93,
    },

    // OCR keywords to identify deal elements
    keywords: {
      // Keywords indicating a new deal appeared
      newDeal: ['USDT', 'BTC', 'RUB', 'Купить', 'Продать', 'Buy', 'Sell'],
      // Keywords on the accept button
      accept: ['Принять', 'Accept', 'Взять', 'Take'],
      // Keywords indicating deal was grabbed successfully
      success: ['Успешно', 'Success', 'Оплатите', 'Pay', 'Оплата'],
      // Keywords indicating deal was already taken
      taken: ['Занято', 'Taken', 'Недоступно', 'Unavailable'],
      // Keywords indicating payment link
      paymentLink: ['ozon', 'bank', 'pay', 'оплат'],
    },
  },

  // ── Deal Filters ───────────────────────────────────────
  filters: {
    // Minimum deal amount in RUB
    minAmountRUB: 1000,
    // Maximum deal amount in RUB
    maxAmountRUB: 100000,
    // Minimum crypto amount (e.g., USDT)
    minCryptoAmount: 10,
    // Maximum crypto amount
    maxCryptoAmount: 10000,
    // Maximum acceptable spread/rate deviation (%)
    maxSpreadPercent: 2.0,
    // Only accept deals with specific payment methods
    acceptedPaymentMethods: ['Ozon', 'Озон'],
    // Minimum seller rating (0-100)
    minSellerRating: 0,
    // Minimum seller completed trades
    minSellerTrades: 0,
  },

  // ── Timing (microseconds) ──────────────────────────────
  timing: {
    // Scan interval between checking for new deals
    scanIntervalUs: 300000,       // 300ms — aggressive scanning
    // Delay after tapping a button before next action
    tapDelayUs: 50000,            // 50ms — minimal delay for speed
    // Delay between sequential taps
    betweenTapsUs: 100000,        // 100ms
    // Delay after page transition
    pageTransitionUs: 500000,     // 500ms — wait for content load
    // OCR processing wait
    ocrWaitUs: 200000,            // 200ms
    // Timeout for deal acceptance (before giving up)
    acceptTimeoutUs: 5000000,     // 5s
    // Delay before scrolling deal list
    scrollDelayUs: 150000,        // 150ms
    // Max time to wait for payment page to load
    paymentPageTimeoutUs: 10000000, // 10s
    // App switch delay
    appSwitchDelayUs: 1000000,    // 1s
  },

  // ── Ozon Bank Payment ──────────────────────────────────
  ozonBank: {
    // Ozon Bank app bundle ID
    bundleId: 'ru.ozon.bank',

    // Payment confirmation screen regions
    ui: {
      // Amount field position
      amountField: { x: 215, y: 300 },
      // Card/account selector
      accountSelector: { x: 215, y: 400 },
      // "Pay" / "Оплатить" button
      payButton: { x: 215, y: 750 },
      // Confirm payment button (final step)
      confirmButton: { x: 215, y: 600 },
      // Biometric/PIN confirmation area
      biometricPrompt: { x: 215, y: 500 },
    },

    colors: {
      // Ozon brand purple
      brandColor: 0x005BFF,
      // Pay button active color
      payButtonActive: 0x005BFF,
      // Success indicator
      successColor: 0x34C759,
    },

    keywords: {
      pay: ['Оплатить', 'Перевести', 'Pay', 'Send'],
      confirm: ['Подтвердить', 'Confirm'],
      success: ['Успешно', 'Выполнено', 'Success', 'Done'],
      error: ['Ошибка', 'Error', 'Недостаточно', 'Insufficient'],
    },
  },

  // ── Notifications ──────────────────────────────────────
  notifications: {
    // Play sound on successful deal grab
    soundOnGrab: true,
    // Vibrate on events
    vibrateOnGrab: true,
    // Log all actions to file
    logToFile: true,
    logFilePath: '/var/mobile/Documents/AutoTouch/p2c_sniper.log',
  },

  // ── Safety ─────────────────────────────────────────────
  safety: {
    // Max deals to grab per session
    maxDealsPerSession: 50,
    // Cooldown between successful grabs (microseconds)
    cooldownAfterGrabUs: 2000000, // 2s
    // Auto-stop after N consecutive errors
    maxConsecutiveErrors: 10,
    // Auto-stop after running for N minutes
    maxRunTimeMinutes: 120,
  },
};

module.exports = CONFIG;
