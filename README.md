# Flight Searcher — voice-first travel operations

A voice AI agent (built on [Vocal Bridge](https://vocalbridgeai.com)) that calls travelers directly to deliver trip updates, answer questions about their itinerary, and handle vendor payments — with real flight/hotel data, live weather, and persistent memory backing every call.

## The pitch

Group trips break down in the gap between "we know the flight got delayed" and "everyone on the trip actually finds out." Group texts get buried, email gets ignored. This app closes that gap: broadcast an update once, and the agent places an outbound call to every traveler, explains the change in conversation, answers their follow-up questions using live data (flights, hotels, weather), and reports back what was said — so nothing depends on someone reading a text at the right moment.

## Capabilities

**Outbound voice updates**
Broadcast a trip update to some or all travelers ([tripUpdates.js](server/tripUpdates.js)); the agent places a real phone call to each one ([voiceCall.js](server/voiceCall.js)) and reports per-traveler call outcomes back to your admin view.

**Live agent tools, called mid-call** ([agentTools.js](server/agentTools.js))
- `get_call_context` — looks up the traveler, their pending update, the shared itinerary, and their last call outcome, all in one shot
- `get_weather` — current conditions or a dated forecast for any destination (free, keyless, via Open-Meteo)
- `submit_call_outcome` — the agent's own post-call notes and itinerary changes, written straight back into persistent memory

**Persistent trip memory** ([travelers.js](server/travelers.js))
SQLite-backed (`node:sqlite`, no extra service to run) — travelers, itinerary notes, pending updates, and full call-outcome history all survive a server restart.

**Flight & hotel data via Sabre MCP** ([existing_mcp_servers.template.json](existing_mcp_servers.template.json))
Flight/hotel search, pricing, and booking management wired in as MCP tools, so the agent can quote real fares and availability instead of guessing.

**Vendor payments** ([payVendor.js](server/payVendor.js), [paypal.js](server/paypal.js))
`pay_vendor` tool creates a real PayPal Sandbox order (amount, currency, description) and returns an approval link — usable as an HTTP route or wired directly into the agent.

**Travel document uploads** ([upload.js](server/upload.js))
Passport scans, booking confirmations, and itineraries upload via a size- and type-restricted endpoint so the agent has documents to reference during a call.

**Web widgets** ([components/](components))
`VoiceChatWidget` (in-browser voice chat) and `OutboundCallButton` (trigger a call from the UI) — both talk only to your own backend, never touching API keys client-side.

## Architecture

```
Browser (React/Vite)  ──▶  Express backend (server/app.js)  ──▶  Vocal Bridge (voice)
                                     │                          Sabre MCP (flights/hotels)
                                     │                          PayPal Sandbox (payments)
                                     │                          Open-Meteo (weather)
                                     ▼
                           SQLite (server/data/travel-memory.sqlite)
```

## Getting started

```bash
npm install
cp .env.example .env        # fill in VocalBridge, Sabre, and PayPal credentials
npm run setup:mcp           # renders existing_mcp_servers.json from the template
npm start                   # backend on :3000
npm run dev                 # frontend (Vite)
```

## Tech stack

Express · React 19 + Vite · `node:sqlite` · Vocal Bridge (voice) · Sabre MCP (flights/hotels) · PayPal Sandbox · Open-Meteo (weather)
