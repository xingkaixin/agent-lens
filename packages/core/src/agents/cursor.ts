import { existsSync } from "node:fs";
import { join } from "node:path";
import { BaseAgent } from "./base.js";
import type { SessionHead, SessionData, Message, MessagePart } from "../types/index.js";
import { getCursorDataPath } from "../discovery/paths.js";
import { openDbReadOnly, isSqliteAvailable, type SQLiteDatabase } from "../utils/sqlite.js";
import { resolveSessionTitle, basenameTitle } from "../utils/title-fallback.js";

// ---------------------------------------------------------------------------
// Cursor data model interfaces
// ---------------------------------------------------------------------------

interface ComposerData {
  id?: string;
  composerId?: string;
  text?: string;
  createdAt?: number;
  updatedAt?: number;
  model?: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
  subagentInfos?: SubagentInfo[];
  chatMessages?: ChatMessage[];
}

interface SubagentInfo {
  id?: string;
  composerId?: string;
  title?: string;
  nickname?: string;
}

interface ChatMessage {
  role: string;
  text?: string;
  createdAt?: number;
  timestamp?: number;
  actions?: ActionEntry[];
  isCompletion?: boolean;
  [key: string]: unknown;
}

interface ActionEntry {
  type?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: unknown;
  state?: Record<string, unknown>;
  [key: string]: unknown;
}

interface BubbleData {
  id?: string;
  composerId?: string;
  chatMessages?: ChatMessage[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CURSOR_TOOL_TITLE_MAP: Record<string, string> = {
  read_file_v2: "read",
  edit_file_v2: "edit",
  run_terminal_command_v2: "bash",
  ripgrep_raw_search: "grep",
  glob_file_search: "glob",
};

function mapToolTitle(toolName: string): string {
  return CURSOR_TOOL_TITLE_MAP[toolName] ?? toolName;
}

function normalizeTitleText(text: string): string {
  const line = text.split("\n").find((l) => l.trim());
  return line?.trim().slice(0, 80) || "";
}

/** Normalize tool output into MessagePart[] */
function normalizeToolOutputParts(output: unknown, timestampMs: number): MessagePart[] {
  if (output == null) return [];

  if (typeof output === "string") {
    return output.trim()
      ? [{ type: "text" as const, text: output, time_created: timestampMs }]
      : [];
  }

  if (Array.isArray(output)) {
    const parts: MessagePart[] = [];
    for (const item of output) {
      if (typeof item === "object" && item !== null) {
        const text = String(
          (item as Record<string, unknown>).text ??
          (item as Record<string, unknown>).content ??
          "",
        );
        if (text.trim()) parts.push({ type: "text", text, time_created: timestampMs });
      } else if (typeof item === "string" && item.trim()) {
        parts.push({ type: "text", text: item, time_created: timestampMs });
      }
    }
    return parts;
  }

  // For object output, stringify for readability
  const text = String(output);
  return text.trim()
    ? [{ type: "text", text, time_created: timestampMs }]
    : [];
}

/** Extract a timestamp (in ms) from a chat message */
function extractTimestamp(msg: ChatMessage): number {
  if (msg.createdAt && typeof msg.createdAt === "number" && msg.createdAt > 0) {
    return msg.createdAt;
  }
  if (msg.timestamp && typeof msg.timestamp === "number" && msg.timestamp > 0) {
    return msg.timestamp;
  }
  return 0;
}

/** Build a normalized tool state object from an action entry */
function buildToolState(action: ActionEntry): MessagePart["state"] {
  const state: MessagePart["state"] = {};

  // Copy input
  if (action.input) {
    state.input = action.input;
  }

  // Normalize output into parts
  if (action.output != null) {
    const ts = 0; // we don't have a finer-grained timestamp for the output
    const outputParts = normalizeToolOutputParts(action.output, ts);
    state.output = outputParts.length > 0 ? outputParts : action.output;
  }

  // Merge any explicit state fields
  if (action.state) {
    Object.assign(state, action.state);
  }

  // Derive status from output shape if not set
  if (!state.status) {
    if (typeof action.output === "object" && action.output !== null) {
      const out = action.output as Record<string, unknown>;
      if (out.success === true) state.status = "completed";
      else if (out.success === false) state.status = "error";
      else state.status = "completed";
    } else if (action.output != null) {
      state.status = "completed";
    }
  }

  return state;
}

/** Build a MessagePart for a tool action */
function buildToolPart(action: ActionEntry, timestampMs: number): MessagePart {
  const toolName = action.tool ?? "unknown";
  return {
    type: "tool",
    tool: mapToolTitle(toolName),
    callID: action.type ? `${action.type}:${String(action.input?.id ?? "")}` : "",
    title: `Tool: ${mapToolTitle(toolName)}`,
    state: buildToolState(action),
    time_created: timestampMs,
  };
}

/** Build a MessagePart for terminal command actions */
function buildTerminalToolPart(action: ActionEntry, timestampMs: number): MessagePart {
  const command = String(action.input?.command ?? "");
  const description = String(action.input?.commandDescription ?? "");

  return {
    type: "tool",
    tool: "bash",
    callID: "",
    title: description || `bash: ${command.slice(0, 60)}`,
    state: {
      input: { command },
      output: typeof action.output === "string"
        ? [{ type: "text" as const, text: action.output, time_created: timestampMs }]
        : normalizeToolOutputParts(action.output, timestampMs),
    },
    time_created: timestampMs,
  };
}

/** Convert an ActionEntry into a MessagePart */
function convertActionToPart(action: ActionEntry, timestampMs: number): MessagePart | null {
  const toolName = action.tool ?? "";

  // Terminal commands get special handling
  if (toolName === "run_terminal_command_v2") {
    return buildTerminalToolPart(action, timestampMs);
  }

  // Generic tool call
  if (toolName && action.type === "tool") {
    return buildToolPart(action, timestampMs);
  }

  return null;
}

// ---------------------------------------------------------------------------
// CursorAgent
// ---------------------------------------------------------------------------

export class CursorAgent extends BaseAgent {
  readonly name = "cursor";
  readonly displayName = "Cursor";

  private dbPath: string | null = null;

  // Cache composer data from scan so getSessionData can reuse it
  private composerCache = new Map<string, ComposerData>();

  private findDbPath(): string | null {
    if (!isSqliteAvailable()) return null;
    const dataPath = getCursorDataPath();
    if (!dataPath) return null;
    return join(dataPath, "globalStorage", "state.vscdb");
  }

  isAvailable(): boolean {
    this.dbPath = this.findDbPath();
    return this.dbPath !== null && existsSync(this.dbPath);
  }

  scan(): SessionHead[] {
    if (!this.dbPath) return [];

    const db = this.openDatabase();
    if (!db) return [];

    try {
      const rows = db
        .prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'composerData:%'")
        .all() as Array<{ key: string; value: string }>;

      const heads: SessionHead[] = [];

      for (const row of rows) {
        try {
          const composer = JSON.parse(row.value) as ComposerData;
          if (!composer.id && !composer.composerId) continue;

          const id = composer.id || composer.composerId || "";
          const text = composer.text?.trim() || null;
          const title = resolveSessionTitle(text, null, null);
          const createdAt = composer.createdAt ?? 0;
          const updatedAt = composer.updatedAt ?? createdAt;

          // Count messages from chatMessages array if available
          let messageCount = 0;
          if (Array.isArray(composer.chatMessages)) {
            messageCount = composer.chatMessages.length;
          }

          heads.push({
            id,
            slug: `cursor/${id}`,
            title,
            directory: "",
            time_created: createdAt,
            time_updated: updatedAt || undefined,
            stats: {
              message_count: messageCount,
              total_input_tokens: composer.inputTokenCount ?? 0,
              total_output_tokens: composer.outputTokenCount ?? 0,
              total_cost: 0,
            },
          });

          this.composerCache.set(id, composer);
        } catch {
          // skip malformed entries
        }
      }

      return heads;
    } catch {
      return [];
    } finally {
      db.close();
    }
  }

  getSessionData(sessionId: string): SessionData {
    // Ensure dbPath is set
    if (!this.dbPath) {
      this.dbPath = this.findDbPath();
    }
    if (!this.dbPath) {
      throw new Error("Cursor database is missing");
    }

    const db = this.openDatabase();
    if (!db) {
      throw new Error("Cursor database is missing");
    }

    try {
      // Try cached composer data first
      let composer = this.composerCache.get(sessionId);
      if (!composer) {
        composer = this.loadComposer(db, sessionId) ?? undefined;
      }

      if (!composer) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const id = composer.id || composer.composerId || "";
      const text = composer.text?.trim() || null;
      const title = resolveSessionTitle(text, null, null);
      const createdAt = composer.createdAt ?? 0;
      const updatedAt = composer.updatedAt ?? createdAt;

      // Load messages: prefer chatMessages from composer, fallback to bubble
      const messages = this.loadMessages(db, composer);

      // Aggregate stats
      let totalInputTokens = 0;
      let totalOutputTokens = 0;

      for (const msg of messages) {
        totalInputTokens += msg.tokens?.input ?? 0;
        totalOutputTokens += msg.tokens?.output ?? 0;
      }

      // Use session-level token counts if per-message counts are zero
      if (totalInputTokens === 0) totalInputTokens = composer.inputTokenCount ?? 0;
      if (totalOutputTokens === 0) totalOutputTokens = composer.outputTokenCount ?? 0;

      // Append subagent messages
      this.appendSubagentMessages(db, composer, messages);

      return {
        id,
        title,
        slug: `cursor/${id}`,
        directory: "",
        time_created: createdAt,
        time_updated: updatedAt || undefined,
        stats: {
          message_count: messages.length,
          total_input_tokens: totalInputTokens,
          total_output_tokens: totalOutputTokens,
          total_cost: 0,
        },
        messages,
      };
    } finally {
      db.close();
    }
  }

  // --- Private helpers ---

  private openDatabase(): SQLiteDatabase | null {
    if (!this.dbPath) return null;
    return openDbReadOnly(this.dbPath);
  }

  private loadComposer(db: SQLiteDatabase, sessionId: string): ComposerData | null {
    const row = db
      .prepare("SELECT value FROM cursorDiskKV WHERE key = ?")
      .get(`composerData:${sessionId}`) as { value: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.value) as ComposerData;
    } catch {
      return null;
    }
  }

  private loadBubble(db: SQLiteDatabase, sessionId: string): BubbleData | null {
    const row = db
      .prepare("SELECT value FROM cursorDiskKV WHERE key = ?")
      .get(`bubble:${sessionId}`) as { value: string } | undefined;

    if (!row) return null;

    try {
      return JSON.parse(row.value) as BubbleData;
    } catch {
      return null;
    }
  }

  private loadMessages(db: SQLiteDatabase, composer: ComposerData): Message[] {
    const messages: Message[] = [];
    let messageIndex = 0;

    // Primary source: chatMessages array in composer data
    const chatMessages = composer.chatMessages;
    if (Array.isArray(chatMessages) && chatMessages.length > 0) {
      for (const chatMsg of chatMessages) {
        const msg = this.convertChatMessage(chatMsg, messageIndex);
        if (msg) {
          messages.push(msg);
          messageIndex++;
        }
      }
      return messages;
    }

    // Fallback: load from bubble
    const bubble = composer.id ? this.loadBubble(db, composer.id) : null;
    if (bubble && Array.isArray(bubble.chatMessages)) {
      for (const chatMsg of bubble.chatMessages) {
        const msg = this.convertChatMessage(chatMsg, messageIndex);
        if (msg) {
          messages.push(msg);
          messageIndex++;
        }
      }
    }

    return messages;
  }

  private convertChatMessage(chatMsg: ChatMessage, index: number): Message | null {
    const role = chatMsg.role?.trim().toLowerCase();
    if (role !== "user" && role !== "assistant") return null;

    const timestampMs = extractTimestamp(chatMsg);
    const parts: MessagePart[] = [];

    // Text content
    const text = chatMsg.text ?? "";
    if (text.trim()) {
      parts.push({ type: "text", text, time_created: timestampMs });
    }

    // Tool calls embedded in assistant messages
    if (role === "assistant" && Array.isArray(chatMsg.actions)) {
      for (const action of chatMsg.actions) {
        const part = convertActionToPart(action as ActionEntry, timestampMs);
        if (part) parts.push(part);
      }
    }

    // Skip empty messages
    if (parts.length === 0) return null;

    return {
      id: `cursor-${composerIdFromChat(chatMsg, index)}`,
      role: role as Message["role"],
      agent: "cursor",
      time_created: timestampMs,
      time_completed: null,
      mode: role === "assistant" && parts.some((p) => p.type === "tool") ? "tool" : null,
      model: null,
      provider: null,
      tokens: undefined,
      cost: 0,
      parts,
    };
  }

  private appendSubagentMessages(
    db: SQLiteDatabase,
    composer: ComposerData,
    messages: Message[],
  ): void {
    const subagentInfos = composer.subagentInfos;
    if (!Array.isArray(subagentInfos) || subagentInfos.length === 0) return;

    for (const subInfo of subagentInfos) {
      if (!subInfo.id) continue;

      const bubble = this.loadBubble(db, subInfo.id);
      if (!bubble || !Array.isArray(bubble.chatMessages)) continue;

      for (const chatMsg of bubble.chatMessages) {
        const role = chatMsg.role?.trim().toLowerCase();
        if (role !== "user" && role !== "assistant") continue;

        const timestampMs = extractTimestamp(chatMsg);
        const parts: MessagePart[] = [];

        const text = chatMsg.text ?? "";
        if (text.trim()) {
          parts.push({ type: "text", text, time_created: timestampMs });
        }

        if (role === "assistant" && Array.isArray(chatMsg.actions)) {
          for (const action of chatMsg.actions) {
            const part = convertActionToPart(action as ActionEntry, timestampMs);
            if (part) parts.push(part);
          }
        }

        if (parts.length === 0) continue;

        messages.push({
          id: `cursor-sub-${subInfo.id}`,
          role: role as Message["role"],
          agent: "cursor",
          time_created: timestampMs,
          time_completed: null,
          mode: null,
          model: null,
          provider: null,
          tokens: undefined,
          cost: 0,
          subagent_id: subInfo.id,
          nickname: subInfo.nickname ?? subInfo.title,
          parts,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers
// ---------------------------------------------------------------------------

function composerIdFromChat(chatMsg: ChatMessage, index: number): string {
  // Try to extract an id from the chat message if available
  if (chatMsg.id && typeof chatMsg.id === "string") {
    return chatMsg.id;
  }
  return String(index);
}
