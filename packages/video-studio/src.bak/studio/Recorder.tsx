import React, { useState, useCallback, useRef } from 'react';

interface RecordingSession {
  id: string;
  name: string;
  composition: string;
  startTime: number;
  endTime?: number;
  duration: number;
  status: 'recording' | 'paused' | 'stopped';
  frameCount: number;
}

interface RecorderProps {
  composition: string;
  fps: number;
  onRecordingStart?: (session: RecordingSession) => void;
  onRecordingStop?: (session: RecordingSession) => void;
}

export const Recorder: React.FC<RecorderProps> = ({
  composition,
  fps,
  onRecordingStart,
  onRecordingStop,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<RecordingSession[]>([]);
  const [currentSession, setCurrentSession] = useState<RecordingSession | null>(null);
  const frameCountRef = useRef(0);

  const startRecording = useCallback(() => {
    const session: RecordingSession = {
      id: `rec-${Date.now()}`,
      name: `${composition}-${new Date().toLocaleTimeString()}`,
      composition,
      startTime: Date.now(),
      duration: 0,
      status: 'recording',
      frameCount: 0,
    };

    setCurrentSession(session);
    setIsRecording(true);
    frameCountRef.current = 0;
    onRecordingStart?.(session);
  }, [composition, onRecordingStart]);

  const stopRecording = useCallback(() => {
    if (!currentSession) return;

    const endedSession: RecordingSession = {
      ...currentSession,
      endTime: Date.now(),
      duration: (Date.now() - currentSession.startTime) / 1000,
      status: 'stopped',
      frameCount: frameCountRef.current,
    };

    setRecordings((prev) => [...prev, endedSession]);
    setIsRecording(false);
    setCurrentSession(null);
    onRecordingStop?.(endedSession);
  }, [currentSession, onRecordingStop]);

  const clearRecordings = useCallback(() => {
    setRecordings([]);
  }, []);

  return (
    <div
      style={{
        padding: '20px',
        background: 'rgba(0, 217, 255, 0.05)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '8px',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <h3 style={{ margin: '0 0 16px 0', color: '#00d9ff' }}>📹 Studio Recorder</h3>

      {/* Recording Controls */}
      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
        <button
          onClick={startRecording}
          disabled={isRecording}
          style={{
            padding: '8px 16px',
            background: isRecording ? '#666' : '#ff4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isRecording ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ⏺ Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          style={{
            padding: '8px 16px',
            background: !isRecording ? '#666' : '#ff4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: !isRecording ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: '600',
          }}
        >
          ⏹ Stop Recording
        </button>

        <button
          onClick={clearRecordings}
          style={{
            padding: '8px 16px',
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🗑 Clear
        </button>
      </div>

      {/* Current Session Status */}
      {currentSession && (
        <div
          style={{
            padding: '12px',
            background: 'rgba(255, 68, 68, 0.1)',
            border: '1px solid rgba(255, 68, 68, 0.3)',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          <strong>🔴 Recording:</strong> {currentSession.name}
          <br />
          Duration: {((Date.now() - currentSession.startTime) / 1000).toFixed(1)}s
        </div>
      )}

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div>
          <h4 style={{ margin: '12px 0 8px 0', fontSize: '12px', color: '#00d9ff' }}>
            Recorded Sessions ({recordings.length})
          </h4>
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              fontSize: '12px',
              lineHeight: '1.6',
            }}
          >
            {recordings.map((rec) => (
              <div
                key={rec.id}
                style={{
                  padding: '8px',
                  background: 'rgba(0, 217, 255, 0.05)',
                  border: '1px solid rgba(0, 217, 255, 0.1)',
                  borderRadius: '4px',
                  marginBottom: '4px',
                }}
              >
                <strong>{rec.name}</strong>
                <br />⏱ {rec.duration.toFixed(1)}s | 📊 {rec.frameCount} frames
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
