import { BaseControl } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class HeaderControl extends BaseControl<null> {
    favMenu: HeaderEntry | null = null;

    constructor(element: HTMLElement) {
        super(element, null);
        const rightEntry = document.querySelector(".right-entry");
        if (rightEntry) {
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
                if (anchor.href.includes("t.bilibili.com")) {
                    console.log("Found fav menu", child);
                    this.favMenu = new HeaderEntry(childElement, anchor.href, this);
                }
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
                    return this.favMenu.onActionButtonPressed(event);
                }
                break;
        }
        return false;
    }
}

class HeaderEntry extends BaseControl<HeaderControl> {
    constructor(element: HTMLElement, readonly url: string, parent: HeaderControl) {
        super(element, parent);
    }

    override onActionButtonPressed(event: GamepadButtonEvent): boolean {
        window.location.href = this.url;
        return true;
    }
}
