export type SemitoneDirection = 'match' | 'higher' | 'lower';

export type SemitoneFeedback = {
  semitones: number;
  direction: SemitoneDirection;
  message: string;
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4_FREQUENCY = 440;
const A4_MIDI = 69;

export function frequencyToMidi(frequency: number): number {
  if (frequency <= 0) {
    throw new Error('Frequency must be greater than zero.');
  }

  return Math.round(A4_MIDI + 12 * Math.log2(frequency / A4_FREQUENCY));
}

export function midiToNoteLabel(midiNote: number): string {
  const roundedMidi = Math.round(midiNote);
  const noteName = NOTE_NAMES[((roundedMidi % 12) + 12) % 12];
  const octave = Math.floor(roundedMidi / 12) - 1;

  return `${noteName}${octave}`;
}

export function compareSemitoneDistance(sungMidiNote: number, playedMidiNote: number): SemitoneFeedback {
  const semitones = playedMidiNote - sungMidiNote;

  if (semitones === 0) {
    return {
      semitones,
      direction: 'match',
      message: 'Same note.'
    };
  }

  const absoluteDistance = Math.abs(semitones);
  const noteWord = absoluteDistance === 1 ? 'note' : 'notes';
  const direction = semitones > 0 ? 'higher' : 'lower';

  return {
    semitones,
    direction,
    message: `Piano was ${absoluteDistance} ${noteWord} ${direction}.`
  };
}
