import SiteLogo from './SiteLogo';
import SciDQuEStName from './SciDQuEStName';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <a href="#" className="footer-logo">
          <SiteLogo variant="footer" />
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
          <a
            href="https://empire-compass.tib.eu/R186491/team"
            target="_blank"
            rel="noreferrer"
          >
            🧭 EmpiRE-Compass
          </a>
        </nav>
      </div>
      <p className="footer-copy">
        <SciDQuEStName variant="footer" /> — AI-assisted research paper analysis. MIT License.
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
