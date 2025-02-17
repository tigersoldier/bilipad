import { BaseControl } from "./control";
import { GamepadButtonEvent } from "./gamepad";
import { DynamicList } from "./list";

export class DynPage extends BaseControl {
  dynamicList?: DynamicList;
  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("bili-dyn-home--member")
          ) {
            const dynamicList = node.querySelector(".bili-dyn-list__items   ");
            console.log("dynamicList", dynamicList);
            this.dynamicList = new DynamicList(
              dynamicList as HTMLElement,
              this,
            );
            observer.disconnect();
            return;
          }
        }
      }
    });
    observer.observe(element, { childList: true });
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (this.dynamicList) {
      return this.dynamicList.onGamepadButtonEvent(event);
    }
    return false;
  }
}
