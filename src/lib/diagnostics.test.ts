import { describe, expect, it } from 'vitest';
import { createDiagnostics } from './diagnostics';

describe('diagnostics', () => {
  function createDeterministicDiagnostics() {
    let wallClockMs = Date.parse('2026-04-27T10:30:15.123+09:00');
    let monotonicMs = 1_000;
    let id = 0;

    return {
      diagnostics: createDiagnostics({
        now: () => new Date(wallClockMs),
        monotonicNow: () => monotonicMs,
        createId: (prefix) => `${prefix}-${++id}`
      }),
      advance(milliseconds: number) {
        wallClockMs += milliseconds;
        monotonicMs += milliseconds;
      }
    };
  }

  it('creates a deterministic run and records structured redacted events', () => {
    const { diagnostics, advance } = createDeterministicDiagnostics();

    const run = diagnostics.createRun({ diagId: 'DIAG-0001' });
    advance(250.5);

    const event = diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'practice.started',
      eventKind: 'point',
      phase: 'idle',
      outcome: 'ok',
      attrs: {
        browser_has_media_devices: false
      }
    });

    expect(event).toEqual({
      schema_version: 1,
      seq: 1,
      ts: '2026-04-27T01:30:15.373Z',
      elapsed_ms: 250.5,
      monotonic_origin: 'run_start',
      diag_id: 'DIAG-0001',
      run_id: 'run-1',
      trace_id: 'trace-2',
      span_id: 'span-3',
      parent_span_id: null,
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'practice.started',
      event_kind: 'point',
      phase: 'idle',
      outcome: 'ok',
      redaction: {
        classification: 'internal',
        contains_raw_user_content: false,
        safe_to_commit: false
      },
      attrs: {
        browser_has_media_devices: false
      }
    });
  });

  it('preserves provided correlation IDs and parent span relationships', () => {
    const { diagnostics } = createDeterministicDiagnostics();
    const run = diagnostics.createRun({
      diagId: 'DIAG-voice-ready',
      runId: 'run-manual',
      traceId: 'trace-manual'
    });

    const start = diagnostics.record({
      run,
      spanId: 'span-parent',
      level: 'info',
      component: 'DiagnosticsPanel',
      operation: 'copy_diagnostics',
      event: 'copy.started',
      eventKind: 'start',
      phase: 'debug_export'
    });

    const end = diagnostics.record({
      run,
      spanId: 'span-child',
      parentSpanId: start.span_id,
      level: 'info',
      component: 'DiagnosticsPanel',
      operation: 'copy_diagnostics',
      event: 'copy.finished',
      eventKind: 'end',
      phase: 'debug_export',
      outcome: 'ok'
    });

    expect(end).toMatchObject({
      seq: 2,
      diag_id: 'DIAG-voice-ready',
      run_id: 'run-manual',
      trace_id: 'trace-manual',
      span_id: 'span-child',
      parent_span_id: 'span-parent'
    });
  });

  it('exports newline-delimited JSON and can clear or reset stored events', () => {
    const { diagnostics } = createDeterministicDiagnostics();
    const run = diagnostics.createRun({ diagId: 'DIAG-0002' });

    diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'support.check.started',
      eventKind: 'start',
      phase: 'checkingSupport'
    });
    diagnostics.record({
      run,
      level: 'warn',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'support.check.finished',
      eventKind: 'end',
      phase: 'checkingSupport',
      outcome: 'unsupported'
    });

    const lines = diagnostics.exportJsonl().split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toMatchObject({ seq: 1, event: 'support.check.started' });
    expect(JSON.parse(lines[1])).toMatchObject({ seq: 2, event: 'support.check.finished' });

    diagnostics.clear();
    expect(diagnostics.getEvents()).toEqual([]);

    diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'retry_practice',
      event: 'practice.retry',
      eventKind: 'point',
      phase: 'retry'
    });
    expect(diagnostics.getEvents()[0].seq).toBe(3);

    diagnostics.reset();
    diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'retry_practice',
      event: 'practice.retry',
      eventKind: 'point',
      phase: 'retry'
    });
    expect(diagnostics.getEvents()[0].seq).toBe(1);
  });

  it('notifies listeners and allows unsubscribe', () => {
    const { diagnostics } = createDeterministicDiagnostics();
    const run = diagnostics.createRun({ diagId: 'DIAG-0003' });
    const received: string[] = [];

    const unsubscribe = diagnostics.subscribe((event) => received.push(event.event));

    diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'first.event',
      eventKind: 'point',
      phase: 'idle'
    });
    unsubscribe();
    diagnostics.record({
      run,
      level: 'info',
      component: 'PracticePreview',
      operation: 'start_practice',
      event: 'second.event',
      eventKind: 'point',
      phase: 'idle'
    });

    expect(received).toEqual(['first.event']);
  });
});
