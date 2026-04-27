# Current State

What is true today?

## Built
- Public GitHub repository exists at `https://github.com/owensantoso/piano-note-sing-trainer`.
- Documentation scaffold and MVP planning docs exist.
- Vite + React + TypeScript app baseline exists.
- Mobile-first static practice preview exists.
- Test-first note math utilities exist for frequency-to-MIDI, MIDI note labels, and semitone distance feedback.
- Test-first practice flow helpers exist for the voice-first microphone spike.
- The start path performs browser microphone support detection and requests microphone permission when available.
- The microphone permission slice stops granted media tracks immediately after permission probing.
- After permission succeeds, the UI automatically starts a rolling monophonic sung-note listener using a microphone stream, Web Audio `AnalyserNode`, an MVP autocorrelation pitch detector, and stable MIDI-note frame reduction.
- Capture keeps listening for a longer default window, resumes suspended mobile audio contexts when possible, and distinguishes unclear input, timeout, and microphone/audio failure states in the UI.
- Sung-note capture stops media tracks and closes or suspends the audio context after captured, unclear, timeout, or error outcomes.
- After sung-note capture succeeds, the UI automatically rolls into listening for one piano note through the same microphone capture path.
- The practice loop compares sung MIDI to played piano MIDI and shows match, higher, lower, or unclear feedback with semitone distance.
- Browser-safe diagnostics foundation exists with structured redacted JSONL export from the UI.
- Sung-note capture, piano-note capture, and piano comparison diagnostics exist with safe numeric/boolean-only attributes.
- GitHub Pages deployment workflow exists.

## Important Paths
- `README.md` - public repo overview and local commands.
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow.
- `src/App.tsx` - static mobile practice preview.
- `src/App.test.tsx` - UI state preview test.
- `src/lib/noteMath.ts` - note math utilities.
- `src/lib/noteMath.test.ts` - note math tests.
- `src/lib/practiceFlow.ts` - voice-first practice state helpers.
- `src/lib/practiceFlow.test.ts` - practice flow tests.
- `src/lib/diagnostics.ts` - structured diagnostics event recorder and JSONL export helper.
- `src/lib/diagnostics.test.ts` - diagnostics event shape and export tests.
- `src/lib/pitchDetection.ts` - sung-note pitch detector, stable capture reducer, and microphone/Web Audio capture coordinator.
- `src/lib/pitchDetection.test.ts` - pitch detector, stable capture, and mocked Web Audio coordinator tests.
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
- The app is configured for GitHub Pages project hosting at `/piano-note-sing-trainer/`.

## Current Risks
- Mobile browser audio quirks, especially iOS Safari.
- Pitch detection instability in noisy rooms; the current detector is an MVP autocorrelation implementation.
- Piano overtones causing octave or note errors.
- Novel UI patterns becoming confusing if affordances are weak.
- Local Codex shell may need Homebrew Node first in `PATH` for Vite/Rollup native bindings.

## Next Best Step
Manually verify the full sing-then-piano microphone loop on real phones in quiet and moderately noisy rooms.
