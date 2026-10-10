// A reviewer's handwritten score, circled in red pen.
export default function ScoreMark({ score, note, delay = 0 }) {
  return (
    <div className="score-mark" style={{ "--d": `${delay}s` }}>
      <p className="visually-hidden">Score: {score} out of 100. {note}</p>
      <svg className="score-circle" viewBox="0 0 140 90" aria-hidden="true">
        <path d="M80 9 C42 3 7 17 8 45 C9 72 52 85 95 76 C130 68 137 35 112 19 C97 10 78 8 60 14" pathLength="1" />
      </svg>
      <span className="score-num" aria-hidden="true">{score}</span>
      {note && <span className="score-note" aria-hidden="true">{note}</span>}
    </div>
  );
}
