const STEPS = [
  "Drop in your resume as a PDF.",
  "Paste the job description you're applying for.",
  "We pick out the skills the job asks for and check your resume for each one.",
  "You get a score out of 100 and a list of gaps to fill before you apply.",
];

// Broad groups the skill matcher covers (the full list lives on the server).
const SKILL_GROUPS = [
  "Languages, like Python, Java and TypeScript",
  "Frontend, like React, Vue and Next.js",
  "Backend, like Node.js, Django and Spring",
  "Databases, like PostgreSQL and MongoDB",
  "Cloud and DevOps, like AWS, Docker and CI/CD",
  "Practices, like testing, Agile and system design",
  "People skills, like communication and leadership",
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
          <h3 className="skills-title">What we look for</h3>
          <ul className="skills-groups">
            {SKILL_GROUPS.map((group) => <li key={group}>{group}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
