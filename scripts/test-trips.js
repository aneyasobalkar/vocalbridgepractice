const fs = require('fs');
const os = require('os');
const path = require('path');

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'trips-test-'));
process.env.TRAVEL_MEMORY_DB_PATH = path.join(tempDirectory, 'memory.sqlite');

const travelers = require('../server/travelers');
const trips = require('../server/trips');

function fail(message) {
  console.error(`Trips test failed: ${message}`);
  travelers.close();
  fs.rmSync(tempDirectory, { recursive: true, force: true });
  process.exit(1);
}

const AMY = { name: 'Amy', phone: '+14155550001' };
const JANE = { name: 'Jane', phone: '+14155550002' };
const BOB = { name: 'Bob', phone: '+14155550003' };

const trip = trips.createTrip({
  type: 'group',
  destination: 'Rome',
  primaryPhone: AMY.phone,
  primaryName: AMY.name,
  members: [JANE, BOB],
});

if (trip.type !== 'group') fail('trip type did not persist');
if (trip.members.length !== 3) fail(`expected 3 members, got ${trip.members.length}`);

const flight = trips.addReservation({
  tripId: trip.id, phone: AMY.phone, type: 'flight', details: 'AA100 to Rome',
});
const hotel = trips.addReservation({
  tripId: trip.id, phone: JANE.phone, type: 'hotel', details: 'Hotel Roma, 3 nights',
});

const amyTrips = trips.findTripsForPhone(AMY.phone);
if (amyTrips.length !== 1) fail('expected exactly 1 trip for Amy');
const reservations = amyTrips[0].reservations;
if (reservations.length !== 2) fail(`expected 2 reservations, got ${reservations.length}`);

const amyReservation = reservations.find((r) => r.phone === AMY.phone);
const janeReservation = reservations.find((r) => r.phone === JANE.phone);
if (amyReservation.type !== 'flight') fail("Amy's reservation type mismatch (per-person data not distinct)");
if (janeReservation.type !== 'hotel') fail("Jane's reservation type mismatch (per-person data not distinct)");

// Notification: adding a reservation should queue a pending update for the
// OTHER members, not the actor.
const bobContext = travelers.getContextFor({ phone: BOB.phone });
if (!bobContext.pendingUpdate) fail('Bob should have received a pending update from Amy/Jane\'s changes');
const amyContextAfterOwnChange = travelers.getContextFor({ phone: AMY.phone });
if (amyContextAfterOwnChange.pendingUpdate && amyContextAfterOwnChange.pendingUpdate.includes('AA100')) {
  fail("Amy should not be notified about her own reservation");
}

// Permission enforcement: Jane must not be able to update Amy's reservation.
try {
  trips.updateReservation({ reservationId: flight.id, phone: JANE.phone, details: 'changed by Jane' });
  fail('Jane was able to update Amy\'s reservation — permission enforcement is broken');
} catch (error) {
  if (!(error instanceof trips.NotOwnerError)) fail(`expected NotOwnerError, got ${error.constructor.name}`);
}

// Amy can update her own reservation.
const updatedFlight = trips.updateReservation({
  reservationId: flight.id, phone: AMY.phone, details: 'AA100 to Rome, seat 12A',
});
if (!updatedFlight.details.includes('12A')) fail("Amy's own update did not persist");

// Non-member cannot add a reservation to a trip they're not on.
const stranger = { name: 'Stranger', phone: '+14155550099' };
try {
  trips.addReservation({ tripId: trip.id, phone: stranger.phone, type: 'dinner', details: 'gatecrashing' });
  fail('a non-member was able to add a reservation — membership enforcement is broken');
} catch (error) {
  if (!(error instanceof trips.NotAMemberError)) fail(`expected NotAMemberError, got ${error.constructor.name}`);
}

travelers.close();
fs.rmSync(tempDirectory, { recursive: true, force: true });
console.log('Trips: group creation, per-person reservations, notifications, and permission enforcement all check out.');
