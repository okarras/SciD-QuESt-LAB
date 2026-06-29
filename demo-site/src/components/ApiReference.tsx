const apis = [
  {
    name: 'ScidQuestProvider',
    type: 'provider',
    desc: 'Root provider that connects your LLMService to all hooks and components. Wraps your app tree and supplies an internal ScidQuestAdapter.',
  },
  {
    name: 'QuestionnaireAIProvider',
    type: 'provider',
    desc: 'Persists suggestion/verification history in localStorage. Required for AIAssistantButton and field AI wrappers.',
  },
  {
    name: 'ResearchQuestionnaireApp',
    type: 'component',
    desc: 'Orchestrates PDF upload, viewer, text extraction, and questionnaire in split or single layout. Supports both default UI and custom questionnaireSlot.',
  },
  {
    name: 'TemplateQuestionnaire',
    type: 'component',
    desc: 'Full questionnaire UI with section accordions, validation, JSON export/import, localStorage autosave, and AI verification batch.',
  },
  {
    name: 'PDFUpload',
    type: 'component',
    desc: 'Drag-and-drop or file-picker PDF upload with type/size validation. Fires onFileSelected with a validated File object.',
  },
  {
    name: 'PdfViewer',
    type: 'component',
    desc: 'Renders PDF pages via react-pdf with zoom, page controls, text extraction, and highlight overlays for evidence references.',
  },
  {
    name: 'useSuggestionGenerator',
    type: 'hook',
    desc: 'Call the adapter suggestion pipeline from arbitrary UI. Returns suggestions, loading, error, generateSuggestions(), and clearSuggestions().',
  },
  {
    name: 'createScidQuestAdapter',
    type: 'util',
    desc: 'Builds a ScidQuestAdapter from your LLMService: generateSuggestions, verifyAnswer, verifyAnswersBatch, and isConfigured.',
  },
  {
    name: 'LLMService',
    type: 'interface',
    desc: 'The contract you implement: generateText(prompt, options?) returning { text, reasoning?, usage? } and isConfigured(). The library never holds API keys.',
  },
  {
    name: 'ResearchQuestionnaireFieldAiWrapper',
    type: 'component',
    desc: 'Wraps a single host-rendered control with AI affordances: suggestion generation, AIAssistantButton, and SuggestionBox wired to workspace navigation.',
  },
  {
    name: 'QuestionnaireTemplate',
    type: 'interface',
    desc: 'JSON template model: version, template name/id, sections array with questions. Each question has id, label, type, options, validation rules, and AI config.',
  },
  {
    name: 'buildQuestionDefinitions',
    type: 'util',
    desc: 'Flat map from questionId → Question including nested subquestions and item_fields. Useful for advanced AI context building.',
  },
];

const typeColorMap: Record<string, string> = {
  provider: 'api-card__type--provider',
  component: 'api-card__type--component',
  hook: 'api-card__type--hook',
  interface: 'api-card__type--interface',
  util: 'api-card__type--util',
};

export default function ApiReference() {
  return (
    <section className="section section--alt" id="api">
      <div className="section-inner">
        <h2 className="section-title">
          API <span className="gradient-text">Reference</span>
        </h2>
        <p className="section-subtitle">
          Everything is imported from <code>@orkg/scidquest</code>. Here are the main
          exports — see{' '}
          <a
            href="https://gitlab.com/TIBHannover/orkg/scidquest/-/blob/main/README.md"
            target="_blank"
            rel="noreferrer"
          >
            the full README
          </a>{' '}
          for detailed prop tables and usage examples.
        </p>

        <div className="api-grid">
          {apis.map((api) => (
            <article className="api-card" key={api.name}>
              <h3 className="api-card__name">{api.name}</h3>
              <span className={`api-card__type ${typeColorMap[api.type] || ''}`}>
                {api.type}
              </span>
              <p className="api-card__desc">{api.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
