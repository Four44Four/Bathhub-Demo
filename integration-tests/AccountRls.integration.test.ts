import { spawnSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  accountCanVoteOrRate,
  existenceVoteWeight,
  reputationAfterWeeklyDrift,
  reputationDeltaForActionIndex,
  type AccountProfile,
} from "../app/_shared/accounts/AccountReputation";
import { type Errorable } from "../app/_shared/Utils";
import { registerAccountWithAuthClient } from "../app/_server/pure/accounts/RegisterAccount";
import { formatRateLimitExceededMessage } from "../app/_server/pure/rate-limit/RateLimit";
import { SERVER_RATE_LIMITS } from "../app/_server/ServerConstants";
import { TEMP_DATA_LENGTH } from "../app/_server/pure/bathroom-data-primary/CreateBathroom";
import {
  requireLocalSupabaseAdminEnv,
  requireLocalSupabaseEnv,
} from "./requireLocalSupabase";

const TEMP_DATA = "a".repeat(TEMP_DATA_LENGTH);
const AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

type CreatedAccount = {
  userId: string;
  username: string;
  accessToken: string;
};

function requireLocalPostgresUrl(): string {
  const raw = process.env.SUPABASE_DB_URL;
  if (raw === undefined || raw.length === 0) {
    throw new Error("SUPABASE_DB_URL is required for account RLS tests");
  }
  return raw;
}

function runPsql(sql: string): string {
  const result = spawnSync(
    "psql",
    [
      requireLocalPostgresUrl(),
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--tuples-only",
      "--no-align",
      "--command",
      sql,
    ],
    { encoding: "utf8" },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `psql exited ${result.status}`);
  }
  return result.stdout.trim();
}

function errorMessage(body: unknown): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }
  return JSON.stringify(body);
}

function adminClient(): SupabaseClient {
  const { url, serviceRoleKey } = requireLocalSupabaseAdminEnv();
  return createClient(url, serviceRoleKey, { auth: AUTH_OPTIONS });
}

async function userRpc(
  accessToken: string,
  functionName: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; body: unknown }> {
  const { url, key } = requireLocalSupabaseEnv();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, body };
}

async function anonRpc(
  functionName: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; body: unknown }> {
  const { url, key } = requireLocalSupabaseEnv();
  const response = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(params),
  });
  const body: unknown = await response.json().catch(() => null);
  return { ok: response.ok, body };
}

describe("account data interaction policies", () => {
  const createdUserIds: string[] = [];
  const createdBathroomIds: number[] = [];
  let latitudeCursor = 14;

  function nextLatitude(): number {
    latitudeCursor += 0.01;
    return latitudeCursor;
  }

  async function createAccount(label: string): Promise<CreatedAccount> {
    const username = `u${label}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 32);
    const password = "passw0rd";
    const { url, key } = requireLocalSupabaseEnv();
    const anon = createClient(url, key, { auth: AUTH_OPTIONS });
    const registered = await registerAccountWithAuthClient(
      username,
      password,
      {
        signUp: async (input) => {
          const signedUp = await anon.auth.signUp({
            email: input.email,
            password: input.password,
            options: { data: { username: input.username } },
          });
          const userId = signedUp.data.user?.id;
          if (userId != null) {
            createdUserIds.push(userId);
          }
          return {
            accessToken: signedUp.data.session?.access_token ?? null,
            errorMessage: signedUp.error?.message ?? null,
          };
        },
        signIn: async (input) => {
          const signedIn = await anon.auth.signInWithPassword({
            email: input.email,
            password: input.password,
          });
          return {
            accessToken: signedIn.data.session?.access_token ?? null,
            errorMessage: signedIn.error?.message ?? null,
          };
        },
      },
      async (accessToken): Promise<Errorable<AccountProfile>> => {
        const profile = await userRpc(accessToken, "get_own_account", {});
        if (!profile.ok) {
          return { val: null, errorMsg: errorMessage(profile.body) };
        }
        const row = (Array.isArray(profile.body) ? profile.body[0] : profile.body) as {
          id?: unknown;
          username?: unknown;
          reputation_score?: unknown;
        };
        if (
          typeof row?.id !== "string" ||
          typeof row.username !== "string" ||
          typeof row.reputation_score !== "number"
        ) {
          return { val: null, errorMsg: "missing account profile" };
        }
        return {
          val: {
            accountId: row.id,
            username: row.username,
            reputationScore: row.reputation_score,
            accessToken,
          },
        };
      },
    );
    if (registered.val == null) {
      throw new Error(registered.errorMsg ?? "failed to register test account");
    }
    expect(registered.val.username).toBe(username);
    expect(registered.val.reputationScore).toBe(0);
    return {
      userId: registered.val.accountId,
      username: registered.val.username,
      accessToken: registered.val.accessToken,
    };
  }

  async function createBathroom(): Promise<{ id: number; existenceValue: number }> {
    const admin = adminClient();
    const { data, error } = await admin
      .rpc("create_bathroom_data_primary_at", {
        p_latitude: nextLatitude(),
        p_longitude: -40,
        p_temp_data: TEMP_DATA,
      })
      .single();
    if (error !== null || data === null) {
      throw new Error(error?.message ?? "failed to create bathroom");
    }
    const row = data as { id: number; existence_value: number };
    createdBathroomIds.push(row.id);
    return { id: row.id, existenceValue: row.existence_value };
  }

  async function reputationOf(userId: string): Promise<number> {
    const { data, error } = await adminClient()
      .from("accounts")
      .select("reputation_score")
      .eq("id", userId)
      .single();
    if (error !== null || data === null) {
      throw new Error(error?.message ?? "missing account reputation");
    }
    return (data as { reputation_score: number }).reputation_score;
  }

  async function setReputation(userId: string, reputationScore: number): Promise<void> {
    const { error } = await adminClient()
      .from("accounts")
      .update({ reputation_score: reputationScore })
      .eq("id", userId);
    if (error !== null) {
      throw new Error(error.message);
    }
  }

  async function existenceOf(bathroomId: number): Promise<number> {
    const { data, error } = await adminClient()
      .from("bathroom_data_primary")
      .select("existence_value")
      .eq("id", bathroomId)
      .single();
    if (error !== null || data === null) {
      throw new Error(error?.message ?? "missing bathroom");
    }
    return (data as { existence_value: number }).existence_value;
  }

  afterAll(async () => {
    const admin = adminClient();
    if (createdBathroomIds.length > 0) {
      await admin.from("bathroom_data_primary").delete().in("id", createdBathroomIds);
    }
    for (const userId of createdUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test("anonymous callers can read bathrooms but cannot create, change, or delete them", async () => {
    const bathroom = await createBathroom();
    const { url, key } = requireLocalSupabaseEnv();
    const anon = createClient(url, key, { auth: AUTH_OPTIONS });

    const read = await anon
      .from("bathroom_data_primary")
      .select("id")
      .eq("id", bathroom.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([{ id: bathroom.id }]);

    const inserted = await anon.from("bathroom_data_primary").insert({
      temp_data: TEMP_DATA,
      location: "SRID=4326;POINT(-40 14)",
    });
    expect(inserted.error).not.toBeNull();

    const updated = await anon
      .from("bathroom_data_primary")
      .update({ existence_value: 9 })
      .eq("id", bathroom.id);
    expect(updated.error).not.toBeNull();

    const deleted = await anon
      .from("bathroom_data_primary")
      .delete()
      .eq("id", bathroom.id);
    expect(deleted.error).not.toBeNull();
    expect(await existenceOf(bathroom.id)).toBe(bathroom.existenceValue);

    const created = await anonRpc("create_bathroom_data_primary_at", {
      p_latitude: nextLatitude(),
      p_longitude: -40,
      p_temp_data: TEMP_DATA,
    });
    expect(created.ok).toBe(false);
    expect(errorMessage(created.body).toLowerCase()).toMatch(
      /account required|permission denied/,
    );

    const voted = await anonRpc(
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(voted.ok).toBe(false);
    expect(errorMessage(voted.body).toLowerCase()).toMatch(
      /account required|permission denied/,
    );

    const rated = await anonRpc("increment_bathroom_data_primary_rating_count", {
      p_id: bathroom.id,
      p_stars: 5,
    });
    expect(rated.ok).toBe(false);
    expect(errorMessage(rated.body).toLowerCase()).toMatch(
      /account required|permission denied/,
    );
  });

  test("an account can create a bathroom without changing reputation", async () => {
    const account = await createAccount("create");
    const created = await userRpc(account.accessToken, "create_bathroom_data_primary_at", {
      p_latitude: nextLatitude(),
      p_longitude: -41,
      p_temp_data: TEMP_DATA,
    });
    expect(created.ok).toBe(true);
    const row = Array.isArray(created.body) ? created.body[0] : created.body;
    const id = (row as { id: number }).id;
    createdBathroomIds.push(id);
    expect(await reputationOf(account.userId)).toBe(0);
  });

  test("voting and rating follow the reputation window and vote weight", async () => {
    const account = await createAccount("window");
    expect(await reputationOf(account.userId)).toBe(0);
    let firstRatedBathroomId = 0;

    for (let action = 1; action <= 11; action += 1) {
      const ratedBathroom = await createBathroom();
      if (action === 1) {
        firstRatedBathroomId = ratedBathroom.id;
      }
      const rated = await userRpc(
        account.accessToken,
        "increment_bathroom_data_primary_rating_count",
        { p_id: ratedBathroom.id, p_stars: 1 },
      );
      expect(rated.ok).toBe(true);
      const expected = Array.from({ length: action }, (_, index) =>
        reputationDeltaForActionIndex(index + 1),
      ).reduce((sum, delta) => sum + delta, 0);
      expect(await reputationOf(account.userId)).toBe(expected);
    }

    const repeated = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_rating_count",
      { p_id: firstRatedBathroomId, p_stars: 1 },
    );
    expect(repeated.ok).toBe(true);
    expect(await reputationOf(account.userId)).toBe(4);

    const weighted = await createAccount("weight");
    await setReputation(weighted.userId, 20);
    const weightedBathroom = await createBathroom();
    const voted = await userRpc(
      weighted.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: weightedBathroom.id, p_vote_for_exists: true },
    );
    expect(voted.ok).toBe(true);
    expect(await existenceOf(weightedBathroom.id)).toBeCloseTo(
      existenceVoteWeight(20),
      4,
    );
    expect(await reputationOf(weighted.userId)).toBe(21);
  });

  test("reputation below -20 blocks voting and rating and accounts cannot delete bathrooms", async () => {
    const blocked = await createAccount("blocked");
    const allowedEdge = await createAccount("edge");
    const bathroom = await createBathroom();
    const deletable = await createBathroom();
    await setReputation(blocked.userId, -21);
    await setReputation(allowedEdge.userId, -20);
    expect(accountCanVoteOrRate(-21)).toBe(false);
    expect(accountCanVoteOrRate(-20)).toBe(true);

    const blockedVote = await userRpc(
      blocked.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(blockedVote.ok).toBe(false);
    expect(errorMessage(blockedVote.body)).toContain(
      "reputation too low to vote or rate",
    );

    const blockedRating = await userRpc(
      blocked.accessToken,
      "increment_bathroom_data_primary_rating_count",
      { p_id: bathroom.id, p_stars: 3 },
    );
    expect(blockedRating.ok).toBe(false);
    expect(await existenceOf(bathroom.id)).toBe(0);
    expect(await reputationOf(blocked.userId)).toBe(-21);

    const { url, key } = requireLocalSupabaseEnv();
    const directUpdate = await fetch(
      `${url}/rest/v1/bathroom_data_primary?id=eq.${bathroom.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: key,
          Authorization: `Bearer ${blocked.accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ existence_value: 40 }),
      },
    );
    expect(directUpdate.ok).toBe(false);
    expect(await existenceOf(bathroom.id)).toBe(0);

    const edgeVote = await userRpc(
      allowedEdge.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: false },
    );
    expect(edgeVote.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(existenceVoteWeight(-20) * -1, 4);
    expect(await reputationOf(allowedEdge.userId)).toBe(-19);

    const deleted = await fetch(
      `${url}/rest/v1/bathroom_data_primary?id=eq.${deletable.id}`,
      {
        method: "DELETE",
        headers: {
          apikey: key,
          Authorization: `Bearer ${blocked.accessToken}`,
          Prefer: "return=minimal",
        },
      },
    );
    expect(deleted.ok).toBe(false);
    const remaining = await adminClient()
      .from("bathroom_data_primary")
      .select("id")
      .eq("id", deletable.id);
    expect(remaining.data).toEqual([{ id: deletable.id }]);
  });

  test("a no-op vote against a pending deletion does not change reputation", async () => {
    const account = await createAccount("noop");
    const bathroom = await createBathroom();
    const stamped = await adminClient()
      .from("bathroom_data_primary")
      .update({ deletion_wait_started_timestamp: new Date().toISOString() })
      .eq("id", bathroom.id);
    expect(stamped.error).toBeNull();

    const voted = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: false },
    );
    expect(voted.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBe(0);
    expect(await reputationOf(account.userId)).toBe(0);
  });

  test("accounts can read only their own profile and cannot set reputation directly", async () => {
    const first = await createAccount("own");
    const second = await createAccount("other");
    await setReputation(second.userId, 8);
    const { url, key } = requireLocalSupabaseEnv();

    const ownRows = await fetch(`${url}/rest/v1/accounts?select=id,reputation_score`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${first.accessToken}`,
      },
    });
    expect(ownRows.ok).toBe(true);
    const rows = (await ownRows.json()) as Array<{ id: string }>;
    expect(rows.map((row) => row.id)).toEqual([first.userId]);

    const tamper = await fetch(`${url}/rest/v1/accounts?id=eq.${second.userId}`, {
      method: "PATCH",
      headers: {
        apikey: key,
        Authorization: `Bearer ${first.accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ reputation_score: 100 }),
    });
    expect(tamper.ok).toBe(false);
    expect(await reputationOf(second.userId)).toBe(8);

    const anon = createClient(url, key, { auth: AUTH_OPTIONS });
    const anonRead = await anon.from("accounts").select("id");
    expect(anonRead.error !== null || (anonRead.data ?? []).length === 0).toBe(
      true,
    );
  });

  test("weekly drift moves every reputation score one step toward 0", async () => {
    const positive = await createAccount("pos");
    const negative = await createAccount("neg");
    const zero = await createAccount("zero");
    await setReputation(positive.userId, 3);
    await setReputation(negative.userId, -2);
    await setReputation(zero.userId, 0);

    const drifted = await adminClient().rpc("drift_account_reputation_toward_zero");
    expect(drifted.error).toBeNull();
    expect(await reputationOf(positive.userId)).toBe(reputationAfterWeeklyDrift(3));
    expect(await reputationOf(negative.userId)).toBe(reputationAfterWeeklyDrift(-2));
    expect(await reputationOf(zero.userId)).toBe(reputationAfterWeeklyDrift(0));
  });

  test("new public tables are created with forced row level security", () => {
    const probe = "rls_future_public_probe";
    runPsql(`DROP TABLE IF EXISTS public.${probe};`);
    runPsql(`CREATE TABLE public.${probe} (id integer);`);
    runPsql(`INSERT INTO public.${probe} (id) VALUES (1);`);
    runPsql(`GRANT SELECT ON public.${probe} TO anon;`);

    const flags = JSON.parse(
      runPsql(`
        SELECT json_build_object(
          'rowSecurity', c.relrowsecurity,
          'forceRowSecurity', c.relforcerowsecurity
        )::text
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = '${probe}';
      `),
    ) as { rowSecurity: boolean; forceRowSecurity: boolean };
    expect(flags).toEqual({ rowSecurity: true, forceRowSecurity: true });

    const visibleToAnon = runPsql(`
      SET ROLE anon;
      SELECT count(*)::text FROM public.${probe};
    `);
    const visibleLines = visibleToAnon.split(/\s+/).filter((line) => line.length > 0);
    expect(visibleLines).toContain("0");
    expect(visibleLines).not.toContain("1");

    runPsql(`DROP TABLE IF EXISTS public.${probe};`);
  });

  test("one existence vote can be changed or undone and does not stack", async () => {
    const account = await createAccount("oncevote");
    const bathroom = await createBathroom();
    const first = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(first.ok).toBe(true);
    const weight = existenceVoteWeight(0);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(weight, 4);
    expect(await reputationOf(account.userId)).toBe(1);

    const stacked = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(stacked.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(weight, 4);
    expect(await reputationOf(account.userId)).toBe(1);

    const interaction = await userRpc(
      account.accessToken,
      "get_own_bathroom_interaction",
      { p_id: bathroom.id },
    );
    expect(interaction.ok).toBe(true);
    const interactionRow = (
      Array.isArray(interaction.body) ? interaction.body[0] : interaction.body
    ) as { vote_on_cooldown: boolean; vote_for_exists: boolean };
    expect(interactionRow.vote_for_exists).toBe(true);
    expect(interactionRow.vote_on_cooldown).toBe(true);

    const changed = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: false },
    );
    expect(changed.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(-existenceVoteWeight(1), 4);
    expect(await reputationOf(account.userId)).toBe(1);

    const cleared = await userRpc(
      account.accessToken,
      "clear_own_bathroom_existence_vote",
      { p_id: bathroom.id },
    );
    expect(cleared.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(0, 4);
    expect(await reputationOf(account.userId)).toBe(1);
  });

  test("one rating can be changed or undone and does not stack", async () => {
    const account = await createAccount("oncerate");
    const bathroom = await createBathroom();
    const first = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_rating_count",
      { p_id: bathroom.id, p_stars: 5 },
    );
    expect(first.ok).toBe(true);
    const changed = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_rating_count",
      { p_id: bathroom.id, p_stars: 2 },
    );
    expect(changed.ok).toBe(true);
    const counts = await adminClient()
      .from("bathroom_data_primary")
      .select("rating_2_count, rating_5_count")
      .eq("id", bathroom.id)
      .single();
    expect(counts.data).toEqual({ rating_2_count: 1, rating_5_count: 0 });
    expect(await reputationOf(account.userId)).toBe(1);

    const cleared = await userRpc(
      account.accessToken,
      "clear_own_bathroom_rating",
      { p_id: bathroom.id },
    );
    expect(cleared.ok).toBe(true);
    const afterClear = await adminClient()
      .from("bathroom_data_primary")
      .select("rating_2_count")
      .eq("id", bathroom.id)
      .single();
    expect(afterClear.data).toEqual({ rating_2_count: 0 });
    expect(await reputationOf(account.userId)).toBe(1);
  });

  test("an expired vote cooldown still does not stack the same direction", async () => {
    const account = await createAccount("cooldown");
    const bathroom = await createBathroom();
    const voted = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(voted.ok).toBe(true);
    const backdated = await adminClient()
      .from("account_bathroom_existence_votes")
      .update({
        voted_at: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("account_id", account.userId)
      .eq("bathroom_id", bathroom.id);
    expect(backdated.error).toBeNull();

    const interaction = await userRpc(
      account.accessToken,
      "get_own_bathroom_interaction",
      { p_id: bathroom.id },
    );
    const interactionRow = (
      Array.isArray(interaction.body) ? interaction.body[0] : interaction.body
    ) as { vote_on_cooldown: boolean };
    expect(interactionRow.vote_on_cooldown).toBe(false);

    const repeated = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: bathroom.id, p_vote_for_exists: true },
    );
    expect(repeated.ok).toBe(true);
    expect(await existenceOf(bathroom.id)).toBeCloseTo(existenceVoteWeight(0), 4);
  });

  test("simultaneous votes on a full increase window do not both add reputation", async () => {
    const account = await createAccount("race");
    for (let index = 0; index < 4; index += 1) {
      const bathroom = await createBathroom();
      const voted = await userRpc(
        account.accessToken,
        "increment_bathroom_data_primary_existence_vote_count",
        { p_id: bathroom.id, p_vote_for_exists: true },
      );
      expect(voted.ok).toBe(true);
    }
    expect(await reputationOf(account.userId)).toBe(4);

    const fifth = await createBathroom();
    const sixth = await createBathroom();
    const [firstResult, secondResult] = await Promise.all([
      userRpc(account.accessToken, "increment_bathroom_data_primary_existence_vote_count", {
        p_id: fifth.id,
        p_vote_for_exists: true,
      }),
      userRpc(account.accessToken, "increment_bathroom_data_primary_existence_vote_count", {
        p_id: sixth.id,
        p_vote_for_exists: true,
      }),
    ]);
    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(await reputationOf(account.userId)).toBe(5);
    expect(await existenceOf(fifth.id)).toBeCloseTo(1, 4);
    expect(await existenceOf(sixth.id)).toBeCloseTo(1, 4);
  });

  test("direct vote calls stop at the bathroom update rate limit", async () => {
    const account = await createAccount("limit");
    const limit = SERVER_RATE_LIMITS.bathroomUpdate.perMinute;
    const expectedMessage = formatRateLimitExceededMessage(
      "bathroom-update",
      limit.windowSeconds,
      limit.maxRequests,
    );
    for (let index = 0; index < limit.maxRequests; index += 1) {
      const bathroom = await createBathroom();
      const voted = await userRpc(
        account.accessToken,
        "increment_bathroom_data_primary_existence_vote_count",
        { p_id: bathroom.id, p_vote_for_exists: true },
      );
      expect(voted.ok).toBe(true);
    }

    const blockedBathroom = await createBathroom();
    const blocked = await userRpc(
      account.accessToken,
      "increment_bathroom_data_primary_existence_vote_count",
      { p_id: blockedBathroom.id, p_vote_for_exists: true },
    );
    expect(blocked.ok).toBe(false);
    expect(errorMessage(blocked.body)).toContain(expectedMessage);
    expect(await existenceOf(blockedBathroom.id)).toBe(0);
  });

  test("logged-out and logged-in users cannot run maintenance or read private tables", async () => {
    const account = await createAccount("private");
    const maintenanceFunctions = [
      "decay_bathroom_data_primary_existence_value",
      "delete_expired_pending_deletion_bathrooms",
      "drift_account_reputation_toward_zero",
    ];
    for (const functionName of maintenanceFunctions) {
      const anonResult = await anonRpc(functionName, {});
      const userResult = await userRpc(account.accessToken, functionName, {});
      expect(anonResult.ok).toBe(false);
      expect(userResult.ok).toBe(false);
      expect(errorMessage(anonResult.body).toLowerCase()).toMatch(/permission denied/);
      expect(errorMessage(userResult.body).toLowerCase()).toMatch(/permission denied/);
    }

    const { url, key } = requireLocalSupabaseEnv();
    const privateTables = [
      "account_bathroom_actions",
      "server_db_schema_version",
      "account_bathroom_existence_votes",
      "account_bathroom_ratings",
      "account_bathroom_update_events",
    ];
    for (const table of privateTables) {
      for (const token of [key, account.accessToken]) {
        const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
          headers: {
            apikey: key,
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        expect(response.ok).toBe(false);
      }
    }
  });

  test("weekly reputation drift is scheduled", () => {
    const job = JSON.parse(
      runPsql(`
        SELECT json_build_object(
          'jobname', job.jobname,
          'schedule', job.schedule,
          'command', job.command
        )::text
        FROM cron.job AS job
        WHERE job.jobname = 'drift_account_reputation_weekly';
      `),
    ) as { jobname: string; schedule: string; command: string };
    expect(job).toEqual({
      jobname: "drift_account_reputation_weekly",
      schedule: "0 0 * * 0",
      command: "SELECT public.drift_account_reputation_toward_zero();",
    });
  });
});
