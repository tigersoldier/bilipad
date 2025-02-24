import {
  ButtonId,
  EventType,
  GamepadButtonEvent,
  GamepadJoystickEvent,
  Joystick,
  JoystickDirection,
} from "./gamepad";

export class BaseControl {
  constructor(
    readonly element: HTMLElement,
    readonly parent: BaseControl | null,
  ) {
    attachControl(element, this);
  }

  focus() {
    this.element.focus();
  }

  onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.A:
          return this.onActionButtonPressed(event);
      }
    }
    return false;
  }

  onGamepadJoystickEvent(event: GamepadJoystickEvent): boolean {
    // By default, treat the left joystick as D-pad.
    if (event.joystick !== Joystick.LEFT) {
      return false;
    }
    let dpadButton: ButtonId | null = null;
    const button: GamepadButton = {
      pressed: true,
      value: 1,
      touched: false,
    };
    let eventType: EventType | null = null;
    switch (event.dominantDirection) {
      case JoystickDirection.NONE:
        return false;
      case JoystickDirection.UP:
        dpadButton = ButtonId.DPAD_UP;
        eventType = event.upEventType;
        break;
      case JoystickDirection.DOWN:
        dpadButton = ButtonId.DPAD_DOWN;
        eventType = event.downEventType;
        break;
      case JoystickDirection.LEFT:
        dpadButton = ButtonId.DPAD_LEFT;
        eventType = event.leftEventType;
        break;
      case JoystickDirection.RIGHT:
        dpadButton = ButtonId.DPAD_RIGHT;
        eventType = event.rightEventType;
        break;
    }
    if (eventType === EventType.HOLD) {
      // Do nothing for hold event.
    } else {
      const buttonEvent = new GamepadButtonEvent(
        event.gamepad,
        button,
        dpadButton,
        eventType,
      );
      console.log("Firing button event for Joystick event", buttonEvent, event);
      return this.onGamepadButtonEvent(buttonEvent);
    }
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onActionButtonPressed(event: GamepadButtonEvent): boolean {
    return false;
  }

  destroy() {
    attachControl(this.element, undefined);
  }
}

// For mixin typing. See https://www.typescriptlang.org/docs/handbook/mixins.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T> = new (...args: any[]) => T;

export class BaseContainerChildControl extends BaseControl {
  constructor(element: HTMLElement, parent: ContainerControl) {
    super(element, parent);
  }

  protected getContainer(): ContainerControl {
    return this.parent as ContainerControl;
  }
}

/**
 * A mixin to add container child control functionality to a class.
 */
export function ContainerChildControl<
  TBase extends Constructor<BaseContainerChildControl>,
>(Base: TBase) {
  return class extends Base {
    index: number = 0;

    down() {
      return this.getContainer().innerDown(this.index);
    }

    up() {
      return this.getContainer().innerUp(this.index);
    }

    left() {
      return this.getContainer().innerLeft(this.index);
    }

    right() {
      return this.getContainer().innerRight(this.index);
    }

    override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
      if (
        event.eventType === EventType.PRESSED ||
        event.eventType === EventType.REPEAT
      ) {
        switch (event.buttonId) {
          case ButtonId.DPAD_DOWN:
            return this.down();
          case ButtonId.DPAD_UP:
            return this.up();
          case ButtonId.DPAD_LEFT:
            return this.left();
          case ButtonId.DPAD_RIGHT:
            return this.right();
        }
      }
      return super.onGamepadButtonEvent(event);
    }
  };
}

export class ContainerControl extends BaseControl {
  /**
   * @returns if the button is handled
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  innerDown(currentIdx: number): boolean {
    return false;
  }

  /**
   * @returns if the button is handled
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  innerUp(currentIdx: number): boolean {
    return false;
  }

  /**
   * @returns if the button is handled
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  innerLeft(currentIdx: number): boolean {
    return false;
  }

  /**
   * @returns if the button is handled
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  innerRight(currentIdx: number): boolean {
    return false;
  }
}

export function attachControl(element: Element, control?: BaseControl) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (element as any).biliCtrl = control;
}

export function getControl(element: Element): BaseControl | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (element as any).biliCtrl;
}

export function getOrObserveElement(
  root: Element,
  selectors: string[],
  callback: (element: HTMLElement) => void,
) {
  if (selectors.length === 0) {
    console.error("No selectors provided on element", root);
    return;
  }
  const selector = selectors[0];
  const element = root.querySelector(selector);
  const onElementFound = (element: Element) => {
    const isLast = selectors.length === 1;
    if (isLast) {
      callback(element as HTMLElement);
    } else {
      getOrObserveElement(element, selectors.slice(1), callback);
    }
  };
  if (element) {
    console.log("Found element directly", root, selector, element);
    onElementFound(element);
    return;
  }
  console.log("Observing element", root, selector);
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }
        const element = node as Element;
        let foundElement: Element | null = null;
        if (element.matches(selector)) {
          foundElement = element;
        } else {
          foundElement = element.querySelector(selector);
        }
        if (foundElement) {
          console.log("Found element", root, selector, foundElement);
          onElementFound(foundElement);
          observer.disconnect();
          return;
        }
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
}
