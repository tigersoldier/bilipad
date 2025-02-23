import {
  BaseContainerChildControl,
  ContainerChildControl,
  ContainerControl,
  getOrObserveElement,
} from "./control";
import { BaseControl } from "./control";
import { ButtonId } from "./gamepad";
import { GamepadButtonEvent } from "./gamepad";
import { EventType } from "./gamepad";
import { FlexContainer } from "./flex";

export class SearchPanel extends ContainerControl {
  private suggestionItems: SuggestionItem[] = [];
  private searchBar: SearchBar | null = null;
  private searchPanelObserver: MutationObserver | null = null;
  private searchPanelElement: HTMLElement | null = null;

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);
    getOrObserveElement(element, ["#nav-searchform"], (element) => {
      const searchFormElement = element as HTMLElement;
      this.searchBar = new SearchBar(
        searchFormElement as HTMLElement,
        this,
        0 /* index */,
      );
    });

    getOrObserveElement(element, [".search-panel"], (element) => {
      const searchPanelElement = element as HTMLElement;
      this.searchPanelElement = searchPanelElement;

      // Observe the search panel element
      this.searchPanelObserver = new MutationObserver(() => {
        this.updateSuggestionItems();
      });
      this.searchPanelObserver.observe(searchPanelElement, {
        childList: true,
        subtree: true,
      });
      this.updateSuggestionItems();
    });
  }

  private updateSuggestionItems() {
    const trendingItemElements =
      this.searchPanelElement?.querySelectorAll(".trending-item");
    const suggestionItemElements =
      this.searchPanelElement?.querySelectorAll(".suggest-item");
    const allItems = Array.from(trendingItemElements ?? []).concat(
      Array.from(suggestionItemElements ?? []),
    );
    console.log("Search suggestion items:", allItems);
    this.suggestionItems = allItems.map((item, index) => {
      // Search input takes the index 0. Suggestion items start from index 1.
      return new SuggestionItem(item as HTMLElement, this, index + 1);
    });
  }

  override focus() {
    console.log("Focusing search panel");
    this.searchBar?.focus();
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.B:
          // This triggers the event listener to close the search panel.
          document.body.dispatchEvent(
            new MouseEvent("mousedown", { bubbles: true }),
          );
          this.parent!.focus();
          return true;
      }
    }
    return super.onGamepadButtonEvent(event);
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
      this.searchBar?.focus();
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
  private readonly searchContentElement: HTMLElement;

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
    this.searchContentElement = element.querySelector(
      ".nav-search-content",
    ) as HTMLElement;
    this.index = index;

    // add a start button icon before the search content
    // NOTE: we don't add to this.element because its class list will be overridden
    // on activated
    this.searchContentElement.classList.add("bilipad-button-before");
    this.searchContentElement.classList.add("bilipad-button-start");
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
          } else {
            this.inputElement.blur();
            // Bubbles up to the search panel, which closes it.
            return false;
          }
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

export class SearchPage extends ContainerControl {
  private searchResultGrid: SearchResultGrid | null = null;
  private prevButtonElement: HTMLElement | null = null;
  private nextButtonElement: HTMLElement | null = null;
  private searchPageObserver: MutationObserver | null = null;

  constructor(element: HTMLElement, parent: BaseControl) {
    super(element, parent);

    const searchPageWrapperElement = this.element.querySelector(
      ".search-page-wrapper",
    ) as HTMLElement;

    this.searchPageObserver = new MutationObserver((mutations) => {
      console.log("Search page wrapper mutation:", mutations);
      this.updateSearchPage();
    });
    this.searchPageObserver.observe(searchPageWrapperElement, {
      childList: true,
      subtree: false,
    });
    this.updateSearchPage();
  }

  private updateSearchPage() {
    if (this.searchResultGrid) {
      this.searchResultGrid.destroy();
      this.searchResultGrid = null;
    }
    const searchResultGridElement = this.element.querySelector(
      ".video-list",
    ) as HTMLElement;
    console.log("Search result grid element:", searchResultGridElement);
    if (searchResultGridElement) {
      this.searchResultGrid = new SearchResultGrid(
        searchResultGridElement,
        this,
      );
    }

    getOrObserveElement(this.element, [".vui_pagenation"], (element) => {
      const paginationPanel = element as HTMLElement;
      const sideButtons = paginationPanel.querySelectorAll(
        ".vui_button.vui_pagenation--btn-side",
      );
      if (sideButtons.length != 2) {
        console.error(
          "Search result grid has unexpected number of side buttons",
          sideButtons,
        );
        return;
      }
      this.prevButtonElement = sideButtons[0] as HTMLElement;
      this.prevButtonElement.classList.add("bilipad-button-before");
      this.prevButtonElement.classList.add("bilipad-button-rb");
      this.nextButtonElement = sideButtons[1] as HTMLElement;
      this.nextButtonElement.classList.add("bilipad-button-after");
      this.nextButtonElement.classList.add("bilipad-button-lb");
    });
  }

  override focus() {
    this.searchResultGrid?.focus();
  }

  override onGamepadButtonEvent(event: GamepadButtonEvent): boolean {
    if (event.eventType === EventType.PRESSED) {
      switch (event.buttonId) {
        case ButtonId.LB:
          if (this.prevButtonElement) {
            console.log("Clicking search page prev button");
            this.prevButtonElement.click();
            return true;
          }
          return false;
        case ButtonId.RB:
          if (this.nextButtonElement) {
            console.log("Clicking search page next button");
            this.nextButtonElement.click();
            return true;
          }
          return false;
        case ButtonId.DPAD_DOWN:
        case ButtonId.DPAD_RIGHT:
          return this.searchResultGrid?.onGamepadButtonEvent(event) ?? false;
      }
    }
    return super.onGamepadButtonEvent(event);
  }
}

export class SearchResultGrid extends FlexContainer {
  private readonly observer: MutationObserver;

  constructor(element: HTMLElement, parent: SearchPage) {
    super(element, parent);
    console.log("Search result grid:", element);
    this.observer = new MutationObserver((mutations) => {
      console.log("Search result grid mutation:", mutations);
      this.updateSearchResultItems();
    });
    this.observer.observe(element, { childList: true, subtree: false });
    this.updateSearchResultItems();
  }

  private updateSearchResultItems() {
    this.children = [];
    let i = 0;
    for (const child of this.element.childNodes) {
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }
      const element = child as HTMLElement;
      console.log("Search result grid child:", element);
      this.addChild(new SearchResultItem(element, this, i));
      i++;
    }
  }

  override destroy() {
    this.observer.disconnect();
    super.destroy();
  }
}

class SearchResultItem extends ContainerChildControl(
  BaseContainerChildControl,
) {
  private readonly anchorElement: HTMLElement;

  constructor(element: HTMLElement, parent: SearchResultGrid, index: number) {
    super(element, parent);
    this.index = index;
    // Make the search result item focusable
    this.element.setAttribute("tabindex", "-1");
    this.anchorElement = element.querySelector("a") as HTMLElement;
  }

  override onActionButtonPressed(): boolean {
    this.anchorElement.click();
    return true;
  }
}
