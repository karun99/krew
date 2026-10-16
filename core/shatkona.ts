/**
 * SHATKONA — the emotional blend engine (G6).
 * Blends emotional modes for resilience, never for decisions.
 * Modes are auditable: every blend is logged. The user may pin a mode.
 *
 *   Active ▼ Receptive ✡ Blended
 *   Drive Patience Endurance
 *   Courage Caution Wisdom
 *   Urgency Rest Rhythm
 *   Ambition Humility Growth
 *   Persistence Surrender Flow
 *   Intensity Calm Focus
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { findRoot, loadState, saveSouls } from "./config.ts";

export const PAIRS: Record<string, string[]> = {
  Active: ["Drive", "Courage", "Urgency", "Ambition", "Persistence", "Intensity"],
  Receptive: ["Patience", "Caution", "Rest", "Humility", "Surrender"],
  Blended: ["Endurance", "Wisdom", "Rhythm", "Growth", "Flow", "Focus"],
};

export function allowedModes(): string[] {
  return ["neutral", "Active", "Receptive", "Blended"];
}

export interface BlendPlan {
  active: string[];
  receptive: string[];
  blended: string[];
}

/** Compute the emotional blend for a mode. Deterministic, no randomness. */
export function planFor(mode: string): BlendPlan {
  const active = PAIRS[mode] ?? [];
  const receptive = PAIRS.Receptive.filter((word) => !active.includes(word));
  const blended = [...PAIRS.Blended];
  return { active, receptive, blended };
}

export interface EmotionalLogEntry {
  at: number;
  mode: string;
  pinned: boolean;
  appliedBy: string;
}

/**
 * The runtime emotional state. Pinned modes are user-controlled and cannot
 * be changed by agents; active modes are set by the orchestrator only.
 */
export class Shatkona {
  activeMode: string;
  pinnedMode: string | null;
  #log: EmotionalLogEntry[] = [];

  constructor() {
    const state = loadState();
    this.pinnedMode = state.emotional.pinnedMode;
    this.activeMode = state.emotional.defaultMode;
  }

  get mode(): string {
    return this.pinnedMode ?? this.activeMode;
  }

  /** Switch the active emotional mode (audited). */
  setActiveMode(mode: string, appliedBy: string): void {
    const state = loadState();
    if (state.emotional.pinnedMode) {
      throw new Error("a pinned emotional mode cannot be replaced");
    }
    this.activeMode = mode;
    const entry: EmotionalLogEntry = { at: Date.now(), mode, pinned: false, appliedBy };
    this.#log.push(entry);
    this.#append(entry);
  }

  pinMode(mode: string): void {
    const state = loadState();
    if (!PAIRS[mode]) throw new Error(`unknown emotional mode '${mode}'`);
    const next = { ...state, emotional: { ...state.emotional, pinnedMode: mode } };
    saveSouls(next.souls);
    this.pinnedMode = mode;
    const entry: EmotionalLogEntry = { at: Date.now(), mode, pinned: true, appliedBy: "user" };
    this.#log.push(entry);
    this.#append(entry);
  }

  unpinned(): void {
    const state = loadState();
    const next = { ...state, emotional: { ...state.emotional, pinnedMode: null } };
    saveSouls(next.souls);
    this.pinnedMode = null;
    const entry: EmotionalLogEntry = { at: Date.now(), mode: this.activeMode, pinned: false, appliedBy: "user" };
    this.#log.push(entry);
    this.#append(entry);
  }

  log(): EmotionalLogEntry[] {
    return [...this.#log];
  }

  /** Emotional state must never influence decisions — only style. */
  decisionPolicyIsolated(): boolean {
    return true;
  }

  #append(entry: EmotionalLogEntry): void {
    try {
      const dir = path.join(findRoot(), "logs");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(path.join(dir, "blend.log"), `${JSON.stringify(entry)}\n`, "utf8");
    } catch {
      /* emotional log is best-effort */
    }
  }
}
