import { useAuth } from "../auth/AuthContext";
import Logo from "./Logo";

export default function Header() {
  const { user, openAuth, signOut } = useAuth();

  return (
    <header className="site-header">
      <div className="container header-row">
        <Logo />
        <nav className="header-nav">
          <a href="#how" className="nav-link hide-mobile">How it works</a>
          {user ? (
            <div className="account">
              <span className="avatar" aria-hidden="true">{user.name.charAt(0).toUpperCase()}</span>
              <span className="account-name hide-mobile">{user.name}</span>
              <button type="button" className="nav-link link-button" onClick={signOut}>Sign out</button>
            </div>
          ) : (
            <>
              <button type="button" className="nav-link link-button" onClick={() => openAuth("signin")}>Sign in</button>
              <button type="button" className="btn btn-small btn-light" onClick={() => openAuth("signup")}>Create account</button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
