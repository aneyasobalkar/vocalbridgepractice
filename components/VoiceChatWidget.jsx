// Standalone voice chat widget for Vocal Bridge.
// Requires: npm install @vocalbridgeai/sdk @vocalbridgeai/react
//
// Drop-in usage:
//   import VoiceChatWidget from './components/VoiceChatWidget';
//   <VoiceChatWidget tokenUrl="/api/voice-token" />
//
// The widget talks only to your own backend (tokenUrl) — it never sees
// the Vocal Bridge API key, which stays server-side in server/voiceToken.js.
import { VocalBridgeProvider, useVocalBridge, useTranscript } from '@vocalbridgeai/react';
import { ConnectionState } from '@vocalbridgeai/sdk';

function VoiceChatInner() {
  const { state, connect, disconnect, isMicrophoneEnabled, toggleMicrophone, error } = useVocalBridge();
  const { transcript } = useTranscript();

  return (
    <div className="voice-chat-widget">
      <p>Status: {state}</p>
      {error && <p style={{ color: 'red' }}>{error.message}</p>}

      {state === ConnectionState.Disconnected ? (
        <button onClick={connect}>Start Voice Chat</button>
      ) : (
        <>
          <button onClick={disconnect}>End Call</button>
          <button onClick={toggleMicrophone}>
            {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
          </button>
        </>
      )}

      <div className="voice-chat-transcript">
        {transcript.map((entry, i) => (
          <p key={i}>
            <strong>{entry.role === 'user' ? 'You' : 'Agent'}:</strong> {entry.text}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function VoiceChatWidget({ tokenUrl = '/api/voice-token' }) {
  return (
    <VocalBridgeProvider options={{ auth: { tokenUrl } }}>
      <VoiceChatInner />
    </VocalBridgeProvider>
  );
}
