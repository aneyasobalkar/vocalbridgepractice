// Custom HTTP API tools exposed to the Vocal Bridge agent (registered via
// `vb config set --api-tools-file`, same mechanism as the LandingAI ade_*
// tools). These are called BY the agent itself, at the start of a call
// (get_call_context) and during post-call processing (submit_call_outcome),
// so they must be reachable from Vocal Bridge's cloud — not just localhost.
// Since that means exposing this router publicly (e.g. via ngrok), every
// route here requires the shared secret below.
const express = require('express');
const travelers = require('./travelers');
const trips = require('./trips');

const router = express.Router();

const AGENT_TOOLS_SHARED_SECRET = process.env.AGENT_TOOLS_SHARED_SECRET;

if (!AGENT_TOOLS_SHARED_SECRET) {
  throw new Error('AGENT_TOOLS_SHARED_SECRET is not set (check your .env file)');
}

router.use((req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : null;

  if (token !== AGENT_TOOLS_SHARED_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

router.get('/call-context', (req, res) => {
  const { phone, name } = req.query;
  if (!phone && !name) {
    return res.status(400).json({ error: 'Provide a phone or name to look up.' });
  }

  const { traveler, pendingUpdate, lastOutcome } = travelers.getContextFor({ phone, name });
  if (!traveler) {
    return res.status(404).json({ error: 'No traveler found matching that phone or name.' });
  }

  const tripList = trips.findTripsForPhone(traveler.phone);
  res.json({ traveler, pendingUpdate, trips: tripList, lastOutcome });
});

// Create a new solo or group trip. membersList is a newline-delimited
// "Name|Phone" string (custom API tool parameters must be flat strings, not
// arrays) listing every OTHER member of a group trip; empty/omitted for solo.
router.post('/trips', express.json(), (req, res) => {
  const { phone, name, type, destination, membersList } = req.body || {};
  if (!phone || !name) {
    return res.status(400).json({ error: 'phone and name are required.' });
  }
  if (type !== 'solo' && type !== 'group') {
    return res.status(400).json({ error: "type must be 'solo' or 'group'." });
  }

  const members = String(membersList || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [memberName, memberPhone] = line.split('|').map((part) => (part || '').trim());
      return { name: memberName, phone: memberPhone };
    })
    .filter((member) => member.phone);

  const trip = trips.createTrip({
    type,
    destination: destination || '',
    primaryPhone: phone,
    primaryName: name,
    members,
  });
  res.status(201).json(trip);
});

// Add a reservation (flight, hotel, dinner, or anything else) owned by the
// calling traveler. Rejects if phone isn't a member of the trip.
router.post('/reservations', express.json(), (req, res) => {
  const { phone, tripId, type, details } = req.body || {};
  if (!phone || !tripId) {
    return res.status(400).json({ error: 'phone and tripId are required.' });
  }

  try {
    const reservation = trips.addReservation({ tripId: Number(tripId), phone, type, details });
    res.status(201).json(reservation);
  } catch (error) {
    if (error instanceof trips.NotAMemberError) {
      return res.status(403).json({ error: 'You are not a member of that trip.' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Update a reservation. Only the traveler who owns it may change it — every
// other trip member's attempt is rejected with 403, this is the actual
// enforcement behind "Jane can't change Amy's stuff".
router.post('/reservations/update', express.json(), (req, res) => {
  const { phone, reservationId, type, details } = req.body || {};
  if (!phone || !reservationId) {
    return res.status(400).json({ error: 'phone and reservationId are required.' });
  }

  try {
    const reservation = trips.updateReservation({
      reservationId: Number(reservationId), phone, type, details,
    });
    res.json(reservation);
  } catch (error) {
    if (error instanceof trips.NotOwnerError) {
      return res.status(403).json({ error: 'You can only change your own reservations.' });
    }
    res.status(400).json({ error: error.message });
  }
});

// Weather lookup for a destination, e.g. "what's it like when I land" during
// a call. Backed by Open-Meteo (free, keyless): geocode the city name, then
// pull the daily forecast for that date (or current conditions if no date
// is given). No credentials needed, so nothing to configure in .env.
router.get('/weather', async (req, res) => {
  const { city, date } = req.query;
  if (!city) {
    return res.status(400).json({ error: 'city is required' });
  }

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
    );
    const geoData = await geoResponse.json();
    const place = geoData.results?.[0];
    if (!place) {
      return res.status(404).json({ error: `No location found matching "${city}".` });
    }

    const forecastParams = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      timezone: 'auto',
    });

    if (date) {
      forecastParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
      forecastParams.set('start_date', date);
      forecastParams.set('end_date', date);
    } else {
      forecastParams.set('current', 'temperature_2m,precipitation,weather_code,wind_speed_10m');
    }

    const forecastResponse = await fetch(`https://api.open-meteo.com/v1/forecast?${forecastParams}`);
    const forecastData = await forecastResponse.json();

    res.json({
      location: { name: place.name, country: place.country, latitude: place.latitude, longitude: place.longitude },
      date: date || null,
      weather: date ? forecastData.daily : forecastData.current,
    });
  } catch (error) {
    res.status(502).json({ error: `Weather lookup failed: ${error.message}` });
  }
});

router.post('/call-outcome', express.json(), (req, res) => {
  const { phone, name, summary, itineraryChanges } = req.body || {};
  if (!phone && !name) {
    return res.status(400).json({ error: 'Provide a phone or name to identify the traveler.' });
  }

  // itineraryChanges arrives as a newline-delimited string (the custom API
  // tool schema only supports string/number/boolean parameters, not arrays).
  const changes = String(itineraryChanges || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const outcome = travelers.recordOutcome({ phone, name, summary, itineraryChanges: changes });
  res.status(201).json(outcome);
});

module.exports = router;
