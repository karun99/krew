/**
 * Guardrails — the eight regulated checks every output must pass (FR-G1..G8).
 * Each layer has a single responsibility; none can be skipped by a prompt.
 */
import { allowedModes } from "./shatkona.ts";
import { Jataka } from "./jataka.ts";
import { HATS, hatsCatalog } from "./hats.ts";
import { onePowerPerAgent } from "./stones.ts";
import { loadKaliRules } from "./config.ts";

export interface GuardrailAgentView {
  agentId: string;
  power?: string;
  hat?: string;
  memoryUsedTokens: number;
}

export interface GuardrailContext {
  goal: string;
  deliverable: string;
  outputText: string;
  outputFiles: string[];
  /** Files that were expected to be produced (declared in the problem). */
  expectedFiles?: string[];
  agents: GuardrailAgentView[];
  emotionalMode: string;
}

export interface GuardrailCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface GuardrailReport {
  checks: GuardrailCheck[];
  passed: boolean;
}

const MAX_NESTING = 16;

/** Depth of the most nested brace/bracket/paren in the output. */
function maxNesting(text: string): number {
  let depth = 0;
  let max = 0;
  let current = 0;
  for (const ch of text) {
    if (ch === "{" || ch === "[" || ch === "(") {
      current += 1;
      if (current > max) max = current;
    } else if (ch === "}" || ch === "]" || ch === ")") {
      current -= 1;
    }
  }
  return max;
}

export function runGuardrails(context: GuardrailContext): GuardrailReport {
  const checks: GuardrailCheck[] = [
    soul(context),
    sahaja(context),
    shatkona(context),
    kundalini(context),
    jataka(),
    stones(context),
    hats(context),
    kali(context),
  ];
  return {
    checks,
    passed: checks.every((check) => check.passed),
  };
}

// FR-G1 — SOUL: verify purpose alignment.
function soul(context: GuardrailContext): GuardrailCheck {
  const words = context.goal.split(/\s+/).filter((w) => w.length >= 4).slice(0, 10);
  const haystack = context.outputText.toLowerCase();
  const found = words.filter((w) => haystack.includes(w.toLowerCase()));
  if (found.length === 0) {
    return { name: "SOUL", passed: false, detail: "output does not address the stated goal" };
  }
  return { name: "SOUL", passed: true, detail: `addresses goal via ${found.length} terms` };
}

// FR-G2 — SAHAJA: enforce the simplest path.
function sahaja(context: GuardrailContext): GuardrailCheck {
  const allowed = new Set([context.deliverable, ...(context.expectedFiles ?? [])]);
  const produced = new Set(context.outputFiles);
  for (const file of produced) {
    if (!allowed.has(file)) {
      return {
        name: "SAHAJA",
        passed: false,
        detail: `${file} is not a declared deliverable (simplest path was not kept)`,
      };
    }
  }
  return { name: "SAHAJA", passed: true, detail: "no unnecessary artifacts" };
}

// FR-G3 — SHATKONA: balance creation against verification.
function shatkona(context: GuardrailContext): GuardrailCheck {
  const mode = context.emotionalMode;
  const modes = allowedModes();
  if (!modes.includes(mode)) {
    return { name: "SHATKONA", passed: false, detail: `unknown emotional mode '${mode}'` };
  }
  return {
    name: "SHATKONA",
    passed: true,
    detail: `balance maintained in '${mode}' mode (style only, never decisions)`,
  };
}

// FR-G4 — KUNDALINI: bounded escalation.
function kundalini(context: GuardrailContext): GuardrailCheck {
  const depth = maxNesting(context.outputText);
  if (depth > MAX_NESTING) {
    return {
      name: "KUNDALINI",
      passed: false,
      detail: `nesting depth ${depth} exceeds bound ${MAX_NESTING}`,
    };
  }
  return { name: "KUNDALINI", passed: true, detail: `depth ${depth} within bound` };
}

// FR-G5 — JATAKA: the wisdom library must be available.
function jataka(): GuardrailCheck {
  if (!new Jataka().isAvailable()) {
    return { name: "JATAKA", passed: false, detail: "wisdom library is not available" };
  }
  return { name: "JATAKA", passed: true, detail: "lessons retrievable" };
}

// FR-G6 — STONES: powers are distributed, never hoarded.
function stones(context: GuardrailContext): GuardrailCheck {
  const withPower = context.agents.filter((agent) => agent.power !== undefined);
  if (withPower.length === 0) {
    return { name: "STONES", passed: false, detail: "no powers assigned" };
  }
  if (!onePowerPerAgent(withPower.map((agent) => ({ agentId: agent.agentId, power: agent.power ?? "" })))) {
    return { name: "STONES", passed: false, detail: "an agent holds two powers" };
  }
  return { name: "STONES", passed: true, detail: `${withPower.length} agents hold one power each` };
}

// FR-G7 — HATS: every agent wears exactly one perspective.
function hats(context: GuardrailContext): GuardrailCheck {
  const assigned = context.agents.filter((agent) => agent.hat !== undefined);
  const byAgent = new Map<string, string[]>();
  for (const agent of context.agents) {
    if (agent.hat) {
      const worn = byAgent.get(agent.agentId) ?? [];
      worn.push(agent.hat);
      byAgent.set(agent.agentId, worn);
    }
  }
  for (const [agentId, worn] of byAgent) {
    if (worn.length !== 1) {
      return {
        name: "HATS",
        passed: false,
        detail: `agent '${agentId}' wears ${worn.length} hats at once`,
      };
    }
    const known = hatsCatalog().some((hat) => hat.name === worn[0]);
    if (!known) {
      return { name: "HATS", passed: false, detail: `unknown hat '${worn[0]}'` };
    }
  }
  const shared = new Map<string, number>();
  for (const agent of assigned) {
    shared.set(agent.hat!, (shared.get(agent.hat!) ?? 0) + 1);
  }
  for (const [hat, count] of shared) {
    if (count > 1) {
      return { name: "HATS", passed: false, detail: `hat '${hat}' is worn by several agents` };
    }
  }
  return { name: "HATS", passed: true, detail: `${assigned.length} perspectives active` };
}

// FR-G8 — KALI: regulation is active and nothing bypasses it.
function kali(context: GuardrailContext): GuardrailCheck {
  const rules = loadKaliRules();
  if (!rules.temporal.phaseGating) {
    return { name: "KALI", passed: false, detail: "phase gating is disabled" };
  }
  return { name: "KALI", passed: true, detail: "mutations pass through Kali" };
}
