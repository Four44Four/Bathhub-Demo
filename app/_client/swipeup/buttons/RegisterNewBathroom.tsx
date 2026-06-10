"use client";

import { PrimaryButton } from "../PrimaryButton";
import { useAddBathroomMode } from "../../viewport2d/add-bathroom-mode";

export const REGISTER_NEW_BR_BTN_STR = "Add bathroom";
export const REGISTER_NEW_BR_BTN_IMAGE_PATH = "/plus_symbol.svg";

export function RegisterNewBathroom() {
  const { enterAddBathroomMode } = useAddBathroomMode();
  return (
    <PrimaryButton
      label={REGISTER_NEW_BR_BTN_STR}
      imagePath={REGISTER_NEW_BR_BTN_IMAGE_PATH}
      onClick={() => {
        enterAddBathroomMode();
      }}
    />
  );
}
