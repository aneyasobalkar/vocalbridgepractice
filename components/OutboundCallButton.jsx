// Simple trigger to have the Flight Searcher agent call a phone number.
// Talks only to your own backend (/api/voice-call) — never touches the
// Vocal Bridge API key directly.
import { useState } from 'react';
import { PhoneIcon } from './icons';

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
      <div className="outbound-row">
        <input
          className="input"
          type="tel"
          placeholder="+14155551234"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="btn btn-primary" onClick={placeCall} disabled={status === 'calling' || !phone}>
          <PhoneIcon /> Call me
        </button>
      </div>
      {status && <p className="status-text">Status: {status}</p>}
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
