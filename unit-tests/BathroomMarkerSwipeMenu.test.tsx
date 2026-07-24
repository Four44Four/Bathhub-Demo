/**
 * @jest-environment jsdom
 */
import { act, useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import {
  SwipeMenuExpansionProvider,
  useRegisterSwipeMenuExpandHandler,
} from "../app/_client/swipeup/SwipeMenuExpansion";
import {
  SwipeMenuPageProvider,
  useSwipeMenuPage,
} from "../app/_client/swipeup/SwipeMenuPageContext";

function ExpandCapture({
  onExpand,
}: {
  onExpand: (pageId: string | undefined) => void;
}) {
  const register = useRegisterSwipeMenuExpandHandler();
  const { navigateToPage } = useSwipeMenuPage();

  useEffect(
    () =>
      register((request) => {
        if (request.pageId) {
          navigateToPage(request.pageId);
        }
        onExpand(request.pageId);
      }),
    [navigateToPage, onExpand, register],
  );

  return null;
}

/** Mirrors HomeContent: reads expandToPage from context and exposes a marker callback. */
function BathroomMarkerClickBridge({
  onReady,
}: {
  onReady: (onBathroomMarkerClick: () => void) => void;
}) {
  const { expandToPage, pageId } = useSwipeMenuPage();
  const expandToPageRef = useRef(expandToPage);

  useEffect(() => {
    expandToPageRef.current = expandToPage;
  }, [expandToPage]);

  useEffect(() => {
    onReady(() => {
      expandToPageRef.current("bathroom");
    });
  }, [onReady]);

  return <div data-testid="swipe-menu-page-id">{pageId}</div>;
}

describe("bathroom marker swipe menu integration", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
      true;
  });

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test("marker callback expandToPage opens bathroom page and expands swipe menu", () => {
    const expandRequests: Array<string | undefined> = [];
    let onBathroomMarkerClick: (() => void) | null = null;

    act(() => {
      root.render(
        <SwipeMenuExpansionProvider>
          <SwipeMenuPageProvider>
            <ExpandCapture
              onExpand={(pageId) => {
                expandRequests.push(pageId);
              }}
            />
            <BathroomMarkerClickBridge
              onReady={(callback) => {
                onBathroomMarkerClick = callback;
              }}
            />
          </SwipeMenuPageProvider>
        </SwipeMenuExpansionProvider>,
      );
    });

    expect(onBathroomMarkerClick).not.toBeNull();

    act(() => {
      onBathroomMarkerClick?.();
    });

    expect(expandRequests).toEqual(["bathroom"]);
    expect(
      container.querySelector('[data-testid="swipe-menu-page-id"]')?.textContent,
    ).toBe("bathroom");
  });

  test("useSwipeMenuPage throws when rendered outside SwipeMenuPageProvider", () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      act(() => {
        root.render(<BathroomMarkerClickBridge onReady={() => {}} />);
      });
    }).toThrow("useSwipeMenuPage must be used within SwipeMenuPageProvider");

    consoleError.mockRestore();
  });
});
