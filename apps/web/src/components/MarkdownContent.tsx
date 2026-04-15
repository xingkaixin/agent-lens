import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const markdownComponents: Components = {
  a: ({ children }) => <span className="console-markdown-link">{children}</span>,
};

interface MarkdownContentProps {
  text: string;
}

export function MarkdownContent({ text }: MarkdownContentProps) {
  return <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>;
}
