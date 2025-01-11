chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url === "https://people.zoho.in/aihifusion/zp#attendance/entry/summary-mode:list") {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"]
        });
        console.log("Injected content script on the target page.");
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.content) {
        // Store the content or forward it as needed
        chrome.storage.local.set({ content: message.content });
        sendResponse({ status: "Content stored" });
    } else if (message.request === "getContent") {
        // Retrieve the stored content
        chrome.storage.local.get("content", (data) => {
            sendResponse({ content: data.content });
        });
        return true;
    }
});