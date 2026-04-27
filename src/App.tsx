import { useMemo, useRef, useState } from 'react';
import { createDiagnostics, type RecordDiagnosticEventInput } from './lib/diagnostics';
import {
  checkMicrophoneSupport,
  microphoneAudioConstraints,
  requestMicrophonePermission
} from './lib/microphone';
import { midiToNoteLabel } from './lib/noteMath';
import {
  captureSungNoteFromMicrophone as defaultCaptureSungNoteFromMicrophone,
  type CaptureSungNoteOptions,
  type SungNoteCaptureEvent
} from './lib/pitchDetection';
import {
  captureSungNote,
  markMicPermission,
  markMicSupport,
  markUnclearInput,
  startPracticeFlow,
  type PracticeFlowState
} from './lib/practiceFlow';

const previewTargetNote = midiToNoteLabel(60);
const requestedAudioConstraints = microphoneAudioConstraints.audio as MediaTrackConstraints;

type CaptureSungNoteFromMicrophone = (options: CaptureSungNoteOptions) => ReturnType<typeof defaultCaptureSungNoteFromMicrophone>;

export interface AppProps {
  captureSungNoteFromMicrophone?: CaptureSungNoteFromMicrophone;
}

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

export function App({ captureSungNoteFromMicrophone = defaultCaptureSungNoteFromMicrophone }: AppProps = {}) {
  const diagnostics = useMemo(() => createDiagnostics(), []);
  const diagnosticRun = useMemo(
    () => diagnostics.createRun({ diagId: 'DIAG-voice-mic-ready' }),
    [diagnostics]
  );
  const [practiceState, setPracticeState] = useState<PracticeFlowState>({ phase: 'idle' });
  const [diagnosticsText, setDiagnosticsText] = useState('');
  const [isCapturingSungNote, setIsCapturingSungNote] = useState(false);
  const captureAttemptRef = useRef(0);
  const statusText = getStatusText(practiceState);

  function recordDiagnostic(input: Omit<RecordDiagnosticEventInput, 'run'>) {
    diagnostics.record({ run: diagnosticRun, ...input });
  }

  function recordCaptureDiagnostic(event: SungNoteCaptureEvent) {
    recordDiagnostic({
      level: event.type === 'capture_error' ? 'warn' : 'info',
      component: 'PracticePreview',
      operation: 'capture_sung_note',
      event: `sung_note_capture.${event.type}`,
      eventKind: event.type === 'capture_start' ? 'start' : event.type === 'pitch_frame_summary' ? 'point' : 'end',
      phase: practiceState.phase,
      outcome: event.type === 'capture_error'
        ? 'error'
        : event.type === 'capture_timeout'
          ? 'unknown'
          : 'ok',
      attrs: event.attrs
    });
  }

  async function startPractice() {
    recordDiagnostic({
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'practice.start_clicked',
      eventKind: 'point',
      phase: practiceState.phase,
      outcome: 'ok',
      attrs: { current_phase_idle: practiceState.phase === 'idle' }
    });

    const checkingState = startPracticeFlow();
    setPracticeState(checkingState);

    recordDiagnostic({
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'microphone.support_check.started',
      eventKind: 'start',
      phase: checkingState.phase,
      attrs: { browser_has_media_devices: Boolean(navigator.mediaDevices) }
    });

    const support = checkMicrophoneSupport();

    recordDiagnostic({
      level: support.supported ? 'info' : 'warn',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'microphone.support_check.finished',
      eventKind: 'end',
      phase: checkingState.phase,
      outcome: support.supported ? 'ok' : 'unsupported',
      attrs: {
        browser_has_media_devices: support.hasMediaDevices,
        browser_has_get_user_media: support.hasGetUserMedia
      }
    });

    const permissionState = markMicSupport(checkingState, support.supported);
    setPracticeState(permissionState);

    if (permissionState.phase !== 'requestingPermission') {
      return;
    }

    recordDiagnostic({
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'microphone.permission_request.started',
      eventKind: 'start',
      phase: permissionState.phase,
      attrs: {
        echo_cancellation: requestedAudioConstraints.echoCancellation as boolean,
        noise_suppression: requestedAudioConstraints.noiseSuppression as boolean,
        auto_gain_control: requestedAudioConstraints.autoGainControl as boolean
      }
    });

    const permission = await requestMicrophonePermission();

    recordDiagnostic({
      level: permission.granted ? 'info' : 'warn',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: permission.granted ? 'microphone.permission_request.finished' : 'microphone.permission_request.error',
      eventKind: 'end',
      phase: permissionState.phase,
      outcome: permission.granted ? 'ok' : permission.denied ? 'denied' : 'error',
      attrs: permission.granted
        ? { stopped_track_count: permission.stoppedTrackCount }
        : {
            is_denied_error: permission.denied,
            stopped_track_count: permission.stoppedTrackCount
          }
    });

    setPracticeState(markMicPermission(permissionState, permission.granted));
  }

  async function captureCurrentSungNote() {
    if (isCapturingSungNote) {
      return;
    }

    const captureAttempt = captureAttemptRef.current + 1;
    captureAttemptRef.current = captureAttempt;
    setIsCapturingSungNote(true);

    try {
      const result = await captureSungNoteFromMicrophone({ onEvent: recordCaptureDiagnostic });

      if (captureAttemptRef.current !== captureAttempt) {
        return;
      }

      if (result.status === 'captured') {
        setPracticeState(captureSungNote(practiceState, result.midiNote, result.noteLabel));
        return;
      }

      setPracticeState(markUnclearInput());
    } finally {
      if (captureAttemptRef.current === captureAttempt) {
        setIsCapturingSungNote(false);
      }
    }
  }

  function markCurrentInputUnclear() {
    captureAttemptRef.current += 1;
    setIsCapturingSungNote(false);
    setPracticeState(markUnclearInput());
  }

  async function exportDiagnostics() {
    recordDiagnostic({
      level: 'info',
      component: 'DiagnosticsPanel',
      operation: 'export_diagnostics',
      event: 'diagnostics.exported',
      eventKind: 'point',
      phase: 'debug_export',
      outcome: 'ok',
      redaction: { safe_to_commit: false },
      attrs: { event_count_before_export: diagnostics.getEvents().length }
    });

    const jsonl = diagnostics.exportJsonl();
    setDiagnosticsText(jsonl);

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonl).catch(() => undefined);
    }
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
          <button className="primary-action" type="button" onClick={startPractice}>
            Start practice
          </button>
        ) : null}

        {practiceState.phase === 'singing' ? (
          <div className="split-actions">
            <button
              className="primary-action"
              type="button"
              disabled={isCapturingSungNote}
              onClick={() => {
                void captureCurrentSungNote();
              }}
            >
              {isCapturingSungNote ? 'Capturing sung note' : 'Capture sung note'}
            </button>
            <button
              className="secondary-action"
              type="button"
              disabled={isCapturingSungNote}
              onClick={markCurrentInputUnclear}
            >
              Mark unclear
            </button>
          </div>
        ) : null}

        {practiceState.phase === 'singCaptured' ||
          practiceState.phase === 'unclearInput' ||
          practiceState.phase === 'permissionDenied' ||
          practiceState.phase === 'unsupported' ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => {
              void startPractice();
            }}
          >
            Try again
          </button>
        ) : null}

        <p className="microcopy">{statusText}. Capture listens briefly, then stops microphone tracks and closes the audio context.</p>

        <section className="diagnostics-panel" aria-label="Diagnostics export">
          <button className="diagnostics-action" type="button" onClick={exportDiagnostics}>
            Export diagnostics
          </button>
          {diagnosticsText ? (
            <pre className="diagnostics-output" aria-label="Diagnostics JSONL">
              {diagnosticsText}
            </pre>
          ) : null}
        </section>
      </section>
    </main>
  );
}
