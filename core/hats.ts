/**
 * HATS — perspective rotation (FR-G7).
 * Every agent wears a hat: the perspective it is asked to defend.
 * Hats rotate each phase so agents are not stuck in one mode.
 * Only the current phase's hat is active — never stacked.
 */
export interface Hat {
  name: string;
  description: string;
}

export const HATS: Hat[] = [
  { name: "analyst", description: "Examines data and sources for hidden assumptions" },
  { name: "critic", description: "Attacks feasibility, edge cases and gaps" },
  { name: "optimist", description: "Finds the simplest path and the easiest win" },
  { name: "historian", description: "Anchors the solution in past attempts and audit" },
  { name: "explorer", description: "Proposes novel routes when the obvious one fails" },
  { name: "guardian", description: "Checks safety, scope and user constraints" },
];

export function hatsCatalog(): Hat[] {
  return HATS;
}

export interface HatAssignment {
  agentId: string;
  hat: string;
}

/** Advance every agent's hat by one step. Never two hats at once. */
export function rotate(assignments: HatAssignment[], offset = 0): HatAssignment[] {
  const current = new Map<string, number>();
  for (const assignment of assignments) {
    const index = HATS.findIndex((hat) => hat.name === assignment.hat);
    current.set(assignment.agentId, (index + offset) % HATS.length);
  }
  return [...current.entries()].map(([agentId, index]) => ({
    agentId,
    hat: HATS[index].name,
  }));
}

export function currentHat(assignments: HatAssignment[], agentId: string, offset = 0): HatAssignment | null {
  const found = assignments.find((a) => a.agentId === agentId);
  if (!found) return null;
  const index = HATS.findIndex((hat) => hat.name === found.hat);
  return { agentId, hat: HATS[(index + offset) % HATS.length].name };
}
