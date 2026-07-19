// Persistent SQLite store for travelers, their pending updates, and call
// outcomes. Per-trip data (trips, membership, reservations) lives in
// trips.js, which shares this module's `database` connection.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const databasePath = process.env.TRAVEL_MEMORY_DB_PATH
  ? path.resolve(process.env.TRAVEL_MEMORY_DB_PATH)
  : path.join(__dirname, 'data', 'travel-memory.sqlite');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec('PRAGMA journal_mode = WAL;');
database.exec('PRAGMA foreign_keys = ON;');
database.exec(`
  CREATE TABLE IF NOT EXISTS travelers (
    phone TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    preferences TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pending_updates (
    phone TEXT PRIMARY KEY REFERENCES travelers(phone) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS call_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    itinerary_changes TEXT NOT NULL DEFAULT '[]',
    timestamp TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS call_outcomes_phone_timestamp
    ON call_outcomes(phone, timestamp DESC);
`);

const statements = {
  findByPhone: database.prepare(
    'SELECT name, phone, preferences FROM travelers WHERE phone = ?',
  ),
  findByName: database.prepare(`
    SELECT name, phone, preferences
    FROM travelers
    WHERE lower(name) LIKE lower(?)
    ORDER BY updated_at DESC
    LIMIT 1
  `),
  listTravelers: database.prepare(`
    SELECT name, phone, preferences
    FROM travelers
    ORDER BY name COLLATE NOCASE, phone
  `),
  upsertTraveler: database.prepare(`
    INSERT INTO travelers (phone, name, preferences, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      name = excluded.name,
      preferences = excluded.preferences,
      updated_at = excluded.updated_at
  `),
  getPendingUpdate: database.prepare(
    'SELECT message FROM pending_updates WHERE phone = ?',
  ),
  setPendingUpdate: database.prepare(`
    INSERT INTO pending_updates (phone, message, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      message = excluded.message,
      created_at = excluded.created_at
  `),
  deletePendingUpdate: database.prepare(
    'DELETE FROM pending_updates WHERE phone = ?',
  ),
  insertOutcome: database.prepare(`
    INSERT INTO call_outcomes (name, phone, summary, itinerary_changes, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `),
  listOutcomes: database.prepare(`
    SELECT name, phone, summary, itinerary_changes, timestamp
    FROM call_outcomes
    ORDER BY id
  `),
  lastOutcomeForPhone: database.prepare(`
    SELECT name, phone, summary, itinerary_changes, timestamp
    FROM call_outcomes
    WHERE phone = ?
    ORDER BY id DESC
    LIMIT 1
  `),
};

function timestamp() {
  return new Date().toISOString();
}

function mapOutcome(row) {
  if (!row) return null;

  let itineraryChanges = [];
  try {
    itineraryChanges = JSON.parse(row.itinerary_changes);
  } catch {
    itineraryChanges = [];
  }

  return {
    name: row.name,
    phone: row.phone,
    summary: row.summary,
    itineraryChanges,
    timestamp: row.timestamp,
  };
}

function upsertTraveler({ name, phone, preferences }) {
  const existing = findTraveler({ phone });
  const traveler = {
    name: name ?? existing?.name ?? '',
    phone,
    preferences: preferences ?? existing?.preferences ?? '',
  };
  const now = timestamp();

  statements.upsertTraveler.run(
    traveler.phone,
    traveler.name,
    traveler.preferences,
    now,
    now,
  );
  return traveler;
}

function listTravelers() {
  return statements.listTravelers.all();
}

function findTraveler({ phone, name }) {
  if (phone) {
    const traveler = statements.findByPhone.get(phone);
    if (traveler) return traveler;
  }

  if (name && name.trim()) {
    return statements.findByName.get(`%${name.trim()}%`) || null;
  }

  return null;
}

function setPendingUpdate(phone, message) {
  statements.setPendingUpdate.run(phone, message, timestamp());
}

function getContextFor({ phone, name }) {
  const traveler = findTraveler({ phone, name });
  const pendingUpdate = traveler
    ? statements.getPendingUpdate.get(traveler.phone)?.message || null
    : null;
  const lastOutcome = traveler
    ? mapOutcome(statements.lastOutcomeForPhone.get(traveler.phone))
    : null;

  return { traveler, pendingUpdate, lastOutcome };
}

function recordOutcome({ phone, name, summary, itineraryChanges }) {
  let traveler = findTraveler({ phone, name });
  if (!traveler && phone) {
    traveler = upsertTraveler({ name: name || '', phone, preferences: '' });
  }
  const changes = Array.isArray(itineraryChanges) ? itineraryChanges : [];
  const now = timestamp();

  database.exec('BEGIN');
  try {
    if (traveler) statements.deletePendingUpdate.run(traveler.phone);

    const outcome = {
      name: traveler?.name || name || '',
      phone: traveler?.phone || phone || '',
      summary: summary || '',
      itineraryChanges: changes,
      timestamp: now,
    };
    statements.insertOutcome.run(
      outcome.name,
      outcome.phone,
      outcome.summary,
      JSON.stringify(outcome.itineraryChanges),
      outcome.timestamp,
    );
    database.exec('COMMIT');
    return outcome;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}

function listOutcomes() {
  return statements.listOutcomes.all().map(mapOutcome);
}

function close() {
  database.close();
}

module.exports = {
  upsertTraveler,
  listTravelers,
  findTraveler,
  setPendingUpdate,
  getContextFor,
  recordOutcome,
  listOutcomes,
  close,
  databasePath,
  database,
};
