// Backend token route for Vocal Bridge. Mount with:
//   const voiceToken = require('./server/voiceToken');
//   app.use('/api', voiceToken);
//
// Keeps VOCALBRIDGE_API_KEY server-side only — never sent to the browser.
const express = require('express');

const router = express.Router();

const VOCAL_BRIDGE_API_KEY = process.env.VOCALBRIDGE_API_KEY;
const VOCAL_BRIDGE_URL = process.env.VOCALBRIDGE_URL || 'https://vocalbridgeai.com';
// Required because VOCALBRIDGE_API_KEY is an account-level key (works across
// all agents). Get this from `cat ~/.vocal-bridge/config.json` after
// `vb agent use <name>`, or from the dashboard's agent page.
const VOCAL_BRIDGE_AGENT_ID = process.env.VOCALBRIDGE_AGENT_ID;

if (!VOCAL_BRIDGE_API_KEY) {
  throw new Error('VOCALBRIDGE_API_KEY is not set (check your .env file)');
}

router.post('/voice-token', express.json(), async (req, res) => {
  try {
    const response = await fetch(`${VOCAL_BRIDGE_URL}/api/v1/token`, {
      method: 'POST',
      headers: {
        'X-API-Key': VOCAL_BRIDGE_API_KEY,
        ...(VOCAL_BRIDGE_AGENT_ID ? { 'X-Agent-Id': VOCAL_BRIDGE_AGENT_ID } : {}),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participant_name: req.body?.participant_name || req.user?.name || 'User',
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('Vocal Bridge token request failed:', response.status, detail);
      return res.status(response.status === 403 ? 403 : 502).json({
        error: 'Failed to get voice token',
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Failed to get voice token:', error);
    res.status(500).json({ error: 'Failed to get voice token' });
  }
});

module.exports = router;
