// In-memory store for the group trip: travelers, the shared itinerary, and
// per-traveler pending updates. Backs both the agent-facing tools
// (agentTools.js) and the app-facing management/broadcast routes
// (tripUpdates.js). Resets on server restart, matching this project's other
// in-memory stores (e.g. upload.js's fileIndex).

const travelers = new Map(); // phone -> { name, phone, preferences }
const pendingUpdates = new Map(); // phone -> update message string
const callOutcomes = []; // { name, phone, summary, itineraryChanges, timestamp }[]
const itinerary = { notes: [] };

function upsertTraveler({ name, phone, preferences }) {
  const existing = travelers.get(phone) || {};
  const traveler = {
    name: name ?? existing.name ?? '',
    phone,
    preferences: preferences ?? existing.preferences ?? '',
  };
  travelers.set(phone, traveler);
  return traveler;
}

function listTravelers() {
  return Array.from(travelers.values());
}

function findTraveler({ phone, name }) {
  if (phone && travelers.has(phone)) return travelers.get(phone);

  if (name) {
    const needle = name.trim().toLowerCase();
    return listTravelers().find((t) => t.name.toLowerCase().includes(needle)) || null;
  }

  return null;
}

function setPendingUpdate(phone, message) {
  pendingUpdates.set(phone, message);
}

function getContextFor({ phone, name }) {
  const traveler = findTraveler({ phone, name });
  const pendingUpdate = traveler ? pendingUpdates.get(traveler.phone) || null : null;

  return { traveler, pendingUpdate, itinerary };
}

function recordOutcome({ phone, name, summary, itineraryChanges }) {
  const traveler = findTraveler({ phone, name });
  const changes = Array.isArray(itineraryChanges) ? itineraryChanges : [];

  if (traveler) pendingUpdates.delete(traveler.phone);
  itinerary.notes.push(...changes);

  const outcome = {
    name: traveler?.name || name || '',
    phone: traveler?.phone || phone || '',
    summary: summary || '',
    itineraryChanges: changes,
    timestamp: new Date().toISOString(),
  };
  callOutcomes.push(outcome);
  return outcome;
}

function getItinerary() {
  return itinerary;
}

function listOutcomes() {
  return callOutcomes;
}

module.exports = {
  upsertTraveler,
  listTravelers,
  findTraveler,
  setPendingUpdate,
  getContextFor,
  recordOutcome,
  getItinerary,
  listOutcomes,
};
