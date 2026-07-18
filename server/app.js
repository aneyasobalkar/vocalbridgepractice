// Minimal Express app wiring the Vocal Bridge routes together.
// Run: npm install && node server/app.js
require('dotenv').config();
const express = require('express');

const voiceToken = require('./voiceToken');
const voiceCall = require('./voiceCall');
const upload = require('./upload');
const payVendor = require('./payVendor');
const agentTools = require('./agentTools');
const tripUpdates = require('./tripUpdates');

const app = express();

app.use('/api', voiceToken);
app.use('/api', voiceCall.router);
app.use('/api', upload);
app.use('/api', payVendor.router);
app.use('/api/agent', agentTools);
app.use('/api', tripUpdates);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Voice backend listening on :${PORT}`));
