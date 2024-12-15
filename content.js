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
    constructor(func) {
        this.func = func;
    }

    emit(...args) {
        this.func(...args);
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
                const event = this.buttonStates[gamepad.index][index].updateState(button);
                if (event) {
                    console.log(event);
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
     * @param {(gamepad: Gamepad) => void} func
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

const gamepadManager = new GamepadManager();

console.log("manager created");
