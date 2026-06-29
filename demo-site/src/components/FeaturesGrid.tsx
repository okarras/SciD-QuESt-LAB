const features = [
  {
    icon: '📄',
    title: 'PDF Upload & Viewing',
    desc: 'Drag-and-drop PDF upload with built-in viewer, zoom controls, page navigation, and automatic full-text extraction via pdfjs.',
  },
  {
    icon: '📐',
    title: 'Split-Panel Analysis UI',
    desc: 'Side-by-side layout with PDF viewer on the left and questionnaire on the right. Evidence highlights and page-jump navigation bridge both panels.',
  },
  {
    icon: '📋',
    title: 'Template-Driven Forms',
    desc: 'Define sections, questions, validation rules, and field types (text, select, multi-select, repeat groups) in a JSON template spec.',
  },
  {
    icon: '🤖',
    title: 'AI Suggestions',
    desc: 'Per-field AI suggestion generation with ranked results, confidence scores, evidence references, and one-click apply. Powered by your own LLM.',
  },
  {
    icon: '✅',
    title: 'AI Verification',
    desc: 'Verify user answers against source PDF content — both per-field and batch verification from the summary bar, with structured verdict payloads.',
  },
  {
    icon: '🔌',
    title: 'Embeddable Workflows',
    desc: 'Use the full app or embed mode: supply a custom questionnaireSlot with your own form while keeping PDF extraction and per-field AI wrappers.',
  },
];

export default function FeaturesGrid() {
  return (
    <section className="section" id="features">
      <div className="section-inner">
        <h2 className="section-title">
          Key <span className="gradient-text">Features</span>
        </h2>
        <p className="section-subtitle">
          Everything you need to build AI-assisted research paper analysis
          workflows — from PDF ingestion to structured knowledge extraction.
        </p>
        <div className="features-grid">
          {features.map((f) => (
            <article className="feature-card" key={f.title}>
              <span className="feature-card__icon" aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="feature-card__title">{f.title}</h3>
              <p className="feature-card__desc">{f.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
