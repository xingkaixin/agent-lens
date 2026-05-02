import { describe, expect, it } from "vitest";
import { estimateTokenCost } from "../cost.js";

describe("estimateTokenCost", () => {
  it("estimates OpenAI model costs from input and output tokens", () => {
    expect(
      estimateTokenCost("gpt-5.5", {
        input: 1_000_000,
        output: 1_000_000,
      }),
    ).toBe(35);
  });

  it("uses Claude cache token pricing", () => {
    expect(
      estimateTokenCost("claude-sonnet-4-5-20250929", {
        input: 1_300_000,
        output: 1_000_000,
        cache_read: 100_000,
        cache_create: 200_000,
      }),
    ).toBe(18.78);
  });

  it("returns null when the model has no pricing", () => {
    expect(estimateTokenCost("unknown-model", { input: 1_000, output: 1_000 })).toBeNull();
  });
});
