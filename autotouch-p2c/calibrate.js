// ============================================================
// AutoTouch P2C — Calibration Tool
// ============================================================
// Helps you find the correct screen coordinates for your device.
// Run this FIRST before using the main scripts.
// Tap anywhere on screen and it will log coordinates + colors.
// ============================================================

const CONFIG = require('./config');
const {
  logInfo, ocrFullText, ocrRegion,
  checkColorAt,
} = require('./utils');

const { usleep, getColor, screenshot } = at;

logInfo('╔═══════════════════════════════════╗');
logInfo('║   P2C SNIPER CALIBRATION TOOL     ║');
logInfo('╚═══════════════════════════════════╝');
logInfo('');
logInfo('This tool helps calibrate screen coordinates.');
logInfo('Make sure the P2C bot chat is open in Telegram.');
logInfo('');

// Step 1: Take screenshot and run OCR on the whole screen
logInfo('Step 1: Running full-screen OCR...');
const fullText = ocrFullText(null);
logInfo('--- Full screen OCR text ---');
logInfo(fullText);
logInfo('--- End OCR ---');
logInfo('');

// Step 2: Scan specific regions
logInfo('Step 2: Scanning configured regions...');

const regions = {
  'Chat area': CONFIG.telegram.chatRegion,
  'Deal list': CONFIG.p2c.buttons.dealList,
  'Buy button': CONFIG.p2c.buttons.buy,
};

for (const [name, region] of Object.entries(regions)) {
  logInfo(`\n--- ${name} (x=${region.x}, y=${region.y}, w=${region.width}, h=${region.height}) ---`);
  const regionText = ocrFullText(region);
  logInfo(regionText || '(empty)');
}

// Step 3: Check color at key positions
logInfo('\nStep 3: Checking colors at key positions...');

const positions = {
  'Accept button': CONFIG.p2c.buttons.acceptDeal,
  'First deal': CONFIG.p2c.buttons.firstDeal,
  'Refresh button': CONFIG.p2c.buttons.refresh,
};

for (const [name, pos] of Object.entries(positions)) {
  const [color, err] = getColor(pos.x, pos.y);
  if (err) {
    logInfo(`${name} (${pos.x}, ${pos.y}): ERROR - ${err}`);
  } else {
    const hex = '0x' + color.toString(16).toUpperCase().padStart(6, '0');
    logInfo(`${name} (${pos.x}, ${pos.y}): color = ${hex}`);
  }
}

// Step 4: Take a debug screenshot
logInfo('\nStep 4: Taking debug screenshot...');
screenshot('p2c_calibration');
logInfo('Screenshot saved as p2c_calibration');

logInfo('\n=== CALIBRATION COMPLETE ===');
logInfo('Review the OCR output and color values above.');
logInfo('Update config.js with correct coordinates and colors for your device.');
logInfo('');
logInfo('Tip: Use the AutoTouch HELPER tool in the script editor');
logInfo('to tap on specific elements and get their exact coordinates.');

alert('Calibration complete! Check logs for results.');
