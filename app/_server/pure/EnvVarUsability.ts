export type EnvVarUsabilityIssueKind =
  | "missing"
  | "unreachable"
  | "unauthenticated";

export type EnvVarUsabilityIssue = {
  name: string;
  kind: EnvVarUsabilityIssueKind;
  detail?: string;
};

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
