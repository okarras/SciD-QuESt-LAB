import SiteLogo from './SiteLogo';

interface HeaderProps {
  onTryDemo: () => void;
}

export default function Header({ onTryDemo }: HeaderProps) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a href="#" className="logo">
          <SiteLogo variant="header" />
        </a>
        <nav className="header-nav">
          <a href="#features" className="header-link">
            <span>Features</span>
          </a>
          <a href="#how-it-works" className="header-link">
            <span>Architecture</span>
          </a>
          <a href="#code" className="header-link">
            <span>Quick Start</span>
          </a>
          <button
            onClick={onTryDemo}
            className="header-link"
            style={{ background: 'none', border: 'none', font: 'inherit', cursor: 'pointer' }}
          >
            <span>Demo</span>
          </button>
          <a href="#api" className="header-link">
            <span>API</span>
          </a>
          <a
            href="https://www.npmjs.com/package/@orkg/scidquest"
            target="_blank"
            rel="noreferrer"
            className="header-link header-link--npm"
          >
            📦 <span>npm</span>
          </a>
          <a
            href="https://gitlab.com/TIBHannover/orkg/scidquest"
            target="_blank"
            rel="noreferrer"
            className="header-link"
          >
            🦊 <span>GitLab</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
