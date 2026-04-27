# Product Brief

## Problem
A musician can sing or imagine a note, but cannot yet find that same note on piano quickly and confidently.

## Target User
The MVP is for a self-directed music learner practicing voice-to-instrument mapping on a phone. They may be a beginner or intermediate singer/piano learner, but they should already have access to a piano or keyboard.

## MVP Goal
Help the user sing a single note, play the matching single note on piano, and receive immediate feedback on whether the piano note matched, was too high, or was too low.

## Core Use Case
1. User starts a practice session on mobile.
2. User sings one sustained note.
3. App detects and stores the sung pitch.
4. User plays one piano note.
5. App detects the piano pitch through the microphone.
6. App compares both notes and says whether the piano note matched, was above, or was below, including distance in semitones.

## MVP Features
- Mobile-first practice screen.
- Microphone permission onboarding.
- Sing-first pitch capture.
- One-note piano input captured through the same microphone.
- Note comparison by nearest semitone.
- Feedback for correct, too high, too low, and unclear input.
- Simple retry / next attempt loop.

## Non-Goals
- Chord detection.
- Polyphonic piano transcription.
- MIDI input in the MVP.
- Accounts, cloud sync, teacher dashboards, or long-term progress tracking.
- Full music theory curriculum.
- Native app behavior.

## Success Criteria
- A user can complete the core loop on a phone in under one minute.
- The app gives useful feedback for one sung note and one piano note in a quiet room.
- The app handles unclear or noisy input without pretending it knows the answer.
- The interface feels like a practice instrument, not a dashboard of cards.

## Resolved Decisions
- MVP is microphone-only.
- MVP exercise model is sing first, then play the matching piano note.
- MIDI is a later roadmap enhancement, not a dependency.

## Open Questions
- What note range should the first version accept for singing and piano?
- Should correctness be exact semitone match only, or should cents tolerance matter in the first version?
- Should the app name notes using letters, solfege, keyboard position, or a combination?
