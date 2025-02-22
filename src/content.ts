import { Bibibili } from "./bilibili";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let bibibili: Bibibili;

// Create on document ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");

  // Add a CSS to define web font from fonts/promptfont.otf
  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: "PromptFont";
      src: url(${chrome.runtime.getURL("fonts/promptfont.otf")}) format("opentype");
    }
  `;
  document.head.appendChild(style);

  // Initialize the Bibibili instance
  bibibili = new Bibibili();
});
