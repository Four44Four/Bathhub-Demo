import { type BathroomDataPrimaryRow, type VerifyStatus } from "../app/_shared/BathroomDataPrimary";

export type InputCoordinate = {
  label: string;
  latitude: number;
  longitude: number;
  verify_status: VerifyStatus;
};

export type FailedRowReport = {
  label: string;
  row: BathroomDataPrimaryRow | null;
  errors: string[];
};

export type CrudReportData = {
  inputs: InputCoordinate[];
  tableRows: BathroomDataPrimaryRow[];
  failedRows: FailedRowReport[];
  testsPassed: boolean;
};

const ANSI = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
} as const;

const INPUT_COLUMNS = ["label", "latitude", "longitude", "verify_status"] as const;
const OUTPUT_COLUMNS = [
  "id",
  "latitude",
  "longitude",
  "verify_status",
  "temp_data",
  "created_at",
] as const;

const FAILED_COLUMNS = [
  "label",
  "id",
  "latitude",
  "longitude",
  "verify_status",
  "errors",
] as const;

const DISPLAY_LIMIT = 5;

function formatCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return String(value);
}

function buildTable(headers: readonly string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(
      header.length,
      ...rows.map((row) => formatCell(row[index]).length),
    ),
  );

  const formatRow = (cells: string[]) =>
    cells.map((cell, index) => formatCell(cell).padEnd(widths[index])).join("  ");

  return [
    formatRow([...headers]),
    widths.map((width) => "-".repeat(width)).join("  "),
    ...rows.map((row) => formatRow(row)),
  ].join("\n");
}

function inputRows(inputs: InputCoordinate[]): string[][] {
  return inputs.map((input) => [
    input.label,
    input.latitude.toFixed(6),
    input.longitude.toFixed(6),
    input.verify_status,
  ]);
}

function outputRows(rows: BathroomDataPrimaryRow[]): string[][] {
  return rows.map((row) => [
    String(row.id),
    row.latitude.toFixed(6),
    row.longitude.toFixed(6),
    row.verify_status,
    row.temp_data,
    row.created_at,
  ]);
}

function failedRows(failures: FailedRowReport[]): string[][] {
  return failures.map((failure) => [
    failure.label,
    failure.row === null ? "-" : String(failure.row.id),
    failure.row === null ? "-" : failure.row.latitude.toFixed(6),
    failure.row === null ? "-" : failure.row.longitude.toFixed(6),
    failure.row === null ? "-" : failure.row.verify_status,
    failure.errors.join("; "),
  ]);
}

function appendOverflowSuffix(lineCount: number, totalCount: number): string {
  if (totalCount > DISPLAY_LIMIT) {
    return "\n...";
  }
  return "";
}

function section(title: string, body: string, color?: string): string {
  const divider = "─".repeat(72);
  const coloredBody = color === undefined ? body : `${color}${body}${ANSI.reset}`;
  return [
    "",
    divider,
    `${ANSI.bold}${title}${ANSI.reset}`,
    divider,
    coloredBody,
  ].join("\n");
}

export function formatCrudReport(data: CrudReportData): string {
  const inputTable = buildTable([...INPUT_COLUMNS], inputRows(data.inputs));

  const outputColor = data.testsPassed ? ANSI.green : ANSI.red;

  let outputSectionTitle = "DATABASE OUTPUT (bathroom_data_primary)";
  let outputBody: string;

  if (data.testsPassed) {
    const preview = data.tableRows.slice(0, DISPLAY_LIMIT);
    outputBody = buildTable([...OUTPUT_COLUMNS], outputRows(preview));
    outputBody += appendOverflowSuffix(preview.length, data.tableRows.length);
  } else {
    const preview = data.failedRows.slice(0, DISPLAY_LIMIT);
    outputSectionTitle = "DATABASE OUTPUT (failed rows only)";
    outputBody = buildTable([...FAILED_COLUMNS], failedRows(preview));
    outputBody += appendOverflowSuffix(preview.length, data.failedRows.length);
  }

  return [
    section("INPUT COORDINATES", inputTable),
    section(outputSectionTitle, outputBody, outputColor),
    "",
  ].join("\n");
}

export function printCrudReport(data: CrudReportData): void {
  console.log(formatCrudReport(data));
}
