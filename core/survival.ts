/**
 * SURVIVAL — resilience simulation (user-requested command).
 * Stresss agents the way production would: verifier crashes, heavy load,
 * network latency. Verifies that agents endure without panicking, recover
 * after failure, honour the memory budget, and stop within the kill-switch
 * deadline (< 1 second).
 */
import { AgentManager } from "./agents.ts";
import { createBackend, type Backend } from "./backend.ts";
import { emotionalMode } from "./config.ts";
import { verify, type VerificationContext } from "./reality.ts";

export interface SurvivalProblem {
  goal: string;
  deliverable: string;
  sources?: Array<{ url: string; title: string }>;
  constraints?: string[];
  expectedFiles?: string[];
}

export interface SurvivalScenario {
  id: "verifier-crash" | "cpu-pressure" | "network-latency";
  description: string;
}

export interface SurvivalCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface SurvivalReport {
  scenarioId: string;
  description: string;
  checks: SurvivalCheck[];
  outcome: "endured" | "failed";
  emotionalMode: string;
}

export const SURVIVAL_SCENARIOS: SurvivalScenario[] = [
  {
    id: "verifier-crash",
    description: "The verifier dies mid-check. Agents must degrade gracefully and finish without panic.",
  },
  {
    id: "cpu-pressure",
    description: "Heavy concurrent load. Agents must stay within the per-agent memory budget.",
  },
  {
    id: "network-latency",
    description: "The backend responds slowly. Agents must stay responsive and never block the kill switch.",
  },
];

export async function runSurvival(
  manager: AgentManager,
  backend: Backend,
  problem: SurvivalProblem,
  scenarioId: string,
): Promise<SurvivalReport> {
  const scenario =
    SURVIVAL_SCENARIOS.find((s) => s.id === scenarioId) ?? SURVIVAL_SCENARIOS[0];
  const checks: SurvivalCheck[] = [];

  // Inject the failure through the backend / verifier.
  backend.inject(scenario.id);

  const ctx: VerificationContext = {
    goal: problem.goal,
    deliverable: problem.deliverable,
    sources: problem.sources ?? [],
    constraints: problem.constraints ?? [],
    expectedFiles: problem.expectedFiles,
  };

  let executionCompleted = true;
  let memoryOk = true;
  try {
    const agent = manager.spawn({
      id: `survival-${scenario.id}`,
      role: "survival-runner",
      zone: "survival",
      persona: "analyst",
    });
    const output = await manager.execute(agent.id, {
      goal: problem.goal,
      deliverable: problem.deliverable,
      sources: ctx.sources,
      constraints: ctx.constraints,
      expectedFiles: ctx.expectedFiles,
    });
    if (scenario.id !== "verifier-crash") {
      const result = verify(output, ctx);
      if (!result.passed) executionCompleted = false;
    }
  } catch {
    // The injected failure must not panic the agent or the runner.
    executionCompleted = false;
  }

  const usage = manager.memoryUsage("survival");
  memoryOk = usage.tokens <= usage.budget;

  // The kill switch must stop everything within one second.
  const { latencyMs } = manager.killSwitch();
  const killFast = latencyMs < 1000;

  checks.push(
    {
      name: "execution-completed",
      passed: executionCompleted,
      detail: executionCompleted
        ? "agent finished despite injected failure"
        : "agent panicked or stalled",
    },
    {
      name: "memory-budget",
      passed: memoryOk,
      detail: `${usage.tokens} tokens used of ${usage.budget}`,
    },
    {
      name: "kill-switch-fast",
      passed: killFast,
      detail: `kill switch in ${latencyMs} ms`,
    },
  );

  return {
    scenarioId: scenario.id,
    description: scenario.description,
    checks,
    outcome: checks.every((c) => c.passed) ? "endured" : "failed",
    emotionalMode: emotionalMode(),
  };
}
