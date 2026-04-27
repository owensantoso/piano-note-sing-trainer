import { midiToNoteLabel } from './lib/noteMath';

const previewTargetNote = midiToNoteLabel(60);

export function App() {
  return (
    <main className="app-shell" aria-labelledby="app-title">
      <section className="hero-panel" aria-label="Practice preview">
        <p className="eyebrow">Sing first, then play</p>
        <h1 id="app-title">Find the note you hear inside.</h1>
        <p className="intro">
          A mic-only practice loop for singing one note, playing one piano note, and learning whether the piano landed high, low, or right on target.
        </p>

        <div className="pitch-arena" aria-label="Pitch arena preview">
          <div className="pitch-lane" aria-hidden="true">
            <span className="pitch-line pitch-line-high" />
            <span className="pitch-line pitch-line-target" />
            <span className="pitch-line pitch-line-low" />
          </div>
          <div className="note-orb">
            <span className="note-label">{previewTargetNote}</span>
            <span className="note-caption">Target note preview</span>
          </div>
        </div>
      </section>

      <section className="control-belt" aria-label="Practice controls">
        <button className="primary-action" type="button">Start practice</button>
        <p className="microcopy">Microphone capture is coming next. No audio is recorded in this baseline.</p>
      </section>
    </main>
  );
}
