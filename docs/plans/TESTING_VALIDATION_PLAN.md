# Testing and Validation Plan

## Validation Goals
- Prove the core voice-to-piano loop works on mobile.
- Prove feedback is useful without overclaiming audio accuracy.
- Prove the interface is understandable without a tutorial-heavy flow.

## Automated Tests
- Frequency to MIDI note conversion.
- MIDI note to label conversion.
- Semitone distance calculation.
- Feedback state selection.
- Permission and unsupported-browser state helpers where possible.

## Manual Device Matrix
- iPhone Safari.
- Android Chrome.
- Desktop Chrome for development.
- Desktop Safari if available.

## Audio Test Cases
- Sustained sung note in a quiet room.
- Short sung note that should be rejected as unclear.
- One piano note at a time in a quiet room.
- Piano note with sustain pedal or ringing decay.
- Background noise.
- Low and high vocal ranges.
- Phone near and far from piano.

## UX Validation
Ask a first-time user to complete one attempt without coaching.

Observe:
- Do they understand to sing first?
- Do they understand when the app is listening?
- Do they understand the feedback?
- Can they recover from unclear input?
- Do they feel corrected or judged?

## Acceptance Criteria
- Core loop works in a quiet room on at least one iPhone and one Android phone.
- The app does not claim a note when confidence is low.
- Above / below / match feedback is correct for known test notes.
- The main interface remains usable on a small mobile viewport.

## Known Hard-to-Automate Areas
- Real microphone behavior.
- Room acoustics.
- Piano timbre differences.
- iOS Safari audio routing quirks.
- User confidence and practice feel.
