import { positionalAlertIdsWithDetachedAnchors } from "../app/_client/pure/viewport2d/PositionalAlertAnchor";
import {
  alertSystemDismissAllPositional,
  alertSystemDismissImportant,
  alertSystemDismissPositional,
  alertSystemShowImportant,
  alertSystemShowPositional,
  EMPTY_ALERT_SYSTEM_STATE,
} from "../app/_client/pure/viewport2d/AlertSystemState";

describe("AlertSystemState", () => {
  test("show and dismiss positional alerts", () => {
    let state = EMPTY_ALERT_SYSTEM_STATE;
    state = alertSystemShowPositional(state, "a", "Path missing", "up");
    state = alertSystemShowPositional(state, "b", "Other", "down");
    expect(state.positional).toHaveLength(2);
    state = alertSystemDismissPositional(state, "a");
    expect(state.positional.map((e) => e.id)).toEqual(["b"]);
    state = alertSystemDismissAllPositional(state);
    expect(state.positional).toHaveLength(0);
  });

  test("show and dismiss important alert", () => {
    let state = EMPTY_ALERT_SYSTEM_STATE;
    state = alertSystemShowImportant(state, "Fatal error", "Ok", false);
    expect(state.important).toEqual({
      message: "Fatal error",
      okLabel: "Ok",
      positive: false,
      onDismiss: undefined,
    });
    state = alertSystemDismissImportant(state);
    expect(state.important).toBeNull();
  });
});

describe("positional alert anchor lifecycle", () => {
  test("detached anchor ids are removed from alert state", () => {
    let state = alertSystemShowPositional(
      EMPTY_ALERT_SYSTEM_STATE,
      "menu-btn",
      "No point picked !!",
      "up",
    );
    const attached = { isConnected: true } as HTMLElement;
    const anchors = new Map<string, HTMLElement>([["menu-btn", attached]]);

    expect(
      positionalAlertIdsWithDetachedAnchors(state.positional, (id) => anchors.get(id)),
    ).toEqual([]);

    anchors.set("menu-btn", { isConnected: false } as HTMLElement);
    const detachedIds = positionalAlertIdsWithDetachedAnchors(
      state.positional,
      (id) => anchors.get(id),
    );
    expect(detachedIds).toEqual(["menu-btn"]);

    for (const id of detachedIds) {
      state = alertSystemDismissPositional(state, id);
    }
    expect(state.positional).toHaveLength(0);
  });
});
