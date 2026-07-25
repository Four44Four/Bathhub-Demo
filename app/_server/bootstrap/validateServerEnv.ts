import {
  formatEnvVarUsabilityIssuesMessage,
  formatEnvVarUsabilityWarningsMessage,
  issuesFromMissingEnvVarNames,
  partitionEnvVarUsabilityIssues,
} from "../pure/EnvVarUsability.ts";
import {
  getMissingRequiredEnvVars,
  OPEN_ROUTE_SERVICE_API_KEY_ENV,
  REDIS_URL_ENV,
  SUPABASE_KEY_ENV,
  SUPABASE_URL_ENV,
} from "../pure/RequiredEnvVars.ts";
import {
  defaultServerEnvEndpointCheckers,
  type ServerEnvEndpointCheckers,
} from "./serverEnvEndpointCheckers.ts";

const ANSI_RED = "\x1b[31m";
const ANSI_ORANGE = "\x1b[38;5;208m";
const ANSI_RESET = "\x1b[0m";

export async function collectServerEnvUsabilityIssues(
  env: Record<string, string | undefined> = process.env,
  checkers: ServerEnvEndpointCheckers = defaultServerEnvEndpointCheckers,
) {
  const issues = issuesFromMissingEnvVarNames(getMissingRequiredEnvVars(env));

  const endpointChecks: Array<Promise<Awaited<
    ReturnType<ServerEnvEndpointCheckers["checkRedisEndpoint"]>
  > | null>> = [];

  const orsApiKey = env[OPEN_ROUTE_SERVICE_API_KEY_ENV];
  if (orsApiKey !== undefined && orsApiKey.length > 0) {
    endpointChecks.push(checkers.checkOpenRouteServiceApiKey(orsApiKey));
  }

  const supabaseUrl = env[SUPABASE_URL_ENV];
  const supabaseKey = env[SUPABASE_KEY_ENV];
  if (
    supabaseUrl !== undefined &&
    supabaseUrl.length > 0 &&
    supabaseKey !== undefined &&
    supabaseKey.length > 0
  ) {
    endpointChecks.push(
      checkers.checkSupabaseEndpoint(supabaseUrl, supabaseKey),
    );
  }

  const redisUrl = env[REDIS_URL_ENV];
  if (redisUrl !== undefined && redisUrl.length > 0) {
    endpointChecks.push(checkers.checkRedisEndpoint(redisUrl));
  }

  const endpointIssues = await Promise.all(endpointChecks);
  for (const issue of endpointIssues) {
    if (issue !== null) {
      issues.push(issue);
    }
  }

  return issues;
}

export async function assertServerEnvValid(
  env: Record<string, string | undefined> = process.env,
  checkers: ServerEnvEndpointCheckers = defaultServerEnvEndpointCheckers,
): Promise<void> {
  const issues = await collectServerEnvUsabilityIssues(env, checkers);
  const { blocking, warnings } = partitionEnvVarUsabilityIssues(issues);

  if (warnings.length > 0) {
    const warningMessage = formatEnvVarUsabilityWarningsMessage(warnings);
    console.warn(`${ANSI_ORANGE}${warningMessage}${ANSI_RESET}`);
  }

  if (blocking.length === 0) {
    return;
  }

  const message = formatEnvVarUsabilityIssuesMessage(blocking);
  console.error(`${ANSI_RED}${message}${ANSI_RESET}`);
  throw new Error("Server environment validation failed");
}
