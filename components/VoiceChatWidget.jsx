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
import { useEffect, useState } from 'react';
import { MicIcon, MicOffIcon, PhoneOffIcon } from './icons';

function statusLabel(state) {
  if (state === ConnectionState.Connected) return 'Connected';
  if (state === ConnectionState.Connecting) return 'Connecting…';
  return 'Not connected';
}

function VoiceChatInner() {
  const { state, connect, disconnect, isMicrophoneEnabled, toggleMicrophone, error } = useVocalBridge();
  const { transcript } = useTranscript();
  const [agentSpeaking, setAgentSpeaking] = useState(false);

  useEffect(() => {
    const latest = transcript.at(-1);
    if (latest?.role !== 'agent') return undefined;

    setAgentSpeaking(true);
    const timeout = window.setTimeout(() => setAgentSpeaking(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [transcript]);

  const dotClass =
    state === ConnectionState.Connected ? 'connected' : state === ConnectionState.Connecting ? 'connecting' : '';
  const connected = state === ConnectionState.Connected;
  const visualState = agentSpeaking ? 'speaking' : connected ? 'listening' : 'idle';

  return (
    <div className="voice-chat-widget">
      <div className={`voice-visualizer ${visualState}`} aria-label={agentSpeaking ? 'Agent is speaking' : statusLabel(state)}>
        <span className="voice-glow voice-glow-one" />
        <span className="voice-glow voice-glow-two" />
        <div className="voice-orbit voice-orbit-outer" />
        <div className="voice-orbit voice-orbit-inner" />
        <div className="voice-core">
          <div className="voice-bars" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((bar) => (
              <span key={bar} style={{ '--bar': bar }} />
            ))}
          </div>
        </div>
        <div className="voice-status">
          <span className={`status-dot ${dotClass}`} />
          <span>{agentSpeaking ? 'Agent speaking' : statusLabel(state)}</span>
        </div>
      </div>

      {error && <div className="error-banner">{error.message}</div>}

      <div className="voice-actions">
        {state === ConnectionState.Disconnected ? (
          <button className="btn btn-primary" onClick={connect}>
            <MicIcon /> Start Voice Chat
          </button>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={disconnect}>
              <PhoneOffIcon /> End Call
            </button>
            <button className="btn btn-secondary" onClick={toggleMicrophone}>
              {isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
              {isMicrophoneEnabled ? 'Mute' : 'Unmute'}
            </button>
          </>
        )}
      </div>

      <div className="voice-chat-transcript">
        {transcript.length === 0 ? (
          <p className="transcript-empty">Your conversation will appear here once you start talking.</p>
        ) : (
          transcript.map((entry, i) => (
            <p key={i} className="transcript-entry">
              <strong>{entry.role === 'user' ? 'You' : 'Agent'}:</strong>
              {entry.text}
            </p>
          ))
        )}
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
