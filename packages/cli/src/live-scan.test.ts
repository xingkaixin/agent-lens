import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveAgentWatchTargets } from "./live-scan.js";

describe("resolveAgentWatchTargets", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("covers Codex session files nested by year/month/day", () => {
    vi.stubEnv("CODEX_HOME", "/tmp/codex-home");

    expect(resolveAgentWatchTargets("codex")).toEqual([
      { path: "/tmp/codex-home/sessions", depth: 4 },
    ]);
  });

  it("keeps Claude Code watch depth aligned with project/session layout", () => {
    vi.stubEnv("CLAUDE_CONFIG_DIR", "/tmp/claude-home");

    expect(resolveAgentWatchTargets("claudecode")).toEqual([
      { path: "/tmp/claude-home/projects", depth: 2 },
      { path: "data/claudecode", depth: 2 },
    ]);
  });
});
