// ============================================================
// AutoTouch P2C Sniper — Deal Grabber
// ============================================================
// Captures deals at maximum speed once detected by the monitor.
// Handles the full flow: tap deal → confirm → get payment info.
// ============================================================

const CONFIG = require('./config');
const {
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, doubleTap,
  findTextOnScreen, findTextPositionOnScreen,
  ocrFullText, checkColorAt,
  waitForText, waitForTextPosition, waitForColor,
  notifyUser,
} = require('./utils');

const { usleep } = at;

// ── State ────────────────────────────────────────────────

let grabbedCount = 0;
let failedCount = 0;

// ── Grab Deal ────────────────────────────────────────────

function grabDeal(deal) {
  logInfo(`Attempting to grab deal at Y=${deal.yPosition}`);
  logInfo(`Deal: ${deal.cryptoAmount} ${deal.cryptoCurrency} = ${deal.rubAmount} RUB`);

  const startTime = Date.now();

  // Step 1: Tap on the deal row (fastest possible)
  tapFast(CONFIG.device.screenWidth / 2, deal.yPosition);
  usleep(CONFIG.timing.betweenTapsUs);

  // Step 2: Look for and tap "Accept" / "Принять" button
  const accepted = tapAcceptButton();
  if (!accepted) {
    logWarn('Could not find accept button, deal may have been taken');
    failedCount++;
    return { success: false, reason: 'accept_not_found' };
  }

  usleep(CONFIG.timing.betweenTapsUs);

  // Step 3: Confirm the deal if confirmation dialog appears
  const confirmed = tapConfirmButton();

  // Step 4: Wait for success or payment info
  const result = waitForDealResult();

  const elapsed = Date.now() - startTime;
  logInfo(`Grab attempt took ${elapsed}ms — result: ${result.status}`);

  if (result.status === 'success') {
    grabbedCount++;
    notifyUser(`Deal grabbed! ${deal.cryptoAmount} ${deal.cryptoCurrency}`);
    return {
      success: true,
      deal: deal,
      paymentInfo: result.paymentInfo,
      elapsed: elapsed,
    };
  }

  failedCount++;
  return { success: false, reason: result.status, elapsed: elapsed };
}

// ── Accept Button ────────────────────────────────────────

function tapAcceptButton() {
  // Strategy 1: Look for accept button by color
  const acceptColor = CONFIG.p2c.colors.acceptButton;
  const acceptRegion = {
    x: 50,
    y: CONFIG.p2c.buttons.acceptDeal.y - 50,
    width: CONFIG.device.screenWidth - 100,
    height: 100,
  };

  const colorFound = checkColorAt(
    CONFIG.p2c.buttons.acceptDeal.x,
    CONFIG.p2c.buttons.acceptDeal.y,
    acceptColor, 40
  );

  if (colorFound) {
    tapFast(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y);
    logInfo('Accept button tapped (color match)');
    return true;
  }

  // Strategy 2: Look for accept button by OCR text
  for (const keyword of CONFIG.p2c.keywords.accept) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      tapFast(pos.x, pos.y);
      logInfo(`Accept button tapped (OCR: "${keyword}")`);
      return true;
    }
  }

  // Strategy 3: Tap the default accept position
  logWarn('Fallback: tapping default accept position');
  tapFast(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y);
  return true;
}

// ── Confirm Button ───────────────────────────────────────

function tapConfirmButton() {
  usleep(CONFIG.timing.pageTransitionUs);

  // Look for confirm keywords
  for (const keyword of ['Подтвердить', 'Confirm', 'Да', 'Yes', 'OK']) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      tapFast(pos.x, pos.y);
      logInfo(`Confirm button tapped ("${keyword}")`);
      return true;
    }
  }

  // Try default confirm position
  const confirmPos = CONFIG.p2c.buttons.confirmDeal;
  tapFast(confirmPos.x, confirmPos.y);
  return true;
}

// ── Wait for Result ──────────────────────────────────────

function waitForDealResult() {
  const timeoutUs = CONFIG.timing.acceptTimeoutUs;
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;

  while (Date.now() - startTime < timeoutMs) {
    // Check for success
    const success = findTextOnScreen(CONFIG.p2c.keywords.success, null);
    if (success.found) {
      const paymentInfo = extractPaymentInfo(success.fullText);
      return { status: 'success', paymentInfo: paymentInfo };
    }

    // Check if deal was already taken
    const taken = findTextOnScreen(CONFIG.p2c.keywords.taken, null);
    if (taken.found) {
      logWarn('Deal was already taken');
      return { status: 'taken', paymentInfo: null };
    }

    usleep(CONFIG.timing.ocrWaitUs);
  }

  logWarn('Deal grab timed out');
  return { status: 'timeout', paymentInfo: null };
}

// ── Extract Payment Info ─────────────────────────────────

function extractPaymentInfo(screenText) {
  const info = {
    amount: 0,
    currency: 'RUB',
    paymentUrl: null,
    cardNumber: null,
    bankName: null,
    recipientName: null,
    comment: null,
    timeLimit: null,
  };

  // Extract RUB amount
  const rubMatch = screenText.match(/([\d\s,.]+)\s*(RUB|₽|руб)/i);
  if (rubMatch) {
    info.amount = parseFloat(rubMatch[1].replace(/\s/g, '').replace(',', '.'));
  }

  // Extract payment URL
  const urlMatch = screenText.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    info.paymentUrl = urlMatch[1];
  }

  // Extract card number
  const cardMatch = screenText.match(/(\d{4}\s?\d{4}\s?\d{4}\s?\d{4})/);
  if (cardMatch) {
    info.cardNumber = cardMatch[1].replace(/\s/g, '');
  }

  // Extract bank name
  if (screenText.toLowerCase().includes('ozon') || screenText.toLowerCase().includes('озон')) {
    info.bankName = 'Ozon Bank';
  }

  // Extract time limit
  const timeMatch = screenText.match(/(\d+)\s*(мин|min|минут)/i);
  if (timeMatch) {
    info.timeLimit = parseInt(timeMatch[1]);
  }

  // Extract comment/memo
  const commentMatch = screenText.match(/(?:комментарий|comment|memo)[:\s]*([^\n]+)/i);
  if (commentMatch) {
    info.comment = commentMatch[1].trim();
  }

  return info;
}

// ── Batch Grab (try multiple deals fast) ─────────────────

function tryGrabFirstAvailable(deals) {
  for (const deal of deals) {
    const result = grabDeal(deal);
    if (result.success) {
      return result;
    }
    usleep(CONFIG.timing.betweenTapsUs);
  }
  return { success: false, reason: 'all_deals_failed' };
}

// ── Stats ────────────────────────────────────────────────

function getStats() {
  return {
    grabbed: grabbedCount,
    failed: failedCount,
    successRate: grabbedCount > 0
      ? ((grabbedCount / (grabbedCount + failedCount)) * 100).toFixed(1) + '%'
      : '0%',
  };
}

module.exports = {
  grabDeal,
  tapAcceptButton,
  tapConfirmButton,
  waitForDealResult,
  extractPaymentInfo,
  tryGrabFirstAvailable,
  getStats,
};
