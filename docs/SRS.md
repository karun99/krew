# KREW — Software Requirements Specification (SRS)

Version: 1.0
Codename: KREW (Kali-Regulated Emotional Workflow)
Target TRL: 7 (System prototype demonstrated in operational environment)
Document Type: Complete SRS — Goals & Constraints

---

## 1. 🎯 INTRODUCTION

### 1.1 Purpose

KREW is a localised, multi-agent AI orchestration system that accepts a problem definition (workflow, userflow, tasks) and autonomously produces a working solution using regulated, emotionally-resilient agents.

### 1.2 Scope

The system:

- Runs on Windows and Linux via shell scripts and batch files
- Installs and operates in under 15 minutes
- Uses very low RAM and storage
- Achieves TRL 7 — prototype demonstrated in operational environment
- Uses Kali regulation for temporal/spatial agent control
- Uses Shatkona blending for emotional resilience
- Uses 8 guardrail layers (SOUL, SAHAJA, SHATKONA, KUNDALINI, JATAKA, KALI, STONES, HATS)

### 1.3 Definitions

| Term | Meaning |
| ---- | ------- |
| KREW | The agent team (krew of AI agents) |
| Agent | A single AI worker with a role |
| Mutation | An agent changing its role, spawning sub-agents, or altering its prompt |
| Coordination | Agent-to-agent communication or shared resource use |
| TRL 7 | Technology Readiness Level 7 — operational prototype |
| Kali | Temporal + spatial + correlation regulator |
| Shatkona | Emotional blend engine |

### 1.4 Intended Audience

- Developers building KREW
- Users running KREW locally
- Auditors verifying TRL 7 compliance
- Maintainers extending the framework

---

## 2. 🎯 GOALS

### 2.1 Primary Goals

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   G1. FAST SETUP      → Install & run under 15 minutes       │
│   G2. CROSS-PLATFORM  → Windows + Linux via shell/batch      │
│   G3. LOW RESOURCE    → Very less RAM & storage              │
│   G4. ACCURATE        → Verified outputs, no hallucinations  │
│   G5. REGULATED       → Kali governs mutation & coordination │
│   G6. RESILIENT       → Shatkona emotional blend             │
│   G7. TRL 7 READY     → Operational prototype                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 G1 — Setup Under 15 Minutes

Goal: A user can go from zero to a working KREW on any supported machine in ≤ 15 minutes.

Sub-goals:

| ID | Sub-Goal | Time Budget |
| -- | -------- | ----------- |
| G1.1 | Download & extract | ≤ 2 min |
| G1.2 | Run setup script | ≤ 5 min |
| G1.3 | Configure API keys | ≤ 3 min |
| G1.4 | First task execution | ≤ 5 min |
| | **Total** | **≤ 15 min** |

Success Criteria:

- Fresh machine → working KREW in one script run
- No manual dependency hunting
- Clear error messages if prerequisites missing

### 2.3 G2 — Cross-Platform (Windows + Linux)

Goal: KREW runs on Windows and Linux using native scripting.

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   LINUX          → bash scripts (.sh)                        │
│   WINDOWS        → batch files (.bat) + PowerShell (.ps1)    │
│                                                              │
│   SHARED LOGIC   → Language-agnostic core                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Deliverables:

| File | Platform | Purpose |
| ---- | -------- | ------- |
| install.sh | Linux | Full setup |
| install.bat | Windows | Full setup |
| run.sh | Linux | Launch KREW |
| run.bat | Windows | Launch KREW |
| setup.ps1 | Windows | Advanced setup |
| krew.sh / krew.bat | Both | CLI wrapper |

Success Criteria:

- Same feature set on both platforms
- No WSL required for Windows
- Scripts are idempotent (safe to re-run)

### 2.4 G3 — Low Resource Usage

Goal: KREW runs efficiently on modest hardware.

Hard Constraints:

| Resource Constraint | Limit |
| ------------------- | ----- |
| RAM (idle) | ≤ 100 MB |
| RAM (per agent) | ≤ 50 MB |
| RAM (total, 10 agents) | ≤ 500 MB |
| Storage (install) | ≤ 200 MB |
| Storage (runtime) | ≤ 1 GB per task |

Design choices:

- Lightweight runtime (Node.js with built-in modules only — no heavy frameworks)
- Shared memory between agents (not duplicated)
- Streaming outputs (not buffered)
- Local cache (JATAKA) to avoid re-fetching
- On-demand agent spawning (not always-on)
- Compression for storage

Success Criteria:

- Runs on 4 GB RAM machine
- Runs on 10 GB free disk
- No swap usage during normal operation

### 2.5 G4 — Accuracy (Verified Outputs)

Goal: KREW produces accurate, verified outputs — not hallucinations.

| Layer | Role |
| ----- | ---- |
| 🔯 SHATKONA Builder ↔ Verifier pairs | every output is built together with its verification |
| ❤️ REALITY Stone | truth-checking agent |
| 🔱 KALI | destroys false outputs |
| 📜 JATAKA | records verification history |
| 🌐 Real-time Web Fetch Checks | checks against live data |

Accuracy Targets:

| Metric | Target |
| ------ | ------ |
| Code compiles | ≥ 95% |
| Tests pass | ≥ 90% |
| Requirements met | ≥ 85% |
| Hallucination rate | ≤ 5% |
| Verified claims | 100% (unverified claims are blocked) |

Success Criteria:

- No output ships without verification
- Every claim traceable to a source
- False outputs destroyed by Kali

### 2.6 G5 — Kali Regulation

Goal: All agent mutation and coordination governed by Kali.

Kali's Three Functions:

```
🕰️ TEMPORAL    → When may agents mutate?
🌌 SPATIAL     → Where may agents exist/coordinate?
🔄 CORRELATION → Do mutations combine into emergence?
```

Rules:

| Rule | Enforcement |
| ---- | ----------- |
| Phase gates | Mutation only in approved phases |
| Cooldowns | Rate limit on mutations |
| Zone isolation | Agents confined to worktrees |
| No new channels | Agents can't create comm paths |
| Correlation detection | Block emergent capabilities |
| Human gate | Cross-zone needs approval |

Success Criteria:

- Every mutation logged
- Every coordination request passes Kali
- Emergence detected & blocked
- No Hugging Face-style runaway possible

### 2.7 G6 — Emotional Resilience (Shatkona)

Goal: Agents blend emotions for resilience, not mood swings.

Shatkona Pairs:

| Mode | Words |
| ---- | ----- |
| Active | Drive, Courage, Urgency, Ambition, Persistence, Intensity |
| Receptive | Patience, Caution, Rest, Humility, Surrender |
| Blended | Endurance, Wisdom, Rhythm, Growth, Flow, Focus |

Rules:

- Emotional blend is logged (auditable)
- Affects style, not decisions
- Users can pin emotional mode
- Default: neutral; blend is opt-in

Success Criteria:

- Agents don't panic on failure
- Agents don't burn out on persistence
- Behavior predictable & auditable

### 2.8 G7 — TRL 7 Compliance

Goal: KREW demonstrates a working prototype in an operational environment.

| Requirement | KREW Deliverable |
| ---------- | --------------- |
| Operational prototype | Working KREW on real tasks |
| Real environment | Windows + Linux, real APIs |
| End-to-end demonstration | Upload → Solution |
| Representative use case | At least 3 real problems solved |
| Documentation | SRS, install guide, user guide |
| Validation | External user can run it |

Success Criteria:

- 3+ real tasks completed end-to-end
- 1+ external user successfully runs KREW
- All 8 guardrails functional
- Performance meets G1–G6 targets

---

## 3. 🚧 CONSTRAINTS

### 3.1 Hard Constraints

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   C1. SETUP TIME      ≤ 15 minutes (non-negotiable)         │
│   C2. PLATFORMS       Windows + Linux (no macOS required)   │
│   C3. RAM             ≤ 500 MB total for 10 agents          │
│   C4. STORAGE         ≤ 1 GB install + runtime              │
│   C5. ACCURACY        ≥ 85% requirements met                │
│   C6. REGULATION      All mutations via Kali                │
│   C7. TRL             Must meet TRL 7 criteria              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Technical Constraints

| ID | Constraint | Rationale |
| -- | ---------- | --------- |
| C8 | No heavy frameworks (no Electron, no Docker required) | Setup time + resource limits |
| C9 | Must use shell (.sh) and batch (.bat) | Platform requirement |
| C10 | Single runtime core (one Node.js process) | Simplicity, low footprint |
| C11 | No GPU required | Accessibility |
| C12 | API keys stored locally only | Privacy |
| C13 | All logs written to disk | Auditability (JATAKA) |
| C14 | Agents cannot bypass Kali (middleware, not prompt) | Security |

### 3.3 Operational Constraints

| ID | Constraint | Rationale |
| -- | ---------- | --------- |
| C15 | Works offline after setup | Resilience |
| C16 | No cloud dependency (except AI APIs) | Privacy |
| C17 | Human approval gates at critical points | Safety |
| C18 | Kill switch available at all times | Emergency stop |
| C19 | Version pinning for dependencies | Reproducibility |
| C20 | Rollback support for updates | Reliability |

### 3.4 Security Constraints

| ID | Constraint | Rationale |
| -- | ---------- | --------- |
| C21 | Agent isolation (worktrees/zones) | Prevent Hugging Face scenario |
| C22 | No agent-created communication channels | Prevent secret coordination |
| C23 | All API calls logged | Audit trail |
| C24 | Rate limits on all agent actions | Prevent runaway |
| C25 | Credentials never in agent context | Leakage prevention |

### 3.5 Legal & Ethical Constraints

| ID | Constraint | Rationale |
| -- | ---------- | --------- |
| C26 | Open-source license | Transparency |
| C27 | No repackaging as paid service | Ethical use |
| C28 | User owns all outputs | Ownership clarity |
| C29 | No telemetry without consent | Privacy |
| C30 | GDPR-compliant data handling | Legal compliance |

---

## 4. 🧩 SYSTEM ARCHITECTURE

### 4.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    🧑 USER                                   │
│         Upload: workflow + userflow + tasks                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    🖥️ KREW CORE                              │
│   ┌─────────────────────────────────────────────────────┐  │
│   │         🔱 KALI (Middleware — Enforced)             │  │
│   │    🕰️ Temporal   🌌 Spatial   🔄 Correlation         │  │
│   └─────────────────────────────────────────────────────┘  │
│                          ↓
│   ┌─────────────────────────────────────────────────────┐  │
│   │         🕉️ KREW GUARDRAILS (8 Layers)               │  │
│   │   🕊️ SOUL  🧘 SAHAJA  🔯 SHATKONA  🐍 KUNDALINI   │  │
│   │   📜 JATAKA  💎 STONES  🎩 HATS  🔱 KALI             │  │
│   └─────────────────────────────────────────────────────┘  │
│                          ↓
│   ┌─────────────────────────────────────────────────────┐  │
│   │         🤖 AGENT KREW                               │  │
│   │   Each agent: 5-15% of YOU                         │  │
│   │   Zones: isolated worktrees                       │  │
│   │   Roles: split across STONES                      │  │
│   │   Perspectives: rotate HATS                     │  │
│   └─────────────────────────────────────────────────────┘  │
│                          ↓
│   ┌─────────────────────────────────────────────────────┐  │
│   │         🌐 EXTERNAL INTERFACES                     │  │
│   │   AI APIs (OpenRouter/OpenAI/Local)              │  │
│   │   Web fetch (real-time data)                    │  │
│   │   File system (isolated worktrees)              │  │
│   └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    ✅ SOLUTION                              │
│         Accurate · Regulated · Resilient                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Directory Structure

```
krew/
├── install.sh              # Linux installer
├── install.bat             # Windows installer
├── run.sh                  # Linux launcher
├── run.bat                 # Windows launcher
├── krew.sh                 # Linux CLI wrapper
├── krew.bat                # Windows CLI wrapper
├── config/
│   ├── krew.json           # Main config
│   ├── kali.json          # Kali rules
│   └── soul.json          # Personal model (personas, blend, survival)
├── core/
│   ├── krew.ts            # CLI entry point (run / duel / survival / verify / kill / status / config)
│   ├── config.ts          # Configuration, backend selection, emotional state
│   ├── kali.ts            # Temporal + Spatial + Correlation middleware
│   ├── guardrails.ts      # SOUL, SAHAJA, SHATKONA, KUNDALINI, JATAKA, STONES, HATS, KALI
│   ├── agents.ts          # Agent runtime, zones, regulation requests, learning
│   ├── backend.ts        # AI API / simulator backend
│   ├── jataka.ts          # Local wisdom library (SQLite)
│   ├── reality.ts        # Truth-checking agent (verification)
│   ├── shatkona.ts       # Emotional blend
│   ├── stones.ts         # Power distribution
│   ├── hats.ts           # Perspective rotation
│   ├── duel.ts           # Accuracy duel command
│   └── survival.ts       # Resilience simulation command
├── jataka/                # Wisdom library (SQLite database)
├── zones/                 # Per-agent worktrees
├── logs/                  # Audit trail (JSON lines)
└── docs/
    ├── SRS.md            # This document
    ├── INSTALL.md
    └── USER_GUIDE.md
```

### 4.3 Technology Stack (Low-Resource)

| Layer | Choice | Why |
| ----- | ------ | --- |
| Runtime | Node.js (≥18, built-in modules) | Fast, low RAM, no install |
| Language | TypeScript (type-stripped at runtime) | Type-safe, single file load |
| Storage | SQLite (embedded) | No server, low footprint |
| Config | JSON | Human-readable, no parser |
| UI | Terminal (TUI in plain text) | No GUI overhead |
| Scripts | Bash + Batch + PowerShell | Native platforms |

---

## 5. 🚧 FUNCTIONAL REQUIREMENTS

### 5.1 User Workflow

```
FR1. User uploads problem definition (workflow, userflow, tasks)
FR2. KREW parses into sub-problems
FR3. Kali assigns phases + zones
FR4. Agents spawn (scaled to problem size)
FR5. Agents work in zones (isolated)
FR6. Kali regulates mutation + coordination
FR7. Shatkona blends emotions
FR8. Verifier checks each output
FR9. Kali destroys false outputs
FR10. JATAKA records lessons
FR11. User reviews final solution
FR12. Solution delivered
```

### 5.2 Kali Functions

| ID | Function |
| -- | -------- |
| FR-K1 | Phase gating — allow mutation only in approved phases |
| FR-K2 | Cooldown enforcement — rate limit mutations per agent |
| FR-K3 | Zone isolation — confine agents to their worktrees |
| FR-K4 | Channel prevention — block agent-created communication |
| FR-K5 | Cross-zone gating — human approval required to cross zones |
| FR-K6 | Correlation detection — block emergent capabilities |
| FR-K7 | Mutation logging — record every mutation |
| FR-K8 | Coordination logging — record every coordination |
| FR-K9 | Kill switch — emergency stop for all agents |
| FR-K10 | Alert system — notify human on suspicious patterns |

### 5.3 Guardrail Functions

| ID | Guardrail |
| -- | -------- |
| FR-G1 | 🕊️ SOUL — verify purpose alignment |
| FR-G2 | 🧘 SAHAJA — enforce simplest path |
| FR-G3 | 🔯 SHATKONA — balance creation + verification |
| FR-G4 | 🐍 KUNDALINI — bounded escalation |
| FR-G5 | 📜 JATAKA — record + retrieve wisdom |
| FR-G6 | 💎 STONES — distribute powers |
| FR-G7 | 🎩 HATS — rotate perspectives |
| FR-G8 | 🔱 KALI — regulate time + space |

### 5.4 Agent Functions

| ID | Function |
| -- | -------- |
| FR-A1 | Spawn — create agent with role + zone |
| FR-A2 | Execute — perform task in zone |
| FR-A3 | Request mutation — ask Kali for a change |
| FR-A4 | Request coordination — ask Kali for contact |
| FR-A5 | Report — send output to verifier |
| FR-A6 | Learn — update JATAKA with lessons |
| FR-A7 | Retire — end lifecycle cleanly |

---

## 6. ⚡ NON-FUNCTIONAL REQUIREMENTS

### 6.1 Performance

| ID | Requirement | Target |
| -- | ----------- | ------ |
| NFR-P1 | Setup time | ≤ 15 min |
| NFR-P2 | Idle RAM | ≤ 100 MB |
| NFR-P3 | Per-agent RAM | ≤ 50 MB |
| NFR-P4 | Install size | ≤ 200 MB |
| NFR-P5 | Task startup | ≤ 30 sec |
| NFR-P6 | Agent response | ≤ 5 sec |
| NFR-P7 | Kali check | ≤ 100 ms |
| NFR-P8 | Web fetch | ≤ 3 sec |

### 6.2 Reliability

| ID | Requirement | Target |
| -- | ----------- | ------ |
| NFR-R1 | Uptime per session | ≥ 99% |
| NFR-R2 | Crash recovery | Auto-restart agents |
| NFR-R3 | Data integrity | No corruption |
| NFR-R4 | Rollback | Version rollback |
| NFR-R5 | Kill switch | < 1 sec to stop all |

### 6.3 Security

| ID | Requirement | Target |
| -- | ----------- | ------ |
| NFR-S1 | Credentials never in agent context | Enforced |
| NFR-S2 | Isolation | Zones enforced |
| NFR-S3 | Audit | All actions logged |
| NFR-S4 | Local storage encryption | Enabled |
| NFR-S5 | Bypass impossible via prompts | Middleware, not prompt |

### 6.4 Usability

| ID | Requirement | Target |
| -- | ----------- | ------ |
| NFR-U1 | Install | One command |
| NFR-U2 | Errors | Clear + actionable |
| NFR-U3 | Docs | Complete + searchable |
| NFR-U4 | Simple mode | Default experience |
| NFR-U5 | Advanced mode | Optional for power users |

### 6.5 Maintainability

| ID | Requirement | Target |
| -- | ----------- | ------ |
| NFR-M1 | Modularity | Clean separation |
| NFR-M2 | Testing | ≥ 80% coverage |
| NFR-M3 | Docs | Every module documented |
| NFR-M4 | Versioning | Semantic versioning |
| NFR-M5 | Updates | In-place upgrade |

---

## 7. ✅ TRL 7 VALIDATION CRITERIA

To claim TRL 7, KREW must demonstrate:

| ID | Criterion | Evidence |
| -- | --------- | -------- |
| TRL1 | Operational prototype | Working KREW on real machine |
| TRL2 | Real environment | Windows + Linux, real APIs |
| TRL3 | End-to-end | Upload → Solution works |
| TRL4 | Representative tasks | 3+ real problems solved |
| TRL5 | External validation | 1+ external user succeeds |
| TRL6 | Guardrails | 8 layers active |
| TRL7 | Kali enforced | Mutations & coordination regulated |
| TRL8 | Performance | All G1–G6 targets met |
| TRL9 | Documentation | SRS + guides complete |
| TRL10 | Kill switch | < 1 sec stop verified |

---

## 8. 📊 ACCEPTANCE CRITERIA

### 8.1 Must-Have (Blocking)

```
☐ Setup ≤ 15 minutes on fresh machine
☐ Works on Windows (batch) and Linux (shell)
☐ RAM ≤ 500 MB for 10 agents
☐ Storage ≤ 1 GB install + runtime
☐ Accuracy ≥ 85% requirements met
☐ Kali enforces all mutations
☐ Shatkona blends emotions (logged)
☐ 8 guardrails functional
☐ Kill switch works
☐ TRL 7 criteria met
```

### 8.2 Should-Have (Important)

```
☐ Simple mode by default
☐ Cost ceiling per task
☐ Web fetch caching
☐ Rollback support
☐ Audit log viewer
☐ Emotional mode pinning
```

### 8.3 Nice-to-Have (Optional)

```
☐ Multi-language UI
☐ Cloud sync (opt-in)
☐ Plugin system
☐ Mobile companion
☐ Voice control
```

---

## 9. 🚫 OUT OF SCOPE

```
❌ macOS native support (Linux/Windows only for v1)
❌ GPU acceleration (CPU-only for accessibility)
❌ Cloud-hosted version (local-only for privacy)
❌ Real-time collaboration (single-user per instance)
❌ Mobile app (CLI + desktop only)
❌ Custom model training (uses existing APIs)
❌ Blockchain/crypto integration
❌ Marketplace for agents
```

---

## 10. 📅 MILESTONES

| Milestone | Deliverable | Target |
| --------- | ----------- | ------ |
| M1 | Core runtime + installers | Week 2 |
| M2 | Kali middleware | Week 4 |
| M3 | 8 guardrails | Week 6 |
| M4 | Agent krew + zones | Week 8 |
| M5 | Shatkona emotional blend | Week 10 |
| M6 | TRL 7 validation | Week 12 |
| M7 | Documentation complete | Week 13 |
| M8 | External validation | Week 14 |

---

## 11. 🎯 SUCCESS METRICS

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│   ✅ SETUP        → 90% of users succeed in ≤ 15 min        │
│   ✅ CROSS-PLAT   → 100% feature parity Win/Linux           │
│   ✅ RESOURCE     → 100% meet RAM/storage targets           │
│   ✅ ACCURACY     → ≥ 85% requirements met                  │
│   ✅ REGULATION   → 0 unregulated mutations                 │
│   ✅ RESILIENCE   → 0 agent panics on failure               │
│   ✅ TRL 7        → External validation passed              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 12. 🔏 APPROVAL

| Role | Name | Signature | Date |
| ---- | ---- | --------- | --- |
| Product Owner | | | |
| Lead Engineer | | | |
| Security Auditor | | | |
| TRL Validator | | | |
