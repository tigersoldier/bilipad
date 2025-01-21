import { Bibibili } from "./bilibili";

let bibibili: Bibibili;

// Create on document ready
document.addEventListener("DOMContentLoaded", () => {
    bibibili = new Bibibili();
    console.log('DOMContentLoaded');
});
