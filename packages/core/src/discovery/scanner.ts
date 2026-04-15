import { resolve } from "node:path";
import type { SessionHead } from "../types/index.js";
import type { BaseAgent } from "../agents/index.js";
import { createRegisteredAgents } from "../agents/index.js";

export interface ScanOptions {
  /** Filter to specific agent name(s) */
  agents?: string[];
  /** Filter to sessions from a specific project directory (substring match) */
  cwd?: string;
  /** Only include sessions created after this timestamp (ms) */
  from?: number;
  /** Only include sessions created before this timestamp (ms) */
  to?: number;
}

export interface ScanResult {
  sessions: SessionHead[];
  byAgent: Record<string, SessionHead[]>;
  agents: BaseAgent[];
}

/**
 * Bidirectional path scope match (mirrors agent-dump's is_path_scope_match).
 * Matches when:
 *   - paths are equal
 *   - queryPath is a parent of sessionPath  (session is inside the queried project)
 *   - sessionPath is a parent of queryPath  (session root contains the queried path)
 */
function isPathScopeMatch(queryPath: string, sessionPath: string): boolean {
  if (!sessionPath) return false;
  const q = resolve(queryPath);
  const s = resolve(sessionPath);
  return s === q || s.startsWith(q + "/") || q.startsWith(s + "/");
}

function filterSessions(sessions: SessionHead[], options: ScanOptions): SessionHead[] {
  let result = sessions;

  if (options.cwd) {
    const cwd = options.cwd;
    result = result.filter((s) => isPathScopeMatch(cwd, s.directory));
  }

  if (options.from != null) {
    result = result.filter((s) => s.time_created >= options.from!);
  }

  if (options.to != null) {
    result = result.filter((s) => s.time_created <= options.to!);
  }

  return result;
}

export function scanSessions(options: ScanOptions = {}): ScanResult {
  const agents = createRegisteredAgents();
  const byAgent: Record<string, SessionHead[]> = {};
  const allSessions: SessionHead[] = [];
  const availableAgents: BaseAgent[] = [];

  const agentFilter = options.agents?.length
    ? new Set(options.agents.map((a) => a.toLowerCase()))
    : null;

  for (const agent of agents) {
    if (agentFilter && !agentFilter.has(agent.name.toLowerCase())) continue;
    if (!agent.isAvailable()) continue;
    availableAgents.push(agent);

    try {
      const heads = agent.scan();
      const filtered = filterSessions(heads, options);
      byAgent[agent.name] = filtered;
      allSessions.push(...filtered);
    } catch (err) {
      console.error(`Error scanning ${agent.name}:`, err);
      byAgent[agent.name] = [];
    }
  }

  return { sessions: allSessions, byAgent, agents: availableAgents };
}
