import { describe, expect, it } from 'vitest';
import {
  capturePianoNote,
  captureSungNote,
  markCaptureError,
  markCaptureTimeout,
  markMicPermission,
  markMicSupport,
  markUnclearInput,
  retryPracticeFlow,
  startPracticeFlow
} from './practiceFlow';

describe('practiceFlow', () => {
  it('starts the flow by checking microphone support', () => {
    expect(startPracticeFlow()).toEqual({ phase: 'checkingSupport' });
  });

  it('moves unsupported browsers out of the microphone flow', () => {
    expect(markMicSupport({ phase: 'checkingSupport' }, false)).toEqual({
      phase: 'unsupported'
    });
  });

  it('asks for permission when microphone support exists', () => {
    expect(markMicSupport({ phase: 'checkingSupport' }, true)).toEqual({
      phase: 'requestingPermission'
    });
  });

  it('starts singing after microphone permission is granted', () => {
    expect(markMicPermission({ phase: 'requestingPermission' }, true)).toEqual({
      phase: 'singing'
    });
  });

  it('tracks denied microphone permission', () => {
    expect(markMicPermission({ phase: 'requestingPermission' }, false)).toEqual({
      phase: 'permissionDenied'
    });
  });

  it('captures a clear sung note before piano input exists', () => {
    expect(captureSungNote({ phase: 'singing' }, 60, 'C4')).toEqual({
      phase: 'singCaptured',
      sungMidiNote: 60,
      sungNoteLabel: 'C4'
    });
  });

  it('compares a matching piano note against the captured sung note', () => {
    expect(capturePianoNote({ phase: 'singCaptured', sungMidiNote: 69, sungNoteLabel: 'A4' }, 69, 'A4')).toEqual({
      phase: 'pianoCompared',
      sungMidiNote: 69,
      sungNoteLabel: 'A4',
      playedMidiNote: 69,
      playedNoteLabel: 'A4',
      comparison: {
        direction: 'match',
        semitones: 0,
        message: 'Same note.'
      }
    });
  });

  it('compares a higher piano note against the captured sung note', () => {
    expect(capturePianoNote({ phase: 'singCaptured', sungMidiNote: 60, sungNoteLabel: 'C4' }, 62, 'D4')).toEqual({
      phase: 'pianoCompared',
      sungMidiNote: 60,
      sungNoteLabel: 'C4',
      playedMidiNote: 62,
      playedNoteLabel: 'D4',
      comparison: {
        direction: 'higher',
        semitones: 2,
        message: 'Piano was 2 notes higher.'
      }
    });
  });

  it('compares a lower piano note against the captured sung note', () => {
    expect(capturePianoNote({ phase: 'singCaptured', sungMidiNote: 64, sungNoteLabel: 'E4' }, 63, 'D#4')).toEqual({
      phase: 'pianoCompared',
      sungMidiNote: 64,
      sungNoteLabel: 'E4',
      playedMidiNote: 63,
      playedNoteLabel: 'D#4',
      comparison: {
        direction: 'lower',
        semitones: -1,
        message: 'Piano was 1 note lower.'
      }
    });
  });

  it('records unclear microphone input so the singer can retry', () => {
    expect(markUnclearInput()).toEqual({
      phase: 'unclearInput'
    });
  });

  it('records capture timeout separately from unclear pitch input', () => {
    expect(markCaptureTimeout()).toEqual({
      phase: 'captureTimeout'
    });
  });

  it('records capture errors separately from unclear pitch input', () => {
    expect(markCaptureError()).toEqual({
      phase: 'captureError'
    });
  });

  it('retries by returning to support checking without preserving captured notes', () => {
    expect(
      retryPracticeFlow()
    ).toEqual({ phase: 'checkingSupport' });
  });
});
