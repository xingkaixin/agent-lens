import type { MessageTokens } from "../types/index.js";
import { estimateCostForTokens } from "../pricing/index.js";

export function estimateTokenCost(
  model: string | null | undefined,
  tokens?: MessageTokens,
): number | null {
  return estimateCostForTokens(model, tokens)?.cost ?? null;
}
