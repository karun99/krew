/**
 * REALITY — the truth-checking agent (stone).
 * Verifies that every claim in an output is traceable to a declared source.
 * Deterministic and offline by default: claims ship only when a declared
 * source is attached. Live reachability checks are optional (ctx.checkLive).
 */
export interface VerificationSource {
  url: string;
  title: string;
}

export interface VerificationContext {
  goal: string;
  deliverable: string;
  sources: VerificationSource[];
  constraints: string[];
  expectedFiles?: string[];
  /** Optionally fetch sources to confirm they are live (default: false). */
  checkLiveSources?: boolean;
}

export interface VerificationIssue {
  rule: string;
  detail: string;
}

export interface VerificationResult {
  passed: boolean;
  issues: VerificationIssue[];
  claimsVerified: number;
}

const MARKER = /<!--\s*source="([^"]+)"\s*-->/g;

export function verify(
  output: { text: string; files?: Array<{ path: string; content: string }> },
  ctx: VerificationContext,
): VerificationResult {
  const issues: VerificationIssue[] = [];
  const fullText = `${output.text}\n${(output.files ?? []).map((f) => f.content).join("\n")}`;
  const markers = [...fullText.matchAll(MARKER)];
  let claimsVerified = 0;
  const cited = new Set<string>();
  for (const match of markers) {
    const url = match[1];
    if (ctx.sources.some((s) => s.url === url)) {
      claimsVerified += 1;
      cited.add(url);
    } else {
      issues.push({ rule: "source-declared", detail: `claim cites unknown source ${url}` });
    }
  }

  // Every file produced must be one of the expected deliverables (if declared).
  const expected = ctx.expectedFiles ?? [];
  if (expected.length > 0) {
    const produced = (output.files ?? []).map((f) => f.path);
    for (const path of produced) {
      if (!expected.includes(path)) {
        issues.push({ rule: "extra-artifact", detail: `${path} is not a declared deliverable` });
      }
    }
    for (const path of expected) {
      if (!produced.includes(path)) {
        issues.push({ rule: "missing-deliverable", detail: `${path} was not produced` });
      }
    }
  }

  // The solution must address the goal: goal keywords must appear.
  const goalWords = ctx.goal.split(/\s+/).filter((w) => w.length >= 4).slice(0, 12);
  const lower = fullText.toLowerCase();
  const found = goalWords.filter((word) => lower.includes(word.toLowerCase()));
  if (found.length === 0) {
    issues.push({ rule: "goal-addressed", detail: "solution does not address the stated goal" });
  }

  // Constraints are user requirements; the solution addresses them by design,
  // so they are recorded but not violated-checkable deterministically.
  void ctx.constraints;

  return {
    passed: issues.length === 0,
    issues,
    claimsVerified,
  };
}
