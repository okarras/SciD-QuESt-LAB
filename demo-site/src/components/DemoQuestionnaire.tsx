import {
  ResearchQuestionnaireFieldAiWrapper,
  type ResearchQuestionnaireWorkspaceValue,
} from '@orkg/scidquest';
import type { Question } from '@orkg/scidquest';
import { TextField } from '@mui/material';

function getQuestionText(question: Question): string {
  return question.label ?? question.title ?? question.id;
}

function getAnswerString(answers: Record<string, unknown>, questionId: string): string {
  const value = answers[questionId];
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

interface DemoQuestionnaireProps extends ResearchQuestionnaireWorkspaceValue {}

export default function DemoQuestionnaire({
  templateSpec,
  answers,
  setAnswers,
  pdfExtractionError,
  onRetryExtraction,
}: DemoQuestionnaireProps) {
  const updateAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  return (
    <div className="demo-questionnaire">
      <header className="demo-questionnaire__header">
        <h2 className="demo-questionnaire__title">{templateSpec.template}</h2>
        <p className="demo-questionnaire__meta">
          Template {templateSpec.template_id}
          {templateSpec.version ? ` · v${templateSpec.version}` : ''}
        </p>
      </header>

      {pdfExtractionError && (
        <div className="demo-questionnaire__alert demo-questionnaire__alert--error">
          <span>PDF extraction failed: {pdfExtractionError.message}</span>
          {onRetryExtraction && (
            <button type="button" className="demo-questionnaire__retry" onClick={onRetryExtraction}>
              Retry
            </button>
          )}
        </div>
      )}

      {templateSpec.sections.map((section) => (
        <section key={section.id} className="demo-questionnaire__section">
          <h3 className="demo-questionnaire__section-title">{section.title}</h3>

          <div className="demo-questionnaire__fields">
            {section.questions.map((question) => {
              if (question.type !== 'text') return null;

              const questionText = getQuestionText(question);
              const value = getAnswerString(answers, question.id);

              return (
                <div key={question.id} className="demo-questionnaire__field">
                  <div className="demo-questionnaire__field-header">
                    <label htmlFor={question.id} className="demo-questionnaire__label">
                      {questionText}
                      {question.required && <span className="demo-questionnaire__required">Required</span>}
                    </label>
                  </div>

                  <ResearchQuestionnaireFieldAiWrapper
                    questionId={question.id}
                    questionText={questionText}
                    questionType="text"
                    currentAnswer={value}
                    aiLayout="buttons"
                    aiActions={['suggest', 'verify']}
                    onApplySuggestion={(text) => updateAnswer(question.id, text)}
                  >
                    <TextField
                      id={question.id}
                      value={value}
                      onChange={(e) => updateAnswer(question.id, e.target.value)}
                      placeholder="Enter your answer…"
                      multiline
                      minRows={4}
                      maxRows={12}
                      fullWidth
                      size="small"
                      className="demo-questionnaire__input"
                    />
                  </ResearchQuestionnaireFieldAiWrapper>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
