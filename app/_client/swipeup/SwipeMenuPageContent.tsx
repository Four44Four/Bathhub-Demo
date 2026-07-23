"use client";

import { MainMenuPage } from "./MainMenuPage";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";
import { TestingBathroomPage } from "./TestingBathroomPage";

export function SwipeMenuPageContent() {
  const { pageId } = useSwipeMenuPage();

  switch (pageId) {
    case "mainMenu":
      return <MainMenuPage />;
    case "testingBathroom":
      return <TestingBathroomPage />;
    default: {
      const _exhaustive: never = pageId;
      return _exhaustive;
    }
  }
}
