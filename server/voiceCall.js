// Backend route to trigger an outbound Vocal Bridge phone call. Mount with:
//   const voiceCall = require('./server/voiceCall');
//   app.use('/api', voiceCall);
//
// Confirmed against the installed `vocal-bridge` CLI's own source
// (vocal_bridge/cli.py: cmd_call -> POST /api/v1/calls), not guessed.
// Requires the agent to have outbound calling enabled first:
//   vb config set --outbound-enabled true --accept-outbound-tos --outbound-greeting "..."
const express = require('express');

const router = express.Router();

const VOCAL_BRIDGE_API_KEY = process.env.VOCALBRIDGE_API_KEY;
const VOCAL_BRIDGE_URL = process.env.VOCALBRIDGE_URL || 'https://vocalbridgeai.com';
// Required because VOCALBRIDGE_API_KEY is an account-level key (works across
// all agents). Get this from `cat ~/.vocal-bridge/config.json` after
// `vb agent use <name>`, or from the dashboard's agent page.
const VOCAL_BRIDGE_AGENT_ID = process.env.VOCALBRIDGE_AGENT_ID;

// Same E.164 validation the CLI itself uses (cli.py cmd_call).
const E164 = /^\+[1-9]\d{6,14}$/;

if (!VOCAL_BRIDGE_API_KEY) {
  throw new Error('VOCALBRIDGE_API_KEY is not set (check your .env file)');
}

// Shared by the single-call route below and the group broadcast in tripUpdates.js.
async function placeCall({ phoneNumber, participantName }) {
  if (typeof phoneNumber !== 'string' || !E164.test(phoneNumber)) {
    throw new Error('phone_number must be E.164 format, e.g. +14155551234');
  }

  const response = await fetch(`${VOCAL_BRIDGE_URL}/api/v1/calls`, {
    method: 'POST',
    headers: {
      'X-API-Key': VOCAL_BRIDGE_API_KEY,
      ...(VOCAL_BRIDGE_AGENT_ID ? { 'X-Agent-Id': VOCAL_BRIDGE_AGENT_ID } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      ...(participantName ? { participant_name: String(participantName).slice(0, 100) } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Vocal Bridge call request failed:', response.status, detail);
    const error = new Error('Failed to place call');
    error.status = response.status === 403 ? 403 : 502;
    throw error;
  }

  return response.json();
}

router.post('/voice-call', express.json(), async (req, res) => {
  const { phone_number, participant_name } = req.body || {};

  try {
    const data = await placeCall({ phoneNumber: phone_number, participantName: participant_name });
    res.json(data);
  } catch (error) {
    if (error.message.startsWith('phone_number must be')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(error.status || 500).json({ error: error.message || 'Failed to place call' });
  }
});

module.exports = { router, placeCall };
