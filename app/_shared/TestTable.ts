export type TestTableRow = {
  id: number;
  foo: number;
  description: string;
  created_at: string;
  updated_at: string;
};

export type NewTestTableRow = Pick<TestTableRow, "foo" | "description">;

export type TestTableRowUpdate = Partial<Pick<TestTableRow, "foo" | "description">>;
