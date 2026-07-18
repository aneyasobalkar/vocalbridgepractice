import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VoiceChatWidget from '../components/VoiceChatWidget';
import OutboundCallButton from '../components/OutboundCallButton';
import AttachmentUpload from '../components/AttachmentUpload';
import { PlaneIcon } from '../components/icons';
import './index.css';

function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">
            <PlaneIcon />
          </span>
          <span className="brand-name">Flight Searcher</span>
        </div>
        <div className="hero-copy">
          <span className="eyebrow">AI travel concierge</span>
          <h1>Where will your voice take you?</h1>
          <p className="brand-tagline">Search flights, shape itineraries, and plan the details in one natural conversation.</p>
        </div>
      </header>

      <main className="app-main">
        <div className="app-main-primary">
          <section className="card voice-card">
            <div className="card-heading">
              <span className="card-kicker">Live assistant</span>
              <h2>Talk to your agent</h2>
              <span className="card-subtitle">Start a voice conversation to search and book flights or hotels</span>
            </div>
            <VoiceChatWidget tokenUrl="/api/voice-token" />
          </section>

          <section className="card call-card">
            <h2>Prefer a phone call?</h2>
            <span className="card-subtitle">We&rsquo;ll call you and walk through your trip together</span>
            <OutboundCallButton />
          </section>
        </div>

        <section className="card">
          <AttachmentUpload uploadUrl="/api/upload" />
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
