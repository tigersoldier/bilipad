import { BaseControl, getControl } from "./control";
import {
  ButtonId,
  EventType,
  GamepadButtonEvent,
  GamepadJoystickEvent,
  GamepadManager,
} from "./gamepad";
import { HeaderControl } from "./header";
import { FeedCardList } from "./feed";
import { PlayerControl } from "./player";
import { DynPage } from "./dyn_page";
import { getOrObserveElement } from "./control";
import { SearchPanel } from "./search";

class RootPage extends BaseControl {
  headerControl: HeaderControl | null;
  feedCardList: FeedCardList | null;
  playerControl: PlayerControl | null;
  dynamicPage: DynPage | null;
  searchPanel: SearchPanel | null;

  constructor() {
    super(document.body, null);
    this.headerControl = null;
    this.feedCardList = null;
    this.playerControl = null;
    this.dynamicPage = null;
    this.searchPanel = null;
    getOrObserveElement(document.body, [".bili-header"], (element) => {
      this.headerControl = new HeaderControl(element as HTMLElement);
    });

    this.updateFeedCardList();
    this.updatePlayerControl();
    this.updateDynamicPage();
    this.updateSearchPanel();
  }

  updateFeedCardList() {
    const feedCardList = document.querySelector(".feed2");
    if (feedCardList) {
      this.feedCardList = new FeedCardList(feedCardList as HTMLElement, this);
    }
  }

  updatePlayerControl() {
    const playerElement = document.querySelector("#bilibili-player");
    if (playerElement) {
      this.playerControl = new PlayerControl(
        playerElement as HTMLElement,
        this,
      );
    }
  }

  updateDynamicPage() {
    if (window.location.hostname === "t.bilibili.com") {
      const app = document.querySelector("#app");
      this.dynamicPage = new DynPage(app as HTMLElement, this);
    }
  }

  updateSearchPanel() {
    getOrObserveElement(
      document.body,
      [".center-search-container"],
      (element) => {
        console.log("Search panel found", element);
        this.searchPanel = new SearchPanel(element as HTMLElement, this);
      },
    );
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (this.dynamicPage) {
      return this.dynamicPage.onGamepadButtonEvent(event);
    }
    if (event.eventType !== EventType.PRESSED) {
      return false;
    }
    switch (event.buttonId) {
      case ButtonId.DPAD_DOWN:
        if (this.feedCardList) {
          this.feedCardList.focus();
          return true;
        }
        break;
      case ButtonId.B:
        window.history.back();
        return true;
      case ButtonId.START:
        if (this.searchPanel) {
          this.searchPanel.focus();
          return true;
        }
        break;
    }
    if (this.playerControl) {
      return this.playerControl.onGamepadButtonEvent(event);
    }
    return false;
  }
}

export class Bibibili {
  readonly gamepadManager = new GamepadManager();
  readonly rootPage = new RootPage();
  ltPressed = false;

  constructor() {
    this.gamepadManager.addButtonEventListener((event: GamepadButtonEvent) =>
      this.onGamepadButtonEvent(event),
    );
    this.gamepadManager.addJoystickEventListener(
      (event: GamepadJoystickEvent) => this.onGamepadJoystickEvent(event),
    );
  }

  onGamepadButtonEvent(event: GamepadButtonEvent) {
    console.log("Gamepad button event:", event);
    if (event.buttonId === ButtonId.LT) {
      if (event.eventType === EventType.PRESSED) {
        this.ltPressed = true;
        if (this.rootPage.headerControl) {
          this.rootPage.headerControl.setShowGamepadButtons(true);
        }
      } else if (event.eventType === EventType.RELEASED) {
        this.ltPressed = false;
        if (this.rootPage.headerControl) {
          this.rootPage.headerControl.setShowGamepadButtons(false);
        }
      }
      return;
    }

    // Get the control to handle the event
    let control = this.getFocusedControl();
    if (!control) {
      control = this.rootPage;
    }
    if (!control) {
      console.log("No control found");
      return;
    }
    console.log("Control:", control);
    while (control) {
      if (control.onGamepadButtonEvent(event)) {
        console.log("Control handled the event", control, event);
        return;
      }
      control = control.parent;
    }
    console.log("No control handled the event", event);
  }

  onGamepadJoystickEvent(event: GamepadJoystickEvent) {
    let control = this.getFocusedControl();
    if (!control) {
      control = this.rootPage;
    }
    if (!control) {
      return;
    }
    while (control) {
      if (control.onGamepadJoystickEvent(event)) {
        return;
      }
      control = control.parent;
    }
  }

  /**
   * @returns {BaseControl | null}
   */
  getFocusedControl() {
    if (this.ltPressed) {
      return this.rootPage.headerControl;
    }
    const focusedElement = document.activeElement;
    if (!focusedElement) {
      return null;
    }
    let control = getControl(focusedElement);
    let currentElement: Element | null = focusedElement;
    while (!control && !!currentElement) {
      currentElement = currentElement.parentElement;
      if (currentElement) {
        control = getControl(currentElement);
      }
    }
    return control;
  }

  getHeaderControl() {
    return document.querySelector(".header");
  }
}
