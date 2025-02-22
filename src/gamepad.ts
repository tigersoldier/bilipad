// See https://w3c.github.io/gamepad/#dfn-standard-gamepad
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

export enum AxisId {
  LEFT_X = 0,
  LEFT_Y = 1,
  RIGHT_X = 2,
  RIGHT_Y = 3,
}

export enum Joystick {
  LEFT,
  RIGHT,
}

export enum JoystickDirection {
  NONE,
  UP,
  DOWN,
  LEFT,
  RIGHT,
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
  /**
   * The button is pressed and held. i.e. it's between the pressed and repeat/released events.
   *
   * This event only applies to the pseudo-buttons for axes.
   */
  HOLD = 3,
}

class ButtonState {
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

class JoyStickState {
  updateTimeMs: number = Date.now();
  lastDurationMs: number = 0;
  eventTypes: Map<JoystickDirection, EventType> = new Map();
  lastXEventTriggerTimeMs: number = 0;
  xRepeated: boolean = false;
  lastYEventTriggerTimeMs: number = 0;
  yRepeated: boolean = false;

  constructor(
    readonly gamePad: Gamepad,
    readonly joystick: Joystick,
  ) {
    this.eventTypes.set(JoystickDirection.UP, EventType.RELEASED);
    this.eventTypes.set(JoystickDirection.DOWN, EventType.RELEASED);
    this.eventTypes.set(JoystickDirection.LEFT, EventType.RELEASED);
    this.eventTypes.set(JoystickDirection.RIGHT, EventType.RELEASED);
  }

  updateState(xValue: number, yValue: number): GamepadJoystickEvent {
    const durationMs = Date.now() - this.updateTimeMs;
    this.lastDurationMs = durationMs;
    this.updateTimeMs = Date.now();
    let xDirection = JoystickDirection.NONE;
    if (xValue >= 0.5) {
      xDirection = JoystickDirection.RIGHT;
    } else {
      this.eventTypes.set(JoystickDirection.RIGHT, EventType.RELEASED);
    }
    if (xValue <= -0.5) {
      xDirection = JoystickDirection.LEFT;
    } else {
      this.eventTypes.set(JoystickDirection.LEFT, EventType.RELEASED);
    }

    if (xDirection !== JoystickDirection.NONE) {
      const newEventType = this.calculatePressedButtonEventType(
        this.eventTypes.get(xDirection)!,
        this.lastXEventTriggerTimeMs,
        this.updateTimeMs,
        this.xRepeated,
      );
      this.eventTypes.set(xDirection, newEventType);
      if (
        newEventType === EventType.PRESSED ||
        newEventType === EventType.REPEAT
      ) {
        console.log("New X axis triggered:", xDirection, newEventType);
        this.lastXEventTriggerTimeMs = this.updateTimeMs;
        this.xRepeated = newEventType === EventType.REPEAT;
      }
    }

    let yDirection = JoystickDirection.NONE;
    if (yValue >= 0.5) {
      yDirection = JoystickDirection.DOWN;
    } else {
      this.eventTypes.set(JoystickDirection.DOWN, EventType.RELEASED);
    }
    if (yValue <= -0.5) {
      yDirection = JoystickDirection.UP;
    } else {
      this.eventTypes.set(JoystickDirection.UP, EventType.RELEASED);
    }

    if (yDirection !== JoystickDirection.NONE) {
      const newEventType = this.calculatePressedButtonEventType(
        this.eventTypes.get(yDirection)!,
        this.lastYEventTriggerTimeMs,
        this.updateTimeMs,
        this.yRepeated,
      );
      this.eventTypes.set(yDirection, newEventType);
      if (
        newEventType === EventType.PRESSED ||
        newEventType === EventType.REPEAT
      ) {
        console.log("New Y axis triggered:", newEventType);
        this.lastYEventTriggerTimeMs = this.updateTimeMs;
        this.yRepeated = newEventType === EventType.REPEAT;
      }
    }

    const xAbs = Math.abs(xValue);
    const yAbs = Math.abs(yValue);
    let dominantDirection = JoystickDirection.NONE;
    if (xAbs > yAbs) {
      dominantDirection = xDirection;
    } else {
      dominantDirection = yDirection;
    }

    return new GamepadJoystickEvent(
      this.gamePad,
      this.joystick,
      xValue,
      yValue,
      this.eventTypes.get(JoystickDirection.UP)!,
      this.eventTypes.get(JoystickDirection.DOWN)!,
      this.eventTypes.get(JoystickDirection.LEFT)!,
      this.eventTypes.get(JoystickDirection.RIGHT)!,
      dominantDirection,
    );
  }

  private calculatePressedButtonEventType(
    oldEventType: EventType,
    lastEventTriggerTimeMs: number,
    currentTimeMs: number,
    repeated: boolean,
  ): EventType {
    if (oldEventType === EventType.RELEASED) {
      return EventType.PRESSED;
    }
    const repeatThresholdMs = repeated
      ? REPEAT_INTERVAL_MS
      : INITIAL_REPEAT_DELAY_MS;
    if (currentTimeMs - lastEventTriggerTimeMs > repeatThresholdMs) {
      return EventType.REPEAT;
    }
    return EventType.HOLD;
  }
}

export class ButtonEventListener {
  readonly func: (gamepadButtonEvent: GamepadButtonEvent) => void;

  constructor(func: (gamepadButtonEvent: GamepadButtonEvent) => void) {
    this.func = func;
  }

  emit(gamepadButtonEvent: GamepadButtonEvent) {
    this.func(gamepadButtonEvent);
  }
}

export class JoystickEventListener {
  readonly func: (gamepadJoystickEvent: GamepadJoystickEvent) => void;

  constructor(func: (gamepadJoystickEvent: GamepadJoystickEvent) => void) {
    this.func = func;
  }

  emit(gamepadJoystickEvent: GamepadJoystickEvent) {
    this.func(gamepadJoystickEvent);
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

export class GamepadJoystickEvent {
  constructor(
    readonly gamepad: Gamepad,
    readonly joystick: Joystick,
    readonly xAxis: number,
    readonly yAxis: number,
    // If x axis considered as a button, the event type of the button
    // 0.5 is used as the threshold for button pressed
    readonly upEventType: EventType,
    readonly downEventType: EventType,
    // If y axis considered as a button, the event type of the button
    // 0.5 is used as the threshold for button pressed
    readonly leftEventType: EventType,
    readonly rightEventType: EventType,
    /** The dominant direction of the joystick. */
    readonly dominantDirection: JoystickDirection,
  ) {}
}

export class GamepadManager {
  // This should be a number in browser. I can't find out a way to get the Typescript ignore the typing
  // from @types/node.
  private gamepadHandle: NodeJS.Timeout | null;
  private buttonStates: Record<string, ButtonState[]>;
  /**
   * The states of the joysticks of each gamepad.
   * The key is the index of the gamepad.
   * The value is a map of the joysticks to their states.
   */
  private joystickStates: Record<string, Record<Joystick, JoyStickState>>;
  private buttonEventListeners: ButtonEventListener[];
  private joystickEventListeners: JoystickEventListener[];

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
    this.joystickStates = {};
    this.buttonEventListeners = [];
    this.joystickEventListeners = [];
    // Listen to the page inactive event
    document.addEventListener(
      "visibilitychange",
      this.onVisibilityChange.bind(this),
    );
    // Listen to window focus/blur events
    window.addEventListener("focus", () => {
      console.log("Window focused");
      this.onPageActivated();
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
      if (gamepad.axes.length >= 2) {
        const xAxis = gamepad.axes[0];
        const yAxis = gamepad.axes[1];
        const joystickState = this.joystickStates[gamepad.index][Joystick.LEFT];
        const joystickEvent = joystickState.updateState(xAxis, yAxis);
        if (joystickEvent) {
          this.emitJoystickEvent(joystickEvent);
        }
      }
      if (gamepad.axes.length >= 4) {
        const xAxis = gamepad.axes[2];
        const yAxis = gamepad.axes[3];
        const joystickState =
          this.joystickStates[gamepad.index][Joystick.RIGHT];
        const joystickEvent = joystickState.updateState(xAxis, yAxis);
        if (joystickEvent) {
          this.emitJoystickEvent(joystickEvent);
        }
      }
    }
  }

  emitButtonEvent(
    gamepad: Gamepad,
    button: GamepadButton,
    buttonId: ButtonId,
    eventType: EventType,
  ) {
    const event = new GamepadButtonEvent(gamepad, button, buttonId, eventType);
    this.buttonEventListeners.forEach((listener) => listener.emit(event));
  }

  emitJoystickEvent(event: GamepadJoystickEvent) {
    this.joystickEventListeners.forEach((listener) => listener.emit(event));
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
    this.joystickStates[event.gamepad.index] = {
      [Joystick.LEFT]: new JoyStickState(event.gamepad, Joystick.LEFT),
      [Joystick.RIGHT]: new JoyStickState(event.gamepad, Joystick.RIGHT),
    };
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

  addButtonEventListener(func: (event: GamepadButtonEvent) => void): {
    remove: () => void;
  } {
    const listener = new ButtonEventListener(func);
    this.buttonEventListeners.push(listener);

    return {
      remove: () => {
        const listeners = this.buttonEventListeners;
        if (!listeners) {
          return;
        }
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  }

  addJoystickEventListener(func: (event: GamepadJoystickEvent) => void): {
    remove: () => void;
  } {
    const listener = new JoystickEventListener(func);
    this.joystickEventListeners.push(listener);

    return {
      remove: () => {
        const listeners = this.joystickEventListeners;
        if (!listeners) {
          return;
        }
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  }
}
