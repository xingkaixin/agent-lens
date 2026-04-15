import type { SessionHead, SessionData } from "../types/index.js";

export abstract class BaseAgent {
  abstract readonly name: string;
  abstract readonly displayName: string;

  /** Check if this agent has data available on the local filesystem. */
  abstract isAvailable(): boolean;

  /** Scan for available sessions, returning lightweight metadata. */
  abstract scan(): SessionHead[];

  /** Load full session data including all messages. */
  abstract getSessionData(sessionId: string): SessionData;

  getUri(sessionId: string): string {
    return `${this.name}://${sessionId}`;
  }
}
