import ScoreMark from "./ScoreMark";

// A sample resume, marked up the way the results will be.
function SampleSheet() {
  return (
    <figure className="sheet sample" role="img" aria-label="Example resume with React, TypeScript and Node.js highlighted, Docker and AWS noted as missing, and a score of 78.">
      <div className="doc-top">
        <div>
          <p className="doc-name">Jordan Lee</p>
          <p className="doc-role">Frontend developer, Austin TX</p>
        </div>
        <ScoreMark score={78} note="almost there" delay={1.5} />
      </div>

      <p className="doc-heading">Experience</p>
      <p className="doc-job"><strong>Frontend developer</strong>, Brightline Labs <span className="doc-dates">2022 to now</span></p>
      <ul className="doc-list">
        <li>Rebuilt the checkout in <mark className="hl" style={{ "--d": "0.3s" }}>React</mark> and <mark className="hl" style={{ "--d": "0.55s" }}>TypeScript</mark>, cutting load time by 40%.</li>
        <li>Built a <mark className="hl" style={{ "--d": "0.8s" }}>Node.js</mark> order-tracking service used by 30,000 customers.</li>
        <li>Ran weekly code reviews for a team of five.</li>
      </ul>

      <p className="doc-heading">Skills</p>
      <p className="doc-skills">
        React, TypeScript, Node.js, HTML/CSS, Git, REST APIs
        <span className="pen-note" style={{ "--d": "1.1s" }}>add Docker, AWS?</span>
      </p>
    </figure>
  );
}

export default function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>See your resume the way a recruiter does.</h1>
          <p className="lead">Drop in your PDF and we mark it up like a reviewer would: the skills that stand out, the ones you're missing, and a score out of 100.</p>
          <a href="#check" className="btn btn-light">Check my resume</a>
          <p className="fine-print">Free to use, no account needed. Your file stays in this browser.</p>
        </div>
        <SampleSheet />
      </div>
    </section>
  );
}
