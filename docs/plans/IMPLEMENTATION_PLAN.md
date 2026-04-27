# Implementation Plan

## Success Criteria
The MVP is complete when a mobile user can sing one note, play one piano note, and receive correct above / below / match feedback based on microphone input.

## Phase 0: App Baseline
- Choose the web framework and local dev setup.
- Establish lint, typecheck, and basic test commands.
- Confirm deployment target supports HTTPS.

Verification:
- App runs locally.
- Basic checks pass.

## Phase 1: Static Mobile Practice UI
- Build the full-screen pitch arena with fake pitch states.
- Add sing, play, feedback, retry, and unclear states.
- Avoid card-based layout as the primary interaction model.

Verification:
- Practice flow can be clicked through on a mobile viewport.
- Controls sit in reachable thumb zones.

## Phase 2: Note Math
- Implement frequency-to-MIDI conversion.
- Implement MIDI-to-note label conversion.
- Implement semitone distance comparison.

Verification:
- Unit tests cover known frequencies and note distances.

## Phase 3: Microphone Capture
- Request microphone permission from a clear user gesture.
- Show listening, denied, unsupported, and no-signal states.
- Keep audio local in the browser.

Verification:
- Mic capture works on localhost and HTTPS preview.
- Denied permission does not trap the user.

## Phase 4: Pitch Detection Spike
- Evaluate `pitchy` first.
- Detect stable sung pitch.
- Detect stable one-note piano pitch.
- Add confidence thresholds and smoothing.

Verification:
- Manual tests pass in a quiet room for sustained singing and one piano note at a time.

## Phase 5: Practice Loop
- Capture sung note as the reference.
- Capture piano note as the response.
- Compare nearest semitones.
- Display match, too high, too low, and unclear feedback.

Verification:
- End-to-end loop works on phone.
- Feedback reports semitone distance correctly.

## Phase 6: Polish and Edge States
- Tune copy and animations.
- Add reduced-motion handling.
- Improve unsupported-browser guidance.
- Add a small session summary only if it does not complicate the loop.

Verification:
- First-time user can complete the loop without extra explanation.
- iPhone Safari and Android Chrome are manually tested.

## Later Enhancements
- Optional Web MIDI input for supported browsers.
- Sampled piano playback or reference tones.
- Cents-level tuning feedback.
- Local practice history.
- Additional exercise modes.
