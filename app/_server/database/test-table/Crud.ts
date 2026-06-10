"use server";

import {
  type NewTestTableRow,
  type TestTableRow,
} from "../../../_shared/TestTable";
import * as Core from "./CrudCore";

export async function testDbCreate(row: NewTestTableRow): Promise<TestTableRow> {
  return Core.createRow(row);
}

export async function testDbUpdateOldest(foo: number): Promise<TestTableRow> {
  const oldest = await Core.getOldestRowByUpdatedAt();
  if (oldest === null) {
    throw new Error("No rows in test_table to update.");
  }

  return Core.updateRow(oldest.id, { foo });
}

export async function testDbRemoveOldest(): Promise<void> {
  const oldest = await Core.getOldestRowByUpdatedAt();
  if (oldest === null) {
    throw new Error("No rows in test_table to remove.");
  }

  await Core.deleteRow(oldest.id);
}

export async function testDbReadAll(): Promise<TestTableRow[]> {
  return Core.getAllRows();
}
