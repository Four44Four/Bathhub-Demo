"use client";

import { Button as ButtonConsts } from "../../../ComponentConstants";
import { Button } from "../../Button";
import * as ClientTestTable from "../../../TestTable";
import { BTN_ROW_OFFSET_PX } from "./TestDBCreate";
import { BTN_X as TEST_PATHFIND_BTN_X, BTN_Y as TEST_PATHFIND_BTN_Y } from "./TestPathfind";

export const BTN_STR = "Test DB Update";
export const BTN_X = TEST_PATHFIND_BTN_X;
export const BTN_Y = TEST_PATHFIND_BTN_Y + BTN_ROW_OFFSET_PX * 2;

async function onTestDbUpdateClick() {
  const result = await ClientTestTable.updateOldestTestTableRow();
  if (result.errorMsg) {
    console.error(result.errorMsg);
    return;
  }
  console.log(`Updated test_table row id=${result.val?.id} foo=${result.val?.foo}`);
}

export function TestDBUpdate() {
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <Button
        text={BTN_STR}
        x={BTN_X}
        y={BTN_Y}
        fillColor={ButtonConsts.TEXT_COLOR}
        outlineColor={ButtonConsts.DEFAULT_FILL_COLOR}
        textColor={ButtonConsts.DEFAULT_LINE_COLOR}
        onClick={() => onTestDbUpdateClick()}
      />
    </div>
  );
}
