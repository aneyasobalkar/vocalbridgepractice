// Custom HTTP API tools exposed to the Vocal Bridge agent (registered via
// `vb config set --api-tools-file`, same mechanism as the LandingAI ade_*
// tools). These are called BY the agent itself, at the start of a call
// (get_call_context) and during post-call processing (submit_call_outcome),
// so they must be reachable from Vocal Bridge's cloud — not just localhost.
// Since that means exposing this router publicly (e.g. via ngrok), every
// route here requires the shared secret below.
const express = require('express');
const travelers = require('./travelers');

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

  const { traveler, pendingUpdate, itinerary, lastOutcome } = travelers.getContextFor({ phone, name });
  if (!traveler) {
    return res.status(404).json({ error: 'No traveler found matching that phone or name.' });
  }

  res.json({ traveler, pendingUpdate, itinerary, lastOutcome });
});

router.get('/itinerary', (req, res) => {
  res.json(travelers.getItinerary());
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
