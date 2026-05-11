// ============================================================
// AutoTouch P2C Sniper — Ozon Bank Payment Automation
// ============================================================
// Handles payment flow: open Ozon Bank → enter details → pay.
// Supports both URL-based and manual payment flows.
// ============================================================

const CONFIG = require('./config');
const {
  T,
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, burstTap,
  ocrFullText, findTextOnScreen, findTextPositionOnScreen,
  waitForText, waitForTextPosition,
  openOzonBank, openURLInApp, isAppForeground,
  checkColorAt,
  notifyUser,
} = require('./utils');

const { usleep, inputText, clipText, appRun } = at;

// ── State ────────────────────────────────────────────────

let paymentCount = 0;
let paymentErrors = 0;

// ── Main Payment Flow ────────────────────────────────────

function processPayment(paymentInfo) {
  logInfo('Starting payment flow...');
  logInfo(`Amount: ${paymentInfo.amount} ${paymentInfo.currency}`);
  logInfo(`URL: ${paymentInfo.paymentUrl || 'none'}`);
  logInfo(`Card: ${paymentInfo.cardNumber || 'none'}`);

  let result;

  if (paymentInfo.paymentUrl) {
    result = payViaURL(paymentInfo);
  } else if (paymentInfo.cardNumber) {
    result = payViaCardTransfer(paymentInfo);
  } else {
    logError('No payment URL or card number found');
    return { success: false, reason: 'no_payment_method' };
  }

  if (result.success) {
    paymentCount++;
    logInfo(`Payment #${paymentCount} completed successfully`);
  } else {
    paymentErrors++;
    logError(`Payment failed: ${result.reason}`);
  }

  return result;
}

// ── Pay via URL (deep link) ──────────────────────────────

function payViaURL(paymentInfo) {
  logInfo(`Opening payment URL: ${paymentInfo.paymentUrl}`);

  openURLInApp(paymentInfo.paymentUrl);
  usleep(T().appSwitchDelayUs * 2);

  // Wait for Ozon Bank to open and show payment screen
  const loaded = waitForPaymentScreen();
  if (!loaded) {
    logError('Payment screen did not load');
    return { success: false, reason: 'screen_not_loaded' };
  }

  // Verify the amount matches
  const verified = verifyPaymentAmount(paymentInfo.amount);
  if (!verified) {
    logWarn('Amount mismatch on payment screen');
    return { success: false, reason: 'amount_mismatch' };
  }

  // Tap the Pay button
  return confirmPayment();
}

// ── Pay via Card Transfer ────────────────────────────────

function payViaCardTransfer(paymentInfo) {
  logInfo(`Starting card transfer to: ${paymentInfo.cardNumber}`);

  openOzonBank();
  usleep(T().appSwitchDelayUs);

  // Navigate to transfers
  const transferBtn = findTextPositionOnScreen('Перевод', null);
  if (!transferBtn.found) {
    const transferBtn2 = findTextPositionOnScreen('Переводы', null);
    if (transferBtn2.found) {
      tap(transferBtn2.x, transferBtn2.y);
    } else {
      logError('Cannot find transfer button');
      return { success: false, reason: 'transfer_btn_not_found' };
    }
  } else {
    tap(transferBtn.x, transferBtn.y);
  }

  usleep(T().pageTransitionUs);

  // Select "By card number" option
  const byCardBtn = findTextPositionOnScreen('По номеру карты', null);
  if (!byCardBtn.found) {
    const byCardBtn2 = findTextPositionOnScreen('На карту', null);
    if (byCardBtn2.found) {
      tap(byCardBtn2.x, byCardBtn2.y);
    } else {
      logError('Cannot find "by card number" option');
      return { success: false, reason: 'card_option_not_found' };
    }
  } else {
    tap(byCardBtn.x, byCardBtn.y);
  }

  usleep(T().pageTransitionUs);

  // Enter card number
  const cardField = findTextPositionOnScreen('Номер карты', null);
  if (cardField.found) {
    tap(cardField.x, cardField.y + 40);
    usleep(T().betweenTapsUs);
  }

  inputText(paymentInfo.cardNumber);
  usleep(T().pageTransitionUs);

  // Enter amount
  const amountField = findTextPositionOnScreen('Сумма', null);
  if (amountField.found) {
    tap(amountField.x, amountField.y + 40);
    usleep(T().betweenTapsUs);
  }

  inputText(String(paymentInfo.amount));
  usleep(T().betweenTapsUs);

  // Enter comment if needed
  if (paymentInfo.comment) {
    const commentField = findTextPositionOnScreen('Комментарий', null);
    if (commentField.found) {
      tap(commentField.x, commentField.y + 40);
      usleep(T().betweenTapsUs);
      inputText(paymentInfo.comment);
      usleep(T().betweenTapsUs);
    }
  }

  // Tap continue/transfer button
  return confirmPayment();
}

// ── Wait for Payment Screen ──────────────────────────────

function waitForPaymentScreen() {
  logInfo('Waiting for payment screen...');

  const payKeywords = CONFIG.ozonBank.keywords.pay;
  const result = waitForText(
    payKeywords,
    null,
    T().paymentPageTimeoutUs
  );

  if (result.found) {
    logInfo('Payment screen detected');
    return true;
  }

  // Fallback: check for Ozon brand color
  const brandColor = CONFIG.ozonBank.colors.brandColor;
  const colorFound = checkColorAt(
    CONFIG.device.screenWidth / 2,
    100,
    brandColor, 40
  );

  if (colorFound) {
    logInfo('Ozon Bank screen detected by color');
    usleep(T().pageTransitionUs);
    return true;
  }

  return false;
}

// ── Verify Amount ────────────────────────────────────────

function verifyPaymentAmount(expectedAmount) {
  const screenText = ocrFullText(null);
  const amounts = screenText.match(/[\d\s,.]+/g) || [];

  for (const raw of amounts) {
    const parsed = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
    if (parsed > 0 && Math.abs(parsed - expectedAmount) < 1) {
      logInfo(`Amount verified: ${parsed} ≈ ${expectedAmount}`);
      return true;
    }
  }

  logWarn(`Expected amount ${expectedAmount} not found on screen`);
  return false;
}

// ── Confirm Payment ──────────────────────────────────────

function confirmPayment() {
  logInfo('Confirming payment...');

  for (const keyword of CONFIG.ozonBank.keywords.pay) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      burstTap(pos.x, pos.y);
      logInfo(`Payment button tapped ("${keyword}")`);
      usleep(T().pageTransitionUs);
      break;
    }
  }

  usleep(T().pageTransitionUs);
  for (const keyword of CONFIG.ozonBank.keywords.confirm) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      burstTap(pos.x, pos.y);
      logInfo(`Confirmation tapped ("${keyword}")`);
      break;
    }
  }

  usleep(T().appSwitchDelayUs);
  return checkPaymentResult();
}

// ── Check Payment Result ─────────────────────────────────

function checkPaymentResult() {
  const successResult = waitForText(
    CONFIG.ozonBank.keywords.success,
    null,
    T().paymentPageTimeoutUs
  );

  if (successResult.found) {
    logInfo('Payment successful!');
    notifyUser('Payment completed successfully!');
    return { success: true, reason: 'completed' };
  }

  const errorResult = findTextOnScreen(CONFIG.ozonBank.keywords.error, null);
  if (errorResult.found) {
    logError(`Payment error: ${errorResult.fullText}`);
    return { success: false, reason: `error: ${errorResult.keyword}` };
  }

  logWarn('Payment result unclear');
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
  payViaURL,
  payViaCardTransfer,
  waitForPaymentScreen,
  verifyPaymentAmount,
  confirmPayment,
  checkPaymentResult,
  returnToTelegram,
  getPaymentStats,
};
