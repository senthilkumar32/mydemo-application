import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-row">
        <Logo />
        <p>Scores come from keyword matching for now. AI review is on the way.</p>
      </div>
    </footer>
  );
}
