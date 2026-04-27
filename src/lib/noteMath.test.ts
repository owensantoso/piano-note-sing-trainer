import { describe, expect, it } from 'vitest';
import { frequencyToMidi, midiToNoteLabel, compareSemitoneDistance } from './noteMath';

describe('frequencyToMidi', () => {
  it('rounds A4 concert pitch to MIDI note 69', () => {
    expect(frequencyToMidi(440)).toBe(69);
  });

  it('rounds nearby pitch to the nearest MIDI note', () => {
    expect(frequencyToMidi(445)).toBe(69);
    expect(frequencyToMidi(466.16)).toBe(70);
  });

  it('rejects non-positive frequencies', () => {
    expect(() => frequencyToMidi(0)).toThrow('Frequency must be greater than zero.');
  });
});

describe('midiToNoteLabel', () => {
  it('labels MIDI notes with scientific pitch notation', () => {
    expect(midiToNoteLabel(60)).toBe('C4');
    expect(midiToNoteLabel(61)).toBe('C#4');
    expect(midiToNoteLabel(69)).toBe('A4');
  });
});

describe('compareSemitoneDistance', () => {
  it('reports a matching note when both MIDI notes are the same', () => {
    expect(compareSemitoneDistance(60, 60)).toEqual({
      semitones: 0,
      direction: 'match',
      message: 'Same note.'
    });
  });

  it('reports when the played note is higher than the sung note', () => {
    expect(compareSemitoneDistance(60, 62)).toEqual({
      semitones: 2,
      direction: 'higher',
      message: 'Piano was 2 notes higher.'
    });
  });

  it('reports when the played note is lower than the sung note', () => {
    expect(compareSemitoneDistance(64, 63)).toEqual({
      semitones: -1,
      direction: 'lower',
      message: 'Piano was 1 note lower.'
    });
  });
});
