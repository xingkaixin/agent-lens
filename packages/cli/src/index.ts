import { defineCommand, runMain } from "citty";
import { createServer } from "./server.js";
import { printScanResults } from "./output.js";
import { scanSessions, createRegisteredAgents, getAgentInfoMap, type ScanOptions } from "@agent-lens/core";

function parseDateToTimestamp(dateStr: string): number {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date.getTime();
}

function parseSessionUri(uri: string): { agent: string; sessionId: string } | null {
  const match = uri.match(/^([a-z]+):\/\/(.+)$/i);
  if (!match) return null;
  return { agent: match[1]!, sessionId: match[2]! };
}

const main = defineCommand({
  meta: {
    name: "agent-lens",
    description: "Discover, aggregate, and visualize AI coding agent sessions",
    version: "0.1.0",
  },
  args: {
    port: {
      type: "string",
      alias: "p",
      description: "HTTP server port",
      default: "4321",
    },
    agent: {
      type: "string",
      alias: "a",
      description: "Filter to specific agent(s), comma-separated",
    },
    cwd: {
      type: "string",
      description: "Filter to sessions from a specific project directory",
    },
    from: {
      type: "string",
      description: "Sessions created after this date (YYYY-MM-DD)",
    },
    to: {
      type: "string",
      description: "Sessions created before this date (YYYY-MM-DD)",
    },
    session: {
      type: "string",
      alias: "s",
      description: "Directly open a specific session (agent://session-id)",
    },
    json: {
      type: "boolean",
      alias: "j",
      description: "Output session index as JSON to stdout (no server)",
      default: false,
    },
    noOpen: {
      type: "boolean",
      description: "Don't auto-open browser",
      default: false,
    },
  },
  async run({ args }) {
    const port = parseInt(args.port as string, 10) || 4321;
    const noOpen = args.noOpen as boolean;
    const jsonOnly = args.json as boolean;

    // Parse session URI if provided
    let targetSession: { agent: string; sessionId: string } | null = null;
    if (args.session) {
      targetSession = parseSessionUri(args.session as string);
      if (!targetSession) {
        console.error(`Invalid session format: ${args.session}. Expected: agent://session-id`);
        process.exit(1);
      }
    }

    // Build scan options
    const scanOptions: ScanOptions = {
      agents: targetSession
        ? [targetSession.agent]
        : args.agent
          ? (args.agent as string).split(",").map((a) => a.trim())
          : undefined,
      cwd: args.cwd as string | undefined,
      from: args.from ? parseDateToTimestamp(args.from as string) : undefined,
      to: args.to ? parseDateToTimestamp(args.to as string) : undefined,
    };

    // Scan sessions
    const result = scanSessions(scanOptions);

    if (jsonOnly) {
      const info = getAgentInfoMap(
        Object.fromEntries(
          Object.entries(result.byAgent).map(([k, v]) => [k, v.length]),
        ),
      );
      const output = {
        agents: info.map(({ name, displayName, count }) => ({ name, displayName, count, available: count > 0 })),
        sessions: result.sessions,
      };
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    // Print console output
    const agents = createRegisteredAgents();
    printScanResults(agents, result);

    // Start server
    const { url } = await createServer(port, result);

    console.log(`  http://localhost:${port}`);
    console.log("");

    if (!noOpen) {
      const open = (await import("open")).default;
      const targetUrl = targetSession
        ? `${url}/${targetSession.agent.toLowerCase()}/${targetSession.sessionId}`
        : url;
      await open(targetUrl);
    }
  },
});

runMain(main);
