import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VoiceChatWidget from '../components/VoiceChatWidget';
import OutboundCallButton from '../components/OutboundCallButton';

function App() {
  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Flight Searcher</h1>
      <VoiceChatWidget tokenUrl="/api/voice-token" />
      <hr />
      <h2>Outbound Call</h2>
      <OutboundCallButton />
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
