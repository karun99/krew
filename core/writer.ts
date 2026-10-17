/**
 * WORKFLOW WRITER — the front-door component (from Workflow Writer with Soul).
 * Turns any work process (prose, SOP, syllabus, tickets, diagram, table, mix)
 * into ONE algorithm document: a Body (steps with pre/postconditions,
 * operators, failure policy) and a Soul (intent, values, quality-of-spirit,
 * guardrails — every clause observable and verdict-typed).
 *
 * The document is the single source of truth: emitYaml/parseYaml round-trip
 * it, and executeAlgorithm compiles and runs it — a step is done only when
 * its postcondition verifies true. Source prompt: config/ww-prompt.md.
 */
import { AgentManager } from "./agents.ts";
import type { Backend } from "./backend.ts";
import { Kali } from "./kali.ts";
import { emotionalMode } from "./config.ts";

// ------------------------------------------------------------------ model
export interface SoulValue {
  id: string;
  statement: string;
  observable_proxy: string;
  verdict: "pass|fail" | "score(0..1)" | "human_approval";
  threshold?: number;
  enforced_by?: string;
  advisory: boolean;
}

export interface SoulQoS {
  id: string;
  name: string;
  observable_proxy: string;
  verdict: "pass|fail" | "score(0..1)" | "human_approval";
  threshold?: number;
}

export interface SoulGuardrail {
  id: string;
  statement: string;
  enforced_by?: string;
}

export interface Soul {
  intent: string;
  voice: string;
  values: SoulValue[];
  quality_of_spirit: SoulQoS[];
  guardrails: SoulGuardrail[];
}

export interface Role {
  id: string;
  responsibility: string;
  does_not: string;
  owns_decision: string;
}

export interface Operator {
  id: string;
  role: string;
  kind: "agent" | "code" | "human";
  capabilities: string[];
}

export interface Step {
  id: string;
  name: string;
  operator: string;
  depends_on: string[];
  precondition: string;
  action: string;
  output_schema: string;
  postcondition: string;
  soul_refs: string[];
  on_fail: { retry_max: number; then: "escalate" | "abort" };
}

export interface AlgorithmModel {
  algorithm: string;
  version: string;
  format: string;
  soul: Soul;
  purpose: string;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  success_condition: string;
  termination: { success: string; failure: string; escalate_to: string };
  roles: Role[];
  operators: Operator[];
  steps: Step[];
  constraints: { deterministic: boolean; cache_outputs: boolean; budgets: { max_tokens: number; timeout_ms: number } };
  assumptions: string[];
  open_questions: string[];
}

// ------------------------------------------------------------ format detect
export type InputFormat = "prose" | "sop" | "syllabus" | "tickets" | "diagram" | "prompt" | "readme" | "table" | "mixed";

export function detectFormat(text: string): InputFormat {
  const markers: InputFormat[] = [];
  if (/```mermaid|\bflowchart\b|\bgraph\s+(TD|LR)\b|BPMN/i.test(text)) markers.push("diagram");
  if (/^\s*\|.+\|\s*$/m.test(text) && (text.match(/^\s*\|.+\|\s*$/gm) ?? []).length >= 3) markers.push("table");
  if (/^\s*[-*]\s+/m.test(text) && (text.match(/^\s*[-*]\s+/gm) ?? []).length >= 3) markers.push("sop");
  if (/^\s*\d+[.)]\s+/m.test(text) && (text.match(/^\s*\d+[.)]\s+/gm) ?? []).length >= 3) markers.push("sop");
  if (/\b(week|unit|module|lesson|chapter)\b/i.test(text)) markers.push("syllabus");
  if (/\b(ticket|issue|jira|linear)\b/i.test(text)) markers.push("tickets");
  if (/^\s*#+\s*(README|Overview|Goals)/im.test(text)) markers.push("readme");
  if (/\byou are\b|\bROLE\b|\bsystem prompt\b/i.test(text)) markers.push("prompt");
  if (markers.length === 0) return "prose";
  if (markers.length === 1) return markers[0];
  return "mixed";
}

// ------------------------------------------------------------------ drafting
export interface WriterInput {
  processText: string;
  soulLine?: string;
}

function kebab(words: string): string {
  return words.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 4).join("-");
}

function contentWords(line: string): string[] {
  return line.replace(/[`#*_>|]/g, " ").split(/\s+/).filter((w) => w.length >= 4).slice(0, 4);
}

/** Deterministic draft of the algorithm document (simulator backend). */
export function buildAlgorithm(input: WriterInput): AlgorithmModel {
  const format = detectFormat(input.processText);
  const soulLine = (input.soulLine ?? "").trim();
  const lines = input.processText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^#/.test(line));
  const taskLines = lines
    .filter((line) => /^([-*]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+[.)])\s+/, ""))
    .slice(0, 8);
  const source = taskLines.length >= 2 ? taskLines : lines.slice(0, 6);
  const steps: Step[] = source.map((line, index) => {
    const id = `S${index + 1}`;
    return {
      id,
      name: kebab(line),
      operator: "op-builder",
      depends_on: index === 0 ? [] : [`S${index}`],
      precondition: index === 0 ? "process description non-empty" : `S${index} completed and verified`,
      action: line.slice(0, 240),
      output_schema: "text",
      postcondition: `output is non-empty and mentions ${contentWords(line).join(", ") || "the task"}`,
      soul_refs: ["V1", "Q1"],
      on_fail: { retry_max: 1, then: "escalate" },
    };
  });
  if (steps.length === 0) {
    steps.push({
      id: "S1",
      name: "describe-process",
      operator: "op-builder",
      depends_on: [],
      precondition: "process description non-empty",
      action: "Restate the described process as a concrete task list.",
      output_schema: "text",
      postcondition: "output is non-empty and mentions the process",
      soul_refs: ["V1", "Q1"],
      on_fail: { retry_max: 1, then: "escalate" },
    });
  }
  const last = steps[steps.length - 1].id;
  steps.push({
    id: `S${steps.length + 1}`,
    name: "qa-verify",
    operator: "op-qa",
    depends_on: [last],
    precondition: `${last} completed and verified`,
    action: "Verify every output of this workflow: claims traceable, no fabricated content, soul clauses honored.",
    output_schema: "verification",
    postcondition: "every output is verified by qa_verifier",
    soul_refs: ["V1", "Q1", "G1"],
    on_fail: { retry_max: 0, then: "escalate" },
  });

  const intent =
    soulLine ||
    "Carry out the described work process honestly and clearly, producing only verified output.";
  const values: SoulValue[] = [
    {
      id: "V1",
      statement: soulLine || "Never fabricate source content.",
      observable_proxy: "every step output reflects the stated intent and declared sources",
      verdict: "pass|fail",
      enforced_by: "op-qa",
      advisory: false,
    },
    {
      id: "V2",
      statement: "Explain, do not just answer.",
      observable_proxy: "each output names the reasoning, not only the conclusion",
      verdict: "score(0..1)",
      threshold: 0.8,
      enforced_by: "op-qa",
      advisory: false,
    },
    {
      id: "V3",
      statement: "Respect the reader's time.",
      observable_proxy: "outputs are concise, structured, and free of filler",
      verdict: "score(0..1)",
      threshold: 0.75,
      enforced_by: "op-qa",
      advisory: false,
    },
  ];
  const qualityOfSpirit: SoulQoS[] = [
    {
      id: "Q1",
      name: "clarity",
      observable_proxy: "output is structured, readable and free of jargon soup",
      verdict: "score(0..1)",
      threshold: 0.75,
    },
  ];
  const guardrails: SoulGuardrail[] = [
    {
      id: "G1",
      statement: "Never fabricate content even if a boolean check would pass.",
      enforced_by: "op-qa",
    },
  ];

  return {
    algorithm: kebab(lines[0] ?? "workflow") || "workflow",
    version: "0.1.0",
    format,
    soul: { intent, voice: "clear, honest, terse", values, quality_of_spirit: qualityOfSpirit, guardrails },
    purpose: (lines[0] ?? "carry out the described process").slice(0, 200),
    inputs: { process: "text" },
    outputs: { solution: "text" },
    success_condition: "every step is verified and qa-verify passes",
    termination: { success: "END", failure: "ESCALATE", escalate_to: "human" },
    roles: [
      { id: "builder", responsibility: "Executes the declared steps.", does_not: "Never skips verification.", owns_decision: "How each step is executed." },
      { id: "qa_verifier", responsibility: "Verifies every step output.", does_not: "Never produces deliverable content.", owns_decision: "Whether an output is verified." },
    ],
    operators: [
      { id: "op-builder", role: "builder", kind: "agent", capabilities: ["write"] },
      { id: "op-qa", role: "qa_verifier", kind: "agent", capabilities: ["verify"] },
    ],
    steps,
    constraints: { deterministic: true, cache_outputs: true, budgets: { max_tokens: 8192, timeout_ms: 60000 } },
    assumptions: ["postconditions were inferred from the process text; review before production use."],
    open_questions: ["Are the inferred postconditions the real completion rules for each step?"],
  };
}

// ------------------------------------------------------------------ checks
export function selfCheck(model: AlgorithmModel): string[] {
  const issues: string[] = [];
  const operatorIds = new Set(model.operators.map((op) => op.id));
  const roleIds = new Set(model.roles.map((role) => role.id));
  for (const step of model.steps) {
    if (!step.precondition || !step.postcondition) issues.push(`${step.id}: missing pre/postcondition`);
    if (/agent decides/i.test(step.postcondition)) issues.push(`${step.id}: postcondition says "agent decides"`);
    const op = model.operators.find((candidate) => candidate.id === step.operator);
    if (!op || !operatorIds.has(step.operator)) issues.push(`${step.id}: operator '${step.operator}' not declared`);
    else if (!roleIds.has(op.role)) issues.push(`${step.id}: operator role '${op.role}' not declared`);
    for (const dependency of step.depends_on) {
      if (!model.steps.some((candidate) => candidate.id === dependency)) {
        issues.push(`${step.id}: depends_on '${dependency}' does not exist`);
      }
    }
    if (!step.on_fail || (step.on_fail.retry_max === undefined && !step.on_fail.then)) {
      issues.push(`${step.id}: no failure policy`);
    }
  }
  // no cycles in depends_on
  const seen = new Set<string>();
  const visiting = new Set<string>();
  const byId = new Map(model.steps.map((step) => [step.id, step]));
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (seen.has(id)) return true;
    visiting.add(id);
    const step = byId.get(id);
    if (step) {
      for (const dependency of step.depends_on) {
        if (!visit(dependency)) return false;
      }
    }
    visiting.delete(id);
    seen.add(id);
    return true;
  };
  for (const step of model.steps) {
    if (!visit(step.id)) {
      issues.push(`${step.id}: cycle in depends_on`);
      break;
    }
  }
  if (!model.success_condition) issues.push("success_condition missing");
  if (!model.termination?.failure) issues.push("termination.failure missing");
  return issues;
}

export function soulCheck(model: AlgorithmModel): string[] {
  const issues: string[] = [];
  const soul = model.soul;
  if (!soul?.intent) issues.push("soul.intent missing");
  const values = soul?.values ?? [];
  if (values.length < 3 || values.length > 7) issues.push(`soul.values count ${values.length} outside 3..7`);
  for (const value of values) {
    if (!value.observable_proxy) issues.push(`${value.id}: no observable proxy`);
    if (!value.verdict) issues.push(`${value.id}: no verdict type`);
    if (!value.enforced_by) issues.push(`${value.id}: no enforced_by operator`);
  }
  for (const clause of [...soul?.quality_of_spirit ?? [], ...soul?.guardrails ?? []]) {
    if (!clause.enforced_by && "enforced_by" in clause) issues.push(`${clause.id}: no enforced_by operator`);
  }
  const soulIds = new Set([...values.map((v) => v.id), ...(soul?.quality_of_spirit ?? []).map((q) => q.id), ...(soul?.guardrails ?? []).map((g) => g.id)]);
  for (const step of model.steps) {
    for (const ref of step.soul_refs) {
      if (!soulIds.has(ref)) issues.push(`${step.id}: soul_ref '${ref}' does not exist`);
    }
  }
  for (const guardrail of soul?.guardrails ?? []) {
    if (!/never|must not|do not/i.test(guardrail.statement)) {
      issues.push(`${guardrail.id}: guardrail should be a prohibition`);
    }
  }
  return issues;
}

// ------------------------------------------------------------------ yaml
function quote(value: string): string {
  if (/[:#{}[\],&*?|>'"%@`]/.test(value) || value.includes("\n")) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

export function emitYaml(model: AlgorithmModel): string {
  const out: string[] = [];
  out.push(`algorithm: ${quote(model.algorithm)}`);
  out.push(`version: ${quote(model.version)}`);
  out.push(`format: ${quote(model.format)}`);
  out.push("soul:");
  out.push(`  intent: ${quote(model.soul.intent)}`);
  out.push(`  voice: ${quote(model.soul.voice)}`);
  out.push("  values:");
  for (const value of model.soul.values) {
    out.push(`    - id: ${quote(value.id)}`);
    out.push(`      statement: ${quote(value.statement)}`);
    out.push(`      observable_proxy: ${quote(value.observable_proxy)}`);
    out.push(`      verdict: ${quote(value.verdict)}`);
    if (value.threshold !== undefined) out.push(`      threshold: ${value.threshold}`);
    if (value.enforced_by) out.push(`      enforced_by: ${quote(value.enforced_by)}`);
    out.push(`      advisory: ${value.advisory}`);
  }
  out.push("  quality_of_spirit:");
  for (const qos of model.soul.quality_of_spirit) {
    out.push(`    - id: ${quote(qos.id)}`);
    out.push(`      name: ${quote(qos.name)}`);
    out.push(`      observable_proxy: ${quote(qos.observable_proxy)}`);
    out.push(`      verdict: ${quote(qos.verdict)}`);
    if (qos.threshold !== undefined) out.push(`      threshold: ${qos.threshold}`);
  }
  out.push("  guardrails:");
  for (const guardrail of model.soul.guardrails) {
    out.push(`    - id: ${quote(guardrail.id)}`);
    out.push(`      statement: ${quote(guardrail.statement)}`);
    if (guardrail.enforced_by) out.push(`      enforced_by: ${quote(guardrail.enforced_by)}`);
  }
  out.push(`purpose: ${quote(model.purpose)}`);
  out.push("inputs:");
  for (const [name, type] of Object.entries(model.inputs)) out.push(`  ${name}: ${quote(type)}`);
  out.push("outputs:");
  for (const [name, type] of Object.entries(model.outputs)) out.push(`  ${name}: ${quote(type)}`);
  out.push(`success_condition: ${quote(model.success_condition)}`);
  out.push("termination:");
  out.push(`  success: ${quote(model.termination.success)}`);
  out.push(`  failure: ${quote(model.termination.failure)}`);
  out.push(`  escalate_to: ${quote(model.termination.escalate_to)}`);
  out.push("roles:");
  for (const role of model.roles) {
    out.push(`  - id: ${quote(role.id)}`);
    out.push(`    responsibility: ${quote(role.responsibility)}`);
    out.push(`    does_not: ${quote(role.does_not)}`);
    out.push(`    owns_decision: ${quote(role.owns_decision)}`);
  }
  out.push("operators:");
  for (const operator of model.operators) {
    out.push(`  - id: ${quote(operator.id)}`);
    out.push(`    role: ${quote(operator.role)}`);
    out.push(`    kind: ${quote(operator.kind)}`);
    out.push(`    capabilities: [${operator.capabilities.map(quote).join(", ")}]`);
  }
  out.push("steps:");
  for (const step of model.steps) {
    out.push(`  - id: ${quote(step.id)}`);
    out.push(`    name: ${quote(step.name)}`);
    out.push(`    operator: ${quote(step.operator)}`);
    out.push(`    depends_on: [${step.depends_on.map(quote).join(", ")}]`);
    out.push(`    precondition: ${quote(step.precondition)}`);
    out.push(`    action: ${quote(step.action)}`);
    out.push(`    output_schema: ${quote(step.output_schema)}`);
    out.push(`    postcondition: ${quote(step.postcondition)}`);
    out.push(`    soul_refs: [${step.soul_refs.map(quote).join(", ")}]`);
    out.push(`    on_fail: retry:${step.on_fail.retry_max},then:${step.on_fail.then}`);
  }
  out.push("constraints:");
  out.push(`  deterministic: ${model.constraints.deterministic}`);
  out.push(`  cache_outputs: ${model.constraints.cache_outputs}`);
  out.push(`  budgets: max_tokens:${model.constraints.budgets.max_tokens},timeout_ms:${model.constraints.budgets.timeout_ms}`);
  out.push("assumptions:");
  for (const assumption of model.assumptions) out.push(`  - ${quote(assumption)}`);
  out.push("open_questions:");
  for (const question of model.open_questions) out.push(`  - ${quote(question)}`);
  return out.join("\n") + "\n";
}

type Node = string | boolean | number | Node[] | { [key: string]: Node };

function scalar(raw: string): Node {
  const text = raw.trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    const inner = text.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(",").map((item) => scalar(item) as string);
  }
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1).replace(/\\"/g, '"');
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  return text;
}

function parseBlock(lines: string[], start: number, indent: number): { node: Node; next: number } {
  const map: { [key: string]: Node } = {};
  let list: Node[] | null = null;
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    const current = line.length - line.trimStart().length;
    if (current < indent) break;
    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) {
      if (current > indent) {
        const nested = parseBlock(lines, index, current);
        if (list) list.push(nested.node);
        index = nested.next;
        continue;
      }
      if (!list) list = [];
      const item = trimmed.slice(2);
      const colon = item.indexOf(":");
      const key = item.slice(0, colon).trim();
      const value = item.slice(colon + 1).trim();
      const itemMap: { [key: string]: Node } = { [key]: value === "" ? {} : scalar(value) };
      index += 1;
      while (index < lines.length) {
        const inner = lines[index];
        const innerIndent = inner.length - inner.trimStart().length;
        if (innerIndent <= current || inner.trim().startsWith("- ")) break;
        const innerColon = inner.trim().indexOf(":");
        const innerKey = inner.trim().slice(0, innerColon).trim();
        const innerValue = inner.trim().slice(innerColon + 1).trim();
        itemMap[innerKey] = innerValue === "" ? {} : scalar(innerValue);
        index += 1;
      }
      list.push(itemMap);
      continue;
    }
    const colon = trimmed.indexOf(":");
    if (colon === -1) break;
    const key = trimmed.slice(0, colon).trim();
    const value = trimmed.slice(colon + 1).trim();
    if (value === "") {
      const nested = parseBlock(lines, index + 1, indent + 2);
      map[key] = nested.node;
      index = nested.next;
    } else {
      map[key] = scalar(value);
      index += 1;
    }
  }
  if (list) return { node: list, next: index };
  return { node: map, next: index };
}

export function parseYaml(text: string): AlgorithmModel {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);
  const { node } = parseBlock(lines, 0, 0);
  const raw = node as Record<string, Node>;
  const asRecord = (value: Node | undefined): Record<string, Node> => (value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, Node>) : {});
  const asArray = (value: Node | undefined): Node[] => (Array.isArray(value) ? value : []);
  const str = (value: Node | undefined, fallback = ""): string => (typeof value === "string" ? value : fallback);
  const num = (value: Node | undefined, fallback = 0): number => (typeof value === "number" ? value : fallback);
  const soul = asRecord(raw.soul);
  const termination = asRecord(raw.termination);
  const constraints = asRecord(raw.constraints);
  const budgets = asRecord(constraints.budgets);
  const mapValues = (value: Node | undefined): Record<string, string> => {
    const result: Record<string, string> = {};
    const entries = Object.entries(asRecord(value));
    for (const [key, entry] of entries) result[key] = str(entry);
    return result;
  };
  const parseBudgetsScalar = (): { max_tokens: number; timeout_ms: number } => {
    const match = str(constraints.budgets).match(/max_tokens:(\d+).*timeout_ms:(\d+)/);
    if (match) return { max_tokens: Number(match[1]), timeout_ms: Number(match[2]) };
    return { max_tokens: num(budgets.max_tokens, 8192), timeout_ms: num(budgets.timeout_ms, 60000) };
  };
  const steps: Step[] = asArray(raw.steps).map((item) => {
    const record = asRecord(item);
    const onFail = str(record.on_fail);
    const match = onFail.match(/retry:(\d+),then:(\w+)/);
    return {
      id: str(record.id),
      name: str(record.name),
      operator: str(record.operator),
      depends_on: asArray(record.depends_on).map((entry) => str(entry)),
      precondition: str(record.precondition),
      action: str(record.action),
      output_schema: str(record.output_schema, "text"),
      postcondition: str(record.postcondition),
      soul_refs: asArray(record.soul_refs).map((entry) => str(entry)),
      on_fail: {
        retry_max: match ? Number(match[1]) : 1,
        then: match && match[2] === "abort" ? "abort" : "escalate",
      },
    } as Step;
  });
  return {
    algorithm: str(raw.algorithm, "workflow"),
    version: str(raw.version, "0.1.0"),
    format: str(raw.format, "prose"),
    soul: {
      intent: str(soul.intent),
      voice: str(soul.voice),
      values: asArray(soul.values).map((item) => {
        const record = asRecord(item);
        const verdict = str(record.verdict, "pass|fail") as SoulValue["verdict"];
        return {
          id: str(record.id),
          statement: str(record.statement),
          observable_proxy: str(record.observable_proxy),
          verdict,
          threshold: record.threshold === undefined ? undefined : num(record.threshold),
          enforced_by: str(record.enforced_by) || undefined,
          advisory: record.advisory === true,
        };
      }),
      quality_of_spirit: asArray(soul.quality_of_spirit).map((item) => {
        const record = asRecord(item);
        return {
          id: str(record.id),
          name: str(record.name),
          observable_proxy: str(record.observable_proxy),
          verdict: str(record.verdict, "score(0..1)") as SoulQoS["verdict"],
          threshold: record.threshold === undefined ? undefined : num(record.threshold),
        };
      }),
      guardrails: asArray(soul.guardrails).map((item) => {
        const record = asRecord(item);
        return { id: str(record.id), statement: str(record.statement), enforced_by: str(record.enforced_by) || undefined };
      }),
    },
    purpose: str(raw.purpose),
    inputs: mapValues(raw.inputs),
    outputs: mapValues(raw.outputs),
    success_condition: str(raw.success_condition),
    termination: {
      success: str(termination.success, "END"),
      failure: str(termination.failure, "ESCALATE"),
      escalate_to: str(termination.escalate_to, "human"),
    },
    roles: asArray(raw.roles).map((item) => {
      const record = asRecord(item);
      return {
        id: str(record.id),
        responsibility: str(record.responsibility),
        does_not: str(record.does_not),
        owns_decision: str(record.owns_decision),
      };
    }),
    operators: asArray(raw.operators).map((item) => {
      const record = asRecord(item);
      return {
        id: str(record.id),
        role: str(record.role),
        kind: (str(record.kind, "agent") as Operator["kind"]),
        capabilities: asArray(record.capabilities).map((entry) => str(entry)),
      };
    }),
    steps,
    constraints: {
      deterministic: constraints.deterministic === true,
      cache_outputs: constraints.cache_outputs === true,
      budgets: parseBudgetsScalar(),
    },
    assumptions: asArray(raw.assumptions).map((entry) => str(entry)),
    open_questions: asArray(raw.open_questions).map((entry) => str(entry)),
  };
}

// ------------------------------------------------------------------ execute
export interface StepReport {
  stepId: string;
  status: "verified" | "escalated" | "skipped";
  detail: string;
  tokens: number;
}

export interface WorkflowReport {
  algorithm: string;
  steps: StepReport[];
  verified: number;
  escalated: number;
  success: boolean;
  emotionalMode: string;
  totalTokens: number;
}

/** Compile and run the document: done means verified (postcondition gates). */
export async function executeAlgorithm(
  model: AlgorithmModel,
  manager: AgentManager,
  backend: Backend,
  kali: Kali,
): Promise<WorkflowReport> {
  kali.setPhases(model.steps.map((step) => ({ name: step.id, open: true })));
  const outputs = new Map<string, string>();
  const reports: StepReport[] = [];
  let escalated = false;
  let totalTokens = 0;
  for (const step of model.steps) {
    if (escalated) {
      reports.push({ stepId: step.id, status: "skipped", detail: "upstream escalation", tokens: 0 });
      continue;
    }
    const depsOk = step.depends_on.every((dependency) => outputs.has(dependency));
    if (!depsOk) {
      reports.push({ stepId: step.id, status: "skipped", detail: "precondition false", tokens: 0 });
      escalated = true;
      continue;
    }
    const agentId = `wf-${step.id}-${step.operator}`;
    const agent = manager.spawn({
      id: agentId,
      role: step.operator,
      zone: "workflow",
      persona: model.operators.find((op) => op.id === step.operator)?.role ?? "builder",
    });
    const permission = manager.requestMutation({
      agentId,
      target: step.id,
      phase: step.id,
      reason: `execute step ${step.id}`,
    });
    if (!permission.allowed) {
      kali.raiseAlert(`step ${step.id} blocked by Kali: ${permission.reason ?? "denied"}`);
      reports.push({ stepId: step.id, status: "escalated", detail: `Kali denied: ${permission.reason}`, tokens: 0 });
      escalated = true;
      continue;
    }
    let attempt = 0;
    let verified = false;
    let detail = "";
    let tokens = 0;
    let lastText = "";
    while (attempt <= step.on_fail.retry_max && !verified) {
      attempt += 1;
      const output = await manager.execute(agentId, {
        goal: step.action,
        deliverable: step.name,
        postcondition: step.postcondition,
      });
      tokens += output.tokens;
      totalTokens += output.tokens;
      const text = output.text;
      lastText = text;
      const nonEmpty = text.trim().length > 0;
      const keywords = step.postcondition.split(/\s+/).filter((word) => word.length >= 4);
      const mentions = keywords.filter((word) => text.toLowerCase().includes(word.toLowerCase())).length;
      const soulRefsExist = step.soul_refs.every((ref) =>
        [...model.soul.values, ...model.soul.quality_of_spirit, ...model.soul.guardrails].some((clause) => clause.id === ref),
      );
      verified = nonEmpty && mentions > 0 && soulRefsExist;
      detail = verified
        ? `postcondition verified (attempt ${attempt})`
        : `postcondition false (attempt ${attempt}, mentions=${mentions})`;
      if (!verified && attempt > step.on_fail.retry_max) {
        if (step.on_fail.then === "escalate") {
          kali.raiseAlert(`step ${step.id} escalated: ${detail}`);
          escalated = true;
        } else {
          escalated = true;
        }
      }
    }
    outputs.set(step.id, lastText || "");
    reports.push({
      stepId: step.id,
      status: verified ? "verified" : "escalated",
      detail,
      tokens,
    });
  }
  const verifiedCount = reports.filter((report) => report.status === "verified").length;
  const success = !escalated && verifiedCount === model.steps.length;
  return {
    algorithm: model.algorithm,
    steps: reports,
    verified: verifiedCount,
    escalated: reports.filter((report) => report.status === "escalated").length,
    success,
    emotionalMode: emotionalMode(),
    totalTokens,
  };
}
