import { BaseControl, getControl } from "./control";
import { ButtonId, EventType, GamepadButtonEvent, GamepadManager } from "./gamepad";
import { HeaderControl } from "./header";
import { FeedCardList } from "./feed";
import { PlayerControl } from "./player";

class RootPage extends BaseControl<null> {
    headerControl: HeaderControl | null;
    feedCardList: FeedCardList | null;
    playerControl: PlayerControl | null;

    constructor() {
        super(document.body, null);
        this.headerControl = null;
        this.feedCardList = null;
        this.playerControl = null;
        const headerElement = /** @type {HTMLElement} */ (document.querySelector(".bili-header"));
        if (headerElement) {
            this.headerControl = new HeaderControl(headerElement as HTMLElement);
        }

        this.updateFeedCardList();
        this.updatePlayerControl();
    }

    updateFeedCardList() {
        const feedCardList = document.querySelector(".feed2");
        if (feedCardList) {
            this.feedCardList = new FeedCardList(feedCardList as HTMLElement);
        }
    }

    updatePlayerControl() {
        const playerElement = document.querySelector("#bilibili-player");
        if (playerElement) {
            this.playerControl = new PlayerControl(playerElement as HTMLElement);
        }
    }

    override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
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
        this.gamepadManager.addEventListener((event: GamepadButtonEvent) => this.onGamepadButtonEvent(event));
    }

    onGamepadButtonEvent(event: GamepadButtonEvent) {
        console.log("Gamepad button event:", event);
        if (event.buttonId === ButtonId.LT) {
            if (event.eventType === EventType.PRESSED) {
                this.ltPressed = true;
            } else if (event.eventType === EventType.RELEASED) {
                this.ltPressed = false;
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
                return;
            }
            control = control.parent;
        }
    }

    /**
     * @returns {BaseControl | null}
     */
    getFocusedControl() {
        const focusedElement = document.activeElement;
        console.log("Focused HTLM element:", focusedElement);
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
