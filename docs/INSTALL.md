# INSTALL — Installing KREW

KREW runs on Windows and Linux with Node.js (≥ 18) already installed — no
other dependencies. Total setup time: about one minute.

## Requirements

| Platform | Requirement |
| -------- | ----------- |
| Linux | `node` (v18 or newer) on PATH, `bash` |
| Windows | `node` (v18 or newer) on PATH, `PowerShell` (installed with Windows) |
| Any | ~200 MB free disk for runtime artifacts |

Check your Node.js version:

```bash
node --version     # v18 or newer
```

If Node.js is missing, install it from <https://nodejs.org> (LTS build) and
re-open the terminal.

## Linux

```bash
git clone <your-krew-repository> krew
cd krew
./install.sh
```

`install.sh` is idempotent — it is safe to re-run at any time. It:

- checks the Node.js version and prints clear errors when missing,
- creates the runtime directories (`zones/`, `logs/`, `config/`),
- seeds default configuration files when absent,
- prints the next step (run `./run.sh`).

## Windows

```bat
git clone <your-krew-repository> krew
cd krew
install.bat
```

`install.bat` does the same for Windows. For advanced setup (custom paths,
PowerShell scripting), run `setup.ps1` instead.

## First run

```bash
./run.sh            # Linux
run.bat             # Windows
```

The first command prints the available commands (`help`).

## Optional: real AI backends

By default KREW runs on its built-in simulator engine, so it works fully
offline. To use a real model, export an API key:

```bash
export OPENROUTER_API_KEY="sk-or-..."   # or OPENAI_API_KEY
./run.sh run problem.json
```

When no key is configured, the simulator backend is used automatically and
every claim stays tied to declared sources.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| `node` not found | Install Node.js ≥ 18 and restart the terminal |
| Installer refuses | Re-run the installer; it is idempotent |
| Verify fails on claims | Attach `<!-- source="URL" -->` markers to factual claims in your expected output, or declare sources in the problem definition |
| Storage grows | JATAKA database is reused; older lessons are pruned automatically |
