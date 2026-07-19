const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const databasePath = process.env.TRAVEL_MEMORY_DB_PATH;

function fail(message) {
  console.error(`Memory test failed: ${message}`);
  process.exit(1);
}

if (process.argv[2] === 'verify') {
  const travelers = require('../server/travelers');
  const context = travelers.getContextFor({ phone: '+14155550100' });

  if (context.traveler?.name !== 'Jane') fail('traveler did not persist');
  if (!context.lastOutcome?.summary.includes('New York')) fail('call summary did not persist');
  if (!context.lastOutcome?.itineraryChanges.includes('Considering a Monday morning flight')) {
    fail('itinerary changes did not persist on the call outcome');
  }

  travelers.close();
  console.log('SQLite memory survived a fresh Node process.');
  process.exit(0);
}

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'travel-memory-test-'));
const testDatabasePath = path.join(tempDirectory, 'memory.sqlite');
process.env.TRAVEL_MEMORY_DB_PATH = testDatabasePath;

const travelers = require('../server/travelers');
travelers.recordOutcome({
  name: 'Jane',
  phone: '+14155550100',
  summary: 'Jane is planning a New York trip with friends.',
  itineraryChanges: ['Considering a Monday morning flight'],
});
travelers.close();

const verification = spawnSync(process.execPath, [__filename, 'verify'], {
  env: { ...process.env, TRAVEL_MEMORY_DB_PATH: testDatabasePath },
  encoding: 'utf8',
});

process.stdout.write(verification.stdout);
process.stderr.write(verification.stderr);
fs.rmSync(tempDirectory, { recursive: true, force: true });

if (verification.status !== 0) process.exit(verification.status || 1);
