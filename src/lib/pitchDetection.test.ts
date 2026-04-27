import { describe, expect, it, vi } from 'vitest';
import {
  captureSungNoteFromMicrophone,
  createAutocorrelationPitchDetector,
  createStablePitchCapture,
  type PitchDetectionResult,
  type SungNoteCaptureEvent
} from './pitchDetection';

describe('stable sung pitch capture', () => {
  it('captures a note only after the same confident MIDI note is stable across frames', () => {
    const capture = createStablePitchCapture({ minConfidence: 0.8, stableFrameCount: 3 });

    expect(capture.addFrame({ frequency: 259.5, confidence: 0.91 })).toEqual({ status: 'collecting' });
    expect(capture.addFrame({ frequency: 261.63, confidence: 0.93 })).toEqual({ status: 'collecting' });

    expect(capture.addFrame({ frequency: 262.4, confidence: 0.95 })).toEqual({
      status: 'captured',
      midiNote: 60,
      noteLabel: 'C4',
      acceptedFrameCount: 3,
      rejectedFrameCount: 0
    });
  });

  it('rejects unclear, low-confidence, and shifting frames before restarting stability', () => {
    const capture = createStablePitchCapture({ minConfidence: 0.8, stableFrameCount: 2 });

    expect(capture.addFrame(null)).toEqual({ status: 'collecting' });
    expect(capture.addFrame({ frequency: 440, confidence: 0.4 })).toEqual({ status: 'collecting' });
    expect(capture.addFrame({ frequency: 440, confidence: 0.9 })).toEqual({ status: 'collecting' });
    expect(capture.addFrame({ frequency: 493.88, confidence: 0.91 })).toEqual({ status: 'collecting' });

    expect(capture.addFrame({ frequency: 494.2, confidence: 0.92 })).toEqual({
      status: 'captured',
      midiNote: 71,
      noteLabel: 'B4',
      acceptedFrameCount: 3,
      rejectedFrameCount: 2
    });
  });
});

describe('autocorrelation pitch detector', () => {
  it('detects a monophonic sine wave near A4', () => {
    const sampleRate = 44_100;
    const detector = createAutocorrelationPitchDetector({ minFrequency: 80, maxFrequency: 1_000 });
    const frame = Float32Array.from({ length: 2_048 }, (_, index) => Math.sin((2 * Math.PI * 440 * index) / sampleRate));

    const result = detector.detect(frame, sampleRate);

    expect(result).not.toBeNull();
    expect(result?.frequency).toBeGreaterThan(435);
    expect(result?.frequency).toBeLessThan(445);
    expect(result?.confidence).toBeGreaterThan(0.8);
  });
});

describe('captureSungNoteFromMicrophone', () => {
  function createMediaStream() {
    const stop = vi.fn();

    return {
      stream: { getTracks: () => [{ stop }] } as unknown as MediaStream,
      stop
    };
  }

  function createAudioPieces(frames: PitchDetectionResult[]) {
    let frameIndex = 0;
    const getFloatTimeDomainData = vi.fn((buffer: Float32Array) => {
      buffer[0] = frameIndex++;
    });
    const analyser = {
      fftSize: 2048,
      frequencyBinCount: 1024,
      getFloatTimeDomainData
    } as unknown as AnalyserNode;
    const source = { connect: vi.fn() } as unknown as MediaStreamAudioSourceNode;
    const close = vi.fn(async () => undefined);
    const createAnalyser = vi.fn(() => analyser);
    const createMediaStreamSource = vi.fn(() => source);
    const audioContext = {
      sampleRate: 44_100,
      createAnalyser,
      createMediaStreamSource,
      close
    } as unknown as AudioContext;
    const detector = {
      detect: vi.fn(() => frames.shift() ?? null)
    };

    return { analyser, source, close, createAnalyser, createMediaStreamSource, audioContext, detector };
  }

  it('opens the mic stream, creates Web Audio nodes, captures a stable note, and cleans up', async () => {
    const { stream, stop } = createMediaStream();
    const audio = createAudioPieces([
      { frequency: 440, confidence: 0.94 },
      { frequency: 441, confidence: 0.93 }
    ]);
    const getUserMedia = vi.fn(async () => stream);
    const events: SungNoteCaptureEvent[] = [];

    const result = await captureSungNoteFromMicrophone({
      getUserMedia,
      createAudioContext: () => audio.audioContext,
      detector: audio.detector,
      minConfidence: 0.8,
      stableFrameCount: 2,
      maxFrames: 8,
      onEvent: (event) => events.push(event)
    });

    expect(result).toEqual({ status: 'captured', midiNote: 69, noteLabel: 'A4' });
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    expect(audio.createAnalyser).toHaveBeenCalledTimes(1);
    expect(audio.createMediaStreamSource).toHaveBeenCalledWith(stream);
    expect(audio.source.connect).toHaveBeenCalledWith(audio.analyser);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(audio.close).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.type)).toEqual([
      'capture_start',
      'stream_opened',
      'audio_context_created',
      'pitch_frame_summary',
      'capture_finished'
    ]);
    expect(events[2]?.attrs).toEqual({ sample_rate: 44_100, fft_size: 2048, resumed_from_suspended: false });
    expect(events.at(-1)?.attrs).toEqual({ captured: true, midi_note: 69, timed_out: false });
  });

  it('resumes a suspended audio context before analysing microphone frames', async () => {
    const { stream } = createMediaStream();
    const audio = createAudioPieces([
      { frequency: 440, confidence: 0.94 },
      { frequency: 441, confidence: 0.93 }
    ]);
    const resume = vi.fn(async () => undefined);
    const audioContext = {
      ...audio.audioContext,
      state: 'suspended' as const,
      resume
    };
    const events: SungNoteCaptureEvent[] = [];

    const result = await captureSungNoteFromMicrophone({
      getUserMedia: vi.fn(async () => stream),
      createAudioContext: () => audioContext,
      detector: audio.detector,
      stableFrameCount: 2,
      onEvent: (event) => events.push(event)
    });

    expect(result).toEqual({ status: 'captured', midiNote: 69, noteLabel: 'A4' });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(events[2]?.attrs).toEqual({ sample_rate: 44_100, fft_size: 2048, resumed_from_suspended: true });
  });

  it('returns unclear after the frame budget is exhausted without a stable note', async () => {
    const { stream, stop } = createMediaStream();
    const audio = createAudioPieces([
      { frequency: 440, confidence: 0.95 },
      { frequency: 493.88, confidence: 0.95 },
      null
    ]);
    const events: SungNoteCaptureEvent[] = [];

    const result = await captureSungNoteFromMicrophone({
      getUserMedia: vi.fn(async () => stream),
      createAudioContext: () => audio.audioContext,
      detector: audio.detector,
      stableFrameCount: 2,
      maxFrames: 3,
      onEvent: (event) => events.push(event)
    });

    expect(result).toEqual({ status: 'unclear' });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(audio.close).toHaveBeenCalledTimes(1);
    expect(events.at(-2)).toEqual({
      type: 'pitch_frame_summary',
      attrs: { accepted_frame_count: 2, rejected_frame_count: 1 }
    });
    expect(events.at(-1)).toEqual({
      type: 'capture_unclear',
      attrs: { accepted_frame_count: 2, rejected_frame_count: 1, timed_out: false }
    });
  });

  it('keeps listening long enough for a delayed sung note with the default frame budget', async () => {
    const { stream, stop } = createMediaStream();
    const delayedFrames: PitchDetectionResult[] = [
      ...Array.from({ length: 60 }, () => null),
      { frequency: 440, confidence: 0.94 },
      { frequency: 440, confidence: 0.93 },
      { frequency: 441, confidence: 0.94 }
    ];
    const audio = createAudioPieces(delayedFrames);

    const result = await captureSungNoteFromMicrophone({
      getUserMedia: vi.fn(async () => stream),
      createAudioContext: () => audio.audioContext,
      detector: audio.detector,
      now: () => 0,
      waitForNextFrame: async () => undefined
    });

    expect(result).toEqual({ status: 'captured', midiNote: 69, noteLabel: 'A4' });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(audio.detector.detect).toHaveBeenCalledTimes(63);
  });

  it('emits a frame summary before capture errors when analysis has started', async () => {
    const { stream, stop } = createMediaStream();
    const audio = createAudioPieces([{ frequency: 440, confidence: 0.95 }]);
    const events: SungNoteCaptureEvent[] = [];

    const result = await captureSungNoteFromMicrophone({
      getUserMedia: vi.fn(async () => stream),
      createAudioContext: () => audio.audioContext,
      detector: {
        detect: vi.fn(() => {
          throw new Error('detector failed');
        })
      },
      maxFrames: 3,
      onEvent: (event) => events.push(event)
    });

    expect(result).toEqual({ status: 'error' });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(audio.close).toHaveBeenCalledTimes(1);
    expect(events.at(-2)).toEqual({
      type: 'pitch_frame_summary',
      attrs: { accepted_frame_count: 0, rejected_frame_count: 0 }
    });
    expect(events.at(-1)).toEqual({ type: 'capture_error', attrs: { captured: false } });
  });
});
