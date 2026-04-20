import { describe, expect, it } from "vitest";
import { ClaudeCodeAgent } from "../claudecode.js";
import type { SessionHead } from "../../types/index.js";

function makeSession(id: string, overrides: Partial<SessionHead> = {}): SessionHead {
  return {
    id,
    slug: `claudecode/${id}`,
    title: id,
    directory: "/tmp/project",
    time_created: 1000,
    time_updated: 1000,
    stats: {
      message_count: 1,
      total_input_tokens: 0,
      total_output_tokens: 0,
      total_cost: 0,
    },
    ...overrides,
  };
}

describe("ClaudeCodeAgent cache refresh", () => {
  it("revalidates recent sessions and invalidates sessions index cache", () => {
    const agent = new ClaudeCodeAgent() as any;
    agent.basePath = "/tmp/claudecode";
    agent.sessionsIndexCache = { project: new Map([["stale", {}]]) };
    agent.sessionMetaMap = new Map([
      [
        "session-1",
        {
          id: "session-1",
          title: "Old",
          sourcePath: "/tmp/claudecode/project/session-1.jsonl",
          directory: "/tmp/project",
          model: null,
          messageCount: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ],
    ]);

    const now = Date.now();
    const result = agent.checkForChanges(now, [
      makeSession("session-1", { time_created: now - 60_000 }),
    ]);

    expect(result.hasChanges).toBe(true);
    expect(result.changedIds).toContain("session-1");
    expect(agent.sessionsIndexCache.project).toBeUndefined();
  });
});
