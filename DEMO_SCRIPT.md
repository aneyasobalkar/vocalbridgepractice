# 3-Minute Demo Script — Flight Searcher Voice Concierge

**Setup before you start:** two browser tabs open to http://localhost:5173,
side by side if possible. Tab 1 = you ("Amy"). Tab 2 = a second person, or
you playing both roles back-to-back. Backend running on :3000.

---

## 0:00–0:20 — Hook

> "This is a voice AI travel concierge — you talk to it like a person, and
> it coordinates an entire group trip: who's going, what everyone's
> booking, and it keeps everyone in the loop automatically. No app, no
> forms — just a phone call. Let me show you."

Click **Connect** on Tab 1.

---

## 0:20–1:00 — Start a group trip

Say to the agent:

> "Hi, I'd like to book a new trip. It's a group trip to Rome — it's me,
> Amy, and my friend Jane. Her number is [Jane's test number]."

**What to point out while it responds:** the agent asks for your name and
phone, confirms solo vs. group, and creates the trip — Jane is now
recognized system-wide the instant she calls in herself, without anyone
manually adding her.

Then add a reservation:

> "Go ahead and book me a flight — American 100, business class."

**Point out:** it doesn't ask for a passport or try to actually issue a
ticket — it just confirms the reservation back to you. That's deliberate;
this demo records real decisions without touching a real booking system.

---

## 1:00–1:45 — Switch to Jane (Tab 2, or hang up and call back as Jane)

Connect Tab 2 and say:

> "Hi, this is Jane."

**What to point out:** the agent recognizes her immediately from her phone
number, pulls up the Rome trip, and can tell her Amy already has a flight
booked — **without Jane needing to ask for it or repeat any setup.**

Now the permission boundary — the most important beat of the demo:

> "Can you also book Amy's hotel for her?"

**Point out:** the agent declines — it will only ever touch the reservations
belonging to whoever it's actually talking to. That's enforced twice: the
agent won't attempt it, and the backend rejects it outright even if it
tried.

Then:

> "Book me a hotel — the Radisson, three nights."

---

## 1:45–2:20 — The notification loop

Hang up Tab 2. Reconnect Tab 1 (Amy) and say:

> "Hey, it's Amy again."

**What to point out:** the agent proactively mentions Jane's new hotel
reservation — nobody placed an extra call or sent a text to make that
happen. It's queued the moment Jane added it, and surfaces automatically
the next time Amy is in touch.

---

## 2:20–2:45 — Memory across calls

Still as Amy:

> "What was I saying last time we talked?"

**Point out:** the agent recalls the actual substance of the prior
conversation naturally, in its own words — real persistence (SQLite),
survives a server restart, not a scripted callback.

---

## 2:45–3:00 — Quick closer

> "One more thing — ask it about the weather."

> "What's the weather like in Rome right now?"

**Close with:** "Under the hood: this is one voice agent, real flight and
hotel search, a persistent group-trip data model with per-person
reservations, automatic cross-traveler notifications, and it all runs off
a single phone call. That's the demo."

---

## Fallback notes
- If outbound phone minutes are limited, the browser widget (used above)
  doesn't count against that quota — safe to rehearse freely.
- If Jane's tab doesn't recognize her, double check the phone number given
  in Tab 1 matches exactly what's used to connect Tab 2.
- Keep reservation asks concrete ("American 100, business class") — vague
  requests take longer for the agent to confirm and eat into your 3 minutes.
