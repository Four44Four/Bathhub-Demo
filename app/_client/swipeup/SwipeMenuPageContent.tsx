"use client";

import { AccountPage } from "./AccountPage";
import { BathroomPage } from "./BathroomPage";
import { LoginPage } from "./LoginPage";
import { MainMenuPage } from "./MainMenuPage";
import { useSwipeMenuPage } from "./SwipeMenuPageContext";

export function SwipeMenuPageContent() {
  const { pageId } = useSwipeMenuPage();

  switch (pageId) {
    case "mainMenu":
      return <MainMenuPage />;
    case "bathroom":
      return <BathroomPage />;
    case "login":
      return <LoginPage />;
    case "account":
      return <AccountPage />;
    default: {
      const _exhaustive: never = pageId;
      return _exhaustive;
    }
  }
}
