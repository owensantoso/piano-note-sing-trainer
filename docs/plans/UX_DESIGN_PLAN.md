# UX Design Plan

## Design Direction
Use a full-screen pitch practice surface instead of card-based lessons. The phone should feel like a small musical instrument: live, responsive, and focused on one attempt at a time.

## Design Principles
- Mobile-first and thumb-friendly.
- One primary practice surface, not a dashboard.
- Feedback should feel corrective, not punitive.
- Show only one actionable correction at a time.
- Use shape, position, motion, and text; do not rely on color alone.

## Primary Flow
1. Welcome / start.
2. Microphone permission explanation.
3. Sing capture: user sings and holds a note.
4. Piano capture: user plays one piano note.
5. Feedback: match, too high, too low, or unclear.
6. Retry or continue.

## Practice Screen Concept
The main screen is a pitch arena:

- Center: captured sung note once stable.
- Live pitch indicator: moving line, glow, or blob while listening.
- Target relationship: piano note moves toward, lands on, or misses the sung note.
- Bottom control belt: start listening, retry, next, settings.
- Top strip: minimal session context such as attempt count or input state.

## Non-Card Interaction Ideas
- Full-screen pitch arena for live feedback.
- Curved thumb piano or compact keyboard visualization for note distance.
- Vertical pitch lane showing above / below relationship.
- Correct hold animation that stabilizes only when input is confident.
- Breathing microphone halo while listening.

## Feedback Language
Use direct, low-shame language:

- Match: "Matched C4" or "Same note."
- Too high: "Piano was 2 notes higher."
- Too low: "Piano was 1 note lower."
- Unclear: "I could not hear one clear note. Try a quieter room or hold the note longer."

Avoid making misses feel like failure. The goal is calibration.

## Visual Direction Options
The recommended starting direction is Warm Practice Room:

- Cream, walnut, brass, and muted blue.
- Large expressive note typography.
- Soft pitch glow and stable lock-on states.
- Minimal chrome around the practice surface.

Avoid generic purple gradient SaaS, white cards with shadows, and cramped desktop music controls.

## Accessibility
- Large tap targets in the bottom thumb zone.
- Text labels alongside color feedback.
- Reduced-motion mode for pitch animations.
- High contrast for live feedback states.
- Portrait layout as the primary mobile target.

## UX Risks
- Over-animated feedback may make users chase the screen instead of listening.
- Too much music notation may overwhelm beginners.
- A novel keyboard or radial layout may need clear affordances.
- Permission failures need calm recovery copy.
