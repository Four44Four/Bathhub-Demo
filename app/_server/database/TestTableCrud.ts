"use server";

import {
  type NewTestTableRow,
  type TestTableRow,
} from "../../_shared/TestTable";
import * as Core from "./TestTableCrudCore";

export async function testDbCreate(row: NewTestTableRow): Promise<TestTableRow> {
  return Core.createTestTableRow(row);
}

export async function testDbUpdateOldest(foo: number): Promise<TestTableRow> {
  const oldest = await Core.getOldestTestTableRowByUpdatedAt();
  if (oldest === null) {
    throw new Error("No rows in test_table to update.");
  }

  return Core.updateTestTableRow(oldest.id, { foo });
}

export async function testDbRemoveOldest(): Promise<void> {
  const oldest = await Core.getOldestTestTableRowByUpdatedAt();
  if (oldest === null) {
    throw new Error("No rows in test_table to remove.");
  }

  await Core.deleteTestTableRow(oldest.id);
}

export async function testDbReadAll(): Promise<TestTableRow[]> {
  return Core.getAllTestTableRows();
}
