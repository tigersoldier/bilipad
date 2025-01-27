import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class BaseControl<P extends BaseControl<any> | null> {
    constructor(readonly element: HTMLElement, readonly parent: P) {
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

    onActionButtonPressed(event: GamepadButtonEvent): boolean {
        return false;
    }
}

// For mixin typing. See https://www.typescriptlang.org/docs/handbook/mixins.html
type Constructor<T> = new (...args: any[]) => T;

/**
 * A mixin to add container child control functionality to a class.
 */
export function ContainerChildControl<TBase extends Constructor<BaseControl<any>>>(Base: TBase) {
    return class extends Base {
        index: number = 0;

        down() {
            return this.parent.innerDown(this.index);
        }

        up() {
            return this.parent.innerUp(this.index);
        }

        left() {
            return this.parent.innerLeft(this.index);
        }

        right() {
            return this.parent.innerRight(this.index);
        }

        override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
            if (event.eventType === EventType.PRESSED || event.eventType === EventType.REPEAT) {
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
    }
}

export class ContainerControl<P extends BaseControl<any> | null> extends BaseControl<P> {
    /**
     * @returns if the button is handled
     */
    innerDown(currentIdx: number): boolean {
        return false;
    }

    /**
     * @returns if the button is handled
     */
    innerUp(currentIdx: number): boolean {
        return false;
    }

    /**
     * @returns if the button is handled
     */
    innerLeft(currentIdx: number): boolean {
        return false;
    }

    /**
     * @returns if the button is handled
     */
    innerRight(currentIdx: number): boolean {
        return false;
    }
}


export function attachControl(element: Element, control: BaseControl<any>) {
    (element as any).biliCtrl = control;
}

export function getControl(element: Element): BaseControl<any> | undefined {
    return (element as any).biliCtrl;
}

export function getOrObserveElement(root: Element, selectors: string[], callback: (element: HTMLElement) => void) {
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
    }
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
