// https://w3c.github.io/gamepad/#remapping
const StandardButtonMapping = {
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
    [StandardButtonMapping.A]: 'a',
    [StandardButtonMapping.B]: 'b',
    [StandardButtonMapping.X]: 'x',
    [StandardButtonMapping.Y]: 'y',
    [StandardButtonMapping.LB]: 'lb',
    [StandardButtonMapping.RB]: 'rb',
    [StandardButtonMapping.LT]: 'lt',
    [StandardButtonMapping.RT]: 'rt',
    [StandardButtonMapping.SELECT]: 'select',
    [StandardButtonMapping.START]: 'start',
    [StandardButtonMapping.L3]: 'l3',
    [StandardButtonMapping.R3]: 'r3',
    [StandardButtonMapping.DPAD_UP]: 'dpad_up',
    [StandardButtonMapping.DPAD_DOWN]: 'dpad_down',
    [StandardButtonMapping.DPAD_LEFT]: 'dpad_left',
    [StandardButtonMapping.DPAD_RIGHT]: 'dpad_right',
    [StandardButtonMapping.POWER]: 'power',
}

const INITIAL_REPEAT_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 100;

class ButtonState {
    /**
     * @param {GamepadButton} button
     * @param {number} index
     */
    constructor(button, index) {
        this.pressed = button.pressed;
        this.updateTimeMs = Date.now();
        this.buttonIndex = index;
        this.name = ButtonName[index] || `button${index}`;
        this.nextRepeatTimeMs = 0;
    }

    /**
     * @param {GamepadButton} button
     *
     * @returns {string | null} the event if not null
     */
    updateState(button) {
        if (!this.pressed) {
            if (!button.pressed) {
                return null;
            }
            this.pressed = true;
            this.updateTimeMs = Date.now();
            this.nextRepeatTimeMs = Date.now() + INITIAL_REPEAT_DELAY_MS;
            return `${this.name}_pressed`;
        }
        // Button was pressed
        if (!button.pressed) {
            this.pressed = false;
            this.updateTimeMs = Date.now();
            return `${this.name}_released`;
        }
        // Button is held. Check if we need to repeat.
        if (this.nextRepeatTimeMs && Date.now() >= this.nextRepeatTimeMs) {
            this.nextRepeatTimeMs = Date.now() + REPEAT_INTERVAL_MS;
            return `${this.name}_repeat`;
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
     * @param {string} eventName
     */
    constructor(gamepad, button, eventName) {
        this.gamepad = gamepad;
        this.button = button;
        this.eventName = eventName;
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
        /** @type {Map<string, Listener[]>} */
        this.eventListeners = new Map();
    }

    maybeStartGamepadLoop() {
        if (this.gamepadHandle) {
            return;
        }
        if (navigator.getGamepads().some(gamepad => !!gamepad)) {
            this.gamepadHandle = setInterval(() => this.gamepadLoop(), 16);
        }
    }

    stopGamepadLoop() {
        if (this.gamepadHandle) {
            clearInterval(this.gamepadHandle);
            this.gamepadHandle = null;
        }
    }

    gamepadLoop() {
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad || !gamepad.connected) {
                continue;
            }
            gamepad.buttons.forEach((button, index) => {
                const eventName = this.buttonStates[gamepad.index][index].updateState(button);
                if (eventName) {
                    console.log("GamepadButton Event:", eventName);
                    const event = new GamepadButtonEvent(gamepad, button, eventName);
                    const listeners = this.eventListeners.get(eventName);
                    if (listeners) {
                        listeners.forEach(listener => listener.emit(event));
                    }
                }
            });
        }
    }

    /**
     * @param {GamepadEvent} event
     */
    onGamepadConnected(event) {
        console.log("Gamepad connected:", event.gamepad);
        if (!this.buttonStates[event.gamepad.index]) {
            this.buttonStates[event.gamepad.index] = event.gamepad.buttons.map((button, index) => new ButtonState(button, index));
        }
        console.log("Current gamepads:", navigator.getGamepads());
        this.maybeStartGamepadLoop();
    }

    /**
     * @param {GamepadEvent} event
     */
    onGamepadDisconnected(event) {
        console.log("Gamepad disconnected:", event.gamepad);
        console.log("Current gamepads:", navigator.getGamepads());
        this.stopGamepadLoop();
    }

    /**
     * @param {string} event
     * @param {(event: GamepadButtonEvent) => void} func
     * @returns {{ remove: () => void }}
     */
    addEventListener(event, func) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        const listener = new Listener(func);
        this.eventListeners.get(event).push(listener);

        return ({
            remove: () => {
                const listeners = this.eventListeners.get(event);
                if (!listeners) {
                    return;
                }
                listeners.splice(listeners.indexOf(listener), 1);
            }
        })
    }
}

/**
 * @template {NavControl<P> | null} P
 * @abstract
 */
class NavControl {
    /**
     * @param {HTMLElement} element
     * @param {P} parent
     */
    constructor(element, parent) {
        /** @type {HTMLElement} */
        this.element = element;
        this.element.nav = this;
        this.parent = parent;
    }

    focus() { }

    /**
     * @returns {NavControl | null}
     */
    down() { }

    /**
     * @returns {NavControl | null}
     */
    up() { }

    /**
     * @returns {NavControl | null}
     */
    left() { }

    /**
     * @returns {NavControl | null}
     */
    right() { }

    /**
     * @returns {P}
     */
    parent() {
        return this.parent;
    }

    /** @returns {boolean} if the action is handled */
    onAction() {
        return false;
    }

    /**
     * @param {GamepadButtonEvent} event
     * @returns {boolean} if the button is handled
     */
    onButtonPressed(event) {
        return false;
    }
}

/**
 * @extends {NavControl<null>}
 */
class HeaderControl extends NavControl {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        super(element, null);
        const rightEntry = document.querySelector(".right-entry");
        if (rightEntry) {
            // Iterate over the child elements of the right entry
            for (const child of rightEntry.childNodes) {
                if (child.nodeType !== Node.ELEMENT_NODE) {
                    continue;
                }
                // Check the href attribute of the child anchor element
                const anchor = child.querySelector("a");
                if (!anchor) {
                    console.log("No anchor found for right entry child", child);
                    continue;
                }
                if (anchor.href.includes("t.bilibili.com")) {
                    console.log("Found fav menu", child);
                    this.favMenu = new HeaderEntry(child, anchor.href, this);
                }
            }
        }
    }

    /**
     * @override
     * @param {GamepadButtonEvent} event
     */
    onButtonPressed(event) {
        if (event.eventName === "a_pressed" && this.favMenu) {
            return this.favMenu.onAction();
        }
        return false;
    }
}

/**
 * @extends {NavControl<HeaderControl>}
 */
class HeaderEntry extends NavControl {
    /**
     * @param {HTMLElement} element
     * @param {string} url
     * @param {HeaderControl} parent
     */
    constructor(element, url, parent) {
        super(element, parent);
        this.url = url;
    }

    /** @override */
    onAction() {
        window.location.href = this.url;
        return true;
    }
}

/**
 * @extends {NavControl<null>}
 */
class FeedCardList extends NavControl {
    /**
     * @param {HTMLElement} element
     */
    constructor(element) {
        super(element, null);
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
     * @param {number} currentIdx
     * @returns {FeedCard | null}
     */
    innerDown(currentIdx) {
        if (currentIdx >= this.feedCards.length - 1) {
            return null;
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
                    return feedCard;
                }
            }
        }
        return bestMatch;
    }

    /**
     * @param {number} currentIdx
     * @returns {FeedCard | null}
     */
    innerRight(currentIdx) {
        if (currentIdx >= this.feedCards.length - 1) {
            return null;
        }
        return this.feedCards[currentIdx + 1];
    }

    /**
     * @param {number} currentIdx
     * @returns {FeedCard | null}
     */
    innerLeft(currentIdx) {
        if (currentIdx <= 0) {
            return null;
        }
        return this.feedCards[currentIdx - 1];
    }

    /**
     * @param {number} currentIdx
     * @returns {FeedCard | null}
     */
    innerUp(currentIdx) {
        if (currentIdx <= 0) {
            return null;
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
                    return feedCard;
                }
            }
        }
        return bestMatch;
    }
}

/**
 * @extends {NavControl<FeedCardList>}
 */
class FeedCard extends NavControl {
    /**
     * @param {HTMLElement} element
     * @param {FeedCardList} parent
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
    down() {
        return this.parent.innerDown(this.index);
    }

    /** @override */
    up() {
        return this.parent.innerUp(this.index);
    }

    /** @override */
    left() {
        return this.parent.innerLeft(this.index);
    }

    /** @override */
    right() {
        return this.parent.innerRight(this.index);
    }

    /** @override */
    onAction() {
        if (this.url) {
            window.location.href = this.url;
            return true;
        }
        return false;
    }
}

/**
 * @extends {NavControl<null>}
 */
class PlayerControl extends NavControl {
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
        /** @type {HTMLButtonElement} */
        this.playButton = playButton;
    }

    /**
     * @override
     * @param {GamepadButtonEvent} event
     */
    onButtonPressed(event) {
        if (event.eventName === "a_pressed") {
            this.playButton.click();
            return true;
        }
        return false;
    }
}

class Bibibili {
    constructor() {
        this.gamepadManager = new GamepadManager();
        // listen to the dom mutation event
        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.ltPressed = false;
        this.gamepadManager.addEventListener("lt_pressed", () => this.ltPressed = true);
        this.gamepadManager.addEventListener("lt_released", () => this.ltPressed = false);
        this.gamepadManager.addEventListener("a_pressed", (event) => {
            let control = null;
            if (this.ltPressed && this.headerControl) {
                console.log("Clicking fav menu");
                control = this.headerControl;
            } else {
                control = this.getFocusedControl();
                if (!control) {
                    control = this.defaultControl;
                }
            }
            console.log("action control:", control);
            while (control) {
                if (control.onAction()) {
                    return;
                }
                if (control.onButtonPressed(event)) {
                    return;
                }
                control = control.parent();
            }
        });
        for (const direction of ["down", "up", "left", "right"]) {
            this.gamepadManager.addEventListener(`dpad_${direction}_pressed`, (event) => {
                this.onNavigation(event);
            });
            this.gamepadManager.addEventListener(`dpad_${direction}_repeat`, (event) => {
                this.onNavigation(event);
            });
        }

        /** @type {HeaderControl | null} */
        this.headerControl = null;
        /** @type {FeedCardList | null} */
        this.feedCardList = null;
        /** @type {NavControl | null} */
        this.defaultControl = null;
        /** @type {PlayerControl | null} */
        this.playerControl = null;
    }

    onMutation(mutations) {
        console.log("Mutation:", mutations);
        this.headerControl = null;
        this.feedCardList = null;
        const headerElement = document.querySelector(".bili-header");
        if (headerElement) {
            this.headerControl = new HeaderControl(headerElement);
        }

        const feedCardList = document.querySelector(".feed2");
        if (feedCardList) {
            this.feedCardList = new FeedCardList(feedCardList);
            this.defaultControl = this.feedCardList;
        }

        const playerElement = document.querySelector("#bilibili-player");
        if (playerElement) {
            console.log("Found player element", playerElement);
            this.playerControl = new PlayerControl(playerElement);
            this.defaultControl = this.playerControl;
        }
    }

    /**
     * @param {GamepadButtonEvent} event
     */
    onNavigation(event) {
        console.log("Navigation:", event);
        // Get the currently focused element
        const focusedElement = this.getFocusedControl();
        if (!focusedElement) {
            console.log("No focused nav element found");
            if (this.defaultControl) {
                this.defaultControl.focus();
            }
            return;
        }
        console.log("Focused nav element:", focusedElement);
        let nextElement = null;
        switch (event.eventName) {
            case "dpad_down_pressed":
            case "dpad_down_repeat":
                nextElement = focusedElement.down();
                break;
            case "dpad_up_pressed":
            case "dpad_up_repeat":
                nextElement = focusedElement.up();
                break;
            case "dpad_left_pressed":
            case "dpad_left_repeat":
                nextElement = focusedElement.left();
                break;
            case "dpad_right_pressed":
            case "dpad_right_repeat":
                nextElement = focusedElement.right();
                break;
        }
        if (nextElement) {
            console.log("Navigating to:", nextElement);
            nextElement.focus();
        } else {
            console.log("No next element found");
        }
    }

    /**
     * @returns {NavControl | null}
     */
    getFocusedControl() {
        const focusedElement = document.activeElement;
        console.log("Focused HTLM element:", focusedElement);
        if (!focusedElement) {
            return null;
        }
        let navElement = focusedElement.nav;
        let currentElement = focusedElement;
        while (!navElement && !!currentElement) {
            currentElement = currentElement.parentElement;
            if (currentElement) {
                navElement = currentElement.nav;
            }
        }
        return navElement;
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
