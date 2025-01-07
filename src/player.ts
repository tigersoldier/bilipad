import { BaseControl } from "./control";
import { ButtonId, EventType, GamepadButtonEvent } from "./gamepad";

export class PlayerControl extends BaseControl<null> {
    playButton: HTMLButtonElement | null = null;
    fullScreenButton: HTMLButtonElement | null = null;
    readonly observer: MutationObserver;

    constructor(element: HTMLElement) {
        super(element, null);
        this.observer = new MutationObserver(this.onMutation.bind(this));
        this.observer.observe(element, { childList: true, subtree: true });

    }

    onMutation(mutations: MutationRecord[]) {
        console.log("Mutation:", mutations);
        this.updateButtons();
    }

    updateButtons() {
        if (!this.playButton) {
            const playButton = this.element.querySelector(".bpx-player-ctrl-play");
            this.playButton = playButton as HTMLButtonElement;
        }
        if (!this.fullScreenButton) {
            const fullScreenButton = this.element.querySelector(".bpx-player-ctrl-full");
            if (!fullScreenButton) {
                console.log("No full screen button found");
                return;
            }
            this.fullScreenButton = fullScreenButton as HTMLButtonElement;
        }
        if (this.playButton && this.fullScreenButton) {
            this.observer.disconnect();
        }
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

