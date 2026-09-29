export type ApiField = {
  name: string;
  type: string;
  desc: string;
  default?: string;
};

export type ApiCodeExample = {
  lang: 'typescript' | 'bash' | 'json';
  label?: string;
  code: string;
};

export type ApiMember = {
  heading: string;
  signature?: string;
  desc?: string;
  notes?: string[];
  params?: ApiField[];
  returns?: { desc?: string; fields?: ApiField[] };
};

export type ApiDoc = {
  intro?: string;
  members: ApiMember[];
  examples?: ApiCodeExample[];
};

export type ApiEntry = {
  name: string;
  type: 'provider' | 'component' | 'hook' | 'interface' | 'util';
  desc: string;
  hasDetailPage?: boolean;
  doc?: ApiDoc;
  demoNote?: string;
  docsBeforeDemo?: boolean;
};

export const apis: ApiEntry[] = [
  {
    name: 'ScidQuestProvider',
    type: 'provider',
    desc: 'Root provider that connects your LLMService to all hooks and components. Wraps your app tree and supplies an internal ScidQuestAdapter.',
    hasDetailPage: true,
    doc: {
      intro:
        'Connects your LLMService to hooks and components that call adapter.generateSuggestions, adapter.verifyAnswer, or batch verification.',
      members: [
        {
          heading: 'ScidQuestProvider',
          params: [
            {
              name: 'llmService',
              type: 'LLMService',
              desc: 'Required. Your implementation of text generation and configuration checks.',
            },
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'App subtree that needs ScidQuest AI APIs.',
            },
          ],
        },
        {
          heading: 'useScidQuestContext()',
          desc: 'Returns `{ adapter: ScidQuestAdapter }`. Throws if used outside `ScidQuestProvider`.',
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `import { ScidQuestProvider, useScidQuestContext } from "@orkg/scidquest";

function Child() {
  const { adapter } = useScidQuestContext();
  return <button type="button" onClick={() => void adapter.isConfigured()}>Check</button>;
}

<ScidQuestProvider llmService={llmService}>
  <Child />
</ScidQuestProvider>`,
        },
      ],
    },
  },
  {
    name: 'QuestionnaireAIProvider',
    type: 'provider',
    desc: 'Persists suggestion/verification history in localStorage. Required for AIAssistantButton and field AI wrappers.',
    hasDetailPage: true,
    doc: {
      intro:
        'In-memory and localStorage-backed history for questionnaire AI events (QuestionnaireAIState / QuestionnaireAIHistory).',
      members: [
        {
          heading: 'QuestionnaireAIProvider',
          desc: 'Wrap near the root of anything that mounts `AIAssistantButton` (or the field wrapper that uses it).',
        },
        {
          heading: 'QuestionnaireAIContext',
          desc: 'The React context object. The package does not export a `useQuestionnaireAI` hook; use `useContext(QuestionnaireAIContext)` if you need programmatic access to `addToHistory`, `getHistoryByQuestion`, `clearHistory`, etc., and guard for `undefined`.',
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `import { useContext } from "react";
import { QuestionnaireAIContext, QuestionnaireAIProvider } from "@orkg/scidquest";

function HistoryLength() {
  const api = useContext(QuestionnaireAIContext);
  if (!api) return null;
  return <span>{api.state.history.length} events</span>;
}

<QuestionnaireAIProvider>
  <HistoryLength />
</QuestionnaireAIProvider>`,
        },
      ],
    },
  },
  {
    name: 'ResearchQuestionnaireApp',
    type: 'component',
    desc: 'Orchestrates file upload, viewer, text extraction, and questionnaire in split or single layout. Set multiModal to accept sheets, code, JSON, ZIPs, and links alongside PDFs, with a built-in file manager panel.',
    hasDetailPage: true,
    doc: {
      intro:
        'Orchestrates PDF upload, PdfViewer, plain-text extraction, optional structured document extraction, split or single-column layout, and either the built-in TemplateQuestionnaire or a custom questionnaireSlot.',
      members: [
        {
          heading: 'ResearchQuestionnaireApp',
          signature: 'ResearchQuestionnaireAppProps',
          params: [
            {
              name: 'templateSpec',
              type: 'QuestionnaireTemplate',
              default: 'required',
              desc: 'Sections and question definitions.',
            },
            {
              name: 'pdfTextExtractor',
              type: '{ extractFullText(url: string): Promise<string> }',
              default: 'built-in',
              desc: 'Override for bundlers or custom PDF pipelines.',
            },
            {
              name: 'structuredPdfExtractor',
              type: '{ extractStructuredDocument(text: string): Promise<StructuredDocument> }',
              default: 'built-in',
              desc: 'Builds structured sections from extracted text.',
            },
            {
              name: 'maxPdfSizeBytes',
              type: 'number',
              default: '30 MB',
              desc: 'Passed to PDFUpload.',
            },
            {
              name: 'layout',
              type: "'split' | 'single'",
              default: "'split'",
              desc: 'Desktop split panel vs stacked flow; narrow viewports behave like single.',
            },
            {
              name: 'showPdfViewer',
              type: 'boolean',
              default: 'true',
              desc: 'Hide the PDF column but keep extraction if a URL exists.',
            },
            {
              name: 'onAnswersChange',
              type: '(answers) => void',
              desc: 'Fires whenever answers updates.',
            },
            {
              name: 'initialAnswers',
              type: 'Record<string, unknown>',
              default: '{}',
              desc: 'Seed state when uncontrolled.',
            },
            {
              name: 'answers / setAnswers',
              type: 'controlled pair',
              desc: 'When both set, the host owns answer state.',
            },
            {
              name: 'questionnaireSlot',
              type: '(ctx: ResearchQuestionnaireWorkspaceValue) => ReactNode',
              desc: 'Embed mode: replace built-in questionnaire; ctx includes pdfContent, answers, navigation, highlights.',
            },
            {
              name: 'sx',
              type: 'MUI sx',
              desc: 'Root Box styling.',
            },
          ],
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `<ResearchQuestionnaireApp
  templateSpec={templateSpec}
  answers={answers}
  setAnswers={setAnswers}
  layout="split"
  showPdfViewer
  onAnswersChange={() => {}}
/>`,
        },
        {
          lang: 'typescript',
          label: 'Embed mode (custom form, same PDF pipeline)',
          code: `<ResearchQuestionnaireApp
  templateSpec={templateSpec}
  answers={answers}
  setAnswers={setAnswers}
  questionnaireSlot={(ctx) => (
    <MyForm
      answers={ctx.answers}
      setAnswers={ctx.setAnswers}
      pdfText={ctx.pdfContent}
      onJumpToPage={ctx.onNavigateToPage}
    />
  )}
/>`,
        },
      ],
    },
  },
  {
    name: 'TemplateQuestionnaire',
    type: 'component',
    desc: 'Full questionnaire UI with section accordions, validation, JSON export/import, localStorage autosave, and AI verification batch.',
    hasDetailPage: true,
    doc: {
      intro:
        'Full questionnaire UI: section accordions, validation, export/import JSON, localStorage autosave, AI verification batch from the summary bar, and integration with PDF navigation and highlights when props are passed.',
      members: [
        {
          heading: 'TemplateQuestionnaire',
          signature: 'TemplateQuestionnaireProps',
          params: [
            {
              name: 'templateSpec',
              type: 'QuestionnaireTemplate | null',
              desc: 'When null, shows a short loading placeholder.',
            },
            {
              name: 'answers / setAnswers',
              type: 'Record<string, unknown> + updater',
              desc: 'Controlled answer map (question ids as keys; repeat sections use arrays under section ids per template).',
            },
            {
              name: 'pdfContent',
              type: 'string?',
              desc: 'Plain text passed to AI flows.',
            },
            {
              name: 'structuredDocument',
              type: 'StructuredDocument | null?',
              desc: 'Improves evidence handling when present.',
            },
            {
              name: 'onNavigateToPage',
              type: '(page: number) => void',
              desc: 'Scroll PDF to page.',
            },
            {
              name: 'onHighlightsChange',
              type: 'highlight map',
              desc: 'Receives highlight rects keyed by page.',
            },
            {
              name: 'pdfUrl / pageWidth',
              type: 'viewer sync',
              desc: 'Used for evidence UI alignment.',
            },
            {
              name: 'pdfExtractionError / onRetryExtraction',
              type: 'error UX',
              desc: 'Shown in the top bar when extraction fails.',
            },
            {
              name: 'aiConfig.hidden',
              type: 'boolean',
              desc: 'Hides AI configuration entry points in the summary bar when set.',
            },
            {
              name: 'sx',
              type: 'MUI sx',
              desc: 'Wrapper styling.',
            },
          ],
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `<TemplateQuestionnaire
  templateSpec={templateSpec}
  answers={answers}
  setAnswers={setAnswers}
  pdfContent={extractedText}
  structuredDocument={structured}
  onNavigateToPage={goToPage}
  onHighlightsChange={setHighlights}
  pdfUrl={blobUrl}
  pageWidth={pageWidth}
/>`,
        },
      ],
    },
  },
  {
    name: 'FileManagerPanel',
    type: 'component',
    desc: 'Sidebar listing every uploaded file with activate, rename, remove, and multi-select bulk delete. Powers the file manager in multi-modal mode.',
    hasDetailPage: true,
    demoNote:
      'Upload a few files, then try the panel: click a file to open it, rename it, remove it, or switch to multi-select (top-right) to delete several at once.',
  },
  {
    name: 'FileUpload',
    type: 'component',
    desc: 'Drag-and-drop or paste-a-link upload for PDFs, images, CSVs, tables, ZIPs, and repo links, with optional external sources like Drive or Dropbox.',
    hasDetailPage: true,
    demoNote:
      'Try uploading any kind of file — a PDF, image, spreadsheet, webpage, zip, code file, or even a link to a repository. Nothing leaves your browser; the file is just recognized and listed below with its type and size.',
  },
  {
    name: 'PDFUpload',
    type: 'component',
    desc: 'Drag-and-drop or file-picker PDF-only upload with type/size validation. Fires onFileSelected with a validated File object.',
    hasDetailPage: true,
    docsBeforeDemo: true,
    demoNote:
      'Try selecting a PDF (up to 20 MB). Nothing is uploaded anywhere — the file is just checked, and its name and size are shown below.',
    doc: {
      intro: 'Drag-and-drop or file-picker PDF upload with type/size validation.',
      members: [
        {
          heading: 'PDFUpload',
          signature: 'PDFUploadProps',
          params: [
            {
              name: 'onFileSelected',
              type: '(file: File) => void',
              default: 'required',
              desc: 'Called with a validated PDF File.',
            },
            {
              name: 'onFileRemoved',
              type: '() => void',
              desc: 'Called when the user clears the selection.',
            },
            {
              name: 'maxSizeBytes',
              type: 'number',
              default: '30 MB',
              desc: 'Rejects larger files.',
            },
            {
              name: 'accept',
              type: 'string',
              default: "'application/pdf'",
              desc: 'Input accept attribute.',
            },
            {
              name: 'disabled',
              type: 'boolean',
              default: 'false',
              desc: 'Disables interaction.',
            },
            {
              name: 'multiple',
              type: 'boolean',
              default: 'false',
              desc: 'Allow selecting or dropping more than one PDF at once.',
            },
            {
              name: 'onFilesSelected',
              type: '(files: File[]) => void',
              desc: 'Called with all validated files when `multiple` is true.',
            },
            {
              name: 'hasExistingFiles',
              type: 'boolean',
              default: 'false',
              desc: 'Collapses the dropzone to a compact variant once files already exist (used with `multiple`).',
            },
            {
              name: 'sx',
              type: 'MUI sx',
              desc: 'Root Box styling.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'PdfViewer',
    type: 'component',
    desc: 'Renders PDF pages via react-pdf with zoom, page controls, text extraction, and highlight overlays for evidence references.',
    hasDetailPage: true,
    docsBeforeDemo: true,
    demoNote:
      'This shows a sample PDF so you can try zooming, scrolling, and paging through it right away — the same viewer used for any PDF you upload. You can also see it as part of the full experience in the main demo — click "Try Demo" in the header.',
    doc: {
      intro:
        'Renders PDF pages with react-pdf, zoom, page controls, optional full-document text extraction via `pdfTextExtractor`, and optional highlight overlays.',
      members: [
        {
          heading: 'PdfViewer',
          signature: 'PdfViewerProps',
          params: [
            {
              name: 'refContainer',
              type: 'RefObject<HTMLDivElement>',
              default: 'required',
              desc: 'Scroll container for pages (must be the element that scrolls).',
            },
            {
              name: 'pdfUrl',
              type: 'string | null | undefined',
              desc: 'Blob URL or remote PDF URL.',
            },
            {
              name: 'pageWidth',
              type: 'number | null',
              desc: 'Pixel width of each page.',
            },
            {
              name: 'registerCommands',
              type: '(cmds: { goToPage(n) }) => void',
              desc: 'Optional imperative navigation hook-up.',
            },
            {
              name: 'onTextExtracted',
              type: '(text: string) => void',
              desc: 'Called when `pdfTextExtractor` finishes.',
            },
            {
              name: 'onStructuredExtracted',
              type: '(doc: StructuredDocument) => void',
              desc: 'Called with structured per-page sections, when the extractor supports it.',
            },
            {
              name: 'onExtractionError',
              type: '(err: Error) => void',
              desc: 'Extraction failure path.',
            },
            {
              name: 'highlights',
              type: 'Record<number, Array<{ left, top, width, height }>>',
              desc: 'Yellow overlays per page number.',
            },
            {
              name: 'pdfTextExtractor',
              type: '{ extractFullText(url: string): Promise<string> } | null',
              desc: 'When null/omitted, no automatic extraction.',
            },
            {
              name: 'pdfWorkerSrc',
              type: 'string',
              default: 'bundled worker',
              desc: 'Override the pdf.js worker URL.',
            },
          ],
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `const scrollRef = useRef<HTMLDivElement>(null);
const [url, setUrl] = useState<string | null>(null);

<Box ref={scrollRef} sx={{ height: 480, overflow: "auto" }}>
  <PdfViewer
    refContainer={scrollRef}
    pdfUrl={url}
    pageWidth={720}
    pdfTextExtractor={myExtractor}
    onTextExtracted={setPlainText}
    onExtractionError={console.error}
    highlights={highlightsByPage}
  />
</Box>`,
        },
      ],
    },
  },
  {
    name: 'FilePreview',
    type: 'component',
    desc: 'Renders the active uploaded file — PDF pages, image, spreadsheet/table, or code — matched to its detected file category.',
    hasDetailPage: true,
    demoNote:
      'Upload a file above and see it previewed instantly below — as PDF pages, an image, a spreadsheet, or code, depending on what you uploaded.',
  },
  {
    name: 'useSuggestionGenerator',
    type: 'hook',
    desc: 'Call the adapter suggestion pipeline from arbitrary UI. Returns suggestions, loading, error, generateSuggestions(), and clearSuggestions().',
    hasDetailPage: true,
    doc: {
      intro:
        'Call the adapter’s suggestion pipeline from arbitrary UI (no PDF viewer required). Requires `ScidQuestProvider`.',
      members: [
        {
          heading: 'useSuggestionGenerator(options)',
          params: [
            {
              name: 'questionText',
              type: 'string',
              desc: 'Wording shown to the model.',
            },
            {
              name: 'questionType',
              type: 'string',
              desc: 'Template field type (e.g. `text`, `select`).',
            },
            {
              name: 'questionOptions',
              type: 'string[]?',
              desc: 'For choice-style questions.',
            },
            {
              name: 'pdfContent',
              type: 'string?',
              desc: 'Extracted document text; required for a successful run.',
            },
            {
              name: 'contextHistory',
              type: 'history entries',
              desc: 'Prior suggestions for diversity (see type exports).',
            },
            {
              name: 'previousFeedback',
              type: 'array',
              desc: 'Thumbs/comments from prior runs (shape matches suggestion feedback entries: ids, rating, optional comment, timestamp).',
            },
            {
              name: 'excludedSuggestionIds',
              type: 'Set<string>',
              desc: 'IDs to strip from `contextHistory`.',
            },
          ],
          returns: {
            desc: '`{ suggestions, loading, error, rawError, generateSuggestions, clearSuggestions }`',
          },
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `import { useSuggestionGenerator } from "@orkg/scidquest";

function Panel({ pdfText }: { pdfText: string }) {
  const { suggestions, loading, error, generateSuggestions, clearSuggestions } =
    useSuggestionGenerator({
      questionText: "What is the research objective?",
      questionType: "text",
      pdfContent: pdfText,
    });

  return (
    <>
      <button type="button" disabled={loading} onClick={() => void generateSuggestions()}>
        Suggest
      </button>
      <button type="button" onClick={clearSuggestions}>Clear</button>
      {error && <p role="alert">{error}</p>}
      <ul>
        {suggestions.map((s) => (
          <li key={s.id}>{typeof s.text === "string" ? s.text : s.text.join(", ")}</li>
        ))}
      </ul>
    </>
  );
}`,
        },
      ],
    },
  },
  {
    name: 'createScidQuestAdapter',
    type: 'util',
    desc: 'Builds a ScidQuestAdapter from your LLMService: generateSuggestions, verifyAnswer, verifyAnswersBatch, and isConfigured.',
    hasDetailPage: true,
    doc: {
      intro:
        '`createScidQuestAdapter(llmService)` builds a `ScidQuestAdapter`: `generateSuggestions`, `verifyAnswer`, optional `verifyAnswersBatch`, and `isConfigured`.',
      members: [
        {
          heading: 'createScidQuestAdapter(llmService)',
          params: [
            {
              name: 'llmService',
              type: 'LLMService',
              default: 'required',
              desc: 'Your implementation of text generation and configuration checks.',
            },
          ],
          returns: {
            desc: '`ScidQuestAdapter`: `{ generateSuggestions, verifyAnswer, verifyAnswersBatch?, isConfigured }`.',
          },
        },
        {
          heading: 'ScidQuestAdapter (advanced)',
          desc: 'Advanced integrations can implement `ScidQuestAdapter` directly instead of using `createScidQuestAdapter`. The shipped `ScidQuestProvider` always uses `createScidQuestAdapter` internally, so a custom adapter needs its own way to be injected.',
        },
      ],
      examples: [
        {
          lang: 'typescript',
          label: 'Implement LLMService → createScidQuestAdapter → call it',
          code: `import { createScidQuestAdapter, type LLMService, type LLMGenerateTextOptions } from "@orkg/scidquest";

class MyLLMService implements LLMService {
  constructor(private apiKey: string) {}

  async generateText(prompt: string, options?: LLMGenerateTextOptions) {
    // call your provider here
    return { text: "..." };
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

const adapter = createScidQuestAdapter(new MyLLMService(apiKey));
await adapter.verifyAnswer({
  questionId: "q1",
  questionText: "Contribution?",
  currentAnswer: "They propose a new metric.",
  pdfContent: extractedPlainText,
});`,
        },
      ],
    },
  },
  {
    name: 'LLMService',
    type: 'interface',
    desc: 'The contract you implement: generateText(prompt, options?) returning { text, reasoning?, usage? } and isConfigured(). The library never holds API keys.',
    hasDetailPage: true,
    doc: {
      intro:
        'The contract you implement: the library never holds API keys, so you supply the call to your LLM provider.',
      members: [
        {
          heading: 'generateText(prompt, options?)',
          signature: '(prompt: string, options?: LLMGenerateTextOptions) => Promise<LLMGenerateTextResponse>',
          desc: 'Send the prompt to your LLM provider and return the response.',
          returns: {
            desc: '`{ text, reasoning?, usage? }`',
          },
        },
        {
          heading: 'isConfigured()',
          signature: '() => boolean',
          desc: 'Return whether the service has what it needs (e.g. an API key) to run.',
        },
      ],
      examples: [
        {
          lang: 'typescript',
          label: 'Implement LLMService → createScidQuestAdapter → call it',
          code: `import { createScidQuestAdapter, type LLMService, type LLMGenerateTextOptions } from "@orkg/scidquest";

class MyLLMService implements LLMService {
  constructor(private apiKey: string) {}

  async generateText(prompt: string, options?: LLMGenerateTextOptions) {
    // call your provider here
    return { text: "..." };
  }

  isConfigured() {
    return !!this.apiKey;
  }
}

const adapter = createScidQuestAdapter(new MyLLMService(apiKey));
await adapter.verifyAnswer({
  questionId: "q1",
  questionText: "Contribution?",
  currentAnswer: "They propose a new metric.",
  pdfContent: extractedPlainText,
});`,
        },
      ],
    },
  },
  {
    name: 'ResearchQuestionnaireFieldAiWrapper',
    type: 'component',
    desc: 'Wraps a single host-rendered control with AI affordances: suggestion generation, AIAssistantButton, and SuggestionBox wired to workspace navigation.',
    hasDetailPage: true,
    demoNote:
      'Click Suggest to have the AI draft an answer for you, or type your own and click Verify to have it checked.',
    doc: {
      intro:
        'Wraps a single host-rendered control with the same AI affordances as built-in fields: suggestion generation, verification entry via AIAssistantButton, and SuggestionBox wired to workspace navigation/highlights. Must be used inside a `ResearchQuestionnaireWorkspaceProvider` (automatic in embed mode under `ResearchQuestionnaireApp`) and `ScidQuestProvider`; for full AIAssistantButton behavior (history dialog, etc.), also wrap in `QuestionnaireAIProvider`.',
      members: [
        {
          heading: 'ResearchQuestionnaireFieldAiWrapper',
          signature: 'ResearchQuestionnaireFieldAiWrapperProps',
          params: [
            {
              name: 'children',
              type: 'ReactNode',
              desc: 'Your input component.',
            },
            {
              name: 'questionId',
              type: 'string',
              desc: 'Must match an id in templateSpec for sibling/context helpers.',
            },
            {
              name: 'questionText',
              type: 'string',
              desc: 'Label or prompt sent to the model.',
            },
            {
              name: 'questionType',
              type: 'ResearchFieldAiQuestionType',
              desc: '`text` | `select` | `multi_select` | `repeat_text` | `group`.',
            },
            {
              name: 'questionOptions',
              type: 'string[]?',
              desc: 'For select-style fields.',
            },
            {
              name: 'currentAnswer',
              type: 'string',
              desc: 'String form of the value for verification.',
            },
            {
              name: 'onApplySuggestion',
              type: '(text: string) => void',
              desc: 'Apply chosen suggestion text into your state.',
            },
            {
              name: 'disableAi',
              type: 'boolean?',
              default: 'false',
              desc: 'Force-disable AI chrome.',
            },
            {
              name: 'parentContext',
              type: 'ParentContext?',
              desc: 'Optional nested/group context (see app types/context).',
            },
            {
              name: 'onVerificationComplete',
              type: '(result: AIVerificationResult) => void',
              desc: 'Per-field verification callback.',
            },
            {
              name: 'aiLayout',
              type: "'menu' | 'buttons' | 'both'",
              default: "'menu'",
              desc: 'AI control layout: dropdown menu, standalone buttons, or both.',
            },
            {
              name: 'aiActions',
              type: "('suggest' | 'verify' | 'history' | 'config')[]",
              desc: 'Which standalone buttons to show when `aiLayout` is `buttons` or `both`.',
            },
            {
              name: 'onConfigureRequired',
              type: '() => void',
              desc: 'Called when the researcher tries to use AI and no LLM service is configured. The host decides what "configure AI" means (open its own dialog, show a banner, etc).',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'QuestionnaireTemplate',
    type: 'interface',
    desc: 'JSON template model: version, template name/id, sections array with questions. Each question has id, label, type, options, validation rules, and AI config.',
    hasDetailPage: true,
    doc: {
      intro:
        'The JSON template model driving both `ResearchQuestionnaireApp`/`TemplateQuestionnaire` and the AI prompt context: a template has `sections`, each section has `questions`, and each question can nest further questions for groups and repeating items.',
      members: [
        {
          heading: 'QuestionnaireTemplate',
          params: [
            { name: 'version', type: 'string', desc: 'Template schema version.' },
            { name: 'template', type: 'string', desc: 'Human-readable template name.' },
            { name: 'template_id', type: 'string', desc: 'Stable identifier for the template.' },
            { name: 'sections', type: 'Section[]', desc: 'Ordered sections shown as accordions in the built-in UI.' },
          ],
        },
        {
          heading: 'Section',
          params: [
            { name: 'id', type: 'string', desc: 'Unique section id.' },
            { name: 'title', type: 'string', desc: 'Section heading shown in the UI.' },
            { name: 'questions', type: 'Question[]', desc: 'Questions belonging to this section.' },
          ],
        },
        {
          heading: 'Question',
          desc: 'A plain `string` `type` field (not a fixed enum) — common values used elsewhere in the library include `text`, `select`, `multi_select`, `group`, and `repeat_group`.',
          params: [
            { name: 'id', type: 'string', desc: 'Unique question id, referenced by answers, sibling helpers, and AI context.' },
            { name: 'label', type: 'string?', desc: 'Question label; some sub-questions use `title` instead.' },
            { name: 'title', type: 'string?', desc: 'Used by groups in place of `label`.' },
            { name: 'type', type: 'string', desc: 'Field type, e.g. `text`, `select`, `multi_select`, `group`, `repeat_group`.' },
            { name: 'required', type: 'boolean?', desc: 'Marks the question as required for validation.' },
            { name: 'choice_type', type: "'single' | 'multiple' | 'no'", desc: 'For choice-style questions.' },
            { name: 'options', type: 'string[]?', desc: 'Choices for select-style questions.' },
            { name: 'evidence_fields', type: 'string[]?', desc: 'Fields expected to carry evidence references.' },
            { name: 'evidence_per_item', type: 'boolean?', desc: 'Whether evidence is tracked per repeated item.' },
            { name: 'desc', type: 'string?', desc: 'Help text shown under the question.' },
            { name: 'validation', type: 'ValidationRule?', desc: 'Format/length rules — see `ValidationRule` below.' },
            { name: 'maps_to_fields', type: 'Mapping[]?', desc: 'ORKG field mappings — see `Mapping` below.' },
            { name: 'links_via_field', type: 'Link?', desc: 'ORKG link mapping — see `Link` below.' },
            { name: 'property_id / cardinality / class_id / subtemplate_id', type: 'string?', desc: 'ORKG schema identifiers for this question.' },
            { name: 'parent_property_id / parent_class_id / parent_subtemplate_id', type: 'string?', desc: 'ORKG schema identifiers inherited from the parent group/section.' },
            { name: 'item_fields', type: 'Question[]?', desc: 'Nested fields for a `repeat_group` question.' },
            { name: 'subquestions', type: 'Question[]?', desc: 'Nested fields for a `group` question.' },
            { name: 'disable_ai_assistant', type: 'boolean?', desc: 'When true, `ResearchQuestionnaireFieldAiWrapper` renders `children` only — no AI chrome.' },
          ],
        },
        {
          heading: 'ValidationRule',
          params: [
            { name: 'format', type: 'string?', desc: 'Format identifier/regex to validate against.' },
            { name: 'formatError', type: 'string?', desc: 'Message shown when `format` fails.' },
            { name: 'minLength', type: 'number?', desc: 'Minimum text length.' },
            { name: 'minLengthError', type: 'string?', desc: 'Message shown when `minLength` fails.' },
            { name: 'maxLength', type: 'number?', desc: 'Maximum text length.' },
            { name: 'maxLengthError', type: 'string?', desc: 'Message shown when `maxLength` fails.' },
          ],
        },
        {
          heading: 'Mapping',
          desc: 'Used by `maps_to_fields` to map a question onto an ORKG property/class.',
          params: [
            { name: 'field', type: 'string', desc: 'Question field being mapped.' },
            { name: 'node / property_id / cardinality / class_id / subtemplate_id', type: 'string?', desc: 'ORKG schema targets for this mapping.' },
            { name: 'property_value_mapping', type: 'Record<string, string>?', desc: 'Maps answer values to ORKG property values.' },
          ],
        },
        {
          heading: 'Link',
          desc: 'Used by `links_via_field` to connect a question to another ORKG node.',
          params: [
            { name: 'field', type: 'string', desc: 'Question field the link is defined on.' },
            { name: 'node', type: 'string', desc: 'Target ORKG node.' },
            { name: 'property_id / cardinality / class_id / subtemplate_id', type: 'string?', desc: 'ORKG schema targets for this link.' },
          ],
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `const templateSpec: QuestionnaireTemplate = {
  version: "1",
  template: "demo",
  template_id: "demo",
  sections: [
    {
      id: "sec1",
      title: "Example",
      questions: [
        {
          id: "q1",
          label: "Main contribution",
          type: "text",
          required: true,
        },
      ],
    },
  ],
};`,
        },
      ],
    },
  },
  {
    name: 'buildQuestionDefinitions',
    type: 'util',
    desc: 'Flat map from questionId → Question including nested subquestions and item_fields. Useful for advanced AI context building.',
    hasDetailPage: true,
    doc: {
      intro: 'Template helpers for advanced AI context.',
      members: [
        {
          heading: 'buildQuestionDefinitions(template)',
          desc: 'Flat map `questionId → Question`, including nested subquestions / `item_fields`.',
        },
        {
          heading: 'siblingQuestionIdsFor(template, questionId)',
          desc: 'Ids in the same section top-level group or same nested group; used to gather related answers for prompting.',
        },
      ],
      examples: [
        {
          lang: 'typescript',
          code: `import { buildQuestionDefinitions, siblingQuestionIdsFor } from "@orkg/scidquest";

const defs = buildQuestionDefinitions(templateSpec);
const siblings = siblingQuestionIdsFor(templateSpec, "q1");`,
        },
      ],
    },
  },
];

export const typeColorMap: Record<string, string> = {
  provider: 'api-card__type--provider',
  component: 'api-card__type--component',
  hook: 'api-card__type--hook',
  interface: 'api-card__type--interface',
  util: 'api-card__type--util',
};
