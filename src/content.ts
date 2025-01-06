// @ts-check

import { ButtonId, EventType, GamepadButtonEvent, GamepadManager } from "./gamepad";

const DOM_RECT_EPS = 1e-2;

class BaseControl<P extends BaseControl<any> | null> {
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

class HeaderControl extends BaseControl<null> {
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

// For mixin typing. See https://www.typescriptlang.org/docs/handbook/mixins.html
type Constructor<T> = new (...args: any[]) => T;

class ContainerControl<P extends BaseControl<any> | null> extends BaseControl<P> {
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

class FeedCardList extends ContainerControl<null> {
    readonly feedCards: FeedCard[];

    constructor(element: HTMLElement) {
        super(element, null);
        const feedCards = document.querySelectorAll(".container > div");
        this.feedCards = [];
        for (let i = 0; i < feedCards.length; i++) {
            this.feedCards.push(new FeedCard(feedCards[i] as HTMLElement, this, i));
        }
    }

    focus() {
        this.feedCards[0].focus();
    }

    override innerDown(currentIdx: number): boolean {
        if (currentIdx >= this.feedCards.length - 1) {
            return false;
        }
        let bestMatch = this.feedCards[currentIdx + 1];
        const currentRect = this.feedCards[currentIdx].element.getBoundingClientRect();
        for (let i = currentIdx + 2; i < this.feedCards.length; i++) {
            const feedCard = this.feedCards[i];
            const rect = feedCard.element.getBoundingClientRect();
            if (rect.top > currentRect.top + currentRect.height - DOM_RECT_EPS) {
                bestMatch = feedCard;
                if (rect.left < currentRect.left + currentRect.width + DOM_RECT_EPS && rect.left + rect.width > currentRect.left - DOM_RECT_EPS) {
                    // We found an element that is below the current element and overlaps with the current element
                    // column-wise. This is the best match.
                    feedCard.focus();
                    return true;
                }
            }
        }
        bestMatch.focus();
        return true;
    }

    override innerRight(currentIdx: number): boolean {
        if (currentIdx >= this.feedCards.length - 1) {
            return false;
        }
        this.feedCards[currentIdx + 1].focus();
        return true;
    }

    override innerLeft(currentIdx: number): boolean {
        if (currentIdx <= 0) {
            return false;
        }
        this.feedCards[currentIdx - 1].focus();
        return true;
    }

    override innerUp(currentIdx: number): boolean {
        if (currentIdx <= 0) {
            return false;
        }
        let bestMatch = this.feedCards[currentIdx - 1];
        const currentRect = this.feedCards[currentIdx].element.getBoundingClientRect();
        for (let i = currentIdx - 2; i >= 0; i--) {
            const feedCard = this.feedCards[i];
            const rect = feedCard.element.getBoundingClientRect();
            if (rect.top + rect.height < currentRect.top + DOM_RECT_EPS) {
                bestMatch = feedCard;
                if (rect.left < currentRect.left + currentRect.width + DOM_RECT_EPS && rect.left + rect.width > currentRect.left - DOM_RECT_EPS) {
                    // We found an element that is above the current element and overlaps with the current element
                    // column-wise. This is the best match.
                    feedCard.focus();
                    return true;
                }
            }
        }
        bestMatch.focus();
        return true;
    }
}

/**
 * A mixin to add container child control functionality to a class.
 */
function ContainerChildControl<TBase extends Constructor<BaseControl<any>>>(Base: TBase) {
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

class FeedCard extends ContainerChildControl(BaseControl<any>) {
    readonly url: string | null;
    constructor(element: HTMLElement, parent: FeedCardList, index: number) {
        super(element, parent);
        this.element.setAttribute("tabindex", "-1");
        this.index = index;
        this.url = null;
        const anchor = element.querySelector("a");
        if (anchor) {
            this.url = anchor.href;
        }
    }

    focus() {
        console.log("Focusing feed card");
        this.element.focus();
    }

    override onActionButtonPressed(event: GamepadButtonEvent): boolean {
        if (this.url) {
            window.location.href = this.url;
            return true;
        }
        return false;
    }
}

class PlayerControl extends BaseControl<null> {
    readonly playButton: HTMLButtonElement | null = null;
    readonly fullScreenButton: HTMLButtonElement | null = null;

    constructor(element: HTMLElement) {
        super(element, null);
        const playButton = element.querySelector(".bpx-player-ctrl-play");
        if (!playButton) {
            console.log("No play button found");
            return;
        }
        const fullScreenButton = element.querySelector(".bpx-player-ctrl-full");
        if (!fullScreenButton) {
            console.log("No full screen button found");
            return;
        }
        this.playButton = playButton as HTMLButtonElement;
        this.fullScreenButton = fullScreenButton as HTMLButtonElement;
    }

    override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
        if (event.eventType !== EventType.PRESSED) {
            return false;
        }
        switch (event.buttonId) {
            case ButtonId.A:
                this.playButton?.click();
                return true;
            case ButtonId.X:
                this.fullScreenButton?.click();
                return true;
        }
        return false;
    }
}

class RootPage extends BaseControl<null> {
    headerControl: HeaderControl | null;
    feedCardList: FeedCardList | null;
    playerControl: PlayerControl | null;
    readonly observer: MutationObserver | null;

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

        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    onMutation(mutations: MutationRecord[]) {
        console.log("Mutation:", mutations);
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

class Bibibili {
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

let bibibili: Bibibili;

// Create on document ready
document.addEventListener("DOMContentLoaded", () => {
    bibibili = new Bibibili();
});

function attachControl(element: Element, control: BaseControl<any>) {
    (element as any).biliCtrl = control;
}

function getControl(element: Element): BaseControl<any> | undefined {
    return (element as any).biliCtrl;
}
