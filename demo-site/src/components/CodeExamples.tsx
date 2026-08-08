import { useState, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import typescript from 'highlight.js/lib/languages/typescript';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';

hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);

const tabs = [
  {
    id: 'install',
    label: 'Installation',
    lang: 'bash',
    code: `# Install the package
npm install @orkg/scidquest

# Peer dependencies (if not already in your project)
npm install react react-dom @mui/material @emotion/react @emotion/styled

# Import styles in your app entrypoint
# import "@orkg/scidquest/dist/contribute-standalone.css";`,
  },
  {
    id: 'quickstart',
    label: 'Quick Start',
    lang: 'typescript',
    code: `import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "@orkg/scidquest/dist/contribute-standalone.css";
import {
  ScidQuestProvider,
  QuestionnaireAIProvider,
  ResearchQuestionnaireApp,
  type LLMService,
  type QuestionnaireTemplate,
} from "@orkg/scidquest";

// Define your questionnaire template
const templateSpec: QuestionnaireTemplate = {
  version: "1",
  template: "demo",
  template_id: "demo",
  sections: [
    {
      id: "sec1",
      title: "Research Analysis",
      questions: [
        { id: "q1", label: "Main contribution", type: "text", required: true },
        { id: "q2", label: "Methodology", type: "text", required: true },
        { id: "q3", label: "Key findings", type: "text", required: false },
      ],
    },
  ],
};

function App() {
  const llmService = useMemo(() => new MyLLMService(), []);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  return (
    <QuestionnaireAIProvider>
      <ScidQuestProvider llmService={llmService}>
        <ResearchQuestionnaireApp
          templateSpec={templateSpec}
          answers={answers}
          setAnswers={setAnswers}
          layout="split"
          multiModal // accept sheets, code, JSON, ZIPs, and links — not just PDFs
        />
      </ScidQuestProvider>
    </QuestionnaireAIProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><App /></React.StrictMode>
);`,
  },
  {
    id: 'multimodal',
    label: 'Multi-Modal Files',
    lang: 'typescript',
    code: `import { useState } from "react";
import type { UploadedFile } from "@orkg/scidquest";
import { ResearchQuestionnaireApp } from "@orkg/scidquest";

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  return (
    <ResearchQuestionnaireApp
      templateSpec={templateSpec}
      answers={answers}
      setAnswers={setAnswers}
      layout="split"
      // Enables sheets, code, JSON, ZIPs, and pasted links — plus the
      // built-in file manager panel (rename, remove, bulk-delete, switch).
      multiModal
      controlledUploadedFiles={uploadedFiles}
      controlledActiveFileId={activeFileId}
      onUploadedFilesChange={setUploadedFiles}
      onActiveFileIdChange={setActiveFileId}
      maxFiles={10}
      // Optional: offer host-owned pickers (Drive, Dropbox, ...) alongside
      // local upload. The library never sees credentials or tokens.
      externalSources={[
        {
          id: "google-drive",
          label: "Drive",
          importFiles: async () => {
            // open your own picker/auth flow, return File[]
            return [];
          },
        },
      ]}
    />
  );
}`,
  },
  {
    id: 'llm',
    label: 'LLM Service (OpenRouter)',
    lang: 'typescript',
    code: `import type { LLMService } from "@orkg/scidquest";

class OpenRouterLLM implements LLMService {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "openai/gpt-4o-mini") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(
    prompt: string,
    options?: { systemContext?: string }
  ) {
    const messages = [];
    if (options?.systemContext) {
      messages.push({ role: "system", content: options.systemContext });
    }
    messages.push({ role: "user", content: prompt });

    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${this.apiKey}\`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.3,
        }),
      }
    );

    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content || "" };
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey.length > 8;
  }
}`,
  },
  {
    id: 'template',
    label: 'Template Spec',
    lang: 'json',
    code: `{
  "version": "1",
  "template": "research-analysis",
  "template_id": "research-analysis-v1",
  "sections": [
    {
      "id": "overview",
      "title": "Paper Overview",
      "questions": [
        {
          "id": "title",
          "label": "Paper title",
          "type": "text",
          "required": true
        },
        {
          "id": "contribution",
          "label": "Main contribution",
          "type": "text",
          "required": true
        },
        {
          "id": "domain",
          "label": "Research domain",
          "type": "select",
          "options": ["NLP", "Computer Vision", "ML Theory", "Other"],
          "required": true
        }
      ]
    },
    {
      "id": "methodology",
      "title": "Methodology",
      "questions": [
        {
          "id": "method",
          "label": "Describe the methodology",
          "type": "text",
          "required": true
        },
        {
          "id": "datasets",
          "label": "Datasets used",
          "type": "text",
          "required": false
        }
      ]
    },
    {
      "id": "results",
      "title": "Results & Impact",
      "questions": [
        {
          "id": "findings",
          "label": "Key findings",
          "type": "text",
          "required": true
        },
        {
          "id": "limitations",
          "label": "Limitations",
          "type": "text",
          "required": false
        }
      ]
    }
  ]
}`,
  },
];

export default function CodeExamples() {
  const [activeTab, setActiveTab] = useState('install');
  const codeRef = useRef<HTMLElement>(null);

  const current = tabs.find((t) => t.id === activeTab)!;

  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [activeTab]);

  return (
    <section className="section" id="code">
      <div className="section-inner">
        <h2 className="section-title">
          Quick <span className="gradient-text">Start</span>
        </h2>
        <p className="section-subtitle">
          Install, implement <code>LLMService</code>, define a template, render the app.
        </p>

        <div className="code-examples-wrap">
          <div className="code-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={`code-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="code-panel">
            <pre>
              <code ref={codeRef} className={`language-${current.lang}`}>
                {current.code}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
