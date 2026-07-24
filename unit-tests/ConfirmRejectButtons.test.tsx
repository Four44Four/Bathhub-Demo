/**
 * @jest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ActionButtons } from "../app/_client/viewport2d/add-bathroom-mode/ActionButtons";

describe("confirm and reject buttons", () => {
  const originalFetchDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "fetch",
  );
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(() => new Promise(() => {})),
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    if (originalFetchDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      Object.defineProperty(globalThis, "fetch", originalFetchDescriptor);
    }
  });

  test("renders confirm left of reject with specified margins and colors", () => {
    act(() => {
      root.render(<ActionButtons onConfirm={() => {}} onReject={() => {}} />);
    });

    const row = container.firstElementChild as HTMLDivElement;
    const buttons = Array.from(row.querySelectorAll("button"));

    expect(row.style.left).toBe("12px");
    expect(row.style.right).toBe("12px");
    expect(row.style.bottom).toBe("16px");
    expect(row.style.gap).toBe("8px");
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Confirm",
      "Reject",
    ]);
    expect(buttons[0].style.backgroundColor).toBe("rgb(108, 224, 209)");
    expect(buttons[1].style.backgroundColor).toBe("rgb(224, 108, 137)");
    expect(buttons[0].style.borderRadius).toBe("8px");
    expect(buttons[1].style.borderRadius).toBe("8px");
  });

  test("dispatches each supplied callback", () => {
    const onConfirm = jest.fn();
    const onReject = jest.fn();
    act(() => {
      root.render(
        <ActionButtons onConfirm={onConfirm} onReject={onReject} />,
      );
    });

    const confirm = container.querySelector(
      'button[aria-label="Confirm"]',
    ) as HTMLButtonElement;
    const reject = container.querySelector(
      'button[aria-label="Reject"]',
    ) as HTMLButtonElement;

    act(() => {
      confirm.click();
      reject.click();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
