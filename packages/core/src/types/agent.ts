export interface AgentInfo {
  name: string;
  displayName: string;
  count: number;
  icon?: string;
}

export interface FilterOptions {
  agent?: string;
  cwd?: string;
  from?: number;
  to?: number;
  q?: string;
}
