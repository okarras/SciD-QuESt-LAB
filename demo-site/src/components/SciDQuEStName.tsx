import { useCallback, useState, type CSSProperties } from 'react';

const SEGMENTS = [
  {
    id: 'sci',
    letters: 'Sci',
    meaning: 'Scientific',
    color: '#60a5fa',
    context: 'From scientific literature',
  },
  {
    id: 'd',
    letters: 'D',
    meaning: 'Documents',
    color: '#34d399',
    context: 'Research papers & PDFs',
  },
  {
    id: 'qu',
    letters: 'Qu',
    meaning: 'Questionnaire-Based',
    color: '#fbbf24',
    context: 'Template-driven forms',
  },
  {
    id: 'e',
    letters: 'E',
    meaning: 'Extraction',
    color: '#f472b6',
    context: 'Pull structured answers',
  },
  {
    id: 'st',
    letters: 'St',
    meaning: 'Structuring',
    color: '#a78bfa',
    context: 'Into the Open Research Knowledge Graph',
  },
] as const;

type SegmentId = (typeof SEGMENTS)[number]['id'];

const EXPANSION_PARTS: { segmentId: SegmentId | null; text: string }[] = [
  { segmentId: null, text: 'From ' },
  { segmentId: 'sci', text: 'Scientific' },
  { segmentId: null, text: ' ' },
  { segmentId: 'd', text: 'Documents' },
  { segmentId: null, text: ' to Knowledge – ' },
  { segmentId: 'qu', text: 'Questionnaire-Based' },
  { segmentId: null, text: ' ' },
  { segmentId: 'e', text: 'Extraction' },
  { segmentId: null, text: ' and ' },
  { segmentId: 'st', text: 'Structuring' },
  { segmentId: null, text: ' of Knowledge' },
];

type SciDQuEStNameProps = {
  variant?: 'hero' | 'inline' | 'footer';
  className?: string;
};

export default function SciDQuEStName({
  variant = 'inline',
  className = '',
}: SciDQuEStNameProps) {
  const [activeId, setActiveId] = useState<SegmentId | null>(null);

  const activeSegment = SEGMENTS.find((segment) => segment.id === activeId) ?? null;

  const activate = useCallback((id: SegmentId) => setActiveId(id), []);
  const deactivate = useCallback(() => setActiveId(null), []);

  const toggle = useCallback((id: SegmentId) => {
    setActiveId((current) => (current === id ? null : id));
  }, []);

  const renderSegment = (segment: (typeof SEGMENTS)[number]) => {
    const isActive = activeId === segment.id;
    const isDimmed = activeId !== null && !isActive;

    return (
      <span
        key={segment.id}
        className={`scidquest-name__segment${isActive ? ' is-active' : ''}${isDimmed ? ' is-dimmed' : ''}`}
        style={{ '--segment-color': segment.color } as CSSProperties}
        onMouseEnter={() => activate(segment.id)}
        onMouseLeave={deactivate}
        onFocus={() => activate(segment.id)}
        onBlur={deactivate}
        onClick={() => toggle(segment.id)}
        tabIndex={0}
        role="button"
        aria-pressed={isActive}
        aria-label={`${segment.letters}: ${segment.meaning}`}
      >
        <span className="scidquest-name__letters">{segment.letters}</span>
        {variant !== 'hero' && (
          <span className="scidquest-name__tooltip" aria-hidden="true">
            <span className="scidquest-name__tooltip-word">{segment.meaning}</span>
          </span>
        )}
      </span>
    );
  };

  return (
    <div
      className={`scidquest-name scidquest-name--${variant}${activeId ? ' has-active' : ''} ${className}`.trim()}
      role="group"
      aria-label="SciD-QuESt acronym — hover or tap each part to reveal its meaning"
    >
      <div className="scidquest-name__word">
        {renderSegment(SEGMENTS[0])}
        {renderSegment(SEGMENTS[1])}
        <span className="scidquest-name__hyphen" aria-hidden="true">
          -
        </span>
        {renderSegment(SEGMENTS[2])}
        {renderSegment(SEGMENTS[3])}
        {renderSegment(SEGMENTS[4])}
      </div>

      {variant === 'hero' && (
        <>
          <p className="scidquest-name__hint">
            {activeSegment ? (
              <>
                <span
                  className="scidquest-name__hint-dot"
                  style={{ background: activeSegment.color }}
                  aria-hidden="true"
                />
                {activeSegment.meaning}
                <span className="scidquest-name__hint-context"> — {activeSegment.context}</span>
              </>
            ) : (
              'Hover over the acronym to explore its meaning.'
            )}
          </p>

          <p
            className={`scidquest-name__expansion${activeId ? ' has-active' : ''}`}
            aria-live="polite"
          >
            {EXPANSION_PARTS.map((part, index) =>
              part.segmentId ? (
                <span
                  key={`${part.segmentId}-${index}`}
                  className={`scidquest-name__expansion-word${
                    activeId === part.segmentId ? ' is-highlighted' : ''
                  }`}
                  style={
                    {
                      '--segment-color':
                        SEGMENTS.find((segment) => segment.id === part.segmentId)?.color ??
                        'inherit',
                    } as CSSProperties
                  }
                >
                  {part.text}
                </span>
              ) : (
                <span key={`plain-${index}`}>{part.text}</span>
              ),
            )}
          </p>
        </>
      )}
    </div>
  );
}
