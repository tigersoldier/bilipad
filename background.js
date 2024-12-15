// Check if the content script is already registered, if not, register it.
const CONTENT_SCRIPT_ID = "bilipad";

chrome.scripting.getRegisteredContentScripts((existingScripts) => {
    if (existingScripts.some(script => script.id === CONTENT_SCRIPT_ID)) {
        console.log("Bilipad registered");
        return;
    }
    console.log("Bilipad not registered");
    chrome.scripting.registerContentScripts([{
        id: CONTENT_SCRIPT_ID,
        js: ["content.js"],
        matches: ["https://*.bilibili.com/*"],
        runAt: "document_start",
        world: "ISOLATED",
    }])
    .then(() => {
        console.log("Bilipad registered");
    })
    .catch((error) => {
        console.error("Error registering Bilipad:", error);
    });
});
