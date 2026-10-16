/**
 * Agent runtime (FR-A1..A7).
 * Spawns agents into isolated zones, executes their work, requests mutations
 * (role / prompt / sub-agents) and coordination through Kali, reports outputs
 * to the verifier, learns lessons into JATAKA, and retires cleanly.
 */
import { createBackend, type Backend, type CompletionInput } from "./backend.ts";
import { findRoot, loadState } from "./config.ts";
import { Jataka } from "./jataka.ts";
import { Kali, type MutationRequest } from "./kali.ts";
import type { ZoneLookup } from "./kali.ts";

export type AgentStatus = "idle" | "running" | "done" | "retired";

export interface Agent {
  id: string;
  role: string;
  zone: string;
  persona: string;
  power?: string;
  hat?: string;
  status: AgentStatus;
  memoryUsedTokens: number;
}

export interface SpawnSpec {
  id: string;
  role: string;
  zone: string;
  persona?: string;
  power?: string;
  hat?: string;
}

export interface ExecutionOutput {
  agentId: string;
  text: string;
  files: Array<{ path: string; content: string }>;
  tokens: number;
}

export interface MutationRequestInput {
  agentId: string;
  target: string;
  phase: string;
  reason: string;
}

export interface CoordinationRequestInput {
  fromZone: string;
  toZone: string;
  channels: string[];
}

export interface RuntimeDecision {
  allowed: boolean;
  reason?: string;
}

export class AgentManager {
  readonly #agents = new Map<string, Agent>();
  readonly #jataka = new Jataka();
  readonly #backend: Backend;
  readonly #kali: Kali;
  readonly #zones: ZoneLookup | undefined;

  constructor(kali: Kali, backend: Backend, zones?: ZoneLookup) {
    this.#kali = kali;
    this.#backend = backend;
    this.#zones = zones;
  }

  // ------------------------------------------------ lifecycle
  spawn(spec: SpawnSpec): Agent {
    const agent: Agent = {
      id: spec.id,
      role: spec.role,
      zone: spec.zone,
      persona: spec.persona ?? "neutral",
      power: spec.power,
      hat: spec.hat,
      status: "idle",
      memoryUsedTokens: 0,
    };
    this.#agents.set(spec.id, agent);
    this.#zones?.register(spec.id, spec.zone);
    return agent;
  }

  list(): Agent[] {
    return [...this.#agents.values()];
  }

  get(agentId: string): Agent | undefined {
    return this.#agents.get(agentId);
  }

  retire(agentId: string): void {
    const agent = this.#agents.get(agentId);
    if (agent) {
      agent.status = "retired";
    }
  }

  allRetired(): boolean {
    return [...this.#agents.values()].every((a) => a.status === "retired");
  }

  // ------------------------------------------------ execution
  async execute(agentId: string, problem: Record<string, unknown>): Promise<ExecutionOutput> {
    const agent = this.#agents.get(agentId);
    if (!agent) throw new Error(`unknown agent '${agentId}'`);
    if (agent.status !== "idle") throw new Error(`agent '${agentId}' is not idle`);
    const budget = this.#memoryBudget();
    if (agent.memoryUsedTokens > budget) {
      throw new Error(`agent '${agentId}' exceeded its memory budget (${agent.memoryUsedTokens} tokens)`);
    }
    agent.status = "running";
    try {
      const input: CompletionInput = {
        prompt: this.#buildPrompt(agent, problem),
        problem,
        maxTokens: 1024,
      };
      const result = await this.#backend.complete(input);
      agent.memoryUsedTokens += result.tokens;
      return {
        agentId,
        text: result.text,
        files: extractFiles(result.text),
        tokens: result.tokens,
      };
    } finally {
      agent.status = "idle";
    }
  }

  #buildPrompt(agent: Agent, problem: Record<string, unknown>): string {
    const goal = String(problem.goal ?? "");
    const persona = agent.persona;
    return [
      `You are the ${agent.role} agent (persona: ${persona}).`,
      `Solve this problem: ${goal}`,
      "Produce the requested deliverable.",
    ].join("\n");
  }

  // ------------------------------------------------ regulation (FR-A3 / FR-A4)
  /** FR-A3: ask Kali for permission to mutate (role, prompt, sub-agents). */
  requestMutation(input: MutationRequestInput): RuntimeDecision {
    const req: MutationRequest = {
      id: `mutation-${Date.now()}`,
      agentId: input.agentId,
      zone: this.#zoneOf(input.agentId),
      target: input.target,
      phase: input.phase,
      reason: input.reason,
      requestedAt: Date.now(),
    };
    const decision = this.#kali.requestMutation(req);
    return { allowed: decision.allowed, reason: decision.reason };
  }

  /** FR-A4: ask Kali for permission to coordinate across zones. */
  requestCoordination(input: CoordinationRequestInput): RuntimeDecision & { requestId?: string } {
    const requestId = this.#kali.requestCoordination({
      id: `coordination-${Date.now()}`,
      fromZone: input.fromZone,
      toZone: input.toZone,
      channels: input.channels,
      requestedAt: Date.now(),
    });
    return { ...requestId, allowed: requestId.allowed ?? false };
  }

  // ------------------------------------------------ learning (FR-A6)
  /** Record a lesson after a task completes (best-effort, never blocks). */
  learn(agentId: string, problemClass: string, lesson: string): void {
    try {
      this.#jataka.record(problemClass, `${agentId}: ${lesson}`);
    } catch {
      /* learning is best-effort */
    }
  }

  // ------------------------------------------------ kill & budget (FR-K9 / G3)
  /** FR-K9: emergency stop — every agent halts immediately. */
  killSwitch(): { latencyMs: number } {
    return this.#kali.activateKillSwitch();
  }

  /** Is the kill switch currently active? */
  isKilled(): boolean {
    return this.#kali.isKilled();
  }

  /** Tokens used and memory budget for one agent (survival checks). */
  memoryUsage(agentId: string): { tokens: number; budget: number } {
    const agent = this.#agents.get(agentId);
    const budget = this.#memoryBudget();
    return { tokens: agent?.memoryUsedTokens ?? 0, budget };
  }

  // ------------------------------------------------ internals
  #zoneOf(agentId: string): string {
    const agent = this.#agents.get(agentId);
    return agent ? agent.zone : "unknown";
  }

  #memoryBudget(): number {
    const { config } = loadState();
    return config.agents.perAgentMemoryMB * 1024 * 1024 / 4; // tokens ≈ bytes / 4
  }
}

function extractFiles(text: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  const pattern = /FILE:\s*(\S+)\n([\s\S]*?)(?=\nFILE:|\n*$)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    files.push({ path: match[1], content: match[2] });
  }
  return files;
}
