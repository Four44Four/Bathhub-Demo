import { OPEN_ROUTE_SERVICE_API_KEY_ENV } from "./RequiredEnvVars.ts";

export type EnvVarUsabilityIssueKind =
  | "missing"
  | "unreachable"
  | "unauthenticated";

export type EnvVarUsabilityIssue = {
  name: string;
  kind: EnvVarUsabilityIssueKind;
  detail?: string;
};

export function isBlockingEnvVarUsabilityIssue(
  issue: EnvVarUsabilityIssue,
): boolean {
  if (
    issue.name === OPEN_ROUTE_SERVICE_API_KEY_ENV &&
    issue.kind === "unreachable"
  ) {
    return false;
  }

  return true;
}

export function partitionEnvVarUsabilityIssues(
  issues: readonly EnvVarUsabilityIssue[],
): {
  blocking: EnvVarUsabilityIssue[];
  warnings: EnvVarUsabilityIssue[];
} {
  const blocking: EnvVarUsabilityIssue[] = [];
  const warnings: EnvVarUsabilityIssue[] = [];

  for (const issue of issues) {
    if (isBlockingEnvVarUsabilityIssue(issue)) {
      blocking.push(issue);
    } else {
      warnings.push(issue);
    }
  }

  return { blocking, warnings };
}

export function issuesFromMissingEnvVarNames(
  names: readonly string[],
): EnvVarUsabilityIssue[] {
  return names.map((name) => ({ name, kind: "missing" }));
}

export function formatEnvVarUsabilityIssueLine(
  issue: EnvVarUsabilityIssue,
): string {
  if (issue.kind === "missing") {
    return `  - ${issue.name}: missing`;
  }

  const detailSuffix = issue.detail ? ` (${issue.detail})` : "";
  return `  - ${issue.name}: ${issue.kind}${detailSuffix}`;
}

export function formatEnvVarUsabilityIssuesMessage(
  issues: readonly EnvVarUsabilityIssue[],
): string {
  if (issues.length === 0) {
    return "";
  }

  const lines = issues.map(formatEnvVarUsabilityIssueLine);
  return `Missing or non-usable environment variables:\n${lines.join("\n")}`;
}

export function formatEnvVarUsabilityWarningsMessage(
  issues: readonly EnvVarUsabilityIssue[],
): string {
  if (issues.length === 0) {
    return "";
  }

  const lines = issues.map(formatEnvVarUsabilityIssueLine);
  return `Unreachable environment variables (startup will continue):\n${lines.join("\n")}`;
}
