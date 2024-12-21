// @ts-check
// https://w3c.github.io/gamepad/#remapping
/** @enum {number} */
const ButtonId = {
    A: 0,
    B: 1,
    X: 2,
    Y: 3,
    LB: 4,
    RB: 5,
    LT: 6,
    RT: 7,
    SELECT: 8,
    START: 9,
    L3: 10,
    R3: 11,
    DPAD_UP: 12,
    DPAD_DOWN: 13,
    DPAD_LEFT: 14,
    DPAD_RIGHT: 15,
    POWER: 16,
};

const DOM_RECT_EPS = 1e-2;

const ButtonName = {
    [ButtonId.A]: 'a',
    [ButtonId.B]: 'b',
    [ButtonId.X]: 'x',
    [ButtonId.Y]: 'y',
    [ButtonId.LB]: 'lb',
    [ButtonId.RB]: 'rb',
    [ButtonId.LT]: 'lt',
    [ButtonId.RT]: 'rt',
    [ButtonId.SELECT]: 'select',
    [ButtonId.START]: 'start',
    [ButtonId.L3]: 'l3',
    [ButtonId.R3]: 'r3',
    [ButtonId.DPAD_UP]: 'dpad_up',
    [ButtonId.DPAD_DOWN]: 'dpad_down',
    [ButtonId.DPAD_LEFT]: 'dpad_left',
    [ButtonId.DPAD_RIGHT]: 'dpad_right',
    [ButtonId.POWER]: 'power',
}

const INITIAL_REPEAT_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 100;

/**
 * @enum {number}
 */
const EventType = {
    PRESSED: 0,
    RELEASED: 1,
    REPEAT: 2,
}

class ButtonState {
    /**
     * @param {GamepadButton} button
     */
    constructor(button) {
        this.pressed = button.pressed;
        this.updateTimeMs = Date.now();
        this.nextRepeatTimeMs = 0;
    }

    /**
     * @param {GamepadButton} button
     *
     * @returns {EventType | null} the type of the event if not null
     */
    updateState(button) {
        if (!this.pressed) {
            if (!button.pressed) {
                return null;
            }
            this.pressed = true;
            this.updateTimeMs = Date.now();
            this.nextRepeatTimeMs = Date.now() + INITIAL_REPEAT_DELAY_MS;
            return EventType.PRESSED;
        }
        // Button was pressed
        if (!button.pressed) {
            this.pressed = false;
            this.updateTimeMs = Date.now();
            return EventType.RELEASED;
        }
        // Button is held. Check if we need to repeat.
        if (this.nextRepeatTimeMs && Date.now() >= this.nextRepeatTimeMs) {
            this.nextRepeatTimeMs = Date.now() + REPEAT_INTERVAL_MS;
            return EventType.REPEAT;
        }
        return null;
    }
}

class Listener {
    /**
     * @param {(gamepadButtonEvent: GamepadButtonEvent) => void} func
     */
    constructor(func) {
        this.func = func;
    }

    emit(gamepadButtonEvent) {
        this.func(gamepadButtonEvent);
    }
}

class GamepadButtonEvent {
    /**
     * @param {Gamepad} gamepad
     * @param {GamepadButton} button
     * @param {ButtonId} buttonId
     * @param {EventType} eventType
     */
    constructor(gamepad, button, buttonId, eventType) {
        /** @type {Gamepad} */
        this.gamepad = gamepad;
        /** @type {GamepadButton} */
        this.button = button;
        /** @type {ButtonId} */
        this.buttonId = buttonId;
        /** @type {EventType} */
        this.eventType = eventType;
    }
}

class GamepadManager {
    constructor() {
        this.gamepadHandle = null;

        window.addEventListener("gamepadconnected", this.onGamepadConnected.bind(this));
        window.addEventListener("gamepaddisconnected", this.onGamepadDisconnected.bind(this));
        this.maybeStartGamepadLoop();
        /** @type {Record<string, ButtonState[]>} */
        this.buttonStates = {};
        /** @type {Listener[]} */
        this.eventListeners = [];
        // Listen to the page inactive event
        document.addEventListener("visibilitychange", this.onVisibilityChange.bind(this));
        // Listen to window focus/blur events
        window.addEventListener("focus", () => {
            console.log("Window focused");
        });
        window.addEventListener("blur", () => {
            console.log("Window blurred");
            this.onPageDeactivated();
        });
    }

    /**
     * @returns {boolean} if the gamepad loop was started
     */
    maybeStartGamepadLoop() {
        if (this.gamepadHandle) {
            return false;
        }
        if (document.visibilityState === "hidden") {
            return false;
        }
        if (!document.hasFocus()) {
            console.log("Window not focused");
            return false;
        }
        if (navigator.getGamepads().some(gamepad => !!gamepad)) {
            this.gamepadHandle = setInterval(() => this.gamepadLoop(), 16);
            return true;
        }
        return false;
    }

    stopGamepadLoop() {
        if (this.gamepadHandle) {
            clearInterval(this.gamepadHandle);
            this.gamepadHandle = null;
        }
    }

    onPageActivated() {
        if (!this.maybeStartGamepadLoop()) {
            return;
        }
        // Send pressed events for any buttons that are currently pressed
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }
            this.sendPressedEvents(gamepad);
        }
    }

    onPageDeactivated() {
        this.stopGamepadLoop();
        // Send released events for any buttons that are currently pressed
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }
            this.sendReleasedEvents(gamepad);
        }
    }

    gamepadLoop() {
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }
            gamepad.buttons.forEach((button, index) => {
                const eventType = this.buttonStates[gamepad.index][index].updateState(button);
                if (eventType !== null) {
                    console.log("GamepadButton Event:", eventType);
                    this.emitButtonEvent(gamepad, button, index, eventType);
                }
            });
        }
    }

    /**
     * @param {Gamepad} gamepad
     * @param {GamepadButton} button
     * @param {ButtonId} buttonId
     * @param {EventType} eventType
     */
    emitButtonEvent(gamepad, button, buttonId, eventType) {
        const event = new GamepadButtonEvent(gamepad, button, buttonId, eventType);
        this.eventListeners.forEach(listener => listener.emit(event));
    }

    onVisibilityChange() {
        console.log("Visibility change:", document.visibilityState);
        if (document.visibilityState === "hidden") {
            this.onPageDeactivated();
        } else {
            this.onPageActivated();
        }
    }

    /**
     * @param {Gamepad} gamepad
     */
    sendPressedEvents(gamepad) {
        this.buttonStates[gamepad.index].forEach((buttonState, index) => {
            if (buttonState.pressed) {
                this.emitButtonEvent(gamepad, { pressed: true, touched: false, value: 1 }, index, EventType.PRESSED);
            }
        });
    }

    sendReleasedEvents(gamepad) {
        this.buttonStates[gamepad.index].forEach((buttonState, index) => {
            if (buttonState.pressed) {
                this.emitButtonEvent(gamepad, { pressed: false, touched: false, value: 0 }, index, EventType.RELEASED);
            }
        });
    }

    /**
     * @param {GamepadEvent} event
     */
    onGamepadConnected(event) {
        console.log("Gamepad connected:", event.gamepad);
        this.buttonStates[event.gamepad.index] = event.gamepad.buttons.map((button) => new ButtonState(button));
        this.sendPressedEvents(event.gamepad);
        console.log("Current gamepads:", navigator.getGamepads());
        this.maybeStartGamepadLoop();
    }

    /**
     * @param {GamepadEvent} event
     */
    onGamepadDisconnected(event) {
        console.log("Gamepad disconnected:", event.gamepad);
        console.log("Current gamepads:", navigator.getGamepads());
        this.sendReleasedEvents(event.gamepad);
        this.buttonStates[event.gamepad.index] = [];
        this.stopGamepadLoop();
    }

    /**
     * @param {(event: GamepadButtonEvent) => void} func
     * @returns {{ remove: () => void }}
     */
    addEventListener(func) {
        const listener = new Listener(func);
        this.eventListeners.push(listener);

        return ({
            remove: () => {
                const listeners = this.eventListeners;
                if (!listeners) {
                    return;
                }
                listeners.splice(listeners.indexOf(listener), 1);
            }
        })
    }
}

/**
 * @template {BaseControl | null} P
 */
class BaseControl {
    /**
     * @param {HTMLElement} element
     * @param {P} parent
     */
    constructor(element, parent) {
        /** @type {HTMLElement} */
        this.element = element;
        attachControl(element, this);
        /** @type {P} */
        this.parent = parent;
    }

    /**
     * @param {GamepadButtonEvent} event
     * @returns {boolean} if the button is handled
     */
    onGamepadButtonEvent(event) {
        if (event.eventType === EventType.PRESSED) {
            switch (event.buttonId) {
                case ButtonId.A:
                    return this.onActionButtonPressed(event);
            }
        }
        return false;
    }

    /**
     * @param {GamepadButtonEvent} event
     * @returns {boolean} if the button is handled
     */
    onActionButtonPressed(event) {
        return false;
    }
}

class Focusable {
    focus() { }
}

class Navigateable {
    down() { }
    up() { }
    left() { }
    right() { }
}

/**
 * @extends {BaseControl<null>}
 */
class HeaderControl extends BaseControl {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        super(element, null);
        const rightEntry = document.querySelector(".right-entry");
        if (rightEntry) {
            // Iterate over the child elements of the right entry
            for (let i = 0; i < rightEntry.childNodes.length; i++) {
                const child = rightEntry.childNodes[i];
                if (child.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }
                const childElement = /** @type {HTMLElement} */ (child);
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

    /**
     * @override
     * @param {GamepadButtonEvent} event
     */
    onGamepadButtonEvent(event) {
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

/**
 * @extends {BaseControl<HeaderControl>}
 */
class HeaderEntry extends BaseControl {
    /**
     * @param {HTMLElement} element
     * @param {string} url
     * @param {HeaderControl} parent
     */
    constructor(element, url, parent) {
        super(element, parent);
        this.url = url;
    }

    onActionButtonPressed(event) {
        window.location.href = this.url;
        return true;
    }
}

/**
 * @template {BaseControl | null} P
 * @extends {BaseControl<P>}
 */
class ContainerControl extends BaseControl {
    /**
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerDown(currentIdx) {
        return false;
    }

    /**
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerUp(currentIdx) {
        return false;
    }

    /**
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerLeft(currentIdx) {
        return false;
    }

    /**
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerRight(currentIdx) {
        return false;
    }
}

/**
 * @extends {ContainerControl<null>}
 */
class FeedCardList extends ContainerControl {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        super(element, null);
        /** @type {NodeListOf<HTMLElement>} */
        const feedCards = document.querySelectorAll(".container > div");
        /** @type {FeedCard[]} */
        this.feedCards = [];
        for (let i = 0; i < feedCards.length; i++) {
            this.feedCards.push(new FeedCard(feedCards[i], this, i));
        }
    }

    focus() {
        this.feedCards[0].focus();
    }

    /**
     * @override
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerDown(currentIdx) {
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

    /**
     * @override
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerRight(currentIdx) {
        if (currentIdx >= this.feedCards.length - 1) {
            return false;
        }
        this.feedCards[currentIdx + 1].focus();
        return true;
    }

    /**
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerLeft(currentIdx) {
        if (currentIdx <= 0) {
            return false;
        }
        this.feedCards[currentIdx - 1].focus();
        return true;
    }

    /**
     * @override
     * @param {number} currentIdx
     * @returns {boolean} if the button is handled
     */
    innerUp(currentIdx) {
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

/** @typedef {new (...args: any[]) => any} Constructor */

/**
 * @template {!Constructor} C
 * @param {C} superclass
 */
function ContainerChildControl(superclass) {
    return class extends superclass {
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

        onGamepadButtonEvent(event) {
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

/**
 * @template ContainerChildControl, BaseControl<FeedCardList>
 */
class FeedCard extends ContainerChildControl(BaseControl) {
    /**
     * @param {HTMLElement} element
     * @param {FeedCardList} parent
     * @param {number} index
     */
    constructor(element, parent, index) {
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

    /** @override */
    onActionButtonPressed(event) {
        if (this.url) {
            window.location.href = this.url;
            return true;
        }
        return false;
    }
}

/**
 * @extends {BaseControl<null>}
 */
class PlayerControl extends BaseControl {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
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
        /** @type {HTMLButtonElement} */
        this.playButton = /** @type {HTMLButtonElement} */ (playButton);
        /** @type {HTMLButtonElement} */
        this.fullScreenButton = /** @type {HTMLButtonElement} */ (fullScreenButton);
    }

    /**
     * @override
     * @param {GamepadButtonEvent} event
     */
    onGamepadButtonEvent(event) {
        if (event.eventType !== EventType.PRESSED) {
            return false;
        }
        switch (event.buttonId) {
            case ButtonId.A:
                this.playButton.click();
                return true;
            case ButtonId.X:
                this.fullScreenButton.click();
                return true;
        }
        return false;
    }
}

/**
 * @extends {BaseControl<null>}
 */
class RootPage extends BaseControl {
    constructor() {
        super(document.body, null);
        /** @type {HeaderControl | null} */
        this.headerControl = null;
        /** @type {FeedCardList | null} */
        this.feedCardList = null;
        /** @type {PlayerControl | null} */
        this.playerControl = null;
        const headerElement = /** @type {HTMLElement} */ (document.querySelector(".bili-header"));
        if (headerElement) {
            this.headerControl = new HeaderControl(headerElement);
        }

        this.updateFeedCardList();
        this.updatePlayerControl();

        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(document.body, { childList: true, subtree: true });
    }

    onMutation(mutations) {
        console.log("Mutation:", mutations);
        this.updateFeedCardList();
        this.updatePlayerControl();
    }

    updateFeedCardList() {
        const feedCardList = /** @type {HTMLElement} */ (document.querySelector(".feed2"));
        if (feedCardList) {
            this.feedCardList = new FeedCardList(feedCardList);
        }
    }

    updatePlayerControl() {
        const playerElement = /** @type {HTMLElement} */ (document.querySelector("#bilibili-player"));
        if (playerElement) {
            this.playerControl = new PlayerControl(playerElement);
        }
    }

    /**
     * @override
     * @param {GamepadButtonEvent} event
     */
    onGamepadButtonEvent(event) {
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
    constructor() {
        this.gamepadManager = new GamepadManager();
        // listen to the dom mutation event
        this.ltPressed = false;
        this.gamepadManager.addEventListener((event) => this.onGamepadButtonEvent(event));

        /** @type {RootPage | null} */
        this.rootPage = new RootPage();
    }

    /**
     * @param {GamepadButtonEvent} event
     */
    onGamepadButtonEvent(event) {
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
        let currentElement = focusedElement;
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

let bibibili;

// Create on document ready
document.addEventListener("DOMContentLoaded", () => {
    // inject CSS
    const style = document.createElement("style");
    style.textContent = `
        .right-entry.gamepad-activated {
            outline: 1px solid red;
        }

        .feed-card:focus {
            outline: 1px solid red;
        }
    `;
    document.head.appendChild(style);

    bibibili = new Bibibili();
});

/**
 * @param {Element} element
 * @param {BaseControl} control
 */
function attachControl(element, control) {
    /** @type {any} */ (element).biliCtrl = control;
}

/**
 * @param {Element} element
 * @returns {BaseControl | undefined}
 */
function getControl(element) {
    return /** @type any */ (element).biliCtrl;
}
