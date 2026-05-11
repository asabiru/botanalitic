// ============================================================
// AutoTouch P2C — Monitor Only Mode
// ============================================================
// Only monitors and notifies about deals, does NOT auto-grab.
// Useful for testing and calibrating screen coordinates.
// ============================================================

const { logInfo, setLogLevel, openTelegram, isAppForeground } = require('./utils');
const { monitorDealsPassive } = require('./p2c_monitor');

const { usleep } = at;

setLogLevel('DEBUG');
logInfo('Starting P2C Monitor in PASSIVE mode');

if (!isAppForeground('ph.telegra.Telegraph')) {
  openTelegram();
  usleep(1000000);
}

monitorDealsPassive();
