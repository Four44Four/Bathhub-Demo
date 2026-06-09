"use client";

import { type Errorable } from "../_shared/Utils";
import {
  type NewTestTableRow,
  type TestTableRow,
} from "../_shared/TestTable";
import * as ServerDebug from "../_server/Debug";
import * as TestTableCrud from "../_server/database/TestTableCrud";

export const RANDOM_DESCRIPTION_LENGTH = 200;

const ALPHANUM =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const TEST_TABLE_COLUMNS = [
  "id",
  "foo",
  "created_at",
  "updated_at",
  "description",
] as const satisfies ReadonlyArray<keyof TestTableRow>;

async function toErrorable<T>(run: () => Promise<T>): Promise<Errorable<T>> {
  try {
    return { val: await run() };
  } catch (error: unknown) {
    return {
      val: null,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }
}

export function randomInt0To255(): number {
  return Math.floor(Math.random() * 256);
}

export function randomAlphanumericString(length: number): string {
  let value = "";
  for (let i = 0; i < length; i++) {
    value += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)];
  }
  return value;
}

export function buildRandomTestTableCreatePayload(): NewTestTableRow {
  return {
    foo: randomInt0To255(),
    description: randomAlphanumericString(RANDOM_DESCRIPTION_LENGTH),
  };
}

export function formatTestTableRowsAligned(rows: TestTableRow[]): string {
  if (rows.length === 0) {
    return "(empty)";
  }

  const widths = TEST_TABLE_COLUMNS.map((column) =>
    Math.max(
      column.length,
      ...rows.map((row) => String(row[column]).length),
    ),
  );

  const formatRow = (values: string[]) =>
    values.map((value, index) => value.padEnd(widths[index])).join("  ");

  const header = formatRow([...TEST_TABLE_COLUMNS]);
  const body = rows.map((row) =>
    formatRow(TEST_TABLE_COLUMNS.map((column) => String(row[column]))),
  );

  return [header, ...body].join("\n");
}

export async function createTestTableRow(): Promise<Errorable<TestTableRow>> {
  return toErrorable(() =>
    TestTableCrud.testDbCreate(buildRandomTestTableCreatePayload()),
  );
}

export async function updateOldestTestTableRow(): Promise<Errorable<TestTableRow>> {
  return toErrorable(() => TestTableCrud.testDbUpdateOldest(randomInt0To255()));
}

export async function removeOldestTestTableRow(): Promise<Errorable<null>> {
  return toErrorable(async () => {
    await TestTableCrud.testDbRemoveOldest();
    return null;
  });
}

export async function readTestTableRows(): Promise<Errorable<string>> {
  const result = await toErrorable(() => TestTableCrud.testDbReadAll());
  if (result.errorMsg) {
    return { val: null, errorMsg: result.errorMsg };
  }
  if (result.val === null) {
    return { val: null, errorMsg: "Failed to read test_table rows." };
  }

  const formatted = formatTestTableRowsAligned(result.val);
  console.log(formatted);
  await ServerDebug.log(formatted);
  return { val: formatted };
}
