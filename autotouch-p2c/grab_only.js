// ============================================================
// AutoTouch P2C — Grab Only Mode
// ============================================================
// Monitors + grabs deals but does NOT auto-pay.
// User must complete payment manually.
// ============================================================

const CONFIG = require('./config');
const { logInfo, setLogLevel, openTelegram, isAppForeground, notifyUser } = require('./utils');
const { monitorDeals } = require('./p2c_monitor');
const { grabDeal } = require('./deal_grabber');

const { usleep } = at;

let grabbed = 0;

setLogLevel('INFO');
logInfo('Starting P2C in GRAB ONLY mode');

if (!isAppForeground('ph.telegra.Telegraph')) {
  openTelegram();
  usleep(1000000);
}

monitorDeals(function(deal) {
  const result = grabDeal(deal);
  if (result.success) {
    grabbed++;
    const pi = result.paymentInfo;
    notifyUser(
      `Deal #${grabbed} grabbed!\n` +
      `Amount: ${pi ? pi.amount : '?'} RUB\n` +
      `Card: ${pi ? pi.cardNumber : '?'}\n` +
      `Complete payment manually.`
    );
  }
  return result.success;
});

logInfo(`Session ended. Grabbed ${grabbed} deals.`);
alert(`Done! Grabbed ${grabbed} deals total.`);
