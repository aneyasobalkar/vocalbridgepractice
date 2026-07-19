// Persistent SQLite store for trips: solo or group, each with its own
// members and per-person reservations (flights, hotels, dinners, anything).
// Shares the SQLite connection opened by travelers.js so foreign keys
// (trip_members.phone / reservations.phone -> travelers.phone) hold.
const travelers = require('./travelers');

const database = travelers.database;

database.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('solo','group')),
    destination TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trip_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    phone TEXT NOT NULL REFERENCES travelers(phone) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    UNIQUE(trip_id, phone)
  );
  CREATE INDEX IF NOT EXISTS trip_members_phone ON trip_members(phone);

  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    phone TEXT NOT NULL REFERENCES travelers(phone) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS reservations_trip ON reservations(trip_id);
`);

const statements = {
  insertTrip: database.prepare(`
    INSERT INTO trips (type, destination, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `),
  touchTrip: database.prepare('UPDATE trips SET updated_at = ? WHERE id = ?'),
  getTrip: database.prepare('SELECT id, type, destination, created_at, updated_at FROM trips WHERE id = ?'),
  tripsForPhone: database.prepare(`
    SELECT t.id, t.type, t.destination, t.created_at, t.updated_at
    FROM trips t
    JOIN trip_members tm ON tm.trip_id = t.id
    WHERE tm.phone = ?
    ORDER BY t.updated_at DESC
  `),
  insertMember: database.prepare(`
    INSERT INTO trip_members (trip_id, phone, role, joined_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(trip_id, phone) DO NOTHING
  `),
  membersForTrip: database.prepare(`
    SELECT tm.phone, tm.role, t.name
    FROM trip_members tm
    JOIN travelers t ON t.phone = tm.phone
    WHERE tm.trip_id = ?
    ORDER BY tm.joined_at
  `),
  findMembership: database.prepare(
    'SELECT id FROM trip_members WHERE trip_id = ? AND phone = ?',
  ),
  otherMembers: database.prepare(
    'SELECT phone, role FROM trip_members WHERE trip_id = ? AND phone != ?',
  ),
  insertReservation: database.prepare(`
    INSERT INTO reservations (trip_id, phone, type, details, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `),
  reservationsForTrip: database.prepare(`
    SELECT id, trip_id, phone, type, details, created_at, updated_at
    FROM reservations
    WHERE trip_id = ?
    ORDER BY created_at
  `),
  getReservation: database.prepare(
    'SELECT id, trip_id, phone, type, details, created_at, updated_at FROM reservations WHERE id = ?',
  ),
  updateReservation: database.prepare(`
    UPDATE reservations SET type = ?, details = ?, updated_at = ? WHERE id = ?
  `),
};

class NotAMemberError extends Error {}
class NotOwnerError extends Error {}

function timestamp() {
  return new Date().toISOString();
}

function isMember(tripId, phone) {
  return Boolean(statements.findMembership.get(tripId, phone));
}

function notifyOtherMembers(tripId, actingPhone, message) {
  for (const member of statements.otherMembers.all(tripId, actingPhone)) {
    travelers.setPendingUpdate(member.phone, message);
  }
}

function hydrateTrip(tripRow) {
  const members = statements.membersForTrip.all(tripRow.id);
  const reservations = statements.reservationsForTrip.all(tripRow.id);
  return { ...tripRow, members, reservations };
}

function createTrip({ type, destination, primaryPhone, primaryName, members }) {
  if (type !== 'solo' && type !== 'group') {
    throw new Error("type must be 'solo' or 'group'");
  }

  const now = timestamp();
  travelers.upsertTraveler({ phone: primaryPhone, name: primaryName, preferences: undefined });

  const { lastInsertRowid: tripId } = statements.insertTrip.run(type, destination || '', now, now);
  statements.insertMember.run(tripId, primaryPhone, 'primary', now);

  for (const member of members || []) {
    if (!member.phone) continue;
    travelers.upsertTraveler({ phone: member.phone, name: member.name, preferences: undefined });
    statements.insertMember.run(tripId, member.phone, 'member', now);
  }

  return hydrateTrip(statements.getTrip.get(tripId));
}

function findTripsForPhone(phone) {
  return statements.tripsForPhone.all(phone).map(hydrateTrip);
}

function getTrip(tripId) {
  const tripRow = statements.getTrip.get(tripId);
  return tripRow ? hydrateTrip(tripRow) : null;
}

function addReservation({ tripId, phone, type, details }) {
  if (!isMember(tripId, phone)) {
    throw new NotAMemberError(`Phone ${phone} is not a member of trip ${tripId}`);
  }

  const now = timestamp();
  const { lastInsertRowid: reservationId } = statements.insertReservation.run(
    tripId, phone, type || '', details || '', now, now,
  );
  statements.touchTrip.run(now, tripId);

  const traveler = travelers.findTraveler({ phone });
  notifyOtherMembers(
    tripId, phone,
    `${traveler?.name || 'A traveler on your trip'} added a ${type || 'reservation'}: ${details || ''}`.trim(),
  );

  return statements.getReservation.get(reservationId);
}

function updateReservation({ reservationId, phone, type, details }) {
  const reservation = statements.getReservation.get(reservationId);
  if (!reservation) {
    throw new Error(`No reservation with id ${reservationId}`);
  }
  if (reservation.phone !== phone) {
    throw new NotOwnerError(`Phone ${phone} does not own reservation ${reservationId}`);
  }

  const now = timestamp();
  const nextType = type || reservation.type;
  const nextDetails = details || reservation.details;
  statements.updateReservation.run(nextType, nextDetails, now, reservationId);
  statements.touchTrip.run(now, reservation.trip_id);

  const traveler = travelers.findTraveler({ phone });
  notifyOtherMembers(
    reservation.trip_id, phone,
    `${traveler?.name || 'A traveler on your trip'} updated a ${nextType || 'reservation'}: ${nextDetails || ''}`.trim(),
  );

  return statements.getReservation.get(reservationId);
}

module.exports = {
  createTrip,
  findTripsForPhone,
  getTrip,
  addReservation,
  updateReservation,
  NotAMemberError,
  NotOwnerError,
};
