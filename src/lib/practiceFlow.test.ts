import { describe, expect, it } from 'vitest';
import {
  captureSungNote,
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

  it('records unclear microphone input so the singer can retry', () => {
    expect(markUnclearInput()).toEqual({
      phase: 'unclearInput'
    });
  });

  it('retries by returning to support checking without preserving captured notes', () => {
    expect(
      retryPracticeFlow()
    ).toEqual({ phase: 'checkingSupport' });
  });
});
