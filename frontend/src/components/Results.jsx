import { scoreBand } from "../lib/analysis";
import ScoreMark from "./ScoreMark";

export default function Results({ result, onReset }) {
  const { fileName, score, present, missing } = result;
  const total = present.length + missing.length;
  const band = scoreBand(score);

  return (
    <div className="sheet results">
      <div className="results-top">
        <div>
          <p className="results-file">{fileName}</p>
          <h3 className="verdict">{band.label}</h3>
          <p className="verdict-summary">{band.summary}</p>
        </div>
        <ScoreMark score={score} delay={0.2} />
      </div>

      {present.length > 0 && (
        <div className="skill-group">
          <h4>Skills you already show <span className="tally">{present.length} of {total} the job asks for</span></h4>
          <ul className="skill-list">
            {present.map((skill, i) => (
              <li key={skill}>
                <mark className="hl" style={{ "--d": `${0.5 + i * 0.06}s` }}>{skill}</mark>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="skill-group">
          <h4>Skills to add <span className="tally">{missing.length} of {total}</span></h4>
          <ul className="skill-list missing-list">
            {missing.map((skill) => (
              <li key={skill} className="insert">{skill}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn btn-quiet" onClick={onReset}>Check another resume</button>
    </div>
  );
}
