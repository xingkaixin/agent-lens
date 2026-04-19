import type { Context } from "hono";
import type { ScanResult, SessionData, SessionHead } from "@codesesh/core";
import { getAgentInfoMap } from "@codesesh/core";

export interface ScanResultSource {
  getSnapshot(): ScanResult;
}

export interface SessionListDefaults {
  from?: number;
  to?: number;
}

function getTotalTokens(stats: SessionHead["stats"]): number {
  return stats.total_tokens ?? stats.total_input_tokens + stats.total_output_tokens;
}

function parseDateParam(
  value: string | undefined,
  fallback: number | undefined,
): number | undefined {
  if (value == null) return fallback;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? fallback : ts;
}

export function handleGetAgents(c: Context, scanSource: ScanResultSource) {
  const scanResult = scanSource.getSnapshot();
  const counts = Object.fromEntries(
    Object.entries(scanResult.byAgent).map(([agentName, sessions]) => [agentName, sessions.length]),
  );
  const info = getAgentInfoMap(counts);
  return c.json(info);
}

export function handleGetSessions(
  c: Context,
  scanSource: ScanResultSource,
  defaults: SessionListDefaults = {},
) {
  const scanResult = scanSource.getSnapshot();
  const agent = c.req.query("agent");
  const q = c.req.query("q")?.toLowerCase();
  const cwd = c.req.query("cwd")?.toLowerCase();
  const from = parseDateParam(c.req.query("from"), defaults.from);
  const to = parseDateParam(c.req.query("to"), defaults.to);

  let sessions: SessionHead[] = [];

  // If agent filter is specified, use byAgent directly
  if (agent && scanResult.byAgent[agent]) {
    sessions = [...scanResult.byAgent[agent]!];
  } else {
    sessions = [...scanResult.sessions];
  }

  if (cwd) {
    sessions = sessions.filter((s) => s.directory.toLowerCase().includes(cwd));
  }

  if (from != null) {
    sessions = sessions.filter((s) => s.time_created >= from);
  }

  if (to != null) {
    sessions = sessions.filter((s) => s.time_created <= to);
  }

  if (q) {
    sessions = sessions.filter((s) => s.title.toLowerCase().includes(q));
  }

  return c.json({ sessions });
}

export async function handleGetSessionData(c: Context, scanSource: ScanResultSource) {
  const scanResult = scanSource.getSnapshot();
  const agentName = c.req.param("agent");
  const sessionId = c.req.param("id");

  if (!sessionId) {
    return c.json({ error: "Missing session ID" }, 400);
  }

  const agent = scanResult.agents.find((a) => a.name === agentName);

  if (!agent) {
    return c.json({ error: `Unknown agent: ${agentName}` }, 404);
  }

  try {
    const data: SessionData = agent.getSessionData(sessionId);
    return c.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load session";
    return c.json({ error: message }, 500);
  }
}

export interface DashboardAgentStat {
  name: string;
  displayName: string;
  icon: string;
  sessions: number;
  messages: number;
  tokens: number;
}

export interface DashboardDailyBucket {
  /** Local YYYY-MM-DD */
  date: string;
  sessions: number;
  messages: number;
}

export interface DashboardTotals {
  sessions: number;
  messages: number;
  tokens: number;
  cost: number;
  latestActivity?: number;
}

export interface DashboardRecentSession extends SessionHead {
  agentName: string;
}

export interface DashboardData {
  totals: DashboardTotals;
  perAgent: DashboardAgentStat[];
  dailyActivity: DashboardDailyBucket[];
  recentSessions: DashboardRecentSession[];
  /** Time window covered by dailyActivity (inclusive, ms) */
  window: { from: number; to: number; days: number };
}

function toLocalDateKey(ts: number): string {
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function handleGetDashboard(c: Context, scanSource: ScanResultSource) {
  const scanResult = scanSource.getSnapshot();
  const daysParam = parseInt(c.req.query("days") ?? "30", 10);
  const days = Number.isFinite(daysParam) && daysParam > 0 ? daysParam : 30;

  const allSessions = scanResult.sessions;
  const agentInfo = getAgentInfoMap(
    Object.fromEntries(
      Object.entries(scanResult.byAgent).map(([name, sessions]) => [name, sessions.length]),
    ),
  );
  const agentInfoMap = new Map(agentInfo.map((a) => [a.name, a]));

  // Aggregate totals
  let totalMessages = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let latestActivity = 0;
  for (const session of allSessions) {
    totalMessages += session.stats.message_count;
    totalTokens += getTotalTokens(session.stats);
    totalCost += session.stats.total_cost ?? 0;
    const activity = session.time_updated ?? session.time_created;
    if (activity > latestActivity) latestActivity = activity;
  }

  // Per-agent stats
  const perAgent: DashboardAgentStat[] = Object.entries(scanResult.byAgent)
    .map(([name, sessions]) => {
      const info = agentInfoMap.get(name);
      let messages = 0;
      let tokens = 0;
      for (const s of sessions) {
        messages += s.stats.message_count;
        tokens += getTotalTokens(s.stats);
      }
      return {
        name,
        displayName: info?.displayName ?? name,
        icon: info?.icon ?? "",
        sessions: sessions.length,
        messages,
        tokens,
      };
    })
    .filter((item) => item.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);

  // Daily activity buckets (local time)
  const now = Date.now();
  const todayStart = startOfLocalDay(now);
  const windowStart = todayStart - (days - 1) * 24 * 60 * 60 * 1000;

  const dailyMap = new Map<string, DashboardDailyBucket>();
  for (let i = 0; i < days; i += 1) {
    const ts = windowStart + i * 24 * 60 * 60 * 1000;
    const key = toLocalDateKey(ts);
    dailyMap.set(key, { date: key, sessions: 0, messages: 0 });
  }

  for (const session of allSessions) {
    const ts = session.time_created;
    if (ts < windowStart) continue;
    const key = toLocalDateKey(ts);
    const bucket = dailyMap.get(key);
    if (bucket) {
      bucket.sessions += 1;
      bucket.messages += session.stats.message_count;
    }
  }

  const dailyActivity = [...dailyMap.values()];

  // Recent sessions
  const recentSessions: DashboardRecentSession[] = [...allSessions]
    .sort((a, b) => (b.time_updated ?? b.time_created) - (a.time_updated ?? a.time_created))
    .slice(0, 10)
    .map((session) => {
      const agentKey = session.slug.split("/")[0] ?? "unknown";
      return { ...session, agentName: agentKey };
    });

  const data: DashboardData = {
    totals: {
      sessions: allSessions.length,
      messages: totalMessages,
      tokens: totalTokens,
      cost: totalCost,
      latestActivity: latestActivity || undefined,
    },
    perAgent,
    dailyActivity,
    recentSessions,
    window: { from: windowStart, to: todayStart + 24 * 60 * 60 * 1000 - 1, days },
  };

  return c.json(data);
}
