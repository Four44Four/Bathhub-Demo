import { positionalAlertIdsWithDetachedAnchors } from "../app/_client/pure/viewport2d/PositionalAlertAnchor";
import {
  alertSystemDismissAllPositional,
  alertSystemDismissBand,
  alertSystemDismissImportant,
  alertSystemDismissPositional,
  alertSystemShowBand,
  alertSystemShowImportant,
  alertSystemShowPositional,
  EMPTY_ALERT_SYSTEM_STATE,
  resolveImportantAlertButtons,
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
    const buttons = resolveImportantAlertButtons({ okLabel: "Ok" });
    state = alertSystemShowImportant(state, "Fatal error", false, buttons);
    expect(state.important).toEqual({
      message: "Fatal error",
      positive: false,
      buttons: [{ label: "Ok", style: "accent", onClick: undefined }],
    });
    state = alertSystemDismissImportant(state);
    expect(state.important).toBeNull();
  });

  test("show and dismiss band alerts", () => {
    let state = EMPTY_ALERT_SYSTEM_STATE;
    state = alertSystemShowBand(state, "a", "Violated rate limit for bathroom creation", {
      createdAtMs: 1,
      maxStack: 5,
    });
    state = alertSystemShowBand(state, "b", "Violated rate limit for retrieving bathrooms", {
      createdAtMs: 2,
      maxStack: 5,
    });
    expect(state.band).toHaveLength(2);
    state = alertSystemDismissBand(state, "a");
    expect(state.band.map((entry) => entry.id)).toEqual(["b"]);
  });

  test("show band alerts drops oldest entries when max stack is exceeded", () => {
    let state = EMPTY_ALERT_SYSTEM_STATE;
    const ids = ["a", "b", "c", "d", "e", "f"] as const;

    for (const [index, id] of ids.entries()) {
      state = alertSystemShowBand(state, id, `Message ${id}`, {
        createdAtMs: index + 1,
        maxStack: 5,
      });
    }

    expect(state.band.map((entry) => entry.id)).toEqual(["b", "c", "d", "e", "f"]);
  });

  test("resolveImportantAlertButtons uses explicit buttons when provided", () => {
    const buttons = resolveImportantAlertButtons({
      buttons: [
        { label: "Exit anyways", style: "accent", onClick: () => {} },
        { label: "Don't exit", style: "background" },
      ],
    });
    expect(buttons).toHaveLength(2);
    expect(buttons[0].label).toBe("Exit anyways");
    expect(buttons[1].style).toBe("background");
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
