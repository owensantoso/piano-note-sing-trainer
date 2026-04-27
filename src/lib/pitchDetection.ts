import { microphoneAudioConstraints } from './microphone';
import { frequencyToMidi, midiToNoteLabel } from './noteMath';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export type PitchDetectionResult = {
  frequency: number;
  confidence: number;
} | null;

export type PitchDetector = {
  detect(frame: Float32Array, sampleRate: number): PitchDetectionResult;
};

export type StablePitchCaptureResult =
  | { status: 'collecting' }
  | {
      status: 'captured';
      midiNote: number;
      noteLabel: string;
      acceptedFrameCount: number;
      rejectedFrameCount: number;
    };

export type SungNoteCaptureResult =
  | { status: 'captured'; midiNote: number; noteLabel: string }
  | { status: 'unclear' }
  | { status: 'timeout' }
  | { status: 'error' };

export type SungNoteCaptureEventType =
  | 'capture_start'
  | 'stream_opened'
  | 'audio_context_created'
  | 'pitch_frame_summary'
  | 'capture_finished'
  | 'capture_unclear'
  | 'capture_timeout'
  | 'capture_error';

export type SungNoteCaptureEvent = {
  type: SungNoteCaptureEventType;
  attrs: Record<string, number | boolean | null>;
};

type AudioContextLike = Pick<AudioContext, 'sampleRate' | 'createAnalyser' | 'createMediaStreamSource'> &
  Partial<Pick<AudioContext, 'close' | 'suspend'>>;

export type CaptureSungNoteOptions = {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  createAudioContext?: () => AudioContextLike;
  detector?: PitchDetector;
  minConfidence?: number;
  stableFrameCount?: number;
  maxFrames?: number;
  maxCaptureMs?: number;
  now?: () => number;
  waitForNextFrame?: () => Promise<void>;
  onEvent?: (event: SungNoteCaptureEvent) => void;
};

const DEFAULT_MIN_CONFIDENCE = 0.8;
const DEFAULT_STABLE_FRAME_COUNT = 3;
const DEFAULT_MAX_FRAMES = 48;
const DEFAULT_MAX_CAPTURE_MS = 2_000;

export function createStablePitchCapture({
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  stableFrameCount = DEFAULT_STABLE_FRAME_COUNT
}: {
  minConfidence?: number;
  stableFrameCount?: number;
} = {}) {
  let candidateMidiNote: number | null = null;
  let candidateFrameCount = 0;
  let acceptedFrameCount = 0;
  let rejectedFrameCount = 0;

  function addFrame(result: PitchDetectionResult): StablePitchCaptureResult {
    if (!result || result.confidence < minConfidence || result.frequency <= 0) {
      rejectedFrameCount += 1;
      candidateMidiNote = null;
      candidateFrameCount = 0;
      return { status: 'collecting' };
    }

    const midiNote = frequencyToMidi(result.frequency);
    acceptedFrameCount += 1;

    if (midiNote === candidateMidiNote) {
      candidateFrameCount += 1;
    } else {
      candidateMidiNote = midiNote;
      candidateFrameCount = 1;
    }

    if (candidateFrameCount < stableFrameCount) {
      return { status: 'collecting' };
    }

    return {
      status: 'captured',
      midiNote,
      noteLabel: midiToNoteLabel(midiNote),
      acceptedFrameCount,
      rejectedFrameCount
    };
  }

  function getSummary() {
    return { acceptedFrameCount, rejectedFrameCount };
  }

  return { addFrame, getSummary };
}

export function createAutocorrelationPitchDetector({
  minFrequency = 80,
  maxFrequency = 1_000
}: {
  minFrequency?: number;
  maxFrequency?: number;
} = {}): PitchDetector {
  return {
    detect(frame: Float32Array, sampleRate: number): PitchDetectionResult {
      let rms = 0;

      for (let index = 0; index < frame.length; index += 1) {
        rms += frame[index] * frame[index];
      }

      rms = Math.sqrt(rms / frame.length);

      if (rms < 0.01) {
        return null;
      }

      const minLag = Math.max(1, Math.floor(sampleRate / maxFrequency));
      const maxLag = Math.min(frame.length - 1, Math.ceil(sampleRate / minFrequency));
      let bestLag = 0;
      let bestCorrelation = 0;
      const correlations: number[] = [];

      for (let lag = minLag; lag <= maxLag; lag += 1) {
        let correlation = 0;
        let energy = 0;
        const sampleCount = frame.length - lag;

        for (let index = 0; index < sampleCount; index += 1) {
          correlation += frame[index] * frame[index + lag];
          energy += frame[index] * frame[index] + frame[index + lag] * frame[index + lag];
        }

        const normalizedCorrelation = energy > 0 ? (2 * correlation) / energy : 0;

        correlations[lag] = normalizedCorrelation;

        if (normalizedCorrelation > bestCorrelation) {
          bestCorrelation = normalizedCorrelation;
          bestLag = lag;
        }
      }

      for (let lag = minLag + 1; lag < maxLag; lag += 1) {
        const correlation = correlations[lag] ?? 0;

        if (
          correlation >= 0.8 &&
          correlation >= (correlations[lag - 1] ?? 0) &&
          correlation >= (correlations[lag + 1] ?? 0)
        ) {
          bestLag = lag;
          bestCorrelation = correlation;
          break;
        }
      }

      if (bestLag === 0 || bestCorrelation < 0.3) {
        return null;
      }

      return {
        frequency: sampleRate / bestLag,
        confidence: Math.max(0, Math.min(1, bestCorrelation))
      };
    }
  };
}

function getDefaultAudioContext(): AudioContextLike {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

  return new AudioContextConstructor();
}

function defaultWaitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }

    window.setTimeout(resolve, 16);
  });
}

async function closeAudioContext(audioContext: AudioContextLike | null) {
  if (!audioContext) {
    return;
  }

  if (typeof audioContext.close === 'function') {
    await audioContext.close().catch(() => undefined);
    return;
  }

  await audioContext.suspend?.().catch(() => undefined);
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function captureSungNoteFromMicrophone({
  getUserMedia = (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createAudioContext = getDefaultAudioContext,
  detector = createAutocorrelationPitchDetector(),
  minConfidence = DEFAULT_MIN_CONFIDENCE,
  stableFrameCount = DEFAULT_STABLE_FRAME_COUNT,
  maxFrames = DEFAULT_MAX_FRAMES,
  maxCaptureMs = DEFAULT_MAX_CAPTURE_MS,
  now = () => performance.now(),
  waitForNextFrame = defaultWaitForNextFrame,
  onEvent
}: CaptureSungNoteOptions = {}): Promise<SungNoteCaptureResult> {
  let stream: MediaStream | null = null;
  let audioContext: AudioContextLike | null = null;
  let latestSummary = { acceptedFrameCount: 0, rejectedFrameCount: 0 };
  const startedAt = now();

  onEvent?.({ type: 'capture_start', attrs: { max_frames: maxFrames, stable_frame_count: stableFrameCount } });

  try {
    stream = await getUserMedia(microphoneAudioConstraints);
    onEvent?.({ type: 'stream_opened', attrs: { track_count: stream.getTracks().length } });

    audioContext = createAudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    onEvent?.({
      type: 'audio_context_created',
      attrs: { sample_rate: audioContext.sampleRate, fft_size: analyser.fftSize }
    });

    const buffer = new Float32Array(analyser.fftSize);
    const stableCapture = createStablePitchCapture({ minConfidence, stableFrameCount });

    for (let frame = 0; frame < maxFrames; frame += 1) {
      if (now() - startedAt >= maxCaptureMs) {
        const summary = stableCapture.getSummary();
        latestSummary = summary;
        onEvent?.({
          type: 'pitch_frame_summary',
          attrs: {
            accepted_frame_count: summary.acceptedFrameCount,
            rejected_frame_count: summary.rejectedFrameCount
          }
        });
        onEvent?.({ type: 'capture_timeout', attrs: { timed_out: true } });
        return { status: 'timeout' };
      }

      analyser.getFloatTimeDomainData(buffer);
      const result = stableCapture.addFrame(detector.detect(buffer, audioContext.sampleRate));

      latestSummary = stableCapture.getSummary();

      if (result.status === 'captured') {
        onEvent?.({
          type: 'pitch_frame_summary',
          attrs: {
            accepted_frame_count: result.acceptedFrameCount,
            rejected_frame_count: result.rejectedFrameCount
          }
        });
        onEvent?.({
          type: 'capture_finished',
          attrs: { captured: true, midi_note: result.midiNote, timed_out: false }
        });

        return { status: 'captured', midiNote: result.midiNote, noteLabel: result.noteLabel };
      }

      await waitForNextFrame();
    }

    const summary = stableCapture.getSummary();
    latestSummary = summary;
    onEvent?.({
      type: 'pitch_frame_summary',
      attrs: {
        accepted_frame_count: summary.acceptedFrameCount,
        rejected_frame_count: summary.rejectedFrameCount
      }
    });
    onEvent?.({
      type: 'capture_unclear',
      attrs: {
        accepted_frame_count: summary.acceptedFrameCount,
        rejected_frame_count: summary.rejectedFrameCount,
        timed_out: false
      }
    });

    return { status: 'unclear' };
  } catch {
    onEvent?.({
      type: 'pitch_frame_summary',
      attrs: {
        accepted_frame_count: latestSummary.acceptedFrameCount,
        rejected_frame_count: latestSummary.rejectedFrameCount
      }
    });
    onEvent?.({ type: 'capture_error', attrs: { captured: false } });
    return { status: 'error' };
  } finally {
    stopStream(stream);
    await closeAudioContext(audioContext);
  }
}
