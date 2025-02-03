import {
  ContainerControl,
  ContainerChildControl,
  BaseContainerChildControl,
} from "./control";

const DOM_RECT_EPS = 1e-2;

export class FeedCardList extends ContainerControl {
  feedCards: FeedCard[];
  readonly observer: MutationObserver;

  constructor(element: HTMLElement) {
    super(element, null);
    this.feedCards = [];
    this.updateFeedCards();
    this.observer = new MutationObserver(this.onMutation.bind(this));
    this.observer.observe(element.querySelector(".container") as HTMLElement, {
      childList: true,
      subtree: false,
    });
  }

  override focus() {
    this.feedCards[0].focus();
  }

  onMutation(mutations: MutationRecord[]) {
    console.log("Mutation:", mutations);
    this.updateFeedCards();
  }

  updateFeedCards() {
    const feedCards = document.querySelectorAll(".container > div");
    this.feedCards = [];
    for (let i = 0; i < feedCards.length; i++) {
      this.feedCards.push(new FeedCard(feedCards[i] as HTMLElement, this, i));
    }
  }

  override innerDown(currentIdx: number): boolean {
    if (currentIdx >= this.feedCards.length - 1) {
      return false;
    }
    let bestMatch = this.feedCards[currentIdx + 1];
    const currentRect =
      this.feedCards[currentIdx].element.getBoundingClientRect();
    for (let i = currentIdx + 2; i < this.feedCards.length; i++) {
      const feedCard = this.feedCards[i];
      const rect = feedCard.element.getBoundingClientRect();
      if (rect.top > currentRect.top + currentRect.height - DOM_RECT_EPS) {
        bestMatch = feedCard;
        if (
          rect.left < currentRect.left + currentRect.width + DOM_RECT_EPS &&
          rect.left + rect.width > currentRect.left - DOM_RECT_EPS
        ) {
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
    const currentRect =
      this.feedCards[currentIdx].element.getBoundingClientRect();
    for (let i = currentIdx - 2; i >= 0; i--) {
      const feedCard = this.feedCards[i];
      const rect = feedCard.element.getBoundingClientRect();
      if (rect.top + rect.height < currentRect.top + DOM_RECT_EPS) {
        bestMatch = feedCard;
        if (
          rect.left < currentRect.left + currentRect.width + DOM_RECT_EPS &&
          rect.left + rect.width > currentRect.left - DOM_RECT_EPS
        ) {
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
