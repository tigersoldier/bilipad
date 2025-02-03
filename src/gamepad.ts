export enum ButtonId {
  A = 0,
  B = 1,
  X = 2,
  Y = 3,
  LB = 4,
  RB = 5,
  LT = 6,
  RT = 7,
  SELECT = 8,
  START = 9,
  L3 = 10,
  R3 = 11,
  DPAD_UP = 12,
  DPAD_DOWN = 13,
  DPAD_LEFT = 14,
  DPAD_RIGHT = 15,
  POWER = 16,
}

export const ButtonName = {
  [ButtonId.A]: "a",
  [ButtonId.B]: "b",
  [ButtonId.X]: "x",
  [ButtonId.Y]: "y",
  [ButtonId.LB]: "lb",
  [ButtonId.RB]: "rb",
  [ButtonId.LT]: "lt",
  [ButtonId.RT]: "rt",
  [ButtonId.SELECT]: "select",
  [ButtonId.START]: "start",
  [ButtonId.L3]: "l3",
  [ButtonId.R3]: "r3",
  [ButtonId.DPAD_UP]: "dpad_up",
  [ButtonId.DPAD_DOWN]: "dpad_down",
  [ButtonId.DPAD_LEFT]: "dpad_left",
  [ButtonId.DPAD_RIGHT]: "dpad_right",
  [ButtonId.POWER]: "power",
};

const INITIAL_REPEAT_DELAY_MS = 500;
const REPEAT_INTERVAL_MS = 100;

export enum EventType {
  PRESSED = 0,
  RELEASED = 1,
  REPEAT = 2,
}

export class ButtonState {
  pressed: boolean;
  updateTimeMs: number;
  nextRepeatTimeMs: number;

  constructor(button: GamepadButton) {
    this.pressed = button.pressed;
    this.updateTimeMs = Date.now();
    this.nextRepeatTimeMs = 0;
  }

  /**
   * @returns the type of the event if not null
   */
  updateState(button: GamepadButton): EventType | null {
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

export class Listener {
  readonly func: (gamepadButtonEvent: GamepadButtonEvent) => void;

  constructor(func: (gamepadButtonEvent: GamepadButtonEvent) => void) {
    this.func = func;
  }

  emit(gamepadButtonEvent: GamepadButtonEvent) {
    this.func(gamepadButtonEvent);
  }
}

export class GamepadButtonEvent {
  constructor(
    readonly gamepad: Gamepad,
    readonly button: GamepadButton,
    readonly buttonId: ButtonId,
    readonly eventType: EventType,
  ) {}
}

export class GamepadManager {
  // This should be a number in browser. I can't find out a way to get the Typescript ignore the typing
  // from @types/node.
  private gamepadHandle: NodeJS.Timeout | null;
  private buttonStates: Record<string, ButtonState[]>;
  private eventListeners: Listener[];

  constructor() {
    this.gamepadHandle = null;

    window.addEventListener(
      "gamepadconnected",
      this.onGamepadConnected.bind(this),
    );
    window.addEventListener(
      "gamepaddisconnected",
      this.onGamepadDisconnected.bind(this),
    );
    this.maybeStartGamepadLoop();
    this.buttonStates = {};
    this.eventListeners = [];
    // Listen to the page inactive event
    document.addEventListener(
      "visibilitychange",
      this.onVisibilityChange.bind(this),
    );
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
   * @returns true if the gamepad loop was started
   */
  maybeStartGamepadLoop(): boolean {
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
    if (navigator.getGamepads().some((gamepad) => !!gamepad)) {
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
        const eventType =
          this.buttonStates[gamepad.index][index].updateState(button);
        if (eventType !== null) {
          console.log("GamepadButton Event:", eventType);
          this.emitButtonEvent(gamepad, button, index, eventType);
        }
      });
    }
  }

  emitButtonEvent(
    gamepad: Gamepad,
    button: GamepadButton,
    buttonId: ButtonId,
    eventType: EventType,
  ) {
    const event = new GamepadButtonEvent(gamepad, button, buttonId, eventType);
    this.eventListeners.forEach((listener) => listener.emit(event));
  }

  onVisibilityChange() {
    console.log("Visibility change:", document.visibilityState);
    if (document.visibilityState === "hidden") {
      this.onPageDeactivated();
    } else {
      this.onPageActivated();
    }
  }

  sendPressedEvents(gamepad: Gamepad) {
    this.buttonStates[gamepad.index].forEach((buttonState, index) => {
      if (buttonState.pressed) {
        this.emitButtonEvent(
          gamepad,
          { pressed: true, touched: false, value: 1 },
          index,
          EventType.PRESSED,
        );
      }
    });
  }

  sendReleasedEvents(gamepad: Gamepad) {
    this.buttonStates[gamepad.index].forEach((buttonState, index) => {
      if (buttonState.pressed) {
        this.emitButtonEvent(
          gamepad,
          { pressed: false, touched: false, value: 0 },
          index,
          EventType.RELEASED,
        );
      }
    });
  }

  onGamepadConnected(event: GamepadEvent) {
    console.log("Gamepad connected:", event.gamepad);
    this.buttonStates[event.gamepad.index] = event.gamepad.buttons.map(
      (button) => new ButtonState(button),
    );
    this.sendPressedEvents(event.gamepad);
    console.log("Current gamepads:", navigator.getGamepads());
    this.maybeStartGamepadLoop();
  }

  onGamepadDisconnected(event: GamepadEvent) {
    console.log("Gamepad disconnected:", event.gamepad);
    console.log("Current gamepads:", navigator.getGamepads());
    this.sendReleasedEvents(event.gamepad);
    this.buttonStates[event.gamepad.index] = [];
    this.stopGamepadLoop();
  }

  addEventListener(func: (event: GamepadButtonEvent) => void): {
    remove: () => void;
  } {
    const listener = new Listener(func);
    this.eventListeners.push(listener);

    return {
      remove: () => {
        const listeners = this.eventListeners;
        if (!listeners) {
          return;
        }
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  }
}
