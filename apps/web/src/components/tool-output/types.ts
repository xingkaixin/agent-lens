export type ToolOutputLanguage = string;

export interface PlainToolOutputContent {
  kind: "plain";
  text: string;
  language: ToolOutputLanguage;
  isCode: boolean;
}

export interface DiffLineItem {
  type: "context" | "add" | "remove";
  text: string;
}

export interface DiffBlock {
  label: string;
  lines: DiffLineItem[];
}

export interface StructuredDiffToolOutputContent {
  kind: "structured-diff";
  blocks: DiffBlock[];
}

export interface FileSectionItem {
  label: string;
  operation: "write" | "edit";
  language: ToolOutputLanguage;
  isCode: boolean;
  text: string;
}

export interface FileSectionsToolOutputContent {
  kind: "file-sections";
  sections: FileSectionItem[];
}

export interface QuestionListOptionItem {
  label: string;
  description?: string;
  recommended?: boolean;
}

export interface QuestionListItem {
  header?: string;
  question: string;
  options: QuestionListOptionItem[];
  answers: string[];
}

export interface QuestionListToolOutputContent {
  kind: "question-list";
  questions: QuestionListItem[];
}

export type ToolOutputContent =
  | PlainToolOutputContent
  | StructuredDiffToolOutputContent
  | FileSectionsToolOutputContent
  | QuestionListToolOutputContent;
