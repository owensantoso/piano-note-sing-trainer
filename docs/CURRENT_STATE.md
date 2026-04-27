# Current State

What is true today?

## Built
- Documentation scaffold only.
- No application code yet.

## Important Paths
- `docs/decisions/0001-mvp-audio-input-strategy.md` - accepted MVP audio input decision.
- `docs/plans/PRODUCT_BRIEF.md` - MVP product scope.
- `docs/plans/UX_DESIGN_PLAN.md` - mobile-first design direction.
- `docs/plans/TECHNICAL_FEASIBILITY.md` - audio and browser feasibility notes.
- `docs/plans/IMPLEMENTATION_PLAN.md` - phased build plan.
- `docs/plans/TESTING_VALIDATION_PLAN.md` - verification plan.

## Current Decisions
- MVP is microphone-only.
- MVP practice loop is sing first, then play the matching piano note.
- Piano input is one note at a time through the microphone.
- MIDI is a later enhancement because Web MIDI is not reliable enough for an iPhone-first MVP.
- The primary UI should feel like a full-screen practice instrument, not a stack of cards.

## Current Risks
- Mobile browser audio quirks, especially iOS Safari.
- Pitch detection instability in noisy rooms.
- Piano overtones causing octave or note errors.
- Novel UI patterns becoming confusing if affordances are weak.

## Next Best Step
Create a small app baseline and run a microphone pitch-detection spike on real phones before investing in polish.
