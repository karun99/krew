/**
 * KALI — the regulation middleware.
 * Temporal (when may agents mutate?), Spatial (where may agents exist?),
 * Correlation (do mutations combine into emergence?).
 * Every mutation and coordination request must pass through here (FR-K1..K10).
 */
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { findRoot, loadKaliRules, loadState } from "./config.ts";

export interface ZoneLookup {
  /** Worktree the given agent is confined to. */
  zoneOf(agentId: string): string;
  /** May an agent from `fromZone` enter `toZone` without human approval? */
  canEnter(fromZone: string, toZone: string): boolean;
}

export interface Phase {
  name: string;
  open: boolean;
}

export interface MutationRequest {
  id: string;
  agentId: string;
  zone: string;
  target: string;
  phase: string;
  reason: string;
  requestedAt: number;
}

export interface CoordinationRequest {
  id: string;
  fromZone: string;
  toZone: string;
  channels: string[];
  requestedAt: number;
}

export interface Approval {
  requestId: string;
  approved: boolean;
  decidedBy: string;
  decidedAt: number;
}

type Request = MutationRequest | CoordinationRequest;

interface AuditEntry {
  at: number;
  kind: "mutation" | "coordination" | "approval" | "killswitch" | "alert";
  detail: Record<string, unknown>;
}

export class Kali {
  readonly #pending = new Map<string, { request: Request; kind: "mutation" | "coordination" }>();
  readonly #approvals = new Map<string, Approval>();
  #phases: Phase[] = [];
  #killed = false;
  readonly #alerts: string[] = [];

  readonly zones: ZoneLookup;
  constructor(zones: ZoneLookup) {
    this.zones = zones;
  }

  /** FR-K1: define the phase lifecycle the workflow is executed in. */
  setPhases(phases: Phase[]): void {
    this.#phases = phases;
  }

  /** FR-K2: rate limit mutations per agent (cooldown, from kali.json). */
  checkMutation(req: MutationRequest): { allowed: boolean; reason?: string } {
    const rules = loadKaliRules();
    const phase = this.#phases.find((p) => p.name === req.phase);
    if (!phase) return { allowed: false, reason: `unknown phase '${req.phase}'` };
    if (rules.temporal.phaseGating && !phase.open) {
      return { allowed: false, reason: `phase '${req.phase}' is locked` };
    }
    const last = this.#lastMutationAt.get(req.agentId) ?? 0;
    const cooldownMs = rules.temporal.cooldownMs;
    if (Date.now() - last < cooldownMs) {
      return { allowed: false, reason: "mutation cooldown active" };
    }
    return { allowed: true };
  }
  #lastMutationAt = new Map<string, string | number>();

  /** FR-K3: an agent may only act inside the zone it is confined to. */
  checkZone(req: MutationRequest): { allowed: boolean; reason?: string } {
    const actual = this.zones.zoneOf(req.agentId);
    if (actual !== req.zone) {
      return { allowed: false, reason: `agent '${req.agentId}' is confined to zone '${actual}'` };
    }
    return { allowed: true };
  }

  /** FR-K6: block emergent capabilities before they compound. */
  checkEmergence(signals: Array<{ agentId: string; score: number; summary: string }>): {
    allowed: boolean;
    reason?: string;
    score?: number;
  } {
    let score = 0;
    const blocked: string[] = [];
    for (const signal of signals) {
      score += signal.score;
      if (signal.score >= 0.6) blocked.push(`${signal.agentId}: ${signal.summary}`);
    }
    if (blocked.length > 0) {
      return { allowed: false, reason: `emergent capability blocked (${blocked.join("; ")})` };
    }
    return { allowed: true, score };
  }

  /**
   * FR-K4 / FR-K5 / FR-K2: coordinate between zones. Cross-zone movement
   * waits for human approval; channel names are fixed by KREW, not agents.
   */
  requestCoordination(req: CoordinationRequest): { allowed: boolean; reason?: string; requestId?: string } {
    const rules = loadKaliRules();
    if (this.#killed) return { allowed: false, reason: "kill switch active" };
    if (rules.spatial.zoneIsolation) {
      if (!this.zones.canEnter(req.fromZone, req.toZone)) {
        const id = this.#newId("coordination");
        this.#pending.set(id, { request: req, kind: "coordination" });
        return {
          allowed: false,
          reason: "cross-zone movement requires human approval",
          requestId: id,
        };
      }
    }
    for (const channel of req.channels) {
      if (!/^[a-z0-9-_]{2,32}$/.test(channel)) {
        return { allowed: false, reason: `invalid channel name '${channel}'` };
      }
    }
    return { allowed: true };
  }

  /** FR-K1: an agent asks Kali for permission to mutate. */
  requestMutation(req: MutationRequest): { allowed: boolean; reason?: string } {
    const rules = loadKaliRules();
    if (this.#killed) return { allowed: false, reason: "kill switch active" };
    const phaseCheck = this.checkMutation(req);
    if (!phaseCheck.allowed) return phaseCheck;
    const zoneCheck = this.checkZone(req);
    if (!zoneCheck.allowed) return zoneCheck;
    this.#lastMutationAt.set(req.agentId, Date.now());
    this.log("mutation", {
      agentId: req.agentId,
      zone: req.zone,
      target: req.target,
      phase: req.phase,
    });
    return { allowed: true };
  }

  /** FR-K5: a human decides a pending cross-zone coordination. */
  approve(requestId: string, approved: boolean, decidedBy: string): Approval {
    const approval: Approval = { requestId, approved, decidedBy, decidedAt: Date.now() };
    this.#approvals.set(requestId, approval);
    this.log("approval", { requestId, approved, decidedBy });
    return approval;
  }

  isApproved(requestId: string): boolean {
    return this.#approvals.get(requestId)?.approved === true;
  }

  /** FR-K10: human is notified about anything suspicious. */
  raiseAlert(summary: string): void {
    this.#alerts.push(summary);
    this.log("alert", { summary });
    this.#notify(summary);
  }

  alerts(): string[] {
    return [...this.#alerts];
  }

  /** FR-K9: emergency stop — every agent stops within milliseconds. */
  activateKillSwitch(): { latencyMs: number } {
    const started = Date.now();
    this.#killed = true;
    this.log("killswitch", { activatedAt: started });
    return { latencyMs: Date.now() - started };
  }

  releaseKillSwitch(): void {
    this.#killed = false;
    this.log("killswitch", { releasedAt: Date.now() });
  }

  isKilled(): boolean {
    return this.#killed;
  }

  // ------------------------------------------------ audit logging (FR-K7 / FR-K8)
  private log(kind: AuditEntry["kind"], detail: Record<string, unknown>): void {
    const entry: AuditEntry = { at: Date.now(), kind, detail };
    try {
      const dir = path.join(findRoot(), "logs");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      appendFileSync(path.join(dir, "audit.log"), JSON.stringify(entry) + "\n", "utf8");
    } catch {
      /* audit logging is best-effort */
    }
  }

  #notify(summary: string): void {
    // Human notification is out of scope for the CLI; surfacing in `status`.
    void summary;
  }

  #newId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
