import type { ToolOutputLanguage } from "./types";

const FILE_NAME_LANGUAGE_MAP: Record<string, ToolOutputLanguage> = {
  ".bashrc": "bash",
  ".zshrc": "bash",
  ".profile": "bash",
  dockerfile: "docker",
  ".env": "ini",
};

const EXTENSION_LANGUAGE_MAP: Record<string, ToolOutputLanguage> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  sql: "sql",
  rs: "rust",
  go: "go",
  java: "java",
  c: "c",
  h: "c",
  cc: "cpp",
  cpp: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  cs: "csharp",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  html: "html",
  css: "css",
  yaml: "yaml",
  yml: "yaml",
  json: "json",
  md: "markdown",
  toml: "toml",
  conf: "ini",
  xml: "markup",
  svg: "markup",
  properties: "ini",
  dockerfile: "docker",
};

export function detectLanguageByFilePath(filePath: string): ToolOutputLanguage {
  const fileName = filePath.split("/").pop()?.toLowerCase() ?? "";
  if (!fileName) return "text";

  const directMatch = FILE_NAME_LANGUAGE_MAP[fileName];
  if (directMatch) return directMatch;

  if (fileName.startsWith(".env.")) return "ini";

  const extension = fileName.includes(".") ? (fileName.split(".").pop() ?? "") : "";
  if (!extension) return "text";

  return EXTENSION_LANGUAGE_MAP[extension] || "text";
}
