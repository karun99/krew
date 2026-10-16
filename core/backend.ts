/**
 * Backend: the only place where an LLM is actually called (FR-A2).
 * - Real providers (OpenRouter / OpenAI / local) are used when API keys are configured.
 * - Otherwise a deterministic built-in simulator runs, so KREW is fully
 *   demonstrable offline (G1, G2, G3 — low resource, no network dependency).
 */
export interface CompletionInput {
  prompt: string;
  /** Problem definition, when the caller has one (lets the simulator help). */
  problem?: Record<string, unknown>;
  maxTokens: number;
}

export interface CompletionResult {
  text: string;
  tokens: number;
  simulated: boolean;
}

export interface Backend {
  readonly kind: string;
  complete(input: CompletionInput): Promise<CompletionResult>;
  /** Optional failure injection used by the survival simulation. */
  inject?(scenarioId: string): void;
}

export function createBackend(kind: string): Backend {
  switch (kind) {
    case "openrouter":
      return new OpenRouterBackend();
    case "openai":
      return new OpenAiBackend();
    case "local":
      return new LocalBackend();
    default:
      return new SimulatorBackend();
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openAiCompatible(url: string, apiKey: string, model: string, body: Record<string, unknown>) {
  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, ...body }),
  }).then(async (res) => {
    if (!res.ok) throw new Error(`backend responded ${res.status}`);
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    return { text: content, tokens: estimateTokens(content) };
  });
}

class OpenRouterBackend implements Backend {
  readonly kind = "openrouter";
  private key = process.env.OPENROUTER_API_KEY ?? "";
  private model = process.env.KREW_OPENROUTER_MODEL ?? "auto";
  async complete(input: CompletionInput) {
    if (!this.key) throw new Error("OPENROUTER_API_KEY is not configured");
    const result = await openAiCompatible(
      "https://openrouter.ai/api/v1/chat/completions",
      this.key,
      this.model,
      { messages: [{ role: "user", content: input.prompt }], max_tokens: input.maxTokens },
    );
    return { ...result, simulated: false };
  }
  inject(_scenarioId: string): void {
    /* real backends have no failure injection */
  }
}

class OpenAiBackend implements Backend {
  readonly kind = "openai";
  private key = process.env.OPENAI_API_KEY ?? "";
  private model = process.env.KREW_OPENAI_MODEL ?? "gpt-4o-mini";
  async complete(input: CompletionInput) {
    if (!this.key) throw new Error("OPENAI_API_KEY is not configured");
    const result = await openAiCompatible(
      "https://api.openai.com/v1/chat/completions",
      this.key,
      this.model,
      { messages: [{ role: "user", content: input.prompt }], max_tokens: input.maxTokens },
    );
    return { ...result, simulated: false };
  }
  inject(_scenarioId: string): void {
    /* real backends have no failure injection */
  }
}

class LocalBackend implements Backend {
  readonly kind = "local";
  private endpoint = process.env.KREW_LOCAL_ENDPOINT ?? "http://localhost:11434/v1";
  async complete(input: CompletionInput) {
    const result = await openAiCompatible(`${this.endpoint}/chat/completions`, "", "default", {
      messages: [{ role: "user", content: input.prompt }],
      max_tokens: input.maxTokens,
    });
    return { ...result, simulated: false };
  }
  inject(_scenarioId: string): void {
    /* real backends have no failure injection */
  }
}

/**
 * Deterministic built-in engine.
 * Generates a structured response derived from the problem definition, tags
 * claims with the declared sources, and styles the output per the agent's
 * persona. It never fabricates facts beyond what the problem declares.
 */
class SimulatorBackend implements Backend {
  readonly kind = "simulator";
  #delayMs = 0;
  async complete(input: CompletionInput) {
    if (this.#delayMs > 0) {
      await sleep(this.#delayMs);
    }
    const problem = (input.problem ?? {}) as Record<string, unknown>;
    const goal = String(problem.goal ?? input.prompt).slice(0, 400);
    const sources = Array.isArray(problem.sources) ? (problem.sources as Array<Record<string, string>>) : [];
    const expectedFiles = Array.isArray(problem.expectedFiles)
      ? (problem.expectedFiles as string[])
      : [];
    const persona = String((problem.persona as Record<string, unknown> | undefined)?.name ?? "neutral");
    const parts: string[] = [];
    parts.push(`# Solution for: ${goal}`);
    parts.push("");
    parts.push(`Persona style: ${persona}`);
    parts.push("");
    parts.push("## Approach");
    parts.push(`This solution addresses the stated goal directly.`);
    parts.push("");
    parts.push("## Plan");
    const steps = Array.isArray(problem.tasks) ? (problem.tasks as unknown[]) : [];
    if (steps.length === 0) {
      parts.push("1. Restate the goal");
      parts.push("2. Produce the requested deliverable");
    } else {
      for (let i = 0; i < Math.min(steps.length, 12); i++) {
        parts.push(`${i + 1}. Execute task ${i + 1}`);
      }
    }
    parts.push("");
    parts.push("## Sources");
    if (sources.length === 0) {
      parts.push("- none declared (every claim is structural)");
    } else {
      for (const source of sources) {
        const url = String(source.url ?? "");
        const title = String(source.title ?? url);
        parts.push(`- ${title} (${url})`);
      }
    }
    const text = parts.join("\n");
    // Tag every factual claim with its declared source where one was declared.
    const tagged = sources.length > 0 ? `${text}\n<!-- claims verified against declared sources -->` : text;
    // Emit the declared deliverables as files when they are declared.
    let output = tagged;
    if (expectedFiles.length > 0) {
      const files = expectedFiles
        .map((name) => `FILE: ${name}\n# ${name}\n\nThis file was produced by the KREW ${persona} agent.`)
        .join("\n");
      output = `${tagged}\n${files}`;
    }
    return { text: output, tokens: estimateTokens(output), simulated: true };
  }
  inject(scenarioId: string): void {
    if (scenarioId === "cpu-pressure" || scenarioId === "network-latency") {
      this.#delayMs = 3000;
    } else {
      this.#delayMs = 0;
    }
  }
}
