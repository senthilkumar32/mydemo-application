// Names that are also everyday words ("let go", "express interest", "spring 2025")
// only count when written with this exact capitalisation. Their aliases still
// match in any case.
const CASE_SENSITIVE = new Set(["Go", "Express", "Swift", "Spring", "Rust", "Ruby"]);

// Skills the keyword engine recognises. Each entry is the display name plus
// the other ways people write it. Matching ignores case unless noted above.
export const SKILLS = [
  // Languages
  ["JavaScript", "js", "ecmascript", "es6"],
  ["TypeScript", "ts"],
  ["Python"],
  ["Java"],
  ["C#", "csharp", "c sharp"],
  ["C++", "cpp"],
  ["Go", "golang"],
  ["Rust"],
  ["Ruby"],
  ["PHP"],
  ["Kotlin"],
  ["Swift"],
  ["SQL"],
  ["HTML/CSS", "html", "css", "html5", "css3"],
  // Frontend
  ["React", "react.js", "reactjs"],
  ["Next.js", "nextjs"],
  ["Vue", "vue.js", "vuejs"],
  ["Angular"],
  ["Redux"],
  ["Tailwind CSS", "tailwind"],
  // Backend
  ["Node.js", "node", "nodejs"],
  ["Express", "express.js", "expressjs"],
  ["Django"],
  ["Flask"],
  ["FastAPI"],
  ["Spring", "spring boot"],
  [".NET", "dotnet", "asp.net"],
  ["REST APIs", "restful", "rest api", "rest apis"],
  ["GraphQL"],
  ["Microservices", "microservice"],
  // Data
  ["MongoDB", "mongo", "mongoose"],
  ["PostgreSQL", "postgres"],
  ["MySQL"],
  ["Redis"],
  ["Elasticsearch"],
  ["Kafka"],
  // Cloud & ops
  ["AWS", "amazon web services"],
  ["Azure"],
  ["GCP", "google cloud"],
  ["Docker", "containers"],
  ["Kubernetes", "k8s"],
  ["Terraform"],
  ["CI/CD", "ci", "continuous integration", "github actions", "jenkins"],
  ["Linux"],
  ["Git", "github", "gitlab"],
  // Practice
  ["Testing", "unit testing", "jest", "cypress", "playwright", "tdd"],
  ["System Design", "distributed systems", "scalability"],
  ["Agile", "scrum", "kanban"],
  ["Machine Learning", "ml", "deep learning"],
  ["Data Structures", "algorithms"],
  ["Security", "owasp", "oauth"],
  // People
  ["Communication", "communicate", "communicating"],
  ["Leadership", "mentoring", "mentor", "led a team"],
  ["Collaboration", "cross-functional", "teamwork"],
  ["Problem Solving", "problem-solving"],
].map(([name, ...aliases]) => ({ name, aliases, exactName: CASE_SENSITIVE.has(name) }));
