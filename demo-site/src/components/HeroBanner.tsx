import SciDQuEStName from './SciDQuEStName';

interface HeroBannerProps {
  onTryDemo: () => void;
}

export default function HeroBanner({ onTryDemo }: HeroBannerProps) {
  return (
    <section className="hero-banner" aria-label="Introduction">
      <div className="hero-banner__grid" aria-hidden="true" />
      <div className="hero-banner__inner">
        <div className="hero-banner__copy">
          <p className="hero-banner__eyebrow fade-in">AI-Assisted Research Paper Analysis</p>
          <div className="hero-banner__brand fade-in fade-in-delay-1">
            <SciDQuEStName variant="hero" />
          </div>
          <p className="hero-banner__lead fade-in fade-in-delay-2">
            Extract structured answers from research PDFs with template forms and your own LLM.
          </p>
          <div className="hero-banner__actions fade-in fade-in-delay-3">
            <button onClick={onTryDemo} className="btn btn-primary">
              ▶ Try Live Demo
            </button>
            <a
              href="https://gitlab.com/TIBHannover/orkg/scidquest"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              🦊 View on GitLab
            </a>
            <a
              href="https://www.npmjs.com/package/@orkg/scidquest"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
            >
              📦 npm Package
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
