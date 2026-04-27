# Technical Feasibility

## Core Hypothesis
A mobile browser can capture microphone audio, estimate one sung pitch, estimate one piano pitch, compare the nearest notes, and show feedback with acceptable latency for practice.

## Recommendation
Build the MVP as microphone-only and monophonic. Use Web Audio API and a lightweight pitch detection library or algorithm. Treat MIDI as a later enhancement because Web MIDI support is not reliable enough for an iPhone-first experience.

## Audio Pipeline
1. Request microphone access with `navigator.mediaDevices.getUserMedia`.
2. Route input into Web Audio API.
3. Read time-domain samples from an `AnalyserNode` for the MVP.
4. Run pitch detection every 30-50 ms.
5. Ignore low-confidence frames.
6. Smooth stable pitch for roughly 100-200 ms.
7. Convert frequency to nearest MIDI note.
8. Compare sung note and piano note by semitone distance.

## Pitch Detection Candidates
- `pitchy`: McLeod Pitch Method, simple browser-friendly API, returns clarity.
- `pitchfinder`: includes YIN and other algorithms, useful for comparison.
- Custom autocorrelation: acceptable for a spike, but avoid productionizing too early.
- CREPE / TensorFlow.js: possible later, likely too heavy for the first mobile MVP.

## Browser APIs
- `MediaDevices.getUserMedia` for microphone access.
- Web Audio API for live audio processing.
- `AnalyserNode.getFloatTimeDomainData()` for simple MVP sample access.
- `AudioWorklet` later if main-thread analysis causes jitter.

## Mobile Constraints
- Microphone access requires HTTPS or localhost.
- iOS Safari must be tested early.
- Chrome on iOS should be treated like Safari/WebKit for practical support expectations.
- Mic input and audio playback can interact strangely on iOS.
- Piano detection through the mic is less reliable than singing because of attack transients, overtones, sustain, and room reflections.

## MIDI Assessment
Web MIDI can work in some browsers, especially Chromium-based desktop and Android environments, but Safari support is the blocker for a mobile-first web app. MIDI belongs on the roadmap as an optional supported-browser mode, not in the MVP.

## Technical Risks
- Octave errors from vocal harmonics or piano overtones.
- Noisy rooms causing unstable pitch detection.
- Multiple simultaneous notes making monophonic pitch detection unreliable.
- Latency or jitter if analysis runs on the main thread under UI load.
- Permission denial or unsupported browser states.

## Spike Plan
- Build a microphone capture spike on iPhone Safari and Android Chrome.
- Test `pitchy` against sustained singing across a comfortable vocal range.
- Test one piano note at a time in a quiet room.
- Measure whether semitone-level feedback is stable enough before tuning cents-level feedback.
- Only move to `AudioWorklet` if the simple pipeline feels laggy or unstable.

## Sources
- MDN `getUserMedia`: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- web.dev microphone processing: https://web.dev/patterns/media/microphone-process
- MDN Web MIDI API: https://developer.mozilla.org/en-US/docs/Web/API/Web_MIDI_API
- Can I use Web MIDI: https://caniuse.com/midi
- pitchy: https://github.com/ianprime0509/pitchy
- pitchfinder: https://github.com/peterkhayes/pitchfinder
