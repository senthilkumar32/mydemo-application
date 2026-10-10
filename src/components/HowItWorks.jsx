import { SKILLS } from "../lib/mockParse";

const STEPS = [
  "Drop in your resume as a PDF.",
  `We read it and match it against the ${SKILLS.length} skills on the right.`,
  "You get a score out of 100 and a list of gaps to fill before you apply.",
];

export default function HowItWorks() {
  return (
    <section id="how" className="how">
      <div className="container how-grid">
        <div>
          <h2>How it works</h2>
          <ol className="how-steps">
            {STEPS.map((text) => <li key={text}>{text}</li>)}
          </ol>
          <a href="#check" className="btn">Check my resume</a>
        </div>
        <div>
          <h3 className="skills-title">The {SKILLS.length} skills we look for</h3>
          <ul className="skills-index">
            {SKILLS.map((skill) => <li key={skill}>{skill}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
