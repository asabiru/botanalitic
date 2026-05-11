// ============================================================
// AutoTouch P2C Sniper — Ozon Bank Payment (Simplified)
// ============================================================
// Flow: P2C bot gives payment URL → Ozon Bank opens →
// tap "Confirm" button → done → return to Telegram.
// No manual card/amount entry needed.
// ============================================================

const CONFIG = require('./config');
const {
  T,
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, burstTap,
  findTextOnScreen, findTextPositionOnScreen,
  waitForText, waitForColor,
  openURLInApp, isAppForeground,
  checkColorAt,
  notifyUser,
} = require('./utils');

const { usleep, appRun } = at;

// ── State ────────────────────────────────────────────────

let paymentCount = 0;
let paymentErrors = 0;

// ── Main Payment Flow ────────────────────────────────────
// P2C bot provides a payment URL after deal is grabbed.
// The URL opens Ozon Bank with pre-filled payment details.
// We just need to find and tap "Confirm" / "Подтвердить".

function processPayment(paymentInfo) {
  logInfo('Starting payment...');

  if (!paymentInfo.paymentUrl) {
    logError('No payment URL from P2C bot');
    paymentErrors++;
    return { success: false, reason: 'no_url' };
  }

  // If the link was already tapped in Telegram, bank is already opening
  const alreadyOpened = paymentInfo.paymentUrl === '__already_opened__';

  if (!alreadyOpened) {
    logInfo(`Opening: ${paymentInfo.paymentUrl}`);
    openURLInApp(paymentInfo.paymentUrl);
    usleep(T().appSwitchDelayUs);
  }

  // Step 2: Wait for Ozon Bank payment screen to load
  const loaded = waitForPaymentScreen();
  if (!loaded) {
    logError('Payment screen did not load');
    paymentErrors++;
    return { success: false, reason: 'screen_not_loaded' };
  }

  // Step 3: Find and tap the Confirm button
  const confirmed = tapConfirmButton();
  if (!confirmed) {
    logError('Could not find confirm button');
    paymentErrors++;
    return { success: false, reason: 'confirm_not_found' };
  }

  // Step 4: Wait for biometric/PIN if needed, then check result
  usleep(T().appSwitchDelayUs);
  const result = checkPaymentResult();

  if (result.success) {
    paymentCount++;
    logInfo(`Payment #${paymentCount} confirmed`);
    notifyUser('Payment confirmed!');
  } else {
    paymentErrors++;
    logError(`Payment failed: ${result.reason}`);
  }

  return result;
}

// ── Wait for Payment Screen ──────────────────────────────

function waitForPaymentScreen() {
  logInfo('Waiting for bank screen...');

  // First try: look for payment-related text
  const keywords = [
    ...CONFIG.ozonBank.keywords.pay,
    ...CONFIG.ozonBank.keywords.confirm,
    'Оплата', 'Перевод', 'Сумма', 'Получатель',
  ];

  const result = waitForText(keywords, null, T().paymentPageTimeoutUs);
  if (result.found) {
    logInfo(`Bank screen detected ("${result.keyword}")`);
    return true;
  }

  // Fallback: detect Ozon brand color at top of screen
  const brandColor = CONFIG.ozonBank.colors.brandColor;
  if (checkColorAt(CONFIG.device.screenWidth / 2, 100, brandColor, 40)) {
    logInfo('Bank screen detected (brand color)');
    usleep(T().pageTransitionUs);
    return true;
  }

  return false;
}

// ── Tap Confirm Button ───────────────────────────────────
// The payment details are pre-filled by the URL.
// We just need to find and burst-tap the confirm/pay button.

function tapConfirmButton() {
  // Try all possible button texts
  const buttonTexts = [
    'Подтвердить',
    'Оплатить',
    'Перевести',
    'Подтвердить оплату',
    'Подтвердить перевод',
    'Confirm',
    'Pay',
    'Send',
    'Продолжить',
    'Continue',
  ];

  for (const text of buttonTexts) {
    const pos = findTextPositionOnScreen(text, null);
    if (pos.found) {
      logInfo(`Confirm button found: "${text}" at (${pos.x}, ${pos.y})`);
      burstTap(pos.x, pos.y);
      return true;
    }
  }

  // Fallback: look for Ozon-blue button by color
  const payBtnColor = CONFIG.ozonBank.colors.payButtonActive;
  const bottomHalf = {
    x: 0,
    y: CONFIG.device.screenHeight / 2,
    width: CONFIG.device.screenWidth,
    height: CONFIG.device.screenHeight / 2,
  };

  const { findColorInRegion } = require('./utils');
  const blueButtons = findColorInRegion(payBtnColor, bottomHalf, 3);
  if (blueButtons.length > 0) {
    const btn = blueButtons[0];
    logInfo(`Confirm button found by color at (${btn.x}, ${btn.y})`);
    burstTap(btn.x, btn.y);
    return true;
  }

  // Last resort: tap default confirm position
  logWarn('Using default confirm position');
  burstTap(CONFIG.ozonBank.ui.confirmButton.x, CONFIG.ozonBank.ui.confirmButton.y);
  return true;
}

// ── Check Payment Result ─────────────────────────────────

function checkPaymentResult() {
  // Wait for success/error screen
  const successResult = waitForText(
    CONFIG.ozonBank.keywords.success,
    null,
    T().paymentPageTimeoutUs
  );

  if (successResult.found) {
    logInfo('Payment successful!');
    return { success: true, reason: 'completed' };
  }

  // Check for error
  const errorResult = findTextOnScreen(CONFIG.ozonBank.keywords.error, null);
  if (errorResult.found) {
    logError(`Payment error: ${errorResult.keyword}`);
    return { success: false, reason: `error: ${errorResult.keyword}` };
  }

  logWarn('Payment result unclear — may need manual check');
  return { success: false, reason: 'result_unknown' };
}

// ── Return to Telegram ───────────────────────────────────

function returnToTelegram() {
  logInfo('Returning to Telegram...');
  appRun('ph.telegra.Telegraph');
  usleep(T().appSwitchDelayUs);
}

// ── Stats ────────────────────────────────────────────────

function getPaymentStats() {
  return {
    payments: paymentCount,
    errors: paymentErrors,
  };
}

module.exports = {
  processPayment,
  waitForPaymentScreen,
  tapConfirmButton,
  checkPaymentResult,
  returnToTelegram,
  getPaymentStats,
};
