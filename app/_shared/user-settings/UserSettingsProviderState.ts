import type {
  UserSettingsPageId,
  UserSettingsBooleanColumnName,
  UserSettingsNumericColumnName,
} from "./UserSettingsPageDefinition";
import {
  popUserSettingsPage,
  pushUserSettingsPage,
} from "./UserSettingsPageStack";
import type { UserSettingsRow } from "./UserSettingsSchema";

export type UserSettingsUiState = {
  isOpen: boolean;
  pageStack: UserSettingsPageId[];
  pendingSettings: UserSettingsRow | null;
  hasEditedSettings: boolean;
  isSaving: boolean;
};

export type UserSettingsUiAction =
  | { type: "open"; settings: UserSettingsRow }
  | { type: "close_without_save" }
  | {
      type: "set_pending_boolean";
      column: UserSettingsBooleanColumnName;
      value: boolean;
    }
  | {
      type: "set_pending_int";
      column: UserSettingsNumericColumnName;
      value: number;
    }
  | { type: "push_page"; pageId: UserSettingsPageId }
  | { type: "pop_page" }
  | { type: "save_start" }
  | { type: "save_success" }
  | { type: "save_end" };

export const initialUserSettingsUiState: UserSettingsUiState = {
  isOpen: false,
  pageStack: ["root"],
  pendingSettings: null,
  hasEditedSettings: false,
  isSaving: false,
};

export function reduceUserSettingsUiState(
  state: UserSettingsUiState,
  action: UserSettingsUiAction,
): UserSettingsUiState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        isOpen: true,
        pageStack: ["root"],
        pendingSettings: action.settings,
        hasEditedSettings: false,
      };
    case "close_without_save":
      return {
        ...state,
        isOpen: false,
        pageStack: ["root"],
        pendingSettings: null,
        hasEditedSettings: false,
      };
    case "set_pending_boolean":
      if (state.pendingSettings == null) {
        return state;
      }
      return {
        ...state,
        pendingSettings: {
          ...state.pendingSettings,
          [action.column]: action.value,
        },
        hasEditedSettings: true,
      };
    case "set_pending_int":
      if (state.pendingSettings == null) {
        return state;
      }
      return {
        ...state,
        pendingSettings: {
          ...state.pendingSettings,
          [action.column]: action.value,
        },
        hasEditedSettings: true,
      };
    case "push_page":
      return {
        ...state,
        pageStack: pushUserSettingsPage(state.pageStack, action.pageId),
      };
    case "pop_page":
      return {
        ...state,
        pageStack: popUserSettingsPage(state.pageStack),
      };
    case "save_start":
      return {
        ...state,
        isSaving: true,
      };
    case "save_success":
      return {
        ...state,
        hasEditedSettings: false,
        isSaving: false,
      };
    case "save_end":
      return {
        ...state,
        isSaving: false,
      };
    default:
      return state;
  }
}
