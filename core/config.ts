/**
 * Configuration: loading defaults, backend selection, personas, emotional state.
 * All paths resolve relative to the KREW root (the folder containing core/).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export interface KrewConfig {
  version: string;
  backend: {
    type: "auto" | "simulator" | "openrouter" | "openai" | "local";
    openrouter: { apiKeyEnv: string; model: string };
    openai: { apiKeyEnv: string; model: string };
    local: { endpoint: string };
  };
  agents: { maxConcurrent: number; perAgentMemoryMB: number };
  killSwitch: { enabled: boolean };
}

export interface EmotionalState {
  defaultMode: string;
  activeMode: string | null;
  pinnedMode: string | null;
}

export interface KaliRules {
  temporal: {
    phaseGating: boolean;
    cooldownMs: number;
  };
  spatial: {
    zoneIsolation: boolean;
  };
  correlation: {
    emergenceDetection: boolean;
    maxEmergenceScore: number;
  };
}

export interface SoulsConfig {
  personalities: Record<string, unknown>;
  emotionalBlend: {
    default: string;
    allowedPairs: Record<string, string[]>;
  };
  duel: { judge: string; metrics: string[] };
  survival: {
    scenarios: Array<{ id: string; description: string; inject: string; checks: string[] }>;
    defaultScenario: string;
  };
}

const DEFAULT_CONFIG: KrewConfig = {
  version: "0.1.0",
  backend: {
    type: "auto",
    openrouter: { apiKeyEnv: "OPENROUTER_API_KEY", model: "auto" },
    openai: { apiKeyEnv: "OPENAI_API_KEY", model: "gpt-4o-mini" },
    local: { endpoint: "http://localhost:11434/v1" },
  },
  agents: { maxConcurrent: 10, perAgentMemoryMB: 50 },
  killSwitch: { enabled: true },
};

const DEFAULT_SOULS: SoulsConfig = {
  personalities: {},
  emotionalBlend: {
    default: "neutral",
    allowedPairs: {},
  },
  duel: { judge: "reality", metrics: ["accuracy", "efficiency"] },
  survival: { scenarios: [], defaultScenario: "verifier-failure" },
};

/** Absolute path of the KREW root (directory containing core/). */
export function findRoot(): string {
  const here = fileURLToPath(import.meta.url); // .../core/config.ts
  return path.resolve(here, "../../");
}

function readJson<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    const raw = readFileSync(file, "utf8");
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJson(file: string, value: unknown): void {
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

const DEFAULT_KALI: KaliRules = {
  temporal: { phaseGating: true, cooldownMs: 2000 },
  spatial: { zoneIsolation: true },
  correlation: { emergenceDetection: true, maxEmergenceScore: 0.85 },
};

export interface KrewState {
  config: KrewConfig;
  souls: SoulsConfig;
  emotional: EmotionalState;
  kali: KaliRules;
}

let cached: KrewState | null = null;

export function loadState(): KrewState {
  if (cached) return cached;
  const root = findRoot();
  const config: KrewConfig = readJson(path.join(root, "config", "krew.json"), DEFAULT_CONFIG);
  const souls: SoulsConfig = readJson(path.join(root, "config", "soul.json"), DEFAULT_SOULS);
  const kali: KaliRules = readJson(path.join(root, "config", "kali.json"), DEFAULT_KALI);
  const emotional: EmotionalState = {
    defaultMode: souls.emotionalBlend.default || "neutral",
    activeMode: null,
    pinnedMode: null,
  };
  cached = { config, souls, emotional, kali };
  return cached;
}

export function saveConfig(next: KrewConfig): void {
  cached = null;
  const root = findRoot();
  const file = path.join(root, "config", "krew.json");
  writeJson(file, next);
  cached = loadState();
}

export function saveSouls(next: SoulsConfig): void {
  cached = null;
  const root = findRoot();
  const file = path.join(root, "config", "soul.json");
  writeJson(file, next);
  cached = loadState();
}

export function reloadState(): KrewState {
  cached = null;
  return loadState();
}

/** Kali regulation rules (temporal / spatial / correlation). */
export function loadKaliRules(): KaliRules {
  return loadState().kali;
}

/** Resolve which backend KREW should use. */
export function resolveBackend(type: KrewConfig["backend"]["type"]): {
  kind: "simulator" | "openrouter" | "openai" | "local";
  label: string;
} {
  const env = process.env as Record<string, string | undefined>;
  if (type === "simulator") return { kind: "simulator", label: "simulator" };
  if (type === "openrouter" && env[DEFAULT_CONFIG.backend.openrouter.apiKeyEnv]) {
    return { kind: "openrouter", label: DEFAULT_CONFIG.backend.openrouter.apiKeyEnv };
  }
  if (type === "openai" && env[DEFAULT_CONFIG.backend.openai.apiKeyEnv]) {
    return { kind: "openai", label: DEFAULT_CONFIG.backend.openai.apiKeyEnv };
  }
  if (type === "local") return { kind: "local", label: "local" };
  return { kind: "simulator", label: "simulator (no API key configured)" };
}

/** All personas declared in soul.json. */
export function personas(): Array<{ name: string; description: string; style: string }> {
  const souls = loadState().souls;
  return Object.entries(souls.personalities ?? {}).map(([name, p]) => ({
    name,
    description: String(p.description ?? ""),
    style: String(p.style ?? ""),
  }));
}

export function emotionalMode(): string {
  const state = loadState();
  return state.emotional.pinnedMode ?? state.emotional.activeMode ?? state.emotional.defaultMode;
}
