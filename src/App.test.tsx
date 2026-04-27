import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App practice state preview', () => {
  it('moves into the singing state after the start flow is simulated', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));

    expect(screen.getByText('Listening for your sung note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /capture demo c4/i })).toBeInTheDocument();
  });

  it('shows a captured sung note in the practice arena', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(screen.getByRole('button', { name: /capture demo c4/i }));

    expect(screen.getByText('Captured C4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('shows unclear input and can retry the flow', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(screen.getByRole('button', { name: /mark unclear/i }));

    expect(screen.getByText('I could not hear one clear note')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Checking microphone support')).toBeInTheDocument();
  });

  it('lets a user export diagnostics JSONL from a small debug panel', async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(screen.getByRole('button', { name: /start practice/i }));
    await user.click(screen.getByRole('button', { name: /export diagnostics/i }));

    const diagnosticsOutput = screen.getByLabelText(/diagnostics jsonl/i);
    const events = (diagnosticsOutput.textContent ?? '').split('\n').map((line) => JSON.parse(line));

    expect(events[0]).toMatchObject({
      diag_id: 'DIAG-voice-mic-ready',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'practice.started',
      event_kind: 'start',
      redaction: {
        contains_raw_user_content: false,
        safe_to_commit: false
      }
    });
    expect(events[1]).toMatchObject({
      component: 'DiagnosticsPanel',
      operation: 'export_diagnostics',
      event: 'diagnostics.exported',
      attrs: { event_count_before_export: 1 }
    });
  });
});
