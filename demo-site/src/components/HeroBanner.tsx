interface HeroBannerProps {
  onTryDemo: () => void;
}

export default function HeroBanner({ onTryDemo }: HeroBannerProps) {
  return (
    <section className="hero-banner" aria-label="Introduction">
      <div className="hero-banner__grid" aria-hidden="true" />
      <div className="hero-banner__glow" aria-hidden="true" />
      <div className="hero-banner__inner">
        <div className="hero-banner__copy">
          <p className="hero-banner__eyebrow fade-in">AI-Assisted Research Paper Analysis</p>
          <h1 className="hero-banner__title fade-in fade-in-delay-1">
            From Scientific Documents to{' '}
            <span className="gradient-text">Knowledge</span>
          </h1>
          <p className="hero-banner__subtitle fade-in fade-in-delay-2">
            via Questionnaire-based Extraction and Structuring
          </p>
          <p className="hero-banner__lead fade-in fade-in-delay-3">
            SciD-QuESt is a reusable React library for extracting structured information from
            research papers with template-driven forms, AI-assisted suggestions, and answer
            verification. Bring your own LLM, upload a PDF, and let AI help you analyze
            scientific literature.
          </p>
          <div className="hero-banner__actions fade-in fade-in-delay-4">
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

        <aside className="hero-metrics fade-in fade-in-delay-4" aria-label="Key capabilities">
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">📄</span>
            <span className="hero-metric__label">PDF-First<br />Workflows</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">🤖</span>
            <span className="hero-metric__label">AI-Powered<br />Suggestions</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">📋</span>
            <span className="hero-metric__label">Template-Driven<br />Extraction</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">✅</span>
            <span className="hero-metric__label">Answer<br />Verification</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">🔌</span>
            <span className="hero-metric__label">Embeddable<br />Workflows</span>
          </div>
          <div className="hero-metric">
            <span className="hero-metric__icon" aria-hidden="true">💾</span>
            <span className="hero-metric__label">Local<br />Persistence</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
