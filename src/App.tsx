import { useState } from 'react';
import { midiToNoteLabel } from './lib/noteMath';
import {
  captureSungNote,
  markMicPermission,
  markMicSupport,
  markUnclearInput,
  retryPracticeFlow,
  startPracticeFlow,
  type PracticeFlowState
} from './lib/practiceFlow';

const previewTargetNote = midiToNoteLabel(60);

function getStatusText(state: PracticeFlowState): string {
  switch (state.phase) {
    case 'checkingSupport':
      return 'Checking microphone support';
    case 'requestingPermission':
      return 'Requesting microphone permission';
    case 'permissionDenied':
      return 'Microphone permission was denied';
    case 'unsupported':
      return 'This browser does not support microphone practice';
    case 'singing':
      return 'Listening for your sung note';
    case 'singCaptured':
      return `Captured ${state.sungNoteLabel}`;
    case 'unclearInput':
      return 'I could not hear one clear note';
    case 'idle':
      return 'Ready for a voice-first practice run';
  }
}

export function App() {
  const [practiceState, setPracticeState] = useState<PracticeFlowState>({ phase: 'idle' });
  const statusText = getStatusText(practiceState);

  function simulateStartPractice() {
    const checkingState = startPracticeFlow();
    const permissionState = markMicSupport(checkingState, true);
    setPracticeState(markMicPermission(permissionState, true));
  }

  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="hero-panel" aria-label="Practice preview">
        <p className="eyebrow">Sing first, then play</p>
        <h1 id="app-title">Find the note you hear inside.</h1>
        <p className="intro">
          A mic-only practice loop for singing one note, playing one piano note, and learning whether the piano landed high, low, or right on target.
        </p>

        <div className="pitch-arena" aria-label="Pitch arena preview">
          <div className="pitch-lane" aria-hidden="true">
            <span className="pitch-line pitch-line-high" />
            <span className="pitch-line pitch-line-target" />
            <span className="pitch-line pitch-line-low" />
          </div>
          <div className="note-orb" data-phase={practiceState.phase}>
            <span className="note-label">
              {practiceState.phase === 'singCaptured' ? practiceState.sungNoteLabel : previewTargetNote}
            </span>
            <span className="note-caption">{statusText}</span>
          </div>
        </div>
      </section>

      <section className="control-belt" aria-label="Practice controls">
        {practiceState.phase === 'idle' ? (
          <button className="primary-action" type="button" onClick={simulateStartPractice}>
            Start practice
          </button>
        ) : null}

        {practiceState.phase === 'singing' ? (
          <div className="split-actions">
            <button
              className="primary-action"
              type="button"
              onClick={() => setPracticeState(captureSungNote(practiceState, 60, 'C4'))}
            >
              Capture demo C4
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => setPracticeState(markUnclearInput())}
            >
              Mark unclear
            </button>
          </div>
        ) : null}

        {practiceState.phase === 'singCaptured' || practiceState.phase === 'unclearInput' ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => setPracticeState(retryPracticeFlow())}
          >
            Try again
          </button>
        ) : null}

        <p className="microcopy">{statusText}. Real microphone capture is the next spike; this preview uses demo transitions only.</p>
      </section>
    </main>
  );
}
