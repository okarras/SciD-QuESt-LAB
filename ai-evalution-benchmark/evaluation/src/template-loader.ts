/**
 * Template Loader - Loads the questionnaire template
 */

import * as fs from 'fs';
import * as path from 'path';
import { EvalConfigLoader } from './eval-config-loader';

export interface TemplateQuestion {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  choice_type?: string;
  options?: string[];
  evidence_fields?: string[];
  desc?: string;
  validation?: any;
  disable_ai_assistant?: boolean;
}

export interface TemplateSection {
  id: string;
  title: string;
  questions: TemplateQuestion[];
}

export interface QuestionnaireTemplate {
  version: string;
  template: string;
  template_id: string;
  sections: TemplateSection[];
}

export class FrontendTemplateLoader {
  private templatePath: string;
  private template: QuestionnaireTemplate | null = null;
  private evalConfigLoader: EvalConfigLoader;

  constructor(templatePath?: string) {
    this.templatePath =
      templatePath ||
      path.resolve(
        __dirname,
        '../templates/empirical_research_questionaire.json'
      );
    this.evalConfigLoader = new EvalConfigLoader(this.templatePath);
  }

  getTemplatePath(): string {
    return this.templatePath;
  }

  getEvalConfigLoader(): EvalConfigLoader {
    return this.evalConfigLoader;
  }

  loadTemplate(): QuestionnaireTemplate {
    if (this.template) {
      return this.template;
    }

    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template file not found: ${this.templatePath}`);
    }

    try {
      const templateContent = fs.readFileSync(this.templatePath, 'utf-8');
      this.template = JSON.parse(templateContent);

      console.log(
        `Loaded template: ${this.template!.template} (${this.template!.template_id})`
      );
      console.log(`Sections: ${this.template!.sections.length}`);

      return this.template!;
    } catch (error) {
      throw new Error(
        `Failed to load template: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractQuestionsRecursively(
    question: any,
    sectionId: string,
    sectionTitle: string,
    parentPath: string = ''
  ): TemplateQuestion[] {
    const questions: TemplateQuestion[] = [];
    const currentPath = parentPath
      ? `${parentPath}.${question.id}`
      : question.id;

    if (question.type !== 'group' && question.type !== 'repeat_group') {
      questions.push({
        ...question,
        sectionId,
        sectionTitle,
        questionPath: currentPath,
      } as TemplateQuestion & {
        sectionId: string;
        sectionTitle: string;
        questionPath: string;
      });
    }

    if (question.item_fields && Array.isArray(question.item_fields)) {
      for (const nestedQuestion of question.item_fields) {
        questions.push(
          ...this.extractQuestionsRecursively(
            nestedQuestion,
            sectionId,
            sectionTitle,
            currentPath
          )
        );
      }
    }
    if (question.subquestions && Array.isArray(question.subquestions)) {
      for (const nestedQuestion of question.subquestions) {
        questions.push(
          ...this.extractQuestionsRecursively(
            nestedQuestion,
            sectionId,
            sectionTitle,
            currentPath
          )
        );
      }
    }

    return questions;
  }

  getAllQuestions(): TemplateQuestion[] {
    const template = this.loadTemplate();
    const questions: TemplateQuestion[] = [];

    for (const section of template.sections) {
      for (const question of section.questions) {
        questions.push(
          ...this.extractQuestionsRecursively(
            question,
            section.id,
            section.title
          )
        );
      }
    }

    return questions;
  }

  getEvaluationQuestions(): TemplateQuestion[] {
    const allQuestions = this.getAllQuestions();
    const evalConfig = this.evalConfigLoader.load();
    const skipQuestions = evalConfig.skip_questions;
    const skipTypes = evalConfig.skip_types;

    return allQuestions.filter((question) => {
      // Skip types defined in eval config
      if (skipTypes.includes(question.type)) {
        return false;
      }

      // Skip questions that disable AI assistant (template-level flag)
      if (question.disable_ai_assistant) {
        return false;
      }

      // Skip question IDs defined in eval config
      if (skipQuestions.includes(question.id)) {
        return false;
      }

      // Skip questions without clear text
      if (!question.label || question.label.trim().length === 0) {
        return false;
      }

      return true;
    });
  }
}
