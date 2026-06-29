import { useState, useMemo } from 'react';
import {
  ScidQuestProvider,
  QuestionnaireAIProvider,
  ResearchQuestionnaireApp,
} from '@orkg/scidquest';
import type { UploadedPdf } from '@orkg/scidquest';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { OpenRouterLLM, MockLLM, AVAILABLE_MODELS } from '../services/OpenRouterLLM';
import type { LLMService, QuestionnaireTemplate } from '@orkg/scidquest';
import Header from './Header';

function resolvePdfUrl(path: string): string {
  if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return new URL(path, window.location.origin).href;
}

// Preloaded mock PDF plain text context
const SAMPLE_PDF_TEXT = `WCI: The Web Context Interface for Agentic Web Automation
Amirreza Alasti, Niloufar Ghandeharioun, Oliver Karras
Leibniz University Hannover, TIB Information Centre, Germany

ABSTRACT
Web agents struggle to interact with complex web environments designed for humans. We propose the Web Context Interface (WCI), a browser-native framework for agentic web automation. WCI enables site operators to expose structured in-context contracts using lightweight semantic HTML annotations.

1. INTRODUCTION
Large Language Models (LLMs) have accelerated the development of LLM web agents. We evaluate WCI on a benchmark of 50 multi-step grounding scenarios.

3. METHODOLOGY (Student's t-test Evaluation)
To measure statistical significance of the token reductions and task success rates, we performed a Student's t-test.
The input dataset consists of success rate percentages and token usage logs across 15,000 runs.
The specified input parameter contains the paired observation variables: (1) Raw HTML baseline runs, and (2) WCI annotated runs.
The specified output represents the test statistic: (1) t-value = 5.24, (2) p-value < 0.001, proving highly significant performance gains.`;

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

// Student's t-test Template Spec matching the screenshot
const templateSpec: QuestionnaireTemplate = {
  version: '1',
  template: "Student's t-test",
  template_id: 'R12002',
  sections: [
    {
      id: 'input-sec',
      title: 'has specified input',
      questions: [
        {
          id: 'has_specified_input',
          label: 'has specified input',
          type: 'text',
          required: true,
          desc: 'Enter has specified input...',
        },
      ],
    },
    {
      id: 'output-sec',
      title: 'has specified output',
      questions: [
        {
          id: 'has_specified_output',
          label: 'has specified output',
          type: 'text',
          required: true,
          desc: 'Enter has specified output...',
        },
      ],
    },
  ],
};

interface LiveDemoProps {
  onBack: () => void;
}

export default function LiveDemo({ onBack }: LiveDemoProps) {
  const [mode, setMode] = useState<'mock' | 'live'>('mock');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [showConfig, setShowConfig] = useState(false);

  // Controlled files state to allow uploading custom PDFs alongside the preloaded wci.pdf
  const initialFile = useMemo<UploadedPdf>(() => ({
    id: 'wci-paper',
    name: 'wci.pdf',
    size: 1048576, // 1MB
    url: resolvePdfUrl('/wci.pdf'),
    extractionStatus: 'done' as const,
    extractedText: SAMPLE_PDF_TEXT,
  }), []);

  const [files, setFiles] = useState<UploadedPdf[]>([initialFile]);
  const [activeFileId, setActiveFileId] = useState<string | null>('wci-paper');

  const llmService: LLMService = useMemo(() => {
    if (mode === 'mock') return new MockLLM();
    return new OpenRouterLLM(apiKey, selectedModel);
  }, [mode, apiKey, selectedModel]);

  return (
    <ThemeProvider theme={orkgTheme}>
      <QuestionnaireAIProvider>
        <ScidQuestProvider llmService={llmService}>
          <div className="demo-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#1e293b' }}>
            
            {/* Standard landing header replicated at the top of the demo page */}
            <Header onTryDemo={() => {}} />

            {/* Sub-Header Toolbar with Submit and AI Settings */}
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

              {/* Left: Back to landing */}
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

              {/* Right: AI Settings Button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                  ⚙️ AI Settings ({mode === 'mock' ? 'Mock' : 'OpenRouter'})
                </button>
              </div>
            </div>

            {/* Collapsible AI Config Dropdown Banner */}
            {showConfig && (
              <div style={{
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'flex-end',
                animation: 'fadeSlideIn 0.25s ease'
              }}>
                <div style={{ flex: '0 0 auto' }}>
                  <label className="demo-config__label" style={{ color: '#475569' }}>Mode</label>
                  <div className="demo-mode-toggle" style={{ border: '1px solid #cbd5e1' }}>
                    <button
                      className={`demo-mode-btn ${mode === 'mock' ? 'active' : ''}`}
                      onClick={() => setMode('mock')}
                      style={{ background: mode === 'mock' ? '#EC6160' : '#ffffff', color: mode === 'mock' ? '#ffffff' : '#475569' }}
                    >
                      🧪 Mock
                    </button>
                    <button
                      className={`demo-mode-btn ${mode === 'live' ? 'active' : ''}`}
                      onClick={() => setMode('live')}
                      style={{ background: mode === 'live' ? '#EC6160' : '#ffffff', color: mode === 'live' ? '#ffffff' : '#475569' }}
                    >
                      🌐 Live OpenRouter
                    </button>
                  </div>
                </div>

                {mode === 'live' && (
                  <>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <label className="demo-config__label" style={{ color: '#475569' }}>OpenRouter API Key</label>
                      <input
                        type="password"
                        placeholder="sk-or-v1-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem'
                        }}
                      />
                    </div>
                    <div style={{ minWidth: '200px' }}>
                      <label className="demo-config__label" style={{ color: '#475569' }}>Model</label>
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
                  </>
                )}
              </div>
            )}

            {/* Core Split-Panel Workspace area (ResearchQuestionnaireApp in split layout) */}
            <div style={{ background: '#f8fafc', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
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
                multiple={true} // Allow multiple files so upload adds tabs and shows PDF view
                sx={{
                  flex: 1,
                  height: '100%',
                  minHeight: 0,
                  '& .MuiPaper-root': {
                    border: 'none',
                    boxShadow: 'none',
                  },
                  '& .MuiAccordion-root': {
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    marginBottom: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    '&::before': {
                      display: 'none',
                    },
                    '&.Mui-expanded': {
                      margin: '0 0 12px 0',
                    }
                  },
                  '& .MuiAccordionSummary-root': {
                    borderBottom: '1px solid #f1f5f9',
                    background: '#f8fafc',
                  },
                  '& .MuiAccordion-root.Mui-expanded': {
                    borderLeft: '4px solid #EC6160'
                  }
                }}
              />
            </div>

          </div>
        </ScidQuestProvider>
      </QuestionnaireAIProvider>
    </ThemeProvider>
  );
}
