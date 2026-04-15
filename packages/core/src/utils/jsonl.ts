import { readFileSync } from "node:fs";

export function* parseJsonlLines(content: string): Generator<Record<string, unknown>> {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      yield JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      // Skip malformed lines
    }
  }
}

export function readJsonlFile(filePath: string): Generator<Record<string, unknown>> {
  const content = readFileSync(filePath, "utf-8");
  return parseJsonlLines(content);
}
