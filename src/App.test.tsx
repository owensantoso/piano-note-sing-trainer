import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import type { CaptureSungNoteOptions } from './lib/pitchDetection';

type MockMediaDevices = Partial<Pick<MediaDevices, 'getUserMedia'>>;

function setMockMediaDevices(mediaDevices: MockMediaDevices | undefined) {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: mediaDevices
  });
}

function mockGrantedMicrophone() {
  const stop = vi.fn();
  const getTracks = vi.fn(() => [{ stop }]);
  const getUserMedia = vi.fn(async () => ({ getTracks }) as unknown as MediaStream);
  setMockMediaDevices({ getUserMedia });

  return { getUserMedia, stop };
}

async function exportDiagnosticEvents(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /export diagnostics/i }));

  const diagnosticsOutput = screen.getByLabelText(/diagnostics jsonl/i);

  return (diagnosticsOutput.textContent ?? '').split('\n').map((line) => JSON.parse(line));
}

describe('App practice state preview', () => {
  beforeEach(() => {
    setMockMediaDevices(undefined);
  });

  it('requests browser microphone permission and offers real sung note capture', async () => {
    const user = userEvent.setup();
    const { getUserMedia, stop } = mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Ready to capture your sung note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture sung note/i })).toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('shows unsupported state when browser microphone APIs are missing', async () => {
    const user = userEvent.setup();
    setMockMediaDevices(undefined);

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('This browser does not support microphone practice')).toBeInTheDocument();
  });

  it('shows denied state when microphone permission is rejected', async () => {
    const user = userEvent.setup();
    const getUserMedia = vi.fn(async () => {
      throw new DOMException('do not log this message', 'NotAllowedError');
    });
    setMockMediaDevices({ getUserMedia });

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Microphone permission was denied')).toBeInTheDocument();
  });

  it('shows a captured sung note in the practice arena after real sung-note capture succeeds', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({
      status: 'captured' as const,
      midiNote: 69,
      noteLabel: 'A4'
    }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(screen.getByText('Captured A4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture piano note/i })).toBeInTheDocument();
  });

  it('shows a match when sung A4 and piano A4 are captured', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' })
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(await screen.findByText('Now play one piano note, then capture it.')).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /capture piano note/i }));

    expect(await screen.findByText('Match: 0 semitones')).toBeInTheDocument();
    expect(screen.getByText('Sang A4, played A4.')).toBeInTheDocument();
    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(2);
  });

  it('shows higher feedback when sung C4 and piano D4 are captured', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 60, noteLabel: 'C4' })
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 62, noteLabel: 'D4' });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));
    await user.click(await screen.findByRole('button', { name: /capture piano note/i }));

    expect(await screen.findByText('Higher by 2 semitones')).toBeInTheDocument();
    expect(screen.getByText('Sang C4, played D4.')).toBeInTheDocument();
  });

  it('shows lower feedback when sung E4 and piano D#4 are captured', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 64, noteLabel: 'E4' })
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 63, noteLabel: 'D#4' });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));
    await user.click(await screen.findByRole('button', { name: /capture piano note/i }));

    expect(await screen.findByText('Lower by 1 semitone')).toBeInTheDocument();
    expect(screen.getByText('Sang E4, played D#4.')).toBeInTheDocument();
  });

  it('keeps the fallback unclear path when piano-note capture cannot stabilize', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' })
      .mockResolvedValueOnce({ status: 'unclear' as const });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));
    await user.click(await screen.findByRole('button', { name: /capture piano note/i }));

    expect(await screen.findByText('I could not hear one clear note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('keeps the fallback unclear path when sung-note capture cannot stabilize', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'unclear' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(screen.getByText('I could not hear one clear note')).toBeInTheDocument();
  });

  it('shows timeout guidance when sung-note capture runs out of listening time', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'timeout' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(screen.getByText('Capture timed out before one stable note')).toBeInTheDocument();
    expect(screen.getByText(/sing or play one steady note right away/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows microphone failure guidance when sung-note capture errors', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'error' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(screen.getByText('Microphone capture failed')).toBeInTheDocument();
    expect(screen.getByText(/check mic permission/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });



  it('ignores repeated sung-note capture taps while a capture is already running', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    let resolveCapture: (value: { status: 'unclear' }) => void = () => undefined;
    const captureSungNoteFromMicrophone = vi.fn(
      () => new Promise<{ status: 'unclear' }>((resolve) => {
        resolveCapture = resolve;
      })
    );

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    const captureButton = await screen.findByRole('button', { name: /capture sung note/i });

    await user.click(captureButton);
    await user.click(captureButton);

    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(1);
    expect(captureButton).toBeDisabled();

    resolveCapture({ status: 'unclear' });
    await screen.findByText('I could not hear one clear note');
  });



  it('disables competing sung-note actions while capture is already running', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    let resolveCapture: (value: { status: 'captured'; midiNote: number; noteLabel: string }) => void = () => undefined;
    const captureSungNoteFromMicrophone = vi.fn(
      () => new Promise<{ status: 'captured'; midiNote: number; noteLabel: string }>((resolve) => {
        resolveCapture = resolve;
      })
    );

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    expect(screen.getByRole('button', { name: /capturing sung note/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /mark unclear/i })).toBeDisabled();

    resolveCapture({ status: 'captured', midiNote: 69, noteLabel: 'A4' });

    expect(await screen.findByText('Captured A4')).toBeInTheDocument();
    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated piano-note capture taps while a capture is already running', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    let resolvePianoCapture: (value: { status: 'captured'; midiNote: number; noteLabel: string }) => void = () => undefined;
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' })
      .mockImplementationOnce(
        () => new Promise<{ status: 'captured'; midiNote: number; noteLabel: string }>((resolve) => {
          resolvePianoCapture = resolve;
        })
      );

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));
    const captureButton = await screen.findByRole('button', { name: /capture piano note/i });

    await user.click(captureButton);
    await user.click(captureButton);

    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(2);
    expect(captureButton).toBeDisabled();

    resolvePianoCapture({ status: 'captured', midiNote: 69, noteLabel: 'A4' });
    await screen.findByText('Match: 0 semitones');
  });

  it('re-enters microphone permission flow when trying again after unclear input', async () => {
    const user = userEvent.setup();
    const { getUserMedia } = mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Ready to capture your sung note');
    await user.click(screen.getByRole('button', { name: /mark unclear/i }));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByText('Ready to capture your sung note');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });



  it('offers a recovery path after microphone permission is denied', async () => {
    const user = userEvent.setup();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('do not log this message', 'NotAllowedError'))
      .mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream);
    setMockMediaDevices({ getUserMedia });

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Microphone permission was denied');

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByText('Ready to capture your sung note');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('lets a user export diagnostics JSONL with microphone support and permission trace events', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Ready to capture your sung note');

    const events = await exportDiagnosticEvents(user);

    expect(events).toEqual([
      expect.objectContaining({
        diag_id: 'DIAG-voice-mic-ready',
        component: 'PracticePreview',
        operation: 'start_practice',
        event: 'practice.start_clicked',
        event_kind: 'point',
        outcome: 'ok',
        attrs: { current_phase_idle: true }
      }),
      expect.objectContaining({
        event: 'microphone.support_check.started',
        event_kind: 'start',
        phase: 'checkingSupport',
        attrs: { browser_has_media_devices: true }
      }),
      expect.objectContaining({
        event: 'microphone.support_check.finished',
        event_kind: 'end',
        outcome: 'ok',
        attrs: {
          browser_has_media_devices: true,
          browser_has_get_user_media: true
        }
      }),
      expect.objectContaining({
        event: 'microphone.permission_request.started',
        event_kind: 'start',
        phase: 'requestingPermission',
        attrs: {
          echo_cancellation: false,
          noise_suppression: false,
          auto_gain_control: false
        }
      }),
      expect.objectContaining({
        event: 'microphone.permission_request.finished',
        event_kind: 'end',
        outcome: 'ok',
        attrs: { stopped_track_count: 1 }
      }),
      expect.objectContaining({
        component: 'DiagnosticsPanel',
        operation: 'export_diagnostics',
        event: 'diagnostics.exported',
        attrs: { event_count_before_export: 5 }
      })
    ]);
  });

  it('records safe diagnostics for a sung-note capture attempt', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(
      async ({ onEvent }: CaptureSungNoteOptions) => {
        onEvent?.({ type: 'capture_start', attrs: { max_frames: 8, stable_frame_count: 3 } });
        onEvent?.({ type: 'stream_opened', attrs: { track_count: 1 } });
        onEvent?.({ type: 'audio_context_created', attrs: { sample_rate: 44_100, fft_size: 2048 } });
        onEvent?.({ type: 'pitch_frame_summary', attrs: { accepted_frame_count: 3, rejected_frame_count: 1 } });
        onEvent?.({ type: 'capture_finished', attrs: { captured: true, midi_note: 69, timed_out: false } });

        return { status: 'captured' as const, midiNote: 69, noteLabel: 'A4' };
      }
    );

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));

    const events = await exportDiagnosticEvents(user);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: 'sung_note_capture.capture_start',
          attrs: { max_frames: 8, stable_frame_count: 3 }
        }),
        expect.objectContaining({
          event: 'sung_note_capture.stream_opened',
          attrs: { track_count: 1 }
        }),
        expect.objectContaining({
          event: 'sung_note_capture.audio_context_created',
          attrs: { sample_rate: 44_100, fft_size: 2048 }
        }),
        expect.objectContaining({
          event: 'sung_note_capture.pitch_frame_summary',
          attrs: { accepted_frame_count: 3, rejected_frame_count: 1 }
        }),
        expect.objectContaining({
          event: 'sung_note_capture.capture_finished',
          attrs: { captured: true, midi_note: 69, timed_out: false }
        })
      ])
    );
  });

  it('records safe diagnostics for piano-note capture and comparison result', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 60, noteLabel: 'C4' })
      .mockImplementationOnce(async ({ onEvent }: CaptureSungNoteOptions) => {
        onEvent?.({ type: 'capture_start', attrs: { max_frames: 8, stable_frame_count: 3 } });
        onEvent?.({ type: 'capture_finished', attrs: { captured: true, midi_note: 62, timed_out: false } });

        return { status: 'captured' as const, midiNote: 62, noteLabel: 'D4' };
      });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture sung note/i }));
    await user.click(await screen.findByRole('button', { name: /capture piano note/i }));

    const events = await exportDiagnosticEvents(user);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: 'capture_piano_note',
          event: 'piano_note_capture.capture_start',
          event_kind: 'start',
          attrs: { max_frames: 8, stable_frame_count: 3 }
        }),
        expect.objectContaining({
          operation: 'capture_piano_note',
          event: 'piano_note_capture.capture_finished',
          event_kind: 'end',
          attrs: { captured: true, midi_note: 62, timed_out: false }
        }),
        expect.objectContaining({
          operation: 'compare_piano_to_sung_note',
          event: 'piano_note_comparison.finished',
          event_kind: 'end',
          outcome: 'ok',
          attrs: {
            sung_midi_note: 60,
            played_midi_note: 62,
            semitone_distance: 2,
            is_match: false,
            is_higher: true,
            is_lower: false
          }
        })
      ])
    );
  });

  it('records denied microphone permission as a redacted diagnostic error', async () => {
    const user = userEvent.setup();
    const getUserMedia = vi.fn(async () => {
      throw new DOMException('do not log this message', 'NotAllowedError');
    });
    setMockMediaDevices({ getUserMedia });

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Microphone permission was denied');

    const events = await exportDiagnosticEvents(user);

    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'microphone.permission_request.error',
        event_kind: 'end',
        outcome: 'denied',
        attrs: {
          is_denied_error: true,
          stopped_track_count: 0
        },
        redaction: expect.objectContaining({
          contains_raw_user_content: false,
          safe_to_commit: false
        })
      })
    );
  });
});
