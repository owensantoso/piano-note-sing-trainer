# 0001: MVP Audio Input Strategy

## Status
Accepted

## Decision
The MVP uses microphone-only input. The user sings one note, then plays one piano note, and both pitches are detected from the microphone.

Web MIDI is a later optional enhancement for supported browsers and devices.

## Context
The app is mobile-first, and iPhone Safari is an important target. Web MIDI can work in some browser/device combinations, but support is not dependable enough for the core mobile MVP.

Microphone-only input keeps the first version hardware-free and validates the main learning loop before adding device-specific paths.

## Consequences
- The first pitch-detection pipeline must handle singing and one piano note at a time.
- The MVP must not claim chord detection or reliable polyphonic transcription.
- Audio confidence and unclear-input states are required.
- MIDI can be explored later without blocking the first usable app.
