import {
  ContainerChildControl,
  BaseContainerChildControl,
  BaseControl,
} from "./control";
import { FlexContainer } from "./flex";

export class FeedCardList extends FlexContainer {
  readonly observer: MutationObserver;

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
    this.updateFeedCards();
    this.observer = new MutationObserver(this.onMutation.bind(this));
    this.observer.observe(element.querySelector(".container") as HTMLElement, {
      childList: true,
      subtree: false,
    });
  }

  onMutation(mutations: MutationRecord[]) {
    console.log("Feed Mutation:", mutations);
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            console.log("Added feed card:", node.textContent);
          }
        }
      }
    }
    this.updateFeedCards();
  }

  updateFeedCards() {
    const feedCards = document.querySelectorAll(".container > div");
    this.children = [];
    for (let i = 0; i < feedCards.length; i++) {
      this.addChild(new FeedCard(feedCards[i] as HTMLElement, this, i));
    }
    // This corrects the focus from the loading card to the loaded card.
    this.focus();
  }
}

export class FeedCard extends ContainerChildControl(BaseContainerChildControl) {
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

  override onActionButtonPressed(): boolean {
    if (this.url) {
      window.location.href = this.url;
      return true;
    }
    return false;
  }
}
