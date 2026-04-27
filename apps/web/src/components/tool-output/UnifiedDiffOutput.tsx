import { lazy, Suspense } from "react";

interface UnifiedDiffOutputProps {
  text: string;
}

const PatchDiff = lazy(() =>
  import("@pierre/diffs/react").then((mod) => ({ default: mod.PatchDiff })),
);

const DIFF_OPTIONS = {
  diffStyle: "unified",
  overflow: "wrap",
  theme: "github-light",
  disableFileHeader: true,
  hunkSeparators: "line-info-basic",
} as const;

function looksLikePatch(text: string) {
  return /(^|\n)(diff --git |--- |\+\+\+ |@@ )/.test(text);
}

function getLineKey(line: string, occurrence: number) {
  return `${line}:${occurrence}`;
}

function getUnifiedDiffLineClassName(line: string) {
  if (/^(Index:|diff\s|===)/.test(line)) {
    return "text-[var(--console-text)] bg-[#f3f4f6]";
  }
  if (line.startsWith("@@")) {
    return "text-[#7c3aed] bg-[#f5f3ff]";
  }
  if (line.startsWith("+++ ") || line.startsWith("--- ")) {
    return "text-[#1d4ed8] bg-[#eff6ff]";
  }
  if (line.startsWith("+")) {
    return "text-[#15803d] bg-[#f0fdf4]";
  }
  if (line.startsWith("-")) {
    return "text-[#b91c1c] bg-[#fef2f2]";
  }
  return "text-[var(--console-text)]";
}

export function UnifiedDiffOutput({ text }: UnifiedDiffOutputProps) {
  if (looksLikePatch(text)) {
    return (
      <div className="max-h-[420px] overflow-auto rounded-sm border border-[var(--console-border)] bg-[#fafafa] text-xs">
        <Suspense
          fallback={
            <pre className="console-mono whitespace-pre-wrap p-3 text-xs leading-relaxed text-[var(--console-muted)]">
              Rendering diff...
            </pre>
          }
        >
          <PatchDiff
            patch={text}
            options={DIFF_OPTIONS}
            disableWorkerPool
            style={{ fontSize: "0.75rem", lineHeight: 1.55 }}
          />
        </Suspense>
      </div>
    );
  }

  const lines = text.split("\n");
  const lineOccurrences = new Map<string, number>();

  return (
    <pre className="console-mono max-h-[420px] overflow-auto whitespace-pre rounded-sm border border-[var(--console-border)] bg-[#fafafa] p-3 text-xs leading-relaxed">
      {lines.map((line) => {
        const occurrence = lineOccurrences.get(line) ?? 0;
        lineOccurrences.set(line, occurrence + 1);
        return (
          <span
            key={getLineKey(line, occurrence)}
            className={`block rounded-[2px] px-1 ${getUnifiedDiffLineClassName(line)}`}
          >
            {line || " "}
          </span>
        );
      })}
    </pre>
  );
}
