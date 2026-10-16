/**
 * STONES — power distribution (FR-G6).
 * Distributes the powers every agent may hold: reader, writer, verifier,
 * analyst, coordinator, historian. Powers rotate over phases so that
 * perspectives spread instead of one agent hoarding everything.
 */
export interface Power {
  name: string;
  description: string;
}

export const POWERS: Power[] = [
  { name: "reader", description: "Reads inputs, tracks requirements and sources" },
  { name: "writer", description: "Produces solution artifacts" },
  { name: "verifier", description: "Checks outputs against declared sources" },
  { name: "analyst", description: "Finds hidden assumptions and risks" },
  { name: "coordinator", description: "Sequences work between zones" },
  { name: "historian", description: "Keeps audit trail and lessons" },
];

export function powersCatalog(): Power[] {
  return POWERS;
}

export interface Assignment {
  agentId: string;
  power: string;
}

/**
 * Assign powers to agents. One power per agent, and an agent never holds
 * two powers. The assignment rotates every phase.
 */
export function distribute(powers: Power[], agentIds: string[], offset = 0): Assignment[] {
  const assignments: Assignment[] = [];
  const taken = new Set<string>();
  powers.forEach((power, index) => {
    let agentId = agentIds[(index + offset) % agentIds.length];
    if (taken.has(agentId)) {
      agentId = agentIds[(index + offset + 1) % agentIds.length];
    }
    taken.add(agentId);
    assignments.push({ agentId, power: power.name });
  });
  return assignments;
}

/** Powers currently held by an agent. */
export function heldPowers(assignments: Assignment[], agentId: string): string[] {
  return assignments.filter((a) => a.agentId === agentId).map((a) => a.power);
}

/** True when no agent holds more than one power (never a bottleneck). */
export function onePowerPerAgent(assignments: Assignment[]): boolean {
  const seen = new Map<string, number>();
  for (const assignment of assignments) {
    seen.set(assignment.agentId, (seen.get(assignment.agentId) ?? 0) + 1);
  }
  return [...seen.values()].every((count) => count <= 1);
}
