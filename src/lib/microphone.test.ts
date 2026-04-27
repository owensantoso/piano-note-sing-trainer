import { describe, expect, it, vi } from 'vitest';
import {
  checkMicrophoneSupport,
  microphoneAudioConstraints,
  requestMicrophonePermission
} from './microphone';

describe('microphone browser support', () => {
  it('reports unsupported when mediaDevices is missing', () => {
    expect(checkMicrophoneSupport({})).toEqual({
      supported: false,
      hasMediaDevices: false,
      hasGetUserMedia: false
    });
  });

  it('reports unsupported when getUserMedia is missing', () => {
    expect(checkMicrophoneSupport({ mediaDevices: {} })).toEqual({
      supported: false,
      hasMediaDevices: true,
      hasGetUserMedia: false
    });
  });

  it('reports supported when getUserMedia is available', () => {
    expect(
      checkMicrophoneSupport({
        mediaDevices: { getUserMedia: vi.fn() }
      })
    ).toEqual({
      supported: true,
      hasMediaDevices: true,
      hasGetUserMedia: true
    });
  });
});

describe('microphone permission request', () => {

  it('does not grant permission when getUserMedia is unavailable', async () => {
    await expect(requestMicrophonePermission({ mediaDevices: {} })).resolves.toEqual({
      granted: false,
      denied: false,
      stoppedTrackCount: 0
    });
  });

  it('requests raw microphone constraints and immediately stops granted tracks', async () => {
    const stop = vi.fn();
    const getTracks = vi.fn(() => [{ stop }, { stop }]);
    const getUserMedia = vi.fn(async () => ({ getTracks }) as unknown as MediaStream);

    const result = await requestMicrophonePermission({
      mediaDevices: { getUserMedia }
    });

    expect(getUserMedia).toHaveBeenCalledWith(microphoneAudioConstraints);
    expect(stop).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      granted: true,
      denied: false,
      stoppedTrackCount: 2
    });
  });

  it('reports denied permission without exposing raw error content', async () => {
    const getUserMedia = vi.fn(async () => {
      throw new DOMException('permission copy should not be surfaced', 'NotAllowedError');
    });

    await expect(
      requestMicrophonePermission({ mediaDevices: { getUserMedia } })
    ).resolves.toEqual({
      granted: false,
      denied: true,
      stoppedTrackCount: 0
    });
  });
});
