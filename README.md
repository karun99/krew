# KREW

**Kali-Regulated Emotional Workflow** — a localised, multi-agent AI orchestration system.

KREW accepts a problem definition (workflow, userflow, tasks) and autonomously
produces a working solution, using regulated and emotionally resilient agents.

- **Fast setup** — one script, under 15 minutes, no heavy dependencies
- **Cross-platform** — Windows (batch/PowerShell) and Linux (shell) launch scripts
- **Low resource** — runs in well under 500 MB RAM for a full agent team
- **Accurate** — every output is verified; false outputs are destroyed
- **Regulated** — every mutation and coordination passes through **Kali**
- **Resilient** — **Shatkona** blends emotional modes for endurance
- **Operational (TRL 7)** — a working prototype demonstrated on real tasks
- **Qualified (TRL 8)** — complete and passing its own qualification suite

## Quick start (Linux)

```bash
./install.sh      # one-time setup (creates config, zones, logs)
./run.sh          # launch the KREW CLI
```

The first real task runs inside `run.sh`. Detailed documentation lives in
[`docs/`](docs/).

## Quick start (Windows)

```bat
install.bat       # one-time setup
run.bat           # launch the KREW CLI
```

## Commands

| Command    | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `run`      | Upload a problem definition and produce a verified solution     |
| `duel`     | Accuracy duel — two personas solve the same problem, one wins  |
| `survival` | Resilience simulation — stress the agents, check they endure    |
| `verify`   | Run TRL 7 self-validation                                      |
| `kill`     | Activate the kill switch (stop all agents immediately)         |
| `status`   | Show zones, agents and recent audit activity                   |
| `config`   | Show / edit KREW configuration                                |
| `write`    | Turn a work process into a Body+Soul algorithm document       |
| `execute`  | Compile and run an algorithm document (done means verified)   |
| `qualify`  | Run the TRL 8 qualification suite (11 acceptance criteria)     |
| `help`     | List commands                                                |

## Documentation

- [SRS.md](docs/SRS.md) — goals, constraints, requirements
- [INSTALL.md](docs/INSTALL.md) — installation guide
- [USER_GUIDE.md](docs/USER_GUIDE.md) — using KREW
