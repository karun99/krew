# USER_GUIDE — Using KREW

This guide covers the commands, the problem-definition format, and what to
expect from each command.

## The commands

| Command | Purpose |
| ------- | ------- |
| `run <problem.json>` | Parse a problem definition, spawn agents, verify, deliver a solution |
| `duel <persona1> <persona2> [problem.json]` | Run an accuracy duel between two personas |
| `survival <scenario>` | Run a resilience simulation (verifier-crash / cpu-pressure / network-latency) |
| `verify <output.json>` | Verify a saved output against its problem definition |
| `kill` | Activate the kill switch — stop every agent immediately |
| `status` | Show agents, zones, kill switch and emotional mode |
| `config` | Show current configuration |
| `help` | List commands |

All commands print a short human-readable report on stdout. Errors are printed
to stderr and exit with a non-zero code.

## Problem definitions

A problem definition is a JSON file:

```json
{
  "goal": "Summarise the KREW project goals in three sentences.",
  "deliverable": "summary",
  "constraints": [
    "mentions all seven goals"
  ],
  "sources": [
    { "url": "https://example.org/krew-goals", "title": "KREW goals" }
  ],
  "expectedFiles": ["summary.md"]
}
```

- **goal** (required) — what the user wants done.
- **deliverable** (required) — the expected output name.
- **constraints** (optional) — requirements the solution must respect.
- **sources** (optional) — URLs used to verify factual claims. Every claim
  carries a `<!-- source="URL" -->` marker in the produced text.
- **expectedFiles** (optional) — files that must exist in the delivered solution.

## `run` — produce a verified solution

```
$ ./run.sh run problem.json
```

1. KREW parses the problem definition.
2. Kali opens the phase and spawns a builder agent in its zone.
3. The agent executes in its worktree (STONES powers and HATS perspectives
   assigned) and Shatkona sets the emotional mode.
4. The guardrails check the output (purpose alignment, simplest path,
   escalation bounds, power/hat distribution, regulation).
5. The REALITY verifier checks every claim against the declared sources.
6. If anything fails, the output is destroyed and a `failed.json` is written.
   Otherwise the solution is delivered to `solutions/`.

Example delivered file:

```
solutions/<deliverable>.solution.json
```

## `duel` — accuracy duel between personas

```
$ ./run.sh duel architect critic
```

Two personas solve the same problem; both solutions go through the REALITY
verifier. The report shows, per persona:

- **accuracy** — did the verifier accept the output?
- **efficiency** — how many tokens were used?

The winning persona is the passing run that used the fewest tokens. This
command exists to prove that accuracy is measured, not assumed.

## `survival` — resilience simulation

```
$ ./run.sh survival verifier-crash
```

Three scenarios are built in:

| Scenario | Injected failure |
| -------- | ---------------- |
| `verifier-crash` | The verifier dies mid-check. Agents must finish without panicking. |
| `cpu-pressure` | Heavy concurrent load. The per-agent memory budget must hold. |
| `network-latency` | The backend responds slowly. The kill switch must stay fast. |

Each scenario reports three checks: execution completed, memory budget,
kill-switch latency (< 1 second).

## `verify` — verify a saved output

```
$ ./run.sh verify solutions/my-solution.solution.json
```

Reads a previously delivered solution file and re-runs the verification.

## `kill` — emergency stop

```
$ ./run.sh kill
```

Activates the kill switch immediately (measured in milliseconds). Every
running agent stops within one second. Run `status` to confirm.

The kill switch is per KREW process: if no agent is running when the command
starts, it simply records the activation for the current session.

## `status` — observe a running KREW

```
$ ./run.sh status
```

Shows the backend in use, spawned agents, the kill switch state, the active
emotional mode, and the most recent audit entries from `logs/audit.log`.

## `write` — turn a process into an algorithm document (Workflow Writer)

```
$ ./run.sh write process.txt --soul "Never approve an invoice without a matching PO."
```

The Workflow Writer front-door takes any work process — prose, SOP, syllabus,
ticket list, diagram notes, table or a mix — and emits ONE algorithm document
(`algorithms/<name>.yaml`) with two mandatory parts:

- **Body** — inputs, outputs, success condition, steps with explicit operators,
  preconditions and postconditions, failure policy, termination and escalation.
- **Soul** — intent, voice, 3–7 values (each with an observable proxy and a
  verdict type), quality-of-spirit clauses and guardrails, every clause bound
  to an enforcing operator.

The document is the single source of truth: it is emitted as YAML and parsed
back by the same engine, so what you review is exactly what runs. Every write
prints the Body self-check and Soul check results plus any open questions —
inferred postconditions are flagged for review, never silently trusted.

The canonical prompt that drives this mechanism ships unmodified in
`config/ww-prompt.md` (Workflow Writer with Soul).

## `execute` — compile and run an algorithm document

```
$ ./run.sh execute algorithms/collect-all-invoices-from.yaml
```

Compiles the Body+Soul document and executes it under Kali regulation. Every
step: the precondition is checked, the operator agent runs, the output must
verify against the step's postcondition, and the Soul clauses must hold. A
step that fails its postcondition is retried per its `on_fail` policy, then
escalated to a human — downstream steps never run on unverified output. The
run report is written to `solutions/<algorithm>.workflow.json`.

## `qualify` — the TRL 8 qualification suite

```
$ ./run.sh qualify
```

Runs the scriptable acceptance tests that prove the system is complete and
qualified (TRL 8), not merely demonstrated (TRL 7):

| Criterion | What it proves |
|---|---|
| documentation-complete | SRS, INSTALL, USER_GUIDE, README present |
| cross-platform-scripts | Linux `.sh` + Windows `.bat`/`.ps1` launchers |
| kill-switch-latency | emergency stop well under one second |
| guardrails-functional | all eight guardrails evaluate and pass |
| workflow-writer-roundtrip | YAML emit → parse is identical; checks clean |
| verification-gates | declared claims verified, no unverified pass |
| resource-budget | per-agent memory budget defined and enforced |
| audit-trail | `logs/audit.log` receives regulation events |
| emotional-blend | six drives blended; `neutral` mode available |
| backend-deterministic | identical input → identical output, offline |
| cli-functional | `help` and `config` run without error |

The suite exits non-zero if any criterion fails, so it can gate CI or
installation. Results are saved to `solutions/qualification.json`.

## Audit trail

All mutations, coordination requests, approvals and the kill switch are
appended to `logs/audit.log` (JSON lines). The emotional blend is recorded in
`logs/blend.log`. Both are human-readable and can grow without affecting
performance.
