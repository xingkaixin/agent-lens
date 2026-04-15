import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FileSectionsOutput } from "./FileSectionsOutput";
import { QuestionListOutput } from "./QuestionListOutput";
import { StructuredDiffOutput } from "./StructuredDiffOutput";
import type { ToolOutputContent } from "./types";
import { UnifiedDiffOutput } from "./UnifiedDiffOutput";

interface ToolOutputRendererProps {
  outputContent: ToolOutputContent;
}

export function ToolOutputRenderer({ outputContent }: ToolOutputRendererProps) {
  if (outputContent.kind === "structured-diff") {
    return <StructuredDiffOutput blocks={outputContent.blocks} />;
  }

  if (outputContent.kind === "file-sections") {
    return <FileSectionsOutput sections={outputContent.sections} />;
  }

  if (outputContent.kind === "question-list") {
    return <QuestionListOutput questions={outputContent.questions} />;
  }

  const outputText = outputContent.text || "No output captured.";

  if (!outputContent.isCode || outputContent.language === "text") {
    return (
      <pre className="console-mono max-h-[420px] overflow-auto whitespace-pre-wrap break-all rounded-sm border border-[var(--console-border)] bg-[#fafafa] p-3 text-xs leading-relaxed text-[var(--console-text)]">
        {outputText}
      </pre>
    );
  }

  if (outputContent.language === "diff") {
    return <UnifiedDiffOutput text={outputText} />;
  }

  return (
    <div className="max-h-[420px] overflow-auto rounded-sm border border-[var(--console-border)] bg-[#fafafa]">
      <SyntaxHighlighter
        language={outputContent.language}
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: "0.75rem",
          borderRadius: 0,
          background: "transparent",
          fontSize: "0.75rem",
          lineHeight: 1.55,
        }}
        codeTagProps={{ className: "console-mono" }}
        wrapLongLines
      >
        {outputText}
      </SyntaxHighlighter>
    </div>
  );
}
