// ============================================================
// AutoTouch P2C Sniper — Main Entry Point (TURBO)
// ============================================================
// Orchestrates the full P2C deal sniping + payment pipeline.
// Default mode: TURBO — minimum latency, maximum grab speed.
// ============================================================

const CONFIG = require('./config');
const {
  T,
  logInfo, logWarn, logError,
  openTelegram, isAppForeground,
  notifyUser, setLogLevel,
} = require('./utils');
const { monitorDeals, refreshDealList } = require('./p2c_monitor');
const { grabDeal, grabDealTurbo, shotgunGrab, getStats: getGrabStats, clearCache } = require('./deal_grabber');
const { processPayment, returnToTelegram, getPaymentStats } = require('./ozon_pay');

const { usleep } = at;

// ── Session State ────────────────────────────────────────

let sessionDeals = 0;
let sessionPayments = 0;
let sessionStartTime = 0;

// ── Deal Handler (called by monitor on each new deal) ────

function handleNewDeal(deal) {
  logInfo('=== DEAL DETECTED ===');

  if (sessionDeals >= CONFIG.safety.maxDealsPerSession) {
    logWarn('Session deal limit reached');
    return false;
  }

  let grabResult;

  // In turbo mode with multiple hits, use shotgun approach
  if (CONFIG.speedMode === 'turbo' && deal.allHits && deal.allHits.length > 1) {
    grabResult = shotgunGrab(deal.allHits);
  } else {
    grabResult = grabDeal(deal);
  }

  if (!grabResult.success) {
    logWarn(`Grab failed: ${grabResult.reason}`);
    return false;
  }

  sessionDeals++;
  logInfo(`Deal #${sessionDeals} grabbed in ${grabResult.elapsed}ms`);

  if (grabResult.paymentInfo) {
    const paymentResult = processPayment(grabResult.paymentInfo);

    if (paymentResult.success) {
      sessionPayments++;
      logInfo(`Payment #${sessionPayments} done`);
    } else {
      logError(`Payment failed: ${paymentResult.reason}`);
      notifyUser(`Payment failed: ${paymentResult.reason}. Complete manually.`);
    }

    returnToTelegram();
    usleep(T().pageTransitionUs);
    refreshDealList();
  } else {
    logWarn('No payment info — manual action required');
    notifyUser('Deal grabbed! Complete payment manually.');
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
    `  P2C SNIPER — ${CONFIG.speedMode.toUpperCase()} MODE`,
    '═══════════════════════════════════',
    `Duration:       ${elapsed} min`,
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

// ── Startup ──────────────────────────────────────────────

function runStartupChecks() {
  logInfo('Running startup checks...');

  if (!isAppForeground('ph.telegra.Telegraph')) {
    logInfo('Opening Telegram...');
    openTelegram();
    usleep(T().appSwitchDelayUs);
  }

  logInfo('Startup checks passed');
  return true;
}

// ── Main ─────────────────────────────────────────────────

function main() {
  sessionStartTime = Date.now();
  setLogLevel('INFO');

  logInfo('╔═══════════════════════════════════╗');
  logInfo(`║  P2C SNIPER v2.0 [${CONFIG.speedMode.toUpperCase()}]        ║`);
  logInfo('╚═══════════════════════════════════╝');
  logInfo(`Scan interval: ${T().scanIntervalUs / 1000}ms`);
  logInfo(`Tap delay:     ${T().tapDelayUs / 1000}ms`);
  logInfo(`Burst taps:    ${T().burstTapCount}x`);

  if (!runStartupChecks()) {
    logError('Startup failed');
    return;
  }

  notifyUser(`P2C Sniper started [${CONFIG.speedMode.toUpperCase()}]`);

  monitorDeals(handleNewDeal);
  printSummary();
}

// ── Alternative Modes ────────────────────────────────────

function mainMonitorOnly() {
  sessionStartTime = Date.now();
  setLogLevel('DEBUG');
  logInfo('MONITOR ONLY mode');

  if (!runStartupChecks()) return;

  const { monitorDealsPassive } = require('./p2c_monitor');
  monitorDealsPassive();
  printSummary();
}

function mainGrabOnly() {
  sessionStartTime = Date.now();
  setLogLevel('INFO');
  logInfo('GRAB ONLY mode (no auto-pay)');

  if (!runStartupChecks()) return;

  monitorDeals(function(deal) {
    const result = grabDeal(deal);
    if (result.success) {
      sessionDeals++;
      notifyUser(`Deal #${sessionDeals} grabbed in ${result.elapsed}ms! Pay manually.`);
    }
    return result.success;
  });

  printSummary();
}

// ── Run ──────────────────────────────────────────────────

main();
