import { Bibibili } from "./bilibili";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let bibibili: Bibibili;

// Create on document ready
document.addEventListener("DOMContentLoaded", () => {
  bibibili = new Bibibili();
  console.log("DOMContentLoaded");
});
