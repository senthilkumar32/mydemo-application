import { SKILLS, scoreBand } from "../lib/mockParse";
import ScoreMark from "./ScoreMark";

export default function Results({ fileName, result, onReset }) {
  const { score, present, missing } = result;
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

      <div className="skill-group">
        <h4>Found in your resume <span className="tally">{present.length} of {SKILLS.length}</span></h4>
        <ul className="skill-list">
          {present.map((skill, i) => (
            <li key={skill}>
              <mark className="hl" style={{ "--d": `${0.5 + i * 0.06}s` }}>{skill}</mark>
            </li>
          ))}
        </ul>
      </div>

      <div className="skill-group">
        <h4>Worth adding <span className="tally">{missing.length}</span></h4>
        <ul className="skill-list missing-list">
          {missing.map((skill) => (
            <li key={skill} className="insert">{skill}</li>
          ))}
        </ul>
      </div>

      <button className="btn btn-quiet" onClick={onReset}>Check another resume</button>
    </div>
  );
}
