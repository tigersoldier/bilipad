import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class BaseControl<P extends BaseControl<any> | null> {
    constructor(readonly element: HTMLElement, readonly parent: P) {
        attachControl(element, this);
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