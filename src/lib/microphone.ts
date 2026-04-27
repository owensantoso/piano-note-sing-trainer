export const microphoneAudioConstraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false
  }
};

type MicrophoneNavigator = {
  mediaDevices?: Partial<Pick<MediaDevices, 'getUserMedia'>>;
};

export interface MicrophoneSupportResult {
  supported: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
}

export interface MicrophonePermissionResult {
  granted: boolean;
  denied: boolean;
  stoppedTrackCount: number;
}

export function getBrowserMicrophoneNavigator(): MicrophoneNavigator {
  if (typeof navigator === 'undefined') {
    return {};
  }

  return navigator;
}

export function checkMicrophoneSupport(target: MicrophoneNavigator = getBrowserMicrophoneNavigator()): MicrophoneSupportResult {
  const hasMediaDevices = Boolean(target.mediaDevices);
  const hasGetUserMedia = typeof target.mediaDevices?.getUserMedia === 'function';

  return {
    supported: hasMediaDevices && hasGetUserMedia,
    hasMediaDevices,
    hasGetUserMedia
  };
}

function isDeniedMicrophoneError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'SecurityError')
  );
}

export async function requestMicrophonePermission(
  target: MicrophoneNavigator = getBrowserMicrophoneNavigator()
): Promise<MicrophonePermissionResult> {
  if (typeof target.mediaDevices?.getUserMedia !== 'function') {
    return {
      granted: false,
      denied: false,
      stoppedTrackCount: 0
    };
  }

  try {
    const stream = await target.mediaDevices.getUserMedia(microphoneAudioConstraints);
    const tracks = stream?.getTracks() ?? [];

    tracks.forEach((track) => track.stop());

    return {
      granted: true,
      denied: false,
      stoppedTrackCount: tracks.length
    };
  } catch (error) {
    return {
      granted: false,
      denied: isDeniedMicrophoneError(error),
      stoppedTrackCount: 0
    };
  }
}
