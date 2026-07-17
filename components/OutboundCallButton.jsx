// Simple trigger to have the Flight Searcher agent call a phone number.
// Talks only to your own backend (/api/voice-call) — never touches the
// Vocal Bridge API key directly.
import { useState } from 'react';

export default function OutboundCallButton() {
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  async function placeCall() {
    setError(null);
    setStatus('calling');
    try {
      const res = await fetch('/api/voice-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Call failed');
      setStatus(data.status || 'initiated');
    } catch (err) {
      setError(err.message);
      setStatus(null);
    }
  }

  return (
    <div className="outbound-call">
      <input
        type="tel"
        placeholder="+14155551234"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <button onClick={placeCall} disabled={status === 'calling'}>
        Call me
      </button>
      {status && <p>Status: {status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
