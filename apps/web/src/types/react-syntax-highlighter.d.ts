declare module "react-syntax-highlighter" {
  import { ComponentType } from "react";
  interface SyntaxHighlighterProps {
    language?: string;
    style?: Record<string, unknown>;
    customStyle?: React.CSSProperties;
    codeTagProps?: { className?: string };
    wrapLongLines?: boolean;
    children: string;
  }
  const SyntaxHighlighter: ComponentType<SyntaxHighlighterProps>;
  export { SyntaxHighlighter };
  export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module "react-syntax-highlighter/dist/esm/styles/prism" {
  export const oneLight: Record<string, unknown>;
}
