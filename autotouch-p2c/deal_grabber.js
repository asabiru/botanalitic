// ============================================================
// AutoTouch P2C Sniper — Deal Grabber (TURBO)
// ============================================================
// Ultra-fast deal capture optimized for minimum latency.
// Strategy: tap first, verify later.
// ============================================================

const CONFIG = require('./config');
const {
  T,
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, burstTap, tapInstant,
  findTextOnScreen, findTextPositionOnScreen,
  ocrFullText, checkColorAt, findColorInRegion,
  waitForText, waitForTextPosition, waitForColor, waitForColorChange,
  checkMultipleColors,
  notifyUser,
} = require('./utils');

const { usleep, touchDown, touchUp, getColor } = at;

// ── State ────────────────────────────────────────────────

let grabbedCount = 0;
let failedCount = 0;
let cachedAcceptPos = null;
let cachedConfirmPos = null;

// ── TURBO Grab: tap-first strategy ───────────────────────
// Instead of scanning -> analyzing -> tapping, we:
// 1. Instantly burst-tap the deal position
// 2. Instantly burst-tap the known accept button position
// 3. Instantly burst-tap the known confirm position
// 4. THEN verify the result

function grabDealTurbo(deal) {
  const startTime = Date.now();

  // Phase 1: Instant tap on deal (no delay)
  burstTap(CONFIG.device.screenWidth / 2, deal.yPosition);

  // Phase 2: Immediately hit accept button (cached or default position)
  const acceptX = cachedAcceptPos ? cachedAcceptPos.x : CONFIG.p2c.buttons.acceptDeal.x;
  const acceptY = cachedAcceptPos ? cachedAcceptPos.y : CONFIG.p2c.buttons.acceptDeal.y;

  usleep(T().betweenTapsUs);
  burstTap(acceptX, acceptY);

  // Phase 3: Hit confirm (pre-emptive, may not appear yet)
  const confirmX = cachedConfirmPos ? cachedConfirmPos.x : CONFIG.p2c.buttons.confirmDeal.x;
  const confirmY = cachedConfirmPos ? cachedConfirmPos.y : CONFIG.p2c.buttons.confirmDeal.y;

  usleep(T().betweenTapsUs);
  burstTap(confirmX, confirmY);

  // Phase 4: Quick color-based result check
  usleep(T().pageTransitionUs);
  const result = checkGrabResult();

  const elapsed = Date.now() - startTime;
  logInfo(`TURBO grab: ${elapsed}ms — ${result.status}`);

  if (result.status === 'success') {
    grabbedCount++;
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

// ── Standard Grab (with OCR verification) ────────────────

function grabDeal(deal) {
  if (CONFIG.speedMode === 'turbo') {
    return grabDealTurbo(deal);
  }

  const startTime = Date.now();

  // Step 1: Burst-tap on the deal row
  burstTap(CONFIG.device.screenWidth / 2, deal.yPosition);
  usleep(T().betweenTapsUs);

  // Step 2: Find and tap accept button
  const accepted = tapAcceptButton();
  if (!accepted) {
    failedCount++;
    return { success: false, reason: 'accept_not_found' };
  }

  usleep(T().betweenTapsUs);

  // Step 3: Confirm
  tapConfirmButton();

  // Step 4: Verify result
  const result = waitForDealResult();

  const elapsed = Date.now() - startTime;
  logInfo(`Grab: ${elapsed}ms — ${result.status}`);

  if (result.status === 'success') {
    grabbedCount++;
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

// ── Accept Button (multi-strategy) ───────────────────────

function tapAcceptButton() {
  // Strategy 1: Use cached position (fastest)
  if (cachedAcceptPos) {
    burstTap(cachedAcceptPos.x, cachedAcceptPos.y);
    logDebug('Accept tapped (cached position)');
    return true;
  }

  // Strategy 2: Color match at default position (fast)
  const acceptColor = CONFIG.p2c.colors.acceptButton;
  if (checkColorAt(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y, acceptColor, 40)) {
    burstTap(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y);
    cachedAcceptPos = { x: CONFIG.p2c.buttons.acceptDeal.x, y: CONFIG.p2c.buttons.acceptDeal.y };
    logDebug('Accept tapped (color match) — position cached');
    return true;
  }

  // Strategy 3: Find green button anywhere in deal region (medium)
  const dealRegion = CONFIG.p2c.buttons.dealList;
  const greenButtons = findColorInRegion(acceptColor, dealRegion, 3);
  if (greenButtons.length > 0) {
    const btn = greenButtons[0];
    burstTap(btn.x, btn.y);
    cachedAcceptPos = { x: btn.x, y: btn.y };
    logDebug(`Accept tapped (color scan at ${btn.x},${btn.y}) — position cached`);
    return true;
  }

  // Strategy 4: OCR (slowest, last resort)
  for (const keyword of CONFIG.p2c.keywords.accept) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      burstTap(pos.x, pos.y);
      cachedAcceptPos = { x: pos.x, y: pos.y };
      logDebug(`Accept tapped (OCR: "${keyword}") — position cached`);
      return true;
    }
  }

  // Strategy 5: Blind tap at default position
  burstTap(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y);
  return true;
}

// ── Confirm Button ───────────────────────────────────────

function tapConfirmButton() {
  usleep(T().pageTransitionUs);

  // Use cached position if available
  if (cachedConfirmPos) {
    burstTap(cachedConfirmPos.x, cachedConfirmPos.y);
    return true;
  }

  // Quick OCR scan for confirm keywords
  for (const keyword of ['Подтвердить', 'Confirm', 'Да', 'Yes', 'OK']) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      burstTap(pos.x, pos.y);
      cachedConfirmPos = { x: pos.x, y: pos.y };
      return true;
    }
  }

  // Default position
  burstTap(CONFIG.p2c.buttons.confirmDeal.x, CONFIG.p2c.buttons.confirmDeal.y);
  return true;
}

// ── Quick Result Check (color-based, no OCR) ─────────────

function checkGrabResult() {
  // Check for green (success) vs red (error) at key screen positions
  const midX = CONFIG.device.screenWidth / 2;
  const positions = [
    { x: midX, y: 400 },
    { x: midX, y: 500 },
    { x: midX, y: 600 },
  ];

  const colors = checkMultipleColors(positions);
  if (colors) {
    for (const c of colors) {
      // Check if any position shows error red
      const r = (c >> 16) & 0xFF;
      const g = (c >> 8) & 0xFF;
      if (r > 200 && g < 80) {
        return { status: 'taken', paymentInfo: null };
      }
    }
  }

  // Fall back to OCR for detailed result
  return waitForDealResult();
}

// ── Wait for Result ──────────────────────────────────────

function waitForDealResult() {
  const timeoutUs = T().acceptTimeoutUs;
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;
  const pollUs = T().ocrWaitUs;

  while (Date.now() - startTime < timeoutMs) {
    const success = findTextOnScreen(CONFIG.p2c.keywords.success, null);
    if (success.found) {
      const paymentInfo = extractPaymentInfo(success.fullText);
      return { status: 'success', paymentInfo: paymentInfo };
    }

    const taken = findTextOnScreen(CONFIG.p2c.keywords.taken, null);
    if (taken.found) {
      return { status: 'taken', paymentInfo: null };
    }

    usleep(pollUs);
  }

  return { status: 'timeout', paymentInfo: null };
}

// ── Extract Payment Info ─────────────────────────────────
// After grabbing a deal, the P2C bot shows a payment URL.
// We extract it and tap it to open Ozon Bank.

function extractPaymentInfo(screenText) {
  const info = {
    amount: 0,
    currency: 'RUB',
    paymentUrl: null,
  };

  // Extract payment URL (the bot provides this after deal capture)
  const urlMatch = screenText.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    info.paymentUrl = urlMatch[1];
  }

  // Extract amount for logging
  const rubMatch = screenText.match(/([\d\s,.]+)\s*(RUB|₽|руб)/i);
  if (rubMatch) {
    info.amount = parseFloat(rubMatch[1].replace(/\s/g, '').replace(',', '.'));
  }

  return info;
}

// ── Find and Tap Payment Link ────────────────────────────
// If extractPaymentInfo didn't get the URL via OCR,
// try to find and tap a clickable link on screen.

function tapPaymentLink() {
  // Look for blue/underlined link text (typical in Telegram)
  const linkKeywords = ['Оплатить', 'Перейти к оплате', 'Pay', 'ozon', 'payment'];
  for (const keyword of linkKeywords) {
    const pos = findTextPositionOnScreen(keyword, null);
    if (pos.found) {
      logInfo(`Payment link found: "${keyword}" at (${pos.x}, ${pos.y})`);
      burstTap(pos.x, pos.y);
      return true;
    }
  }

  // Look for URL-like text on screen
  const fullText = ocrFullText(null);
  const urlMatch = fullText.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    // URL found in text — find its position
    const urlPos = findTextPositionOnScreen(urlMatch[1].substring(0, 20), null);
    if (urlPos.found) {
      burstTap(urlPos.x, urlPos.y);
      return true;
    }
  }

  return false;
}

// ── Batch Grab (shotgun approach) ────────────────────────
// Tap ALL deal positions simultaneously, then verify

function shotgunGrab(dealPositions) {
  logInfo(`Shotgun grab: ${dealPositions.length} positions`);
  const startTime = Date.now();

  // Tap all positions with minimal delay
  for (const pos of dealPositions) {
    tapInstant(pos.x, pos.y);
    usleep(T().burstTapIntervalUs);
  }

  // Wait a moment then tap accept
  usleep(T().betweenTapsUs);
  burstTap(CONFIG.p2c.buttons.acceptDeal.x, CONFIG.p2c.buttons.acceptDeal.y);

  usleep(T().betweenTapsUs);
  burstTap(CONFIG.p2c.buttons.confirmDeal.x, CONFIG.p2c.buttons.confirmDeal.y);

  usleep(T().pageTransitionUs);
  const result = checkGrabResult();

  const elapsed = Date.now() - startTime;
  if (result.status === 'success') {
    grabbedCount++;
    return { success: true, paymentInfo: result.paymentInfo, elapsed: elapsed };
  }

  failedCount++;
  return { success: false, reason: result.status, elapsed: elapsed };
}

// ── Clear Cached Positions ───────────────────────────────

function clearCache() {
  cachedAcceptPos = null;
  cachedConfirmPos = null;
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
  grabDealTurbo,
  shotgunGrab,
  tapAcceptButton,
  tapConfirmButton,
  waitForDealResult,
  extractPaymentInfo,
  tapPaymentLink,
  clearCache,
  getStats,
};
