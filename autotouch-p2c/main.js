// ============================================================
// AutoTouch P2C Sniper — Main Entry Point
// ============================================================
// Orchestrates the full P2C deal sniping + payment pipeline.
// Install: copy entire autotouch-p2c folder to AutoTouch scripts.
// Run: execute main.js from AutoTouch control panel.
// ============================================================

const CONFIG = require('./config');
const {
  logInfo, logWarn, logError,
  openTelegram, isAppForeground,
  notifyUser, setLogLevel,
} = require('./utils');
const { monitorDeals, refreshDealList } = require('./p2c_monitor');
const { grabDeal, getStats: getGrabStats } = require('./deal_grabber');
const { processPayment, returnToTelegram, getPaymentStats } = require('./ozon_pay');

const { usleep } = at;

// ── Session State ────────────────────────────────────────

let sessionDeals = 0;
let sessionPayments = 0;
let sessionStartTime = 0;

// ── Deal Handler (called by monitor on each new deal) ────

function handleNewDeal(deal) {
  logInfo('=== NEW DEAL DETECTED ===');
  logInfo(`${deal.cryptoAmount} ${deal.cryptoCurrency} = ${deal.rubAmount} RUB`);
  logInfo(`Payment method accepted: ${deal.hasAcceptedPayment}`);

  // Check session limits
  if (sessionDeals >= CONFIG.safety.maxDealsPerSession) {
    logWarn('Session deal limit reached');
    return false;
  }

  // Grab the deal
  const grabResult = grabDeal(deal);
  if (!grabResult.success) {
    logWarn(`Grab failed: ${grabResult.reason}`);
    return false;
  }

  sessionDeals++;
  logInfo(`Deal grabbed (#${sessionDeals}). Payment info received.`);

  // Process payment if payment info is available
  if (grabResult.paymentInfo) {
    const paymentResult = processPayment(grabResult.paymentInfo);

    if (paymentResult.success) {
      sessionPayments++;
      logInfo(`Payment #${sessionPayments} completed`);

      // Return to Telegram to continue monitoring
      returnToTelegram();
      usleep(CONFIG.timing.pageTransitionUs);

      // Navigate back to P2C bot and refresh
      refreshDealList();
    } else {
      logError(`Payment failed: ${paymentResult.reason}`);
      notifyUser(`Payment failed: ${paymentResult.reason}. Please complete manually.`);

      // Still return to Telegram
      returnToTelegram();
      usleep(CONFIG.timing.pageTransitionUs);
    }
  } else {
    logWarn('No payment info extracted, manual action required');
    notifyUser('Deal grabbed but no payment info found. Complete payment manually.');
  }

  return true;
}

// ── Print Summary ────────────────────────────────────────

function printSummary() {
  const elapsed = ((Date.now() - sessionStartTime) / 1000 / 60).toFixed(1);
  const grabStats = getGrabStats();
  const payStats = getPaymentStats();

  const summary = [
    '═══════════════════════════════════',
    '     P2C SNIPER SESSION SUMMARY    ',
    '═══════════════════════════════════',
    `Duration:       ${elapsed} minutes`,
    `Deals grabbed:  ${sessionDeals}`,
    `Payments made:  ${sessionPayments}`,
    `Grab success:   ${grabStats.successRate}`,
    `Grab failed:    ${grabStats.failed}`,
    `Payment errors: ${payStats.errors}`,
    '═══════════════════════════════════',
  ].join('\n');

  logInfo(summary);
  alert(summary);
}

// ── Startup Checks ───────────────────────────────────────

function runStartupChecks() {
  logInfo('Running startup checks...');

  // Check if Telegram is running
  if (!isAppForeground('ph.telegra.Telegraph')) {
    logInfo('Telegram not in foreground, opening...');
    openTelegram();
    usleep(CONFIG.timing.appSwitchDelayUs);
  }

  logInfo('Startup checks passed');
  return true;
}

// ── Main ─────────────────────────────────────────────────

function main() {
  sessionStartTime = Date.now();
  setLogLevel('INFO');

  logInfo('╔═══════════════════════════════════╗');
  logInfo('║     P2C SNIPER by AutoTouch       ║');
  logInfo('║     v1.0.0                        ║');
  logInfo('╚═══════════════════════════════════╝');

  // Startup
  if (!runStartupChecks()) {
    logError('Startup checks failed, aborting');
    return;
  }

  notifyUser('P2C Sniper started! Monitoring for deals...');

  // Start monitoring loop (blocking)
  monitorDeals(handleNewDeal);

  // When monitor stops, print summary
  printSummary();
}

// ── Alternative Modes ────────────────────────────────────

function mainMonitorOnly() {
  sessionStartTime = Date.now();
  setLogLevel('INFO');
  logInfo('Starting in MONITOR ONLY mode (no auto-grab)');

  if (!runStartupChecks()) return;

  const { monitorDealsPassive } = require('./p2c_monitor');
  monitorDealsPassive();

  printSummary();
}

function mainGrabOnly() {
  sessionStartTime = Date.now();
  setLogLevel('INFO');
  logInfo('Starting in GRAB ONLY mode (no auto-pay)');

  if (!runStartupChecks()) return;

  monitorDeals(function(deal) {
    const result = grabDeal(deal);
    if (result.success) {
      sessionDeals++;
      notifyUser(`Deal grabbed! Complete payment manually.\nAmount: ${result.paymentInfo ? result.paymentInfo.amount : 'unknown'} RUB`);
    }
    return result.success;
  });

  printSummary();
}

// ── Run ──────────────────────────────────────────────────

main();
