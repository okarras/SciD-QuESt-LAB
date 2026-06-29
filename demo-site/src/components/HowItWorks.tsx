export default function HowItWorks() {
  return (
    <section className="section section--alt" id="how-it-works">
      <div className="section-inner">
        <h2 className="section-title">
          How It <span className="gradient-text">Works</span>
        </h2>
        <p className="section-subtitle">
          SciD-QuESt uses a provider-based architecture. Wrap your app tree with the
          provider stack, implement <code>LLMService</code>, and the library handles AI
          suggestion generation, verification, and PDF extraction.
        </p>

        {/* Architecture Diagram */}
        <div className="architecture-diagram">
          <div className="arch-layer arch-layer--outer">
            <div className="arch-layer__name">
              <code>QuestionnaireAIProvider</code>
            </div>
            <div className="arch-layer__desc">
              Persists suggestion / verification history (localStorage)
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div className="arch-layer arch-layer--middle">
                <div className="arch-layer__name">
                  <code>ScidQuestProvider</code>
                </div>
                <div className="arch-layer__desc">
                  Supplies your <code>LLMService</code> via internal adapter + Redux store
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <div className="arch-layer arch-layer--inner">
                    <div className="arch-layer__name">
                      <code>ResearchQuestionnaireApp</code>
                    </div>
                    <div className="arch-layer__desc">
                      PDF viewer · questionnaire · text extraction · AI wrappers
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontWeight: 700 }}>
          Traditional vs. SciD-QuESt Workflow
        </h3>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Aspect</th>
                <th>🧑 Manual Review</th>
                <th>🤖 With SciD-QuESt</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PDF Reading</td>
                <td>Open PDF in external viewer, manually scroll</td>
                <td>Built-in viewer with zoom, page navigation, evidence highlights</td>
              </tr>
              <tr>
                <td>Information Extraction</td>
                <td>Copy-paste into spreadsheets or notes</td>
                <td>Template-driven forms with structured field types</td>
              </tr>
              <tr>
                <td>Answer Drafting</td>
                <td>Read full paper, write answers from memory</td>
                <td>AI generates ranked suggestions with confidence & evidence</td>
              </tr>
              <tr>
                <td>Quality Assurance</td>
                <td>Self-review or peer review (slow, inconsistent)</td>
                <td>AI verification against source content with verdicts</td>
              </tr>
              <tr>
                <td>Consistency</td>
                <td>Ad-hoc, varies by reviewer</td>
                <td>Template-enforced structure with validation rules</td>
              </tr>
              <tr>
                <td>Progress Tracking</td>
                <td>Manual bookmarking / notes</td>
                <td>Auto-saved sessions with JSON export/import</td>
              </tr>
              <tr>
                <td>Integration</td>
                <td>Standalone, requires rebuilding</td>
                <td>Embeddable React components, bring-your-own LLM</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
