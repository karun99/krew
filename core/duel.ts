/**
 * DUEL — the accuracy duel (user-requested command).
 * Two agents, two personas, one problem. Both produce a solution;
 * the REALITY verifier checks both; the user sees accuracy and
 * efficiency side by side.
 */
import { AgentManager, type ExecutionOutput } from "./agents.ts";
import { createBackend, type Backend } from "./backend.ts";
import { emotionalMode, personas } from "./config.ts";
import { verify, type VerificationContext } from "./reality.ts";

export interface DuelProblem {
  goal: string;
  deliverable: string;
  sources?: Array<{ url: string; title: string }>;
  constraints?: string[];
  expectedFiles?: string[];
}

export interface PersonaRun {
  persona: string;
  output: ExecutionOutput;
  verifier: ReturnType<typeof verify>;
}

export interface DuelResult {
  problem: DuelProblem;
  runs: PersonaRun[];
  /** Per persona: did the verifier accept the output? */
  accuracy: Array<{ persona: string; passed: boolean }>;
  /** Per persona: token usage of the run. */
  efficiency: Array<{ persona: string; tokens: number }>;
  /** Best passing run by token efficiency, or null when none passed. */
  winner: string | null;
  emotionalMode: string;
}

export async function runDuel(
  manager: AgentManager,
  backend: Backend,
  problem: DuelProblem,
  personaNames: string[],
): Promise<DuelResult> {
  const available = personas().map((p) => p.name);
  const selected = personaNames.filter((name) => available.includes(name));
  if (selected.length < 2) {
    throw new Error(`duel needs two personas; available: ${available.join(", ")}`);
  }

  const ctx: VerificationContext = {
    goal: problem.goal,
    deliverable: problem.deliverable,
    sources: problem.sources ?? [],
    constraints: problem.constraints ?? [],
    expectedFiles: problem.expectedFiles,
  };

  const runs: PersonaRun[] = [];
  for (const persona of selected) {
    const agent = manager.spawn({
      id: `duel-${persona}`,
      role: `duel-${persona}`,
      zone: "duel",
      persona,
    });
    const output = await manager.execute(agent.id, {
      goal: problem.goal,
      deliverable: problem.deliverable,
      sources: ctx.sources,
      constraints: ctx.constraints,
      expectedFiles: ctx.expectedFiles,
    });
    runs.push({ persona, output, verifier: verify(output, ctx) });
  }

  const accuracy = runs.map((run) => ({ persona: run.persona, passed: run.verifier.passed }));
  const efficiency = runs.map((run) => ({
    persona: run.persona,
    tokens: run.output.tokens,
  }));
  const passing = accuracy.filter((entry) => entry.passed);
  let winner: string | null = null;
  if (passing.length > 0) {
    const best = passing
      .map((entry) => {
        const run = runs.find((r) => r.persona === entry.persona)!;
        const tokens = run.output.tokens;
        return { persona: entry.persona, tokens };
      })
      .sort((a, b) => a.tokens - b.tokens)[0];
    if (best) winner = best.persona;
  }

  return {
    problem,
    runs,
    accuracy,
    efficiency,
    winner,
    emotionalMode: emotionalMode(),
  };
}
