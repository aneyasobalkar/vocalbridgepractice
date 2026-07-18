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
          <span>Flight Searcher</span>
        </div>
        <span className="brand-tagline">Your voice-powered travel concierge for flights, hotels, and itineraries</span>
      </header>

      <main className="app-main">
        <div className="app-main-primary">
          <section className="card">
            <h2>Talk to your agent</h2>
            <span className="card-subtitle">Start a voice conversation to search and book flights or hotels</span>
            <VoiceChatWidget tokenUrl="/api/voice-token" />
          </section>

          <section className="card">
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
