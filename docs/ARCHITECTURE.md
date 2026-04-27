# Architecture

Keep this short. For a tiny project, this file should answer:

- What are the main parts?
- Where does state live?
- What external systems does this touch?
- What decisions should future agents preserve?

## Planned Shape
- Mobile web app.
- Local browser audio pipeline using microphone input and Web Audio API.
- Client-side pitch detection and note comparison.
- No server-side audio processing for the MVP.

## State
MVP state should stay local to the browser session unless a later feature needs persistence.

## External Systems
- Browser microphone permission via `getUserMedia`.
- Web Audio API for audio analysis.

## Decisions To Preserve
- MVP is microphone-only.
- MVP loop is sing first, then play one matching piano note.
- MIDI is a later optional enhancement, not a core dependency.
