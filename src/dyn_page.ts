import { BaseControl, getOrObserveElement } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";
import { DynamicList } from "./list";

export class DynPage extends BaseControl {
  private dynamicList?: DynamicList;
  private dynamicUpList?: DynamicUpList;

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
    this.updateDynamicList();
    this.updateDynamicUpList();

    // Listen to the dynamic list recreation due to changing active uploader.
    getOrObserveElement(
      this.element,
      [".bili-dyn-home--member", ".bili-dyn-list"],
      (element) => {
        const observer = new MutationObserver(() => {
          this.updateDynamicList();
        });
        observer.observe(element.parentElement!, {
          childList: true,
          subtree: true,
        });
      },
    );
  }

  private updateDynamicList() {
    this.dynamicList?.destroy();
    getOrObserveElement(
      this.element,
      [".bili-dyn-home--member", ".bili-dyn-list__items"],
      (element) => {
        console.log("dynamicList items container", element);
        this.dynamicList = new DynamicList(element, this);
      },
    );
  }

  private updateDynamicUpList() {
    getOrObserveElement(this.element, [".bili-dyn-up-list"], (element) => {
      console.log("dynamicUpList", element);
      this.dynamicUpList = new DynamicUpList(element, this);
    });
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.LB:
          this.dynamicUpList?.prev();
          break;
        case ButtonId.RB:
          this.dynamicUpList?.next();
          break;
      }
    }
    if (this.dynamicList) {
      return this.dynamicList.onGamepadButtonEvent(event);
    }
    return false;
  }
}

class DynamicUpList extends BaseControl {
  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);

    element.classList.add("bilipad-button-lbrb");
  }

  prev() {
    const activeItem = this.getActiveItem();
    const prevItem = activeItem?.previousElementSibling;
    if (prevItem) {
      const prevItemElement = prevItem as HTMLElement;
      prevItemElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      prevItemElement.click();
    }
  }

  next() {
    const activeItem = this.getActiveItem();
    const nextItem = activeItem?.nextElementSibling;
    if (nextItem) {
      const nextItemElement = nextItem as HTMLElement;
      nextItemElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
      nextItemElement.click();
    }
  }

  private getActiveItem() {
    const activeItem = this.element.querySelector(
      ".bili-dyn-up-list__item.active",
    );
    return activeItem;
  }
}
