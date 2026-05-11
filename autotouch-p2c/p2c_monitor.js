// ============================================================
// AutoTouch P2C Sniper — P2C Deal Monitor (TURBO)
// ============================================================
// Two-phase scanning: fast pixel polling + OCR on demand.
// Color scan runs at ~80ms intervals, OCR only when needed.
// ============================================================

const CONFIG = require('./config');
const {
  T,
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, burstTap, scrollDealList,
  ocrFullText, findTextOnScreen, findTextPositionOnScreen,
  ocrRegion,
  checkColorAt, findColorInRegion, checkMultipleColors,
  extractAmount, extractCryptoAmount, extractRate,
  waitForText, waitForColorChange,
} = require('./utils');

const { usleep, getColor } = at;

// ── State ────────────────────────────────────────────────

let lastSeenDeals = [];
let scanCount = 0;
let lastScreenHash = 0;

// ── Screen Change Detection ──────────────────────────────
// Check a few sentinel pixels to detect if screen content changed.
// Much faster than OCR — skips processing when nothing happened.

const SENTINEL_POINTS = [
  { x: 215, y: 250 },
  { x: 215, y: 350 },
  { x: 215, y: 450 },
  { x: 100, y: 300 },
  { x: 330, y: 300 },
];

function computeScreenHash() {
  const colors = checkMultipleColors(SENTINEL_POINTS);
  if (!colors) return 0;
  let hash = 0;
  for (const c of colors) {
    hash = ((hash << 5) - hash + c) | 0;
  }
  return hash;
}

function hasScreenChanged() {
  const newHash = computeScreenHash();
  if (newHash !== lastScreenHash) {
    lastScreenHash = newHash;
    return true;
  }
  return false;
}

// ── Deal Parsing ─────────────────────────────────────────

function parseDealFromText(text, yPosition) {
  const rubAmount = extractAmount(text);
  const crypto = extractCryptoAmount(text);
  const rate = extractRate(text);

  const hasPaymentMethod = CONFIG.filters.acceptedPaymentMethods.some(
    method => text.toLowerCase().includes(method.toLowerCase())
  );

  return {
    text: text,
    rubAmount: rubAmount,
    cryptoAmount: crypto ? crypto.amount : 0,
    cryptoCurrency: crypto ? crypto.currency : 'USDT',
    rate: rate,
    hasAcceptedPayment: hasPaymentMethod,
    yPosition: yPosition,
    timestamp: Date.now(),
  };
}

function isDealAcceptable(deal) {
  if (deal.rubAmount > 0) {
    if (deal.rubAmount < CONFIG.filters.minAmountRUB) return false;
    if (deal.rubAmount > CONFIG.filters.maxAmountRUB) return false;
  }

  if (deal.cryptoAmount > 0) {
    if (deal.cryptoAmount < CONFIG.filters.minCryptoAmount) return false;
    if (deal.cryptoAmount > CONFIG.filters.maxCryptoAmount) return false;
  }

  if (!deal.hasAcceptedPayment && CONFIG.filters.acceptedPaymentMethods.length > 0) {
    return false;
  }

  return true;
}

// ── Full OCR Scan ────────────────────────────────────────

function scanDealList() {
  scanCount++;
  const dealRegion = CONFIG.p2c.buttons.dealList;
  const ocrResults = ocrRegion(dealRegion);

  if (!ocrResults || ocrResults.length === 0) return [];

  const deals = [];
  let currentDealText = '';
  let currentDealY = 0;
  let lastY = -1;

  for (const item of ocrResults) {
    if (!item.text) continue;
    const itemY = item.rect ? item.rect.y : 0;

    if (lastY >= 0 && Math.abs(itemY - lastY) > 60) {
      if (currentDealText.length > 5) {
        deals.push(parseDealFromText(currentDealText, currentDealY));
      }
      currentDealText = item.text;
      currentDealY = itemY;
    } else {
      currentDealText += ' ' + item.text;
      if (currentDealY === 0) currentDealY = itemY;
    }
    lastY = itemY;
  }

  if (currentDealText.length > 5) {
    deals.push(parseDealFromText(currentDealText, currentDealY));
  }

  return deals;
}

function findNewDeals(currentDeals) {
  return currentDeals.filter(deal =>
    !lastSeenDeals.some(
      prev =>
        prev.rubAmount === deal.rubAmount &&
        prev.cryptoAmount === deal.cryptoAmount &&
        Math.abs(prev.yPosition - deal.yPosition) < 30
    )
  );
}

// ── Fast Color Scan ──────────────────────────────────────
// Pure pixel check — no OCR. Returns candidate button positions.

function fastScanForNewDeal() {
  const acceptColor = CONFIG.p2c.colors.acceptButton;
  const dealRegion = CONFIG.p2c.buttons.dealList;
  return findColorInRegion(acceptColor, dealRegion, 5);
}

// ── Turbo Scan: pixel-poll + instant grab ────────────────
// Skips OCR entirely. When green button appears, grab immediately.

function turboScan() {
  const acceptColor = CONFIG.p2c.colors.acceptButton;
  const dealRegion = CONFIG.p2c.buttons.dealList;

  // Check sentinel pixels for screen change
  if (!hasScreenChanged()) return null;

  // Screen changed — look for green accept buttons
  const hits = findColorInRegion(acceptColor, dealRegion, 3);
  if (hits.length > 0) {
    logInfo(`Turbo scan: ${hits.length} green button(s) detected`);
    // Return the first hit as a minimal "deal" object with Y position
    return {
      text: '',
      rubAmount: 0,
      cryptoAmount: 0,
      cryptoCurrency: 'USDT',
      rate: 0,
      hasAcceptedPayment: true,
      yPosition: hits[0].y,
      timestamp: Date.now(),
      isTurboDetected: true,
      allHits: hits,
    };
  }

  return null;
}

// ── Refresh ──────────────────────────────────────────────

function refreshDealList() {
  const refreshPos = CONFIG.p2c.buttons.refresh;
  tap(refreshPos.x, refreshPos.y);
  usleep(T().pageTransitionUs);
}

// ── Monitor Loop (TURBO) ─────────────────────────────────

function monitorDeals(callback) {
  logInfo('P2C Monitor started (mode: ' + CONFIG.speedMode + ')');

  const startTime = Date.now();
  const maxRunMs = CONFIG.safety.maxRunTimeMinutes * 60 * 1000;
  let consecutiveErrors = 0;
  const isTurbo = CONFIG.speedMode === 'turbo';
  const t = T();

  while (true) {
    if (Date.now() - startTime > maxRunMs) {
      logWarn('Max run time reached');
      break;
    }
    if (consecutiveErrors >= CONFIG.safety.maxConsecutiveErrors) {
      logError('Too many errors, stopping');
      break;
    }

    try {
      if (isTurbo) {
        // ── TURBO PATH: pixel-only scanning ──────────
        const turboDeal = turboScan();
        if (turboDeal) {
          // Grab immediately — no OCR verification
          const grabbed = callback(turboDeal);
          if (grabbed) {
            consecutiveErrors = 0;
            usleep(CONFIG.safety.cooldownAfterGrabUs);
            continue;
          }
        }
        usleep(t.colorScanUs); // 15ms poll in turbo
      } else {
        // ── STANDARD PATH: color scan → OCR on hit ───
        const quickHits = fastScanForNewDeal();

        if (quickHits.length > 0) {
          const deals = scanDealList();
          const acceptable = deals.filter(isDealAcceptable);

          if (acceptable.length > 0) {
            const newDeals = findNewDeals(acceptable);
            if (newDeals.length > 0) {
              logInfo(`${newDeals.length} new deal(s)`);
              const grabbed = callback(newDeals[0]);
              if (grabbed) {
                lastSeenDeals = deals;
                consecutiveErrors = 0;
                usleep(CONFIG.safety.cooldownAfterGrabUs);
                continue;
              }
            }
          }
          lastSeenDeals = deals;
        }

        usleep(t.scanIntervalUs);
      }

      consecutiveErrors = 0;
    } catch (e) {
      consecutiveErrors++;
      logError(`Error #${consecutiveErrors}: ${e}`);
      usleep(t.scanIntervalUs * 2);
    }
  }

  logInfo(`Monitor stopped after ${scanCount} scans`);
}

// ── Passive Monitor ──────────────────────────────────────

function monitorDealsPassive() {
  logInfo('Passive monitor started');
  monitorDeals(function(deal) {
    logInfo(`Deal spotted: Y=${deal.yPosition} turbo=${deal.isTurboDetected || false}`);
    alert('New deal detected!');
    return false;
  });
}

module.exports = {
  scanDealList,
  findNewDeals,
  fastScanForNewDeal,
  turboScan,
  hasScreenChanged,
  refreshDealList,
  monitorDeals,
  monitorDealsPassive,
  isDealAcceptable,
  parseDealFromText,
};
