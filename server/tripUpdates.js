// App-facing routes for managing the traveler list and broadcasting a trip
// update as individual outbound calls. Not agent tools — these are what your
// own frontend/admin tooling calls.
const express = require('express');
const travelers = require('./travelers');
const { placeCall } = require('./voiceCall');

const router = express.Router();

router.post('/travelers', express.json(), (req, res) => {
  const { name, phone, preferences } = req.body || {};
  if (typeof phone !== 'string' || !phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  const traveler = travelers.upsertTraveler({ name, phone, preferences });
  res.status(201).json(traveler);
});

router.get('/travelers', (req, res) => {
  res.json(travelers.listTravelers());
});

router.get('/trip-updates/outcomes', (req, res) => {
  res.json(travelers.listOutcomes());
});

router.post('/trip-updates/broadcast', express.json(), async (req, res) => {
  const { message, phones } = req.body || {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  const targets = phones && phones.length
    ? travelers.listTravelers().filter((t) => phones.includes(t.phone))
    : travelers.listTravelers();

  if (targets.length === 0) {
    return res.status(400).json({ error: 'No matching travelers to call.' });
  }

  const results = [];
  for (const traveler of targets) {
    travelers.setPendingUpdate(traveler.phone, message);
    try {
      const call = await placeCall({ phoneNumber: traveler.phone, participantName: traveler.name });
      results.push({ traveler, status: 'called', call });
    } catch (error) {
      results.push({ traveler, status: 'failed', error: error.message });
    }
  }

  res.status(207).json({ results });
});

module.exports = router;
