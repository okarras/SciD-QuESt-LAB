import { useEffect, useRef, useState } from 'react';

type Feature = {
  icon: string;
  title: string;
  desc: string;
  gif?: string;
};

const features: Feature[] = [
  {
    icon: '📄',
    title: 'PDF Upload & Viewing',
    desc: 'Drag-and-drop PDF upload with built-in viewer, zoom controls, page navigation, and automatic full-text extraction via pdfjs.',
    gif: '/fileupload.gif',
  },
  {
    icon: '📐',
    title: 'Split-Panel Analysis UI',
    desc: 'Side-by-side layout with PDF viewer on the left and questionnaire on the right. Evidence highlights and page-jump navigation bridge both panels.',
    gif: '/splitpanel.gif',
  },
  {
    icon: '📋',
    title: 'Template-Driven Forms',
    desc: 'Define sections, questions, validation rules, and field types (text, select, multi-select, repeat groups) in a JSON template spec.',
    gif: '/templatedriven.gif',
  },
  {
    icon: '🤖',
    title: 'AI Suggestions',
    desc: 'Per-field AI suggestion generation with ranked results, confidence scores, evidence references, and one-click apply. Powered by your own LLM.',
    gif: '/suggestanswers.gif',
  },
  {
    icon: '✅',
    title: 'AI Verification',
    desc: 'Verify user answers against source PDF content — both per-field and batch verification from the summary bar, with structured verdict payloads.',
    gif: '/verify.gif',
  },
  {
    icon: '🔌',
    title: 'Embeddable Workflows',
    desc: 'Use the full app or embed mode: supply a custom questionnaireSlot with your own form while keeping PDF extraction and per-field AI wrappers.',
  },
];

function EmbedWorkflowAnimation({ expanded = false }: { expanded?: boolean }) {
  return (
    <div
      className={`embed-workflow-demo${expanded ? ' embed-workflow-demo--expanded' : ''}`}
      aria-hidden={expanded ? undefined : true}
      aria-label={expanded ? 'Embeddable workflow animation' : undefined}
    >
      <div className="embed-workflow-demo__window">
        <div className="embed-workflow-demo__titlebar">
          <span className="embed-workflow-demo__dots" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span className="embed-workflow-demo__app-name">ResearchQuestionnaireApp</span>
        </div>

        <div className="embed-workflow-demo__split">
          <div className="embed-workflow-demo__pdf">
            <span className="embed-workflow-demo__badge">built-in</span>
            <div className="embed-workflow-demo__pdf-page">
              <span className="embed-workflow-demo__pdf-line embed-workflow-demo__pdf-line--title" />
              <span className="embed-workflow-demo__pdf-line" />
              <span className="embed-workflow-demo__pdf-line" />
              <span className="embed-workflow-demo__pdf-line embed-workflow-demo__pdf-line--short" />
            </div>
          </div>

          <div className="embed-workflow-demo__slot">
            <span className="embed-workflow-demo__badge embed-workflow-demo__badge--slot">
              questionnaireSlot
            </span>
            <div className="embed-workflow-demo__placeholder">Your custom form</div>
            <div className="embed-workflow-demo__form">
              <span className="embed-workflow-demo__form-title">MyForm</span>
              <span className="embed-workflow-demo__field" />
              <span className="embed-workflow-demo__field" />
              <span className="embed-workflow-demo__field embed-workflow-demo__field--active" />
            </div>
          </div>
        </div>
      </div>

      <div className="embed-workflow-demo__editor">
        <div className="embed-workflow-demo__editor-bar">
          <span>App.tsx</span>
        </div>
        <pre className="embed-workflow-demo__code">
          <code>
            <span className="embed-workflow-demo__code-line embed-workflow-demo__code-line--1">
              {'<ResearchQuestionnaireApp'}
            </span>
            <span className="embed-workflow-demo__code-line embed-workflow-demo__code-line--2">
              {'  questionnaireSlot={(ctx) => ('}
            </span>
            <span className="embed-workflow-demo__code-line embed-workflow-demo__code-line--3">
              {'    <MyForm {...ctx} />'}
            </span>
            <span className="embed-workflow-demo__code-line embed-workflow-demo__code-line--4">
              {'  )}'}
            </span>
            <span className="embed-workflow-demo__code-line embed-workflow-demo__code-line--5">
              {'/>'}
            </span>
            <span className="embed-workflow-demo__cursor" aria-hidden="true" />
          </code>
        </pre>
      </div>
    </div>
  );
}

function FeatureDetailModal({
  feature,
  onClose,
}: {
  feature: Feature;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="feature-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feature-modal-title"
    >
      <button
        type="button"
        className="feature-modal__backdrop"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="feature-modal__panel">
        <button
          ref={closeRef}
          type="button"
          className="feature-modal__close"
          aria-label="Close preview"
          onClick={onClose}
        >
          ×
        </button>

        <div className="feature-modal__media">
          {feature.gif ? (
            <img
              className="feature-modal__gif"
              src={feature.gif}
              alt={`Demo: ${feature.title}`}
              width={1200}
              height={421}
            />
          ) : (
            <EmbedWorkflowAnimation expanded />
          )}
        </div>

        <div className="feature-modal__body">
          <h2 id="feature-modal-title" className="feature-modal__title">
            <span aria-hidden="true">{feature.icon}</span>
            {feature.title}
          </h2>
          <p className="feature-modal__desc">{feature.desc}</p>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesGrid() {
  const [selected, setSelected] = useState<Feature | null>(null);

  const openFeature = (feature: Feature) => setSelected(feature);
  const closeFeature = () => setSelected(null);

  return (
    <section className="section" id="features">
      <div className="section-inner">
        <h2 className="section-title">
          Key <span className="gradient-text">Features</span>
        </h2>
        <p className="section-subtitle">
          PDF ingestion, structured forms, and AI-assisted field workflows.
        </p>
        <div className="features-grid">
          {features.map((f) => (
            <article
              className="feature-card feature-card--interactive"
              key={f.title}
              role="button"
              tabIndex={0}
              aria-label={`View demo: ${f.title}`}
              onClick={() => openFeature(f)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openFeature(f);
                }
              }}
            >
              <div className="feature-card__media">
                {f.gif ? (
                  <img
                    className="feature-card__gif"
                    src={f.gif}
                    alt=""
                    width={1200}
                    height={421}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <EmbedWorkflowAnimation />
                )}
                <span className="feature-card__expand-hint">View demo</span>
              </div>
              <div className="feature-card__body">
                <div className="feature-card__header">
                  <span className="feature-card__icon" aria-hidden="true">
                    {f.icon}
                  </span>
                  <h3 className="feature-card__title">{f.title}</h3>
                </div>
                <p className="feature-card__desc">{f.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {selected && (
        <FeatureDetailModal feature={selected} onClose={closeFeature} />
      )}
    </section>
  );
}
