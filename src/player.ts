import { BaseControl } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class PlayerControl extends BaseControl<null> {
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

