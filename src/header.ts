import { BaseControl, getOrObserveElement } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class HeaderControl extends BaseControl {
  favMenu: HeaderEntry | null = null;

  constructor(element: HTMLElement) {
    super(element, null);
    getOrObserveElement(element, [".right-entry"], (element) => {
      this.handleRightEntry(element as HTMLElement);
    });
  }

  private handleRightEntry(rightEntry: HTMLElement) {
    // Iterate over the child elements of the right entry
    for (let i = 0; i < rightEntry.childNodes.length; i++) {
      const child = rightEntry.childNodes[i];
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const childElement = child as HTMLElement;
      // Check the href attribute of the child anchor element
      const anchor = childElement.querySelector("a");
      if (!anchor) {
        console.log("No anchor found for right entry child", child);
        continue;
      }
      if (anchor.hostname === "t.bilibili.com") {
        console.log("Found fav menu", child);
        this.favMenu = new HeaderEntry(childElement, this, anchor.href);
      }
    }
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent) {
    if (event.eventType !== EventType.PRESSED) {
      return false;
    }
    switch (event.buttonId) {
      case ButtonId.A:
        if (this.favMenu) {
          return this.favMenu.onActionButtonPressed();
        }
        break;
    }
    return false;
  }

  setShowGamepadButtons(show: boolean) {
    this.element.classList.toggle("bilipad-buttons-visible", show);
  }
}

class HeaderEntry extends BaseControl {
  constructor(
    element: HTMLElement,
    parent: HeaderControl,
    readonly url: string,
  ) {
    super(element, parent);
    element.classList.add("bilipad-button-after");
    element.classList.add("bilipad-button-a");
    element.classList.add("bilipad-button-hidden");
  }

  override onActionButtonPressed(): boolean {
    window.location.href = this.url;
    return true;
  }
}
