import {
  BaseContainerChildControl,
  ContainerChildControl,
  ContainerControl,
} from "./control";
import { BaseControl } from "./control";
import { ButtonId } from "./gamepad";
import { GamepadButtonEvent } from "./gamepad";
import { EventType } from "./gamepad";

export class SearchPanel extends ContainerControl {
  private suggestionItems: SuggestionItem[] = [];
  private searchBar: SearchBar;
  private searchPanelObserver: MutationObserver;
  private searchPanelElement: HTMLElement;

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
    const searchFormElement = element.querySelector("#nav-searchform");
    if (!searchFormElement) {
      throw new Error("Search form element not found");
    }
    this.searchBar = new SearchBar(
      searchFormElement as HTMLElement,
      this,
      0 /* index */,
    );

    const searchPanelElement = element.querySelector(".search-panel");
    if (!searchPanelElement) {
      throw new Error("Search panel element not found");
    }
    this.searchPanelElement = searchPanelElement as HTMLElement;

    // Observe the search panel element
    this.searchPanelObserver = new MutationObserver(() => {
      this.updateSuggestionItems();
    });
    this.searchPanelObserver.observe(searchPanelElement, {
      childList: true,
      subtree: true,
    });
    this.updateSuggestionItems();
  }

  private updateSuggestionItems() {
    const trendingItemElements =
      this.searchPanelElement.querySelectorAll(".trending-item");
    const suggestionItemElements =
      this.searchPanelElement.querySelectorAll(".suggest-item");
    const allItems = Array.from(trendingItemElements).concat(
      Array.from(suggestionItemElements),
    );
    console.log("Search suggestion items:", allItems);
    this.suggestionItems = allItems.map((item, index) => {
      // Search input takes the index 0. Suggestion items start from index 1.
      return new SuggestionItem(item as HTMLElement, this, index + 1);
    });
  }

  override focus() {
    console.log("Focusing search panel");
    this.searchBar.focus();
  }

  override innerDown(currentIdx: number): boolean {
    console.log("Inner down, currentIdx:", currentIdx, this.suggestionItems);
    const nextIdx = currentIdx + 1;
    if (nextIdx > this.suggestionItems.length) {
      // Return true because the search panel is a popup. We don't want the
      // focus to be moved to other sibling containers.
      return true;
    }
    this.suggestionItems[nextIdx - 1].focus();
    return true;
  }

  override innerUp(currentIdx: number): boolean {
    const prevIdx = currentIdx - 1;
    if (prevIdx < 0) {
      // Return true because the search panel is a popup. We don't want the
      // focus to be moved to other sibling containers.
      return true;
    }
    if (prevIdx === 0) {
      this.searchBar.focus();
      return true;
    }
    this.suggestionItems[prevIdx - 1].focus();
    return true;
  }

  override innerLeft(): boolean {
    // Return true because the search panel is a popup. We don't want the
    // focus to be moved to other sibling containers.
    return true;
  }

  override innerRight(): boolean {
    // Return true because the search panel is a popup. We don't want the
    // focus to be moved to other sibling containers.
    return true;
  }
}

class SearchBar extends ContainerChildControl(BaseContainerChildControl) {
  private readonly inputElement: HTMLInputElement;
  private readonly searchButtonElement: HTMLButtonElement;
  private readonly cleanButtonElement: HTMLButtonElement;

  constructor(element: HTMLElement, parent: SearchPanel, index: number) {
    super(element, parent);
    this.inputElement = element.querySelector(
      ".nav-search-input",
    ) as HTMLInputElement;
    this.searchButtonElement = element.querySelector(
      ".nav-search-btn",
    ) as HTMLButtonElement;
    this.cleanButtonElement = element.querySelector(
      ".nav-search-clean",
    ) as HTMLButtonElement;
    this.index = index;
  }

  override focus() {
    console.log("Focusing search bar");
    this.inputElement.focus();
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.A:
          this.searchButtonElement.click();
          return true;
        case ButtonId.B:
          if (this.inputElement.value) {
            this.cleanButtonElement.click();
            return true;
          }
          return false;
      }
    }
    return super.onGamepadButtonEvent(event);
  }
}

class SuggestionItem extends ContainerChildControl(BaseContainerChildControl) {
  constructor(element: HTMLElement, parent: SearchPanel, index: number) {
    super(element, parent);
    this.index = index;
    // Make the suggestion item focusable
    this.element.setAttribute("tabindex", "-1");
  }

  override onActionButtonPressed(): boolean {
    this.element.click();
    return true;
  }
}
