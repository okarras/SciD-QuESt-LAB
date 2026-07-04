import { useState } from 'react';

const LAYERS = [
  {
    id: 'outer',
    name: 'QuestionnaireAIProvider',
    desc: 'Suggestion & verification history',
  },
  {
    id: 'middle',
    name: 'ScidQuestProvider',
    desc: 'Your LLMService via adapter',
  },
  {
    id: 'inner',
    name: 'ResearchQuestionnaireApp',
    desc: 'PDF viewer, forms, AI wrappers',
  },
] as const;

const COMPARISON_ROWS = [
  {
    aspect: 'Reading',
    manual: 'External PDF, manual scrolling',
    scidquest: 'Built-in viewer with evidence highlights',
  },
  {
    aspect: 'Extraction',
    manual: 'Copy-paste to notes or spreadsheets',
    scidquest: 'Template-driven structured forms',
  },
  {
    aspect: 'Drafting',
    manual: 'Write from memory',
    scidquest: 'AI suggestions with source references',
  },
  {
    aspect: 'Review',
    manual: 'Ad-hoc peer review',
    scidquest: 'AI verification against the PDF',
  },
] as const;

export default function HowItWorks() {
  const [focusedLayer, setFocusedLayer] = useState<(typeof LAYERS)[number]['id'] | null>(
    null,
  );

  return (
    <section className="section section--alt" id="how-it-works">
      <div className="section-inner">
        <h2 className="section-title">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="section-subtitle">
          Wrap your app with providers, plug in your LLM, and render the questionnaire.
        </p>

        <div
          className={`arch-diagram${focusedLayer ? ` arch-diagram--focus-${focusedLayer}` : ''}`}
          onMouseLeave={() => setFocusedLayer(null)}
        >
          <span className="arch-diagram__pulse" aria-hidden="true" />

          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`arch-layer arch-layer--${layer.id}${focusedLayer === layer.id ? ' is-focused' : ''}${focusedLayer && focusedLayer !== layer.id ? ' is-dimmed' : ''}`}
              onMouseEnter={() => setFocusedLayer(layer.id)}
              onFocus={() => setFocusedLayer(layer.id)}
              onBlur={() => setFocusedLayer(null)}
            >
              <code className="arch-layer__name">{layer.name}</code>
              <span className="arch-layer__desc">{layer.desc}</span>
            </button>
          ))}
        </div>

        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Manual</th>
                <th scope="col">SciD-QuESt</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.aspect}>
                  <th scope="row">{row.aspect}</th>
                  <td>{row.manual}</td>
                  <td>{row.scidquest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
