// ============================================================
// AutoTouch P2C Sniper — Utilities
// ============================================================
// Helper functions: tap, swipe, OCR wrappers, logging, etc.
// Uses AutoTouch v7+ JavaScript API (at.* namespace).
// ============================================================

const {
  touchDown, touchUp, touchMove,
  usleep, screenshot, appRun, appKill,
  getColor, getColors, findColor, findColors,
  findImage, keyDown, keyUp, openURL,
  appState, appInfo, setAutoLaunch,
  inputText, clipText,
} = at;

const CONFIG = require('./config');

// ── Timing Resolution (picks active speed mode) ──────

function T() {
  return CONFIG.timing[CONFIG.speedMode] || CONFIG.timing.turbo;
}

// ── Logging ──────────────────────────────────────────────

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLogLevel = LOG_LEVELS.INFO;

function setLogLevel(level) {
  currentLogLevel = LOG_LEVELS[level] || LOG_LEVELS.INFO;
}

function log(level, msg) {
  if (LOG_LEVELS[level] < currentLogLevel) return;
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level}] ${msg}`;
  console.log(line);
}

function logDebug(msg) { log('DEBUG', msg); }
function logInfo(msg)  { log('INFO', msg); }
function logWarn(msg)  { log('WARN', msg); }
function logError(msg) { log('ERROR', msg); }

// ── Touch Helpers ────────────────────────────────────────

function tap(x, y) {
  touchDown(0, x, y);
  usleep(T().tapDelayUs);
  touchUp(0, x, y);
}

function tapFast(x, y) {
  touchDown(0, x, y);
  usleep(8000); // 8ms — absolute minimum for iOS touch registration
  touchUp(0, x, y);
}

// Burst-tap: hit the same spot multiple times to guarantee registration
function burstTap(x, y) {
  const t = T();
  for (let i = 0; i < t.burstTapCount; i++) {
    touchDown(0, x, y);
    usleep(t.tapDelayUs);
    touchUp(0, x, y);
    if (i < t.burstTapCount - 1) usleep(t.burstTapIntervalUs);
  }
}

// Zero-delay instant tap — fires touchDown+touchUp back to back
function tapInstant(x, y) {
  touchDown(0, x, y);
  touchUp(0, x, y);
}

// Multi-finger tap (tap two spots simultaneously for speed)
function tapDual(x1, y1, x2, y2) {
  touchDown(0, x1, y1);
  touchDown(1, x2, y2);
  usleep(8000);
  touchUp(0, x1, y1);
  touchUp(1, x2, y2);
}

function doubleTap(x, y) {
  tapFast(x, y);
  usleep(20000);
  tapFast(x, y);
}

function longPress(x, y, durationUs) {
  touchDown(0, x, y);
  usleep(durationUs || 500000);
  touchUp(0, x, y);
}

function swipeUp(x, startY, endY, steps) {
  steps = steps || 10;
  const stepY = (endY - startY) / steps;
  touchDown(0, x, startY);
  for (let i = 1; i <= steps; i++) {
    usleep(8000);
    touchMove(0, x, startY + stepY * i);
  }
  touchUp(0, x, endY);
}

function swipeDown(x, startY, endY, steps) {
  swipeUp(x, startY, endY, steps);
}

function scrollDealList(direction) {
  const region = CONFIG.p2c.buttons.dealList;
  const centerX = region.x + region.width / 2;
  if (direction === 'down') {
    swipeUp(centerX, region.y + region.height - 50, region.y + 50, 15);
  } else {
    swipeUp(centerX, region.y + 50, region.y + region.height - 50, 15);
  }
  usleep(T().scrollDelayUs);
}

// ── Screen Analysis ──────────────────────────────────────

function checkColorAt(x, y, expectedColor, tolerance) {
  tolerance = tolerance || 30;
  const [color, err] = getColor(x, y);
  if (err) {
    logError(`getColor error at (${x},${y}): ${err}`);
    return false;
  }

  const r1 = (color >> 16) & 0xFF;
  const g1 = (color >> 8) & 0xFF;
  const b1 = color & 0xFF;

  const r2 = (expectedColor >> 16) & 0xFF;
  const g2 = (expectedColor >> 8) & 0xFF;
  const b2 = expectedColor & 0xFF;

  return (
    Math.abs(r1 - r2) <= tolerance &&
    Math.abs(g1 - g2) <= tolerance &&
    Math.abs(b1 - b2) <= tolerance
  );
}

function findColorInRegion(color, region, count) {
  const [result, err] = findColor({
    color: color,
    count: count || 1,
    region: region
      ? { x: region.x, y: region.y, width: region.width, height: region.height }
      : null,
  });
  if (err) return [];
  return result || [];
}

// Ultra-fast: check multiple key pixel positions in one call
function checkMultipleColors(positions) {
  const locs = positions.map(p => ({ x: p.x, y: p.y }));
  const [result, err] = getColors(locs);
  if (err) return null;
  return result;
}

function findColorsPattern(colors, region) {
  const [result, err] = findColors({
    colors: colors,
    count: 1,
    region: region
      ? { x: region.x, y: region.y, width: region.width, height: region.height }
      : null,
  });
  if (err) {
    logError(`findColors error: ${err}`);
    return [];
  }
  return result || [];
}

// ── OCR Helpers ──────────────────────────────────────────

function ocrRegion(region) {
  const [result, err] = at.ocr({
    region: region
      ? { x: region.x, y: region.y, width: region.width, height: region.height }
      : null,
    languages: ['ru-RU', 'en-US'],
    level: 1,
  });
  if (err) {
    logError(`OCR error: ${err}`);
    return [];
  }
  return result || [];
}

function ocrFullText(region) {
  const results = ocrRegion(region);
  return results.map(r => r.text || '').join(' ');
}

function findTextOnScreen(keywords, region) {
  const text = ocrFullText(region).toLowerCase();
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) {
      return { found: true, keyword: kw, fullText: text };
    }
  }
  return { found: false, keyword: null, fullText: text };
}

function findTextPositionOnScreen(keyword, region) {
  const results = ocrRegion(region);
  for (const item of results) {
    if (item.text && item.text.toLowerCase().includes(keyword.toLowerCase())) {
      if (item.rect) {
        return {
          found: true,
          x: item.rect.x + item.rect.width / 2,
          y: item.rect.y + item.rect.height / 2,
          text: item.text,
        };
      }
    }
  }
  return { found: false, x: 0, y: 0, text: '' };
}

// ── Text Extraction ──────────────────────────────────────

function extractAmount(text) {
  const match = text.match(/([\d\s,.]+)\s*(RUB|₽|руб)/i);
  if (match) {
    return parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
  }
  return 0;
}

function extractCryptoAmount(text) {
  const match = text.match(/([\d,.]+)\s*(USDT|BTC|ETH|TON)/i);
  if (match) {
    return {
      amount: parseFloat(match[1].replace(',', '.')),
      currency: match[2].toUpperCase(),
    };
  }
  return null;
}

function extractRate(text) {
  const match = text.match(/(?:курс|rate|цена|price)[:\s]*([\d,.]+)/i);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

// ── App Management ───────────────────────────────────────

function openTelegram() {
  logInfo('Opening Telegram...');
  appRun('ph.telegra.Telegraph');
  usleep(CONFIG.timing.appSwitchDelayUs);
}

function openOzonBank() {
  logInfo('Opening Ozon Bank...');
  appRun(CONFIG.ozonBank.bundleId);
  usleep(CONFIG.timing.appSwitchDelayUs);
}

function openURLInApp(url) {
  logInfo(`Opening URL: ${url}`);
  openURL(url);
  usleep(CONFIG.timing.appSwitchDelayUs);
}

function isAppForeground(bundleId) {
  const [state, err] = appState(bundleId);
  if (err) return false;
  return state === 'active';
}

// ── Waiting Helpers ──────────────────────────────────────

function waitForColor(x, y, color, timeoutUs, tolerance) {
  tolerance = tolerance || 30;
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;
  const pollUs = T().colorScanUs;

  while (Date.now() - startTime < timeoutMs) {
    if (checkColorAt(x, y, color, tolerance)) return true;
    usleep(pollUs);
  }
  return false;
}

function waitForText(keywords, region, timeoutUs) {
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;
  const pollUs = T().ocrWaitUs;

  while (Date.now() - startTime < timeoutMs) {
    const result = findTextOnScreen(keywords, region);
    if (result.found) return result;
    usleep(pollUs);
  }
  return { found: false, keyword: null, fullText: '' };
}

function waitForTextPosition(keyword, region, timeoutUs) {
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;
  const pollUs = T().ocrWaitUs;

  while (Date.now() - startTime < timeoutMs) {
    const result = findTextPositionOnScreen(keyword, region);
    if (result.found) return result;
    usleep(pollUs);
  }
  return { found: false, x: 0, y: 0, text: '' };
}

// Wait for ANY color change at a position (new content appeared)
function waitForColorChange(x, y, timeoutUs) {
  const [origColor] = getColor(x, y);
  const startTime = Date.now();
  const timeoutMs = timeoutUs / 1000;
  const pollUs = T().colorScanUs;

  while (Date.now() - startTime < timeoutMs) {
    const [current] = getColor(x, y);
    if (current !== origColor) return true;
    usleep(pollUs);
  }
  return false;
}

// ── Vibration / Sound ────────────────────────────────────

function notifyUser(message) {
  logInfo(`NOTIFY: ${message}`);
  if (CONFIG.notifications.vibrateOnGrab) {
    at.vibrate();
  }
  alert(message);
}

module.exports = {
  T,
  setLogLevel,
  logDebug, logInfo, logWarn, logError,
  tap, tapFast, burstTap, tapInstant, tapDual, doubleTap, longPress,
  swipeUp, swipeDown, scrollDealList,
  checkColorAt, findColorInRegion, findColorsPattern, checkMultipleColors,
  ocrRegion, ocrFullText, findTextOnScreen, findTextPositionOnScreen,
  extractAmount, extractCryptoAmount, extractRate,
  openTelegram, openOzonBank, openURLInApp, isAppForeground,
  waitForColor, waitForText, waitForTextPosition, waitForColorChange,
  notifyUser,
};
