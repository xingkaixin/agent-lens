import type { BaseAgent } from "./base.js";
import type { AgentInfo } from "../types/index.js";

export interface AgentRegistration {
  name: string;
  displayName: string;
  create: () => BaseAgent;
  icon: string;
}

let registrations: AgentRegistration[] = [];

export function registerAgent(reg: AgentRegistration): void {
  registrations.push(reg);
}

export function createRegisteredAgents(): BaseAgent[] {
  return registrations.map((r) => r.create());
}

export function getRegisteredAgents(): readonly AgentRegistration[] {
  return registrations;
}

export function getAgentInfoMap(sessionsByAgent: Record<string, number>): AgentInfo[] {
  return registrations.map((r) => ({
    name: r.name,
    displayName: r.displayName,
    icon: r.icon,
    count: sessionsByAgent[r.name] ?? 0,
  }));
}

export function getAgentByName(name: string): AgentRegistration | undefined {
  return registrations.find((r) => r.name === name);
}
