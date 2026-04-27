# Piano Note Sing Trainer

Mobile-first web app for practicing voice-to-piano note matching.

The MVP goal is simple: sing one note, play the matching single note on piano, and get immediate feedback about whether the piano note matched, was too high, or was too low.

## Current Status

This repo currently contains:

- Product, UX, technical, implementation, and validation planning docs.
- A Vite + React + TypeScript app baseline.
- A mobile-first static practice preview.
- Test-first note math utilities for frequency, MIDI note labels, and semitone feedback.
- GitHub Pages deployment workflow.

Microphone capture and pitch detection are intentionally not implemented yet.

## Local Development

```bash
npm install
npm test
npm run build
npm run dev
```

If the Codex desktop shell picks up its bundled Node before Homebrew Node on macOS, use:

```bash
PATH="/opt/homebrew/bin:$PATH" npm test
PATH="/opt/homebrew/bin:$PATH" npm run build
```

## Key Docs

- [Current State](docs/CURRENT_STATE.md)
- [Product Brief](docs/plans/PRODUCT_BRIEF.md)
- [UX Design Plan](docs/plans/UX_DESIGN_PLAN.md)
- [Technical Feasibility](docs/plans/TECHNICAL_FEASIBILITY.md)
- [Implementation Plan](docs/plans/IMPLEMENTATION_PLAN.md)
- [Testing and Validation Plan](docs/plans/TESTING_VALIDATION_PLAN.md)
- [MVP Audio Input Decision](docs/decisions/0001-mvp-audio-input-strategy.md)
