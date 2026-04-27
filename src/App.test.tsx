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

describe('App rolling live practice flow', () => {
  beforeEach(() => {
    setMockMediaDevices(undefined);
  });

  it('starts a rolling sung-note listener after microphone permission without showing capture buttons', async () => {
    const user = userEvent.setup();
    const { getUserMedia, stop } = mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(() => new Promise<never>(() => undefined));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Listening for your sung note')).toBeInTheDocument();
    expect(screen.getByText(/listening for your voice/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /capture sung note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark unclear/i })).not.toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(1);
  });

  it('rolls from sung-note capture into piano-note capture and shows match feedback', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' })
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 69, noteLabel: 'A4' });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Match: 0 semitones')).toBeInTheDocument();
    expect(screen.getByText('Sang A4, played A4.')).toBeInTheDocument();
    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: /capture piano note/i })).not.toBeInTheDocument();
  });

  it('shows higher and lower semitone feedback from the rolling piano listener', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 60, noteLabel: 'C4' })
      .mockResolvedValueOnce({ status: 'captured' as const, midiNote: 62, noteLabel: 'D4' });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Higher by 2 semitones')).toBeInTheDocument();
    expect(screen.getByText('Sang C4, played D4.')).toBeInTheDocument();
  });

  it('shows unclear feedback when the rolling sung-note listener cannot stabilize', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'unclear' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('I could not hear one clear note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows timeout guidance when the rolling listener runs out of time', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'timeout' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Listening timed out before one stable note')).toBeInTheDocument();
    expect(screen.getByText(/sing or play one steady note while the orb is listening/i)).toBeInTheDocument();
  });

  it('shows microphone failure guidance when rolling capture errors', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'error' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Microphone capture failed')).toBeInTheDocument();
    expect(screen.getByText(/check mic permission/i)).toBeInTheDocument();
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
    expect(screen.getByText(/enable microphone permission/i)).toBeInTheDocument();
  });

  it('offers a recovery path after microphone permission is denied', async () => {
    const user = userEvent.setup();
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('do not log this message', 'NotAllowedError'))
      .mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream);
    setMockMediaDevices({ getUserMedia });
    const captureSungNoteFromMicrophone = vi.fn(async () => ({ status: 'unclear' as const }));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Microphone permission was denied');

    await user.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByText('I could not hear one clear note');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(captureSungNoteFromMicrophone).toHaveBeenCalledTimes(1);
  });

  it('exports microphone support and permission diagnostics', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi.fn(() => new Promise<never>(() => undefined));

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Listening for your sung note');

    const events = await exportDiagnosticEvents(user);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: 'practice.start_clicked', outcome: 'ok' }),
        expect.objectContaining({ event: 'microphone.support_check.finished', outcome: 'ok' }),
        expect.objectContaining({ event: 'microphone.permission_request.finished', outcome: 'ok' }),
        expect.objectContaining({ event: 'diagnostics.exported' })
      ])
    );
  });

  it('records safe diagnostics for rolling sung and piano capture plus comparison', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();
    const captureSungNoteFromMicrophone = vi
      .fn()
      .mockImplementationOnce(async ({ onEvent }: CaptureSungNoteOptions) => {
        onEvent?.({ type: 'capture_start', attrs: { max_frames: 480, stable_frame_count: 3 } });
        onEvent?.({ type: 'capture_finished', attrs: { captured: true, midi_note: 60, timed_out: false } });

        return { status: 'captured' as const, midiNote: 60, noteLabel: 'C4' };
      })
      .mockImplementationOnce(async ({ onEvent }: CaptureSungNoteOptions) => {
        onEvent?.({ type: 'capture_start', attrs: { max_frames: 480, stable_frame_count: 3 } });
        onEvent?.({ type: 'capture_finished', attrs: { captured: true, midi_note: 62, timed_out: false } });

        return { status: 'captured' as const, midiNote: 62, noteLabel: 'D4' };
      });

    render(<App captureSungNoteFromMicrophone={captureSungNoteFromMicrophone} />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Higher by 2 semitones');

    const events = await exportDiagnosticEvents(user);

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ operation: 'capture_sung_note', event: 'sung_note_capture.capture_start' }),
        expect.objectContaining({ operation: 'capture_piano_note', event: 'piano_note_capture.capture_start' }),
        expect.objectContaining({
          operation: 'compare_piano_to_sung_note',
          attrs: expect.objectContaining({ semitone_distance: 2, is_higher: true })
        })
      ])
    );
  });
});
