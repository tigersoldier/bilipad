import { BaseControl, ContainerControl } from "./control";
import { GamepadButtonEvent } from "./gamepad";
import { EventType } from "./gamepad";
import { ButtonId } from "./gamepad";

const DOM_RECT_EPS = 10;

export class FlexContainer extends ContainerControl {
  protected currentIdx: number = -1;
  protected children: BaseControl[] = [];

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
  }

  protected addChild(child: BaseControl) {
    this.children.push(child);
  }

  override focus() {
    console.log("FlexContainer focus", this.currentIdx);
    if (this.currentIdx === -1) {
      this.children[0].focus();
      this.currentIdx = 0;
    } else if (this.currentIdx >= this.children.length) {
      this.children[this.children.length - 1].focus();
      this.currentIdx = this.children.length - 1;
    } else {
      this.children[this.currentIdx].focus();
    }
  }

  override innerDown(currentIdx: number): boolean {
    if (currentIdx >= this.children.length - 1) {
      return false;
    }
    let bestMatch = this.children[currentIdx + 1];
    let bestMatchIdx = currentIdx + 1;
    const currentRect =
      this.children[currentIdx].element.getBoundingClientRect();
    for (let i = currentIdx + 2; i < this.children.length; i++) {
      const child = this.children[i];
      const rect = child.element.getBoundingClientRect();
      if (rect.top > currentRect.top + currentRect.height - DOM_RECT_EPS) {
        bestMatch = child;
        bestMatchIdx = i;
        if (
          rect.left < currentRect.left + currentRect.width - DOM_RECT_EPS &&
          rect.left + rect.width > currentRect.left + DOM_RECT_EPS
        ) {
          // We found an element that is below the current element and overlaps with the current element
          // column-wise. This is the best match.
          break;
        }
      }
    }
    bestMatch.focus();
    this.currentIdx = bestMatchIdx;
    return true;
  }

  override innerRight(currentIdx: number): boolean {
    if (currentIdx >= this.children.length - 1) {
      return false;
    }
    this.children[currentIdx + 1].focus();
    this.currentIdx = currentIdx + 1;
    return true;
  }

  override innerLeft(currentIdx: number): boolean {
    if (currentIdx <= 0) {
      return false;
    }
    this.children[currentIdx - 1].focus();
    this.currentIdx = currentIdx - 1;
    return true;
  }

  override innerUp(currentIdx: number): boolean {
    if (currentIdx <= 0) {
      return false;
    }
    let bestMatch = this.children[currentIdx - 1];
    let bestMatchIdx = currentIdx - 1;
    const currentRect =
      this.children[currentIdx].element.getBoundingClientRect();
    for (let i = currentIdx - 2; i >= 0; i--) {
      const child = this.children[i];
      const rect = child.element.getBoundingClientRect();
      if (rect.top + rect.height < currentRect.top + DOM_RECT_EPS) {
        bestMatch = child;
        bestMatchIdx = i;
        if (
          rect.left < currentRect.left + currentRect.width - DOM_RECT_EPS &&
          rect.left + rect.width > currentRect.left + DOM_RECT_EPS
        ) {
          // We found an element that is above the current element and overlaps with the current element
          // column-wise. This is the best match.
          break;
        }
      }
    }
    bestMatch.focus();
    this.currentIdx = bestMatchIdx;
    return true;
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.DPAD_DOWN:
        case ButtonId.DPAD_RIGHT:
          if (this.currentIdx === -1) {
            // If we reach here, none of the children have focus.
            // For DPAD_DOWN and DPAD_RIGHT, we should focus on the first child.
            this.focus();
            return true;
          }
          return this.innerDown(this.currentIdx);
      }
    }
    return super.onGamepadButtonEvent(event);
  }
}
