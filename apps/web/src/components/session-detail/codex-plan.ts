import type { MessagePart } from "../../lib/api";

export type CodexPlanApprovalStatus = "success" | "fail";

export interface CodexPlanDisplay {
  title: "plan";
  secondaryText?: undefined;
  approvalStatus: CodexPlanApprovalStatus;
  expandable: boolean;
  contentLabel: "Plan" | "Rejected";
  contentMarkdown: string;
}

function extractPlanText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => extractPlanText(item))
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text = extractPlanText(record.text);
    if (text) {
      return text;
    }

    const content = extractPlanText(record.content);
    if (content) {
      return content;
    }
  }

  return "";
}

export function buildCodexPlanDisplay(part: MessagePart): CodexPlanDisplay {
  const approvalStatus: CodexPlanApprovalStatus =
    part.approval_status === "fail" ? "fail" : "success";
  const contentMarkdown =
    approvalStatus === "fail" ? extractPlanText(part.output) : extractPlanText(part.input);

  return {
    title: "plan",
    secondaryText: undefined,
    approvalStatus,
    expandable: Boolean(contentMarkdown),
    contentLabel: approvalStatus === "fail" ? "Rejected" : "Plan",
    contentMarkdown,
  };
}
