export type DiagnosticLevel = 'debug' | 'info' | 'warn' | 'error';
export type DiagnosticEventKind = 'start' | 'end' | 'point';
export type DiagnosticOutcome = 'ok' | 'error' | 'cancelled' | 'unsupported' | 'denied' | 'unknown';
export type DiagnosticRedactionClassification = 'public' | 'internal' | 'private';

export type DiagnosticAttrs = Record<string, number | boolean | null>;

export interface DiagnosticRedaction {
  classification: DiagnosticRedactionClassification;
  contains_raw_user_content: boolean;
  safe_to_commit: boolean;
}

export interface DiagnosticRun {
  diagId: string;
  runId: string;
  traceId: string;
  monotonicStart: number;
}

export interface DiagnosticEvent {
  schema_version: 1;
  seq: number;
  ts: string;
  elapsed_ms: number;
  monotonic_origin: 'run_start';
  diag_id: string;
  run_id: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  level: DiagnosticLevel;
  component: string;
  operation: string;
  event: string;
  event_kind: DiagnosticEventKind;
  phase: string;
  outcome: DiagnosticOutcome;
  redaction: DiagnosticRedaction;
  attrs: DiagnosticAttrs;
}

export interface CreateDiagnosticRunInput {
  diagId?: string;
  runId?: string;
  traceId?: string;
}

export interface RecordDiagnosticEventInput {
  run: DiagnosticRun;
  spanId?: string;
  parentSpanId?: string | null;
  level: DiagnosticLevel;
  component: string;
  operation: string;
  event: string;
  eventKind: DiagnosticEventKind;
  phase: string;
  outcome?: DiagnosticOutcome;
  redaction?: Partial<DiagnosticRedaction>;
  attrs?: DiagnosticAttrs;
}

export interface DiagnosticDependencies {
  now?: () => Date;
  monotonicNow?: () => number;
  createId?: (prefix: 'DIAG' | 'run' | 'trace' | 'span') => string;
}

export type DiagnosticListener = (event: DiagnosticEvent) => void;

function defaultMonotonicNow(): number {
  if (typeof performance !== 'undefined') {
    return performance.now();
  }

  return Date.now();
}

function createDefaultIdFactory() {
  let nextId = 0;

  return (prefix: 'DIAG' | 'run' | 'trace' | 'span') => `${prefix}-${++nextId}`;
}

export function createDiagnostics(dependencies: DiagnosticDependencies = {}) {
  const now = dependencies.now ?? (() => new Date());
  const monotonicNow = dependencies.monotonicNow ?? defaultMonotonicNow;
  const createId = dependencies.createId ?? createDefaultIdFactory();
  const events: DiagnosticEvent[] = [];
  const listeners = new Set<DiagnosticListener>();
  let nextSeq = 1;

  function createRun(input: CreateDiagnosticRunInput = {}): DiagnosticRun {
    return {
      diagId: input.diagId ?? createId('DIAG'),
      runId: input.runId ?? createId('run'),
      traceId: input.traceId ?? createId('trace'),
      monotonicStart: monotonicNow()
    };
  }

  function record(input: RecordDiagnosticEventInput): DiagnosticEvent {
    const redaction: DiagnosticRedaction = {
      classification: input.redaction?.classification ?? 'internal',
      contains_raw_user_content: input.redaction?.contains_raw_user_content ?? false,
      safe_to_commit: input.redaction?.safe_to_commit ?? false
    };

    const event: DiagnosticEvent = {
      schema_version: 1,
      seq: nextSeq++,
      ts: now().toISOString(),
      elapsed_ms: monotonicNow() - input.run.monotonicStart,
      monotonic_origin: 'run_start',
      diag_id: input.run.diagId,
      run_id: input.run.runId,
      trace_id: input.run.traceId,
      span_id: input.spanId ?? createId('span'),
      parent_span_id: input.parentSpanId ?? null,
      level: input.level,
      component: input.component,
      operation: input.operation,
      event: input.event,
      event_kind: input.eventKind,
      phase: input.phase,
      outcome: input.outcome ?? 'unknown',
      redaction,
      attrs: input.attrs ?? {}
    };

    events.push(event);
    listeners.forEach((listener) => listener(event));

    return event;
  }

  function getEvents(): DiagnosticEvent[] {
    return events.slice();
  }

  function exportJsonl(): string {
    return events.map((event) => JSON.stringify(event)).join('\n');
  }

  function clear() {
    events.length = 0;
  }

  function reset() {
    clear();
    nextSeq = 1;
  }

  function subscribe(listener: DiagnosticListener): () => void {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }

  return {
    createRun,
    record,
    getEvents,
    exportJsonl,
    clear,
    reset,
    subscribe
  };
}
