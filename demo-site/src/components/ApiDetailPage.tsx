import { useMemo, useState } from 'react';
import { Box, Paper, IconButton, Tooltip } from '@mui/material';
import { createHighlightedCodeBlockProps } from '@tanstack/highlight/react';
import { defaultHighlighter } from '@tanstack/highlight';
import { githubLightTheme } from '@tanstack/highlight/themes/github-light';
import { createThemeCss } from '@tanstack/highlight/theme';
import { apis, typeColorMap } from '../data/apiReference';
import type { ApiField } from '../data/apiReference';
import { apiLiveDemos } from './apiLiveDemos';

interface ApiDetailPageProps {
  apiName: string;
  onBack: () => void;
}

const codeThemeCss = createThemeCss({ light: githubLightTheme });

const codeBlockLangMap: Record<'typescript' | 'bash' | 'json', string> = {
  typescript: 'ts',
  bash: 'shell',
  json: 'json',
};

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: 'typescript' | 'bash' | 'json' }) {
  const [copied, setCopied] = useState(false);
  const block = useMemo(
    () =>
      createHighlightedCodeBlockProps({
        code,
        lang: codeBlockLangMap[lang],
        highlighter: defaultHighlighter,
      }),
    [code, lang]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(block.copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Paper
      elevation={8}
      sx={{
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'rgba(0, 0, 0, 0.15)',
        }}
      >
        <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: 'inherit' }}>
            <CopyIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ overflow: 'auto', maxHeight: 520 }} dangerouslySetInnerHTML={{ __html: block.htmlMarkup }} />
    </Paper>
  );
}

function renderInline(text: string) {
  return text.split(/`([^`]+)`/g).map((part, i) => (i % 2 === 1 ? <code key={i}>{part}</code> : part));
}

function FieldsTable({ fields, headerLabel }: { fields: ApiField[]; headerLabel: string }) {
  const hasDefaults = fields.some((f) => f.default !== undefined);
  return (
    <div className="comparison-table-wrap">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>{headerLabel}</th>
            <th>Type</th>
            {hasDefaults && <th>Default</th>}
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name}>
              <td>
                <code>{f.name}</code>
              </td>
              <td>
                <code>{f.type}</code>
              </td>
              {hasDefaults && <td>{f.default !== undefined ? <code>{f.default}</code> : '—'}</td>}
              <td>{renderInline(f.desc)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ApiDetailPage({ apiName, onBack }: ApiDetailPageProps) {
  const api = apis.find((a) => a.name === apiName);
  const LiveDemoComponent = api ? apiLiveDemos[api.name] : undefined;

  return (
    <section className="section">
      <style>{codeThemeCss}</style>
      <div className={`section-inner api-detail${LiveDemoComponent ? ' api-detail--wide' : ''}`}>
        <button className="btn btn-ghost-light btn-sm api-detail__back" onClick={onBack}>
          ← Back to API Reference
        </button>

        {api ? (
          <>
            <h1 className="api-detail__name">{api.name}</h1>
            <span className={`api-card__type ${typeColorMap[api.type] || ''}`}>{api.type}</span>
            <p className="api-detail__desc">{renderInline(api.doc?.intro ?? api.desc)}</p>

            {(() => {
              const demoSection = LiveDemoComponent && (
                <>
                  <div className="api-detail__section-label">Try it</div>
                  {api.demoNote && <p className="api-detail__demo-note">{renderInline(api.demoNote)}</p>}
                  <LiveDemoComponent />
                </>
              );

              const docSection = api.doc && (
                <>
                  {api.doc.members.map((m) => (
                    <div className="api-detail__member" key={m.heading}>
                      <h3 className="api-detail__member-heading">{m.heading}</h3>
                      {m.signature && <div className="api-detail__signature">{m.signature}</div>}
                      {m.desc && <p className="api-detail__desc">{renderInline(m.desc)}</p>}
                      {m.notes && (
                        <ol>
                          {m.notes.map((n, i) => (
                            <li key={i}>{renderInline(n)}</li>
                          ))}
                        </ol>
                      )}
                      {m.params && <FieldsTable fields={m.params} headerLabel="Prop" />}
                      {m.returns && (
                        <>
                          <div className="api-detail__section-label">Returns</div>
                          {m.returns.desc && (
                            <p className="api-detail__desc">{renderInline(m.returns.desc)}</p>
                          )}
                          {m.returns.fields && (
                            <FieldsTable fields={m.returns.fields} headerLabel="Field" />
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {api.doc.examples?.map((ex, i) => (
                    <div key={i}>
                      <div className="api-detail__section-label">{ex.label ?? 'Example'}</div>
                      <CodeBlock code={ex.code} lang={ex.lang} />
                    </div>
                  ))}
                </>
              );

              return api.docsBeforeDemo ? (
                <>
                  {docSection}
                  {demoSection}
                </>
              ) : (
                <>
                  {demoSection}
                  {docSection}
                </>
              );
            })()}
          </>
        ) : (
          <p>Unknown API: {apiName}</p>
        )}
      </div>
    </section>
  );
}
