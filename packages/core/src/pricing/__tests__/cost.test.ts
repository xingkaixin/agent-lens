import { describe, expect, it } from "vitest";
import { estimateCostForTokens } from "../cost.js";
import { pricingResolver } from "../resolver.js";

describe("pricing", () => {
  it("estimates cache token cost from the registry", () => {
    const estimate = estimateCostForTokens("claude-sonnet-4-6", {
      input: 1300,
      output: 200,
      cache_create: 100,
      cache_read: 200,
    });

    expect(estimate?.source).toBe("estimated");
    expect(estimate?.cost).toBeCloseTo(0.006735);
  });

  it("resolves kimi-for-coding through the global alias table", () => {
    const estimate = estimateCostForTokens("kimi-for-coding", {
      input: 1000,
      output: 1000,
    });

    expect(estimate?.cost).toBeCloseTo(0.0031);
  });

  it("returns null for unknown models", () => {
    expect(estimateCostForTokens("unknown-model", { input: 1000, output: 1000 })).toBeNull();
    expect(pricingResolver.resolve("unknown-model")).toBeNull();
  });
});
