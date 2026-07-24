"use client";

import { MainMenuPage } from "./MainMenuPage";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";
import { BathroomPage } from "./BathroomPage";

export function SwipeMenuPageContent() {
  const { pageId } = useSwipeMenuPage();

  switch (pageId) {
    case "mainMenu":
      return <MainMenuPage />;
    case "bathroom":
      return <BathroomPage />;
    default: {
      const _exhaustive: never = pageId;
      return _exhaustive;
    }
  }
}
