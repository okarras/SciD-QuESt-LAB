export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <a href="#" className="footer-logo">
          <div className="logo-icon" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
            SQ
          </div>
          <span>SciD-QuESt</span>
        </a>

        <nav className="footer-links">
          <a
            href="https://www.npmjs.com/package/@orkg/scidquest"
            target="_blank"
            rel="noreferrer"
          >
            📦 npm
          </a>
          <a
            href="https://gitlab.com/TIBHannover/orkg/scidquest"
            target="_blank"
            rel="noreferrer"
          >
            🦊 GitLab
          </a>
          <a href="https://orkg.org" target="_blank" rel="noreferrer">
            🔬 ORKG
          </a>
          <a
            href="https://www.tib.eu"
            target="_blank"
            rel="noreferrer"
          >
            🏛 TIB Hannover
          </a>
        </nav>
      </div>
      <p className="footer-copy">
        SciD-QuESt — AI-assisted research paper analysis. MIT License.
        <br />
        Part of the{' '}
        <a
          href="https://orkg.org"
          target="_blank"
          rel="noreferrer"
          style={{ color: 'hsl(220 12% 50%)' }}
        >
          Open Research Knowledge Graph (ORKG)
        </a>{' '}
        project by TIB Hannover.
      </p>
    </footer>
  );
}
