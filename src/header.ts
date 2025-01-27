import { BaseControl, getOrObserveElement } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class HeaderControl extends BaseControl<null> {
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
                    this.favMenu = new HeaderEntry(childElement, this, anchor.href, "images/gamepad_button_a.svg");
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

    setShowGamepadButtons(show: boolean) {
        this.element.classList.toggle("bilipad-show-gamepad-buttons", show);
    }
}

class HeaderEntry extends BaseControl<HeaderControl> {
    constructor(element: HTMLElement, parent: HeaderControl, readonly url: string, buttonImagePath: string) {
        super(element, parent);
        const button = document.createElement("img");
        const buttonImageUrl = chrome.runtime.getURL(buttonImagePath);
        console.log("buttonImageUrl", buttonImageUrl);
        button.src = buttonImageUrl;
        button.classList.add("bilipad-gamepad-button");
        button.classList.add("bilipad-gamepad-button-a");
        element.appendChild(button);
    }

    override onActionButtonPressed(event: GamepadButtonEvent): boolean {
        window.location.href = this.url;
        return true;
    }
}
