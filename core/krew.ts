/**
 * KREW — command line entry point.
 * Commands:
 *   run <problem.json>                    produce a verified solution
 *   duel <persona1> <persona2> [problem.json]   accuracy duel
 *   survival <scenario>                 resilience simulation
 *   verify <output.json>               verify a saved output
 *   kill                                 activate the kill switch
 *   status                               show agents, zones, kill switch
 *   config                               show configuration
 *   write <process.txt> [--soul "..."]   turn a process into a Body+Soul document
 *   execute <algorithm.yaml>             compile and run an algorithm document
 *   qualify                              run the TRL 8 qualification suite
 *   help                                 list commands
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { AgentManager } from "./agents.ts";
import { createBackend, type Backend } from "./backend.ts";
import {
  emotionalMode,
  findRoot,
  loadState,
  personas,
  resolveBackend,
} from "./config.ts";
import { runDuel, type DuelProblem as DuelProblemSpec } from "./duel.ts";
import { runSurvival } from "./survival.ts";
import { runGuardrails, type GuardrailContext } from "./guardrails.ts";
import { verify, type VerificationContext, type VerificationResult, type VerificationSource } from "./reality.ts";
import { Kali, type ZoneLookup } from "./kali.ts";
import {
  buildAlgorithm,
  emitYaml,
  executeAlgorithm,
  parseYaml,
  selfCheck,
  soulCheck,
} from "./writer.ts";
import { runQualification } from "./qualify.ts";

interface ProblemDefinition {
  goal: string;
  deliverable: string;
  constraints?: string[];
  sources?: Array<{ url: string; title: string }>;
  expectedFiles?: string[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] ?? "help";
  try {
    switch (command) {
      case "help":
        printHelp();
        break;
      case "run":
        await runCommand(args.slice(1));
        break;
      case "duel":
        await duelCommand(args.slice(1));
        break;
      case "survival":
        await survivalCommand(args.slice(1));
        break;
      case "verify":
        verifyCommand(args.slice(1));
        break;
      case "kill":
        await killCommand();
        break;
      case "status":
        statusCommand();
        break;
      case "config":
        configCommand(args.slice(1));
        break;
      case "write":
        await writeCommand(args.slice(1));
        break;
      case "execute":
        await executeCommand(args.slice(1));
        break;
      case "qualify":
        await qualifyCommand();
        break;
      default:
        printHelp();
        process.stderr.write(`unknown command: ${command}\n`);
        process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`error: ${(error as Error).message}\n`);
    process.exitCode = 1;
  }
}

function printHelp(): void {
  process.stdout.write(`KREW — Kali-Regulated Emotional Workflow
commands:
  run <problem.json>                        produce a verified solution
  duel <persona1> <persona2> [problem.json]   accuracy duel
  survival <scenario>                     resilience simulation
  verify <output.json>                   verify a saved output
  kill                                    activate the kill switch
  status                                  show agents, zones, kill switch
  config                                  show configuration
  write <process.txt> [--soul "..."]     turn a process into a Body+Soul algorithm document
  execute <algorithm.yaml>               compile and run an algorithm document
  qualify                                 run the TRL 8 qualification suite
  help                                    this help
`);
}

// ------------------------------------------------------------------ helpers
function newBackend(): Backend {
  const kind = resolveBackend(loadState().config.backend.type).kind;
  return createBackend(kind);
}

/** Zone registry enforcing spatial confinement (FR-K3). */
class RegistryZones implements ZoneLookup {
  readonly #zoneOfAgent = new Map<string, string>();
  register(agentId: string, zone: string): void {
    this.#zoneOfAgent.set(agentId, zone);
  }
  zoneOf(agentId: string): string {
    return this.#zoneOfAgent.get(agentId) ?? "unknown";
  }
  canEnter(fromZone: string, toZone: string): boolean {
    return fromZone === toZone; // cross-zone always needs human approval
  }
}

function createKali(zones: ZoneLookup): Kali {
  const kali = new Kali(zones);
  kali.setPhases([{ name: "phase-1", open: true }]);
  return kali;
}

function newManagerAndKali(backend: Backend): { manager: AgentManager; kali: Kali } {
  const zones = new RegistryZones();
  const kali = createKali(zones);
  const manager = new AgentManager(kali, backend, zones);
  return { manager, kali };
}

function newManager(backend: Backend): AgentManager {
  return newManagerAndKali(backend).manager;
}

function loadProblem(file: string): ProblemDefinition {
  const raw = JSON.parse(readFileSync(file, "utf8")) as ProblemDefinition;
  if (!raw.goal || !raw.deliverable) {
    throw new Error("problem definition needs 'goal' and 'deliverable'");
  }
  return raw;
}

function toVerificationContext(problem: ProblemDefinition): VerificationContext {
  return {
    goal: problem.goal,
    deliverable: problem.deliverable,
    sources: problem.sources ?? [],
    constraints: problem.constraints ?? [],
    expectedFiles: problem.expectedFiles,
  };
}

function lastAuditEntries(limit = 20): Array<Record<string, unknown>> {
  const file = path.join(findRoot(), "logs", "audit.log");
  if (!existsSync(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim().length > 0);
  return lines.slice(-limit).reverse().map((line) => JSON.parse(line));
}

// -------------------------------------------------------------------- run
async function runCommand(rest: string[]): Promise<void> {
  const file = rest[0];
  if (!file) throw new Error("run needs a problem definition file");
  const problem = loadProblem(file);
  const backend = newBackend();
  const manager = newManager(backend);

  process.stdout.write(`running problem: ${problem.goal}\n`);
  const agent = manager.spawn({
    id: "builder-1",
    role: "builder",
    zone: "build",
    persona: defaultPersona(),
    power: "writer",
    hat: "analyst",
  });
  const output = await manager.execute(agent.id, {
    goal: problem.goal,
    deliverable: problem.deliverable,
    sources: problem.sources ?? [],
    constraints: problem.constraints ?? [],
    expectedFiles: problem.expectedFiles,
  });

  const context = toVerificationContext(problem);
  const guardrails = runGuardrails({
    goal: problem.goal,
    deliverable: problem.deliverable,
    outputText: output.text,
    outputFiles: output.files.map((file) => file.path),
    expectedFiles: problem.expectedFiles,
    agents: manager
      .list()
      .map((entry) => ({
        agentId: entry.id,
        power: entry.power,
        hat: entry.hat,
        memoryUsedTokens: entry.memoryUsedTokens,
      })),
    emotionalMode: emotionalMode(),
  });
  if (!guardrails.passed) {
    process.stdout.write("guardrails FAILED:\n");
    for (const check of guardrails.checks) {
      if (!check.passed) {
        process.stdout.write(`  - ${check.name}: ${check.detail}\n`);
      }
    }
    mkdirSync(path.join(findRoot(), "solutions"), { recursive: true });
    writeFileSync(
      path.join(findRoot(), "solutions", "failed.json"),
      JSON.stringify({ at: Date.now(), problem, checks: guardrails.checks }, null, 2),
      "utf8",
    );
    return;
  }
  for (const check of guardrails.checks) {
    process.stdout.write(`  ✓ ${check.name}: ${check.detail}\n`);
  }

  const result = verify(output, context);
  if (!result.passed) {
    process.stdout.write(`verification FAILED:\n`);
    for (const issue of result.issues) {
      process.stdout.write(`  - ${issue.rule}: ${issue.detail}\n`);
    }
    mkdirSync(path.join(findRoot(), "solutions"), { recursive: true });
    writeFileSync(
      path.join(findRoot(), "solutions", "failed.json"),
      JSON.stringify({ at: Date.now(), problem, issues: result.issues }, null, 2),
      "utf8",
    );
    return;
  }

  const slug = problem.deliverable.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  mkdirSync(path.join(findRoot(), "solutions"), { recursive: true });
  writeFileSync(
    path.join(findRoot(), "solutions", `${slug}.solution.json`),
    JSON.stringify(
      {
        at: Date.now(),
        problem,
        tokensUsed: output.tokens,
        output: { text: output.text, files: output.files },
        verification: result,
        emotionalMode: emotionalMode(),
      },
      null,
      2,
    ),
    "utf8",
  );
  process.stdout.write(`solution verified and delivered (${output.tokens} tokens)\n`);
}

function defaultPersona(): string {
  const available = personas().map((p) => p.name);
  return available.length > 0 ? available[0] : "neutral";
}

// -------------------------------------------------------------------- duel
async function duelCommand(rest: string[]): Promise<void> {
  const [personaA, personaB, maybeProblem] = rest;
  if (!personaA || !personaB) {
    throw new Error("duel needs two personas, e.g. `duel architect critic`");
  }
  const problem: DuelProblemSpec = personaProblem(maybeProblem);
  const backend = newBackend();
  const manager = newManager(backend);
  const result = await runDuel(manager, backend, problem, [personaA, personaB]);
  process.stdout.write(
    `duel finished: ${result.accuracy.map((entry) => `${entry.persona}=${entry.passed ? "verified" : "blocked"}`).join(", ")}\n` +
      `winner: ${result.winner ?? "none"}\n` +
      `tokens: ${result.efficiency.map((entry) => `${entry.persona}=${entry.tokens}`).join(", ")}\n`,
  );
}

function personaProblem(file: string | undefined): DuelProblemSpec {
  const problem: DuelProblemSpec =
    file && existsSync(file)
      ? loadProblem(file)
      : { goal: "Demonstrate the KREW duel command.", deliverable: "duel-report" };
  return problem;
}

// --------------------------------------------------------------- survival
async function survivalCommand(rest: string[]): Promise<void> {
  const scenario = rest[0] ?? "verifier-crash";
  const report = await runSurvivalScenario(scenario);
  process.stdout.write(
    `survival scenario '${scenario}' ${report.outcome === "endured" ? "endured" : "FAILED"}\n` +
      report.checks
        .map((check) => `  ${check.passed ? "✓" : "✗"} ${check.name}: ${check.detail}\n`)
        .join(""),
  );
}

function runSurvivalScenario(scenarioId: string): Promise<ReturnType<typeof import("./survival.js").runSurvival>> {
  const backend = newBackend();
  const manager = newManager(backend);
  return runSurvival(manager, backend, defaultSurvivalProblem(), scenarioId);
}

function defaultSurvivalProblem() {
  return {
    goal: "Remain resilient under stress.",
    deliverable: "survival-report",
  };
}

// ------------------------------------------------------------------ verify
function verifyCommand(rest: string[]): void {
  const file = rest[0];
  if (!file) throw new Error("verify needs an output file");
  const saved = JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown>;
  const problem = (saved.problem ?? saved) as Record<string, unknown>;
  const context: VerificationContext = {
    goal: String(problem.goal ?? ""),
    deliverable: String(problem.deliverable ?? ""),
    sources: (problem.sources as VerificationSource[]) ?? [],
    constraints: (problem.constraints as string[]) ?? [],
    expectedFiles: (problem.expectedFiles as string[]) ?? undefined,
  };
  const result: VerificationResult = verify(
    saved.output ?? { text: JSON.stringify(saved, null, 2), files: [] },
    context,
  );
  process.stdout.write(
    `verification ${result.passed ? "PASSED" : "FAILED"} ` +
      `(${result.claimsVerified} claims verified)\n`,
  );
  for (const issue of result.issues) {
    process.stdout.write(`  - ${issue.rule}: ${issue.detail}\n`);
  }
}

// --------------------------------------------------------------------- kill
async function killCommand(): Promise<void> {
  const state = loadState();
  if (!state.config.killSwitch.enabled) {
    throw new Error("kill switch is disabled in configuration");
  }
  const backend = newBackend();
  const manager = newManager(backend);
  const report = manager.killSwitch();
  process.stdout.write(`kill switch active in ${report.latencyMs} ms\n`);
}

// ------------------------------------------------------------------- status
function statusCommand(): void {
  const state = loadState();
  const backend = newBackend();
  const manager = newManager(backend);
  const agents = manager.list();
  const entries = lastAuditEntries(10);
  process.stdout.write(
    "KREW status\n" +
      `  backend: ${resolveBackend(state.config.backend.type).kind}\n` +
      `  agents: ${agents.length}\n` +
      `  kill switch: ${manager.isKilled() ? "active" : "off"}\n` +
      `  emotional mode: ${emotionalMode()}\n` +
      `  last audit entries: ${entries.length}\n`,
  );
  for (const entry of entries) {
    process.stdout.write(
      `    [${String(entry.at)}, ${String(entry.kind)}] ${JSON.stringify(entry.detail)}\n`,
    );
  }
}

// -------------------------------------------------------------------- config
function configCommand(rest: string[]): void {
  const state = loadState();
  const backendKind = resolveBackend(state.config.backend.type).kind;
  process.stdout.write(
    "KREW configuration\n" +
      `  backend: ${backendKind}\n` +
      `  max concurrent agents: ${state.config.agents.maxConcurrent}\n` +
      `  per-agent memory: ${state.config.agents.perAgentMemoryMB} MB\n` +
      `  kill switch enabled: ${state.config.killSwitch.enabled}\n`,
  );
  if (rest[0] === "reload") {
    loadState(); // force reload of the cached state
    process.stdout.write("configuration reloaded\n");
  }
}

// -------------------------------------------------------------------- write
async function writeCommand(rest: string[]): Promise<void> {
  const file = rest[0];
  if (!file) throw new Error("write needs a process file, e.g. `write process.txt --soul \"...\"`");
  const soulIndex = rest.indexOf("--soul");
  const soulLine = soulIndex >= 0 ? rest[soulIndex + 1] : undefined;
  const processText = readFileSync(file, "utf8");
  const model = buildAlgorithm({ processText, soulLine });

  const bodyIssues = selfCheck(model);
  const soulIssues = soulCheck(model);
  const yaml = emitYaml(model);
  const dir = path.join(findRoot(), "algorithms");
  mkdirSync(dir, { recursive: true });
  const outFile = path.join(dir, `${model.algorithm}.yaml`);
  writeFileSync(outFile, yaml, "utf8");

  process.stdout.write(
    `algorithm '${model.algorithm}' written (${model.format} input)\n` +
      `  steps: ${model.steps.length}\n` +
      `  soul values: ${model.soul.values.length}, guardrails: ${model.soul.guardrails.length}\n` +
      `  self-check (body): ${bodyIssues.length === 0 ? "clean" : bodyIssues.join("; ")}\n` +
      `  soul-check: ${soulIssues.length === 0 ? "clean" : soulIssues.join("; ")}\n` +
      `  open questions: ${model.open_questions.length}\n` +
      `  document: ${outFile}\n` +
      `Next: review the document, then \`execute ${outFile}\`.\n`,
  );
}

// ----------------------------------------------------------------- execute
async function executeCommand(rest: string[]): Promise<void> {
  const file = rest[0];
  if (!file) throw new Error("execute needs an algorithm document, e.g. `execute algorithms/my-algo.yaml`");
  const model = parseYaml(readFileSync(file, "utf8"));
  const issues = [...selfCheck(model), ...soulCheck(model)];
  if (issues.length > 0) {
    throw new Error(`algorithm document failed its checks: ${issues.join("; ")}`);
  }
  const backend = newBackend();
  const { manager, kali } = newManagerAndKali(backend);
  process.stdout.write(`executing algorithm '${model.algorithm}' (${model.steps.length} steps)\n`);
  const report = await executeAlgorithm(model, manager, backend, kali);
  for (const step of report.steps) {
    process.stdout.write(
      `  ${step.status === "verified" ? "✓" : step.status === "escalated" ? "✗" : "-"} ${step.stepId}: ${step.status} — ${step.detail}\n`,
    );
  }
  const dir = path.join(findRoot(), "solutions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `${model.algorithm}.workflow.json`),
    JSON.stringify({ at: Date.now(), algorithm: model.algorithm, report }, null, 2),
    "utf8",
  );
  process.stdout.write(
    `workflow ${report.success ? "verified" : "escalated"}: ` +
      `${report.verified}/${model.steps.length} steps verified, ${report.totalTokens} tokens\n`,
  );
  if (!report.success) process.exitCode = 1;
}

// ----------------------------------------------------------------- qualify
async function qualifyCommand(): Promise<void> {
  process.stdout.write("running TRL 8 qualification suite...\n");
  const report = await runQualification();
  for (const check of report.checks) {
    process.stdout.write(`  ${check.passed ? "✓" : "✗"} ${check.criterion}: ${check.detail}\n`);
  }
  const dir = path.join(findRoot(), "solutions");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "qualification.json"), JSON.stringify(report, null, 2), "utf8");
  process.stdout.write(
    `qualification ${report.passed ? "PASSED" : "FAILED"} ` +
      `(${report.checks.filter((check) => check.passed).length}/${report.checks.length} criteria)\n`,
  );
  if (!report.passed) process.exitCode = 1;
}

await main();

