import { useState, useMemo } from 'react';
import {
  ScidQuestProvider,
  QuestionnaireAIProvider,
  ResearchQuestionnaireApp,
} from '@orkg/scidquest';
import type { UploadedPdf } from '@orkg/scidquest';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { OpenRouterLLM, AVAILABLE_MODELS } from '../services/OpenRouterLLM';
import type { LLMService, QuestionnaireTemplate } from '@orkg/scidquest';
import Header from './Header';
import DemoQuestionnaire from './DemoQuestionnaire';

const OPENROUTER_API_KEY = import.meta.env.OPENROUTER_API_KEY ?? '';

function resolvePdfUrl(path: string): string {
  if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return new URL(path, window.location.origin).href;
}

// Define ORKG-compliant Red Theme for MUI
const orkgTheme = createTheme({
  palette: {
    primary: {
      main: '#EC6160', // ORKG Red (CIELAB to Hex conversion)
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#2563eb', // Blue for ScidQuest mode
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Domain-specific template for the EmpiRE-Compass paper
const templateSpec: QuestionnaireTemplate = {
  version: '1',
  template: 'EmpiRE-Compass Paper Analysis',
  template_id: 'EC-DEMO-001',
  sections: [
    {
      id: 'paper-overview',
      title: 'Paper Overview',
      questions: [
        {
          id: 'research_problem',
          label: 'What core problem or gap does the paper address in sustainable knowledge exploration and reuse?',
          type: 'text',
          required: true,
        },
        {
          id: 'proposed_solution',
          label: 'What is EmpiRE-Compass, and what is the main idea behind the proposed approach?',
          type: 'text',
          required: true,
        },
        {
          id: 'target_users',
          label: 'Who is expected to use or benefit from the system (e.g., researchers, curators, or domain experts)?',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      id: 'system-design',
      title: 'System Design',
      questions: [
        {
          id: 'neuro_symbolic_components',
          label: 'What symbolic and neural components make up the system, and how do they work together?',
          type: 'text',
          required: true,
        },
        {
          id: 'dashboard_capabilities',
          label: 'What are the main features of the dashboard for exploration, synthesis, reuse, or interaction with knowledge?',
          type: 'text',
          required: true,
        },
        {
          id: 'knowledge_representation',
          label: 'How is knowledge modeled, organized, or linked in the platform?',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      id: 'data-and-workflow',
      title: 'Data and Workflow',
      questions: [
        {
          id: 'data_sources',
          label: 'What datasets, repositories, or knowledge sources does the system use?',
          type: 'text',
          required: true,
        },
        {
          id: 'workflow_steps',
          label: 'What are the main workflow steps from data ingestion through exploration, synthesis, and reuse?',
          type: 'text',
          required: true,
        },
        {
          id: 'sustainability_reuse_mechanisms',
          label: 'How does the paper support long-term maintenance, dynamic updates, interoperability, or reuse of knowledge?',
          type: 'text',
          required: false,
        },
      ],
    },
    {
      id: 'evaluation-and-impact',
      title: 'Evaluation and Impact',
      questions: [
        {
          id: 'evaluation_method',
          label: 'How do the authors evaluate the system (e.g., case studies, experiments, expert feedback, or demonstrations)?',
          type: 'text',
          required: true,
        },
        {
          id: 'key_findings',
          label: 'What are the main results, observations, or benefits reported in the paper?',
          type: 'text',
          required: true,
        },
        {
          id: 'limitations_future_work',
          label: 'What limitations, open challenges, or future research directions do the authors mention?',
          type: 'text',
          required: false,
        },
      ],
    },
  ],
};

interface LiveDemoProps {
  onBack: () => void;
}

export default function LiveDemo({ onBack }: LiveDemoProps) {
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showConfig, setShowConfig] = useState(false);

  const initialFile = useMemo<UploadedPdf>(() => ({
    id: 'empire-compass',
    name: 'empire-compass.pdf',
    size: 1_120_998,
    url: resolvePdfUrl('/empire-compass.pdf'),
    extractionStatus: 'idle',
  }), []);

  const [files, setFiles] = useState<UploadedPdf[]>([initialFile]);
  const [activeFileId, setActiveFileId] = useState<string | null>('empire-compass');

  const llmService: LLMService = useMemo(
    () => new OpenRouterLLM(OPENROUTER_API_KEY, selectedModel),
    [selectedModel],
  );

  const selectedModelName = AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name ?? selectedModel;

  return (
    <ThemeProvider theme={orkgTheme}>
      <QuestionnaireAIProvider>
        <ScidQuestProvider llmService={llmService}>
          <div className="demo-wrapper" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#1e293b', overflow: 'hidden' }}>

            <Header onTryDemo={() => {}} />

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 24px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <button
                onClick={onBack}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ← Back to Home
              </button>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!OPENROUTER_API_KEY && (
                  <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                    Missing OPENROUTER_API_KEY in .env
                  </span>
                )}
                <button
                  onClick={() => setShowConfig(!showConfig)}
                  style={{
                    background: showConfig ? '#fee2e2' : '#ffffff',
                    color: showConfig ? '#EC6160' : '#475569',
                    border: '1px solid #cbd5e1',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ⚙️ Model: {selectedModelName}
                </button>
              </div>
            </div>

            {showConfig && (
              <div style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'flex-end',
              }}>
                <div style={{ minWidth: '240px', maxWidth: '360px' }}>
                  <label className="demo-config__label" style={{ color: '#475569' }}>OpenRouter Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      background: '#ffffff'
                    }}
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div
              className="demo-workspace"
              style={{ background: '#f8fafc', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px 16px 16px', overflow: 'hidden' }}
            >
              <ResearchQuestionnaireApp
                templateSpec={templateSpec}
                answers={answers}
                setAnswers={setAnswers}
                layout="split"
                showPdfViewer={true}
                controlledFiles={files}
                controlledActiveFileId={activeFileId}
                onFilesChange={setFiles}
                onActiveFileIdChange={setActiveFileId}
                multiple={true}
                questionnaireSlot={(ctx) => <DemoQuestionnaire {...ctx} />}
                sx={{
                  flex: 1,
                  height: '100%',
                  minHeight: 0,
                  '& .MuiPaper-outlined': {
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                    background: '#fff',
                  },
                  '& .MuiPaper-outlined > .MuiBox-root:nth-of-type(1)': {
                    borderRight: '1px solid #e2e8f0',
                    background: '#fff',
                  },
                  '& .MuiPaper-outlined > .MuiBox-root:nth-of-type(2)': {
                    width: '5px',
                    backgroundColor: '#e2e8f0',
                    transition: 'background-color 0.2s',
                    '&:hover': { backgroundColor: '#EC6160' },
                  },
                  '& .MuiPaper-outlined > .MuiBox-root:nth-of-type(3)': {
                    background: '#f1f5f9',
                  },
                  '& .MuiTabs-root': {
                    background: '#fff',
                    minHeight: 44,
                    borderBottom: '1px solid #e2e8f0',
                  },
                  '& .MuiTab-root': {
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    minHeight: 44,
                    opacity: 0.75,
                    transition: 'opacity 0.15s',
                    '&.Mui-selected': { fontWeight: 600, opacity: 1 },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#EC6160',
                    height: 3,
                    borderRadius: '3px 3px 0 0',
                  },
                  '& .MuiBox-root:has(+ .MuiBox-root > .react-pdf__Document)': {
                    backgroundColor: '#fff',
                    borderBottom: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    py: 0.75,
                    gap: 1.5,
                    '& .MuiIconButton-root': {
                      borderRadius: '6px',
                      color: '#475569',
                      '&:hover': { backgroundColor: '#f1f5f9', color: '#1e293b' },
                      '&.Mui-disabled': { color: '#cbd5e1' },
                    },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '6px',
                      backgroundColor: '#f8fafc',
                      fontSize: '0.85rem',
                      '& fieldset': { borderColor: '#e2e8f0' },
                      '&:hover fieldset': { borderColor: '#cbd5e1' },
                      '&.Mui-focused fieldset': { borderColor: '#EC6160' },
                    },
                    '& .MuiTypography-body2': {
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      color: '#64748b',
                    },
                  },
                  '& .MuiBox-root:has(> .react-pdf__Document)': {
                    backgroundColor: '#dfe4ea',
                    backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.035) 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                    padding: '20px 16px',
                  },
                  '& .react-pdf__Page': {
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                  },
                  '& .react-pdf__Page canvas': {
                    display: 'block',
                  },
                  '& [data-page]': {
                    scrollMarginTop: '12px',
                  },
                }}
              />
            </div>

          </div>
        </ScidQuestProvider>
      </QuestionnaireAIProvider>
    </ThemeProvider>
  );
}
