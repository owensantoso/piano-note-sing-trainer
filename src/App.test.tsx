import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

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

  it('requests browser microphone permission and moves into the singing state', async () => {
    const user = userEvent.setup();
    const { getUserMedia, stop } = mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(await screen.findByText('Listening for your sung note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture demo c4/i })).toBeInTheDocument();
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

  it('shows a captured sung note in the practice arena after permission succeeds', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(await screen.findByRole('button', { name: /capture demo c4/i }));

    expect(screen.getByText('Captured C4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('re-enters microphone permission flow when trying again after unclear input', async () => {
    const user = userEvent.setup();
    const { getUserMedia } = mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Listening for your sung note');
    await user.click(screen.getByRole('button', { name: /mark unclear/i }));
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await screen.findByText('Listening for your sung note');
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

    await screen.findByText('Listening for your sung note');
    expect(getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('lets a user export diagnostics JSONL with microphone support and permission trace events', async () => {
    const user = userEvent.setup();
    mockGrantedMicrophone();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await screen.findByText('Listening for your sung note');

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
