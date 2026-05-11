// ============================================================
// AutoTouch P2C Sniper — P2C Deal Monitor
// ============================================================
// Continuously scans the P2C bot screen for new deals.
// Uses OCR + color detection for maximum speed.
// ============================================================

const CONFIG = require('./config');
const {
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, scrollDealList,
  ocrFullText, findTextOnScreen, findTextPositionOnScreen,
  ocrRegion,
  checkColorAt, findColorInRegion,
  extractAmount, extractCryptoAmount, extractRate,
  waitForText,
} = require('./utils');

const { usleep } = at;

// ── State ────────────────────────────────────────────────

let lastSeenDeals = [];
let scanCount = 0;

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

// ── Screen Scanning ──────────────────────────────────────

function scanDealList() {
  scanCount++;
  logDebug(`Scan #${scanCount} started`);

  const dealRegion = CONFIG.p2c.buttons.dealList;
  const ocrResults = ocrRegion(dealRegion);

  if (!ocrResults || ocrResults.length === 0) {
    logDebug('No OCR results in deal list region');
    return [];
  }

  const deals = [];
  let currentDealText = '';
  let currentDealY = 0;
  let lastY = -1;

  for (const item of ocrResults) {
    if (!item.text) continue;

    const itemY = item.rect ? item.rect.y : 0;

    // Group OCR results into deals by vertical proximity
    if (lastY >= 0 && Math.abs(itemY - lastY) > 60) {
      if (currentDealText.length > 5) {
        const deal = parseDealFromText(currentDealText, currentDealY);
        deals.push(deal);
      }
      currentDealText = item.text;
      currentDealY = itemY;
    } else {
      currentDealText += ' ' + item.text;
      if (currentDealY === 0) currentDealY = itemY;
    }
    lastY = itemY;
  }

  // Push last deal
  if (currentDealText.length > 5) {
    const deal = parseDealFromText(currentDealText, currentDealY);
    deals.push(deal);
  }

  logDebug(`Found ${deals.length} deals in scan`);
  return deals;
}

function findNewDeals(currentDeals) {
  const newDeals = [];
  for (const deal of currentDeals) {
    const isNew = !lastSeenDeals.some(
      prev =>
        prev.rubAmount === deal.rubAmount &&
        prev.cryptoAmount === deal.cryptoAmount &&
        Math.abs(prev.yPosition - deal.yPosition) < 30
    );
    if (isNew) {
      newDeals.push(deal);
    }
  }
  return newDeals;
}

// ── Fast Scan Mode ───────────────────────────────────────
// Uses color detection instead of OCR for speed.

function fastScanForNewDeal() {
  const buyColor = CONFIG.p2c.colors.buyButton;
  const acceptColor = CONFIG.p2c.colors.acceptButton;
  const dealRegion = CONFIG.p2c.buttons.dealList;

  // Look for green "accept" buttons (new deal indicator)
  const acceptButtons = findColorInRegion(acceptColor, dealRegion, 5);

  if (acceptButtons.length > 0) {
    logInfo(`Fast scan: found ${acceptButtons.length} potential deal buttons`);
    return acceptButtons;
  }

  return [];
}

// ── Refresh Deals ────────────────────────────────────────

function refreshDealList() {
  logDebug('Refreshing deal list...');
  const refreshPos = CONFIG.p2c.buttons.refresh;
  tap(refreshPos.x, refreshPos.y);
  usleep(CONFIG.timing.pageTransitionUs);
}

// ── Monitor Loop ─────────────────────────────────────────

function monitorDeals(callback) {
  logInfo('P2C Monitor started');

  const startTime = Date.now();
  const maxRunMs = CONFIG.safety.maxRunTimeMinutes * 60 * 1000;
  let consecutiveErrors = 0;

  while (true) {
    // Safety checks
    if (Date.now() - startTime > maxRunMs) {
      logWarn('Max run time reached, stopping monitor');
      break;
    }
    if (consecutiveErrors >= CONFIG.safety.maxConsecutiveErrors) {
      logError('Too many consecutive errors, stopping');
      break;
    }

    try {
      // Phase 1: Fast color scan (minimal latency)
      const quickHits = fastScanForNewDeal();

      if (quickHits.length > 0) {
        // Phase 2: OCR scan for detailed info
        const deals = scanDealList();
        const acceptable = deals.filter(isDealAcceptable);

        if (acceptable.length > 0) {
          logInfo(`Found ${acceptable.length} acceptable deal(s)!`);
          const newDeals = findNewDeals(acceptable);

          if (newDeals.length > 0) {
            logInfo(`${newDeals.length} NEW deal(s) detected`);
            const bestDeal = newDeals[0];

            // Callback to deal grabber
            const grabbed = callback(bestDeal);
            if (grabbed) {
              lastSeenDeals = deals;
              consecutiveErrors = 0;
              usleep(CONFIG.safety.cooldownAfterGrabUs);
              continue;
            }
          }
        }

        lastSeenDeals = deals;
        consecutiveErrors = 0;
      }

      usleep(CONFIG.timing.scanIntervalUs);
    } catch (e) {
      consecutiveErrors++;
      logError(`Monitor error #${consecutiveErrors}: ${e}`);
      usleep(CONFIG.timing.scanIntervalUs * 2);
    }
  }

  logInfo(`Monitor stopped after ${scanCount} scans`);
}

// ── Passive Monitor (notification only) ──────────────────

function monitorDealsPassive() {
  logInfo('Passive P2C monitor started (notification only)');
  monitorDeals(function(deal) {
    const msg = `New deal: ${deal.cryptoAmount} ${deal.cryptoCurrency} = ${deal.rubAmount} RUB`;
    logInfo(msg);
    alert(msg);
    return false;
  });
}

module.exports = {
  scanDealList,
  findNewDeals,
  fastScanForNewDeal,
  refreshDealList,
  monitorDeals,
  monitorDealsPassive,
  isDealAcceptable,
  parseDealFromText,
};
