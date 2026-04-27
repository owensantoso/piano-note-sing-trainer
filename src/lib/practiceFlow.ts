import { compareSemitoneDistance, type SemitoneFeedback } from './noteMath';

export type PracticeFlowState =
  | { phase: 'idle' }
  | { phase: 'checkingSupport' }
  | { phase: 'requestingPermission' }
  | { phase: 'permissionDenied' }
  | { phase: 'unsupported' }
  | { phase: 'singing' }
  | { phase: 'singCaptured'; sungMidiNote: number; sungNoteLabel: string }
  | {
      phase: 'pianoCompared';
      sungMidiNote: number;
      sungNoteLabel: string;
      playedMidiNote: number;
      playedNoteLabel: string;
      comparison: SemitoneFeedback;
    }
  | { phase: 'unclearInput' };

export function startPracticeFlow(): PracticeFlowState {
  return { phase: 'checkingSupport' };
}

export function markMicSupport(_state: PracticeFlowState, isSupported: boolean): PracticeFlowState {
  if (!isSupported) {
    return { phase: 'unsupported' };
  }

  return { phase: 'requestingPermission' };
}

export function markMicPermission(_state: PracticeFlowState, isGranted: boolean): PracticeFlowState {
  if (!isGranted) {
    return { phase: 'permissionDenied' };
  }

  return { phase: 'singing' };
}

export function captureSungNote(
  _state: PracticeFlowState,
  sungMidiNote: number,
  sungNoteLabel: string
): PracticeFlowState {
  return {
    phase: 'singCaptured',
    sungMidiNote,
    sungNoteLabel
  };
}

export function capturePianoNote(
  state: Extract<PracticeFlowState, { phase: 'singCaptured' }>,
  playedMidiNote: number,
  playedNoteLabel: string
): PracticeFlowState {
  return {
    phase: 'pianoCompared',
    sungMidiNote: state.sungMidiNote,
    sungNoteLabel: state.sungNoteLabel,
    playedMidiNote,
    playedNoteLabel,
    comparison: compareSemitoneDistance(state.sungMidiNote, playedMidiNote)
  };
}

export function markUnclearInput(): PracticeFlowState {
  return { phase: 'unclearInput' };
}

export function retryPracticeFlow(): PracticeFlowState {
  return { phase: 'checkingSupport' };
}
