import { ContainerControl, ContainerChildControl, BaseControl } from "./control";
import { GamepadButtonEvent, EventType, ButtonId } from "./gamepad";
const LIST_ITEM_CLASS = "bili-dyn-list__item";

export class DynamicList extends ContainerControl<null> {
    readonly items: DynamicListItem[] = [];

    constructor(element: HTMLElement) {
        super(element, null);
        // observe the children of the element
        const observer = new MutationObserver((mutations) => this.onMutations(mutations));
        observer.observe(element, { childList: true });
        const items = element.querySelectorAll(`.${LIST_ITEM_CLASS}`);
        for (const item of items) {
            this.addItem(item as HTMLElement);
        }
    }

    private onMutations(mutations: MutationRecord[]) {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement && node.classList.contains(LIST_ITEM_CLASS)) {
                    this.addItem(node);
                }
            }
        }
    }

    private addItem(element: HTMLElement) {
        this.items.push(new DynamicListItem(element, this, this.items.length));
    }

    override innerUp(currentIdx: number): boolean {
        if (currentIdx <= 0) {
            return false;
        }
        this.items[currentIdx - 1].focus();
        return true;
    }

    override innerDown(currentIdx: number): boolean {
        while (currentIdx < this.items.length - 1) {
            currentIdx++;
            const item = this.items[currentIdx];
            if (item.hasContent) {
                item.focus();
                return true;
            }
        }
        return false;
    }

    override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
        if (event.eventType == EventType.PRESSED && event.buttonId == ButtonId.DPAD_DOWN) {
            this.items[0].focus();
            return true;
        }
        return false;
    }
}

export class DynamicListItem extends ContainerChildControl(BaseControl<any>) {
    readonly itemElement: HTMLElement;
    forwardButtonElement?: HTMLElement;
    commentButtonElement?: HTMLElement;
    likeButtonElement?: HTMLElement;
    titleElement?: HTMLElement;
    descriptionElement?: HTMLElement;
    videoCardElement?: HTMLElement;
    $hasContent: boolean;

    constructor(element: HTMLElement, parent: DynamicList, index: number) {
        super(element, parent);
        this.index = index;
        this.itemElement = element.querySelector('.bili-dyn-item') as HTMLElement;
        const contentElement = this.itemElement.querySelector('.bili-dyn-item__main');
        if (contentElement) {
            this.$hasContent = true;
            this.updateContentElements();
        } else {
            this.$hasContent = false;
            // This may be a placeholder for Related items that are hidden by default.
            // We need to wait for the content to load when the user clicks the show Related items on the previous item.
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    for (const node of mutation.addedNodes) {
                        if (node instanceof HTMLElement && node.classList.contains('bili-dyn-item__main')) {
                            this.$hasContent = true;
                            this.updateContentElements();
                            observer.disconnect();
                        }
                    }
                }
            });
            observer.observe(this.itemElement, { childList: true });
        }
    }

    private updateContentElements() {
        this.itemElement.setAttribute("tabindex", "-1");  // Make it focusable
        this.forwardButtonElement = this.itemElement.querySelector('.bili-dyn-item__action .bili-dyn-action.forward') as HTMLElement | undefined;
        this.commentButtonElement = this.itemElement.querySelector('.bili-dyn-item__action .bili-dyn-action.comment') as HTMLElement | undefined;
        this.likeButtonElement = this.itemElement.querySelector('.bili-dyn-item__action .bili-dyn-action.like') as HTMLElement | undefined;
        this.titleElement = this.itemElement.querySelector('.bili-dyn-title') as HTMLElement | undefined;
        this.descriptionElement = this.itemElement.querySelector('.bili-dyn-time') as HTMLElement | undefined;
        this.videoCardElement = this.itemElement.querySelector('.bili-dyn-card-video') as HTMLElement | undefined;
    }

    override focus() {
        this.itemElement.focus();
    }

    override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
        if (event.eventType === EventType.PRESSED) {
            switch (event.buttonId) {
                case ButtonId.A:
                    if (this.videoCardElement) {
                        this.videoCardElement.click();
                    } else if (this.descriptionElement) {
                        this.descriptionElement.click();
                    }
                    return true;
                case ButtonId.X:
                    if (this.forwardButtonElement) {
                        this.forwardButtonElement.click();
                    }
                    return true;
                case ButtonId.Y:
                    if (this.commentButtonElement) {
                        this.commentButtonElement.click();
                    }
                    return true;
                case ButtonId.B:
                    if (this.likeButtonElement) {
                        this.likeButtonElement.click();
                    }
                    return true;
            }
        }
        return super.onGamepadButtonEvent(event);
    }

    get hasContent(): boolean {
        return this.$hasContent;
    }
}
