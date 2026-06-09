"use client";

import { Button } from "../Button";
import * as ClientTestTable from "../../TestTable";
import { BTN_ROW_OFFSET_PX } from "./TestDBCreate";
import { BTN_X as TEST_PATHFIND_BTN_X, BTN_Y as TEST_PATHFIND_BTN_Y } from "./TestPathfind";

export const BTN_STR = "Test DB Remove";
export const BTN_X = TEST_PATHFIND_BTN_X;
export const BTN_Y = TEST_PATHFIND_BTN_Y + BTN_ROW_OFFSET_PX * 3;

async function onTestDbRemoveClick() {
  const result = await ClientTestTable.removeOldestTestTableRow();
  if (result.errorMsg) {
    console.error(result.errorMsg);
  }
}

export function TestDBRemove() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <Button text={BTN_STR} x={BTN_X} y={BTN_Y} onClick={() => onTestDbRemoveClick()} />
    </div>
  );
}
