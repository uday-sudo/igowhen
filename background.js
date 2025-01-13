chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    console.log(tab.url);
    if (
        changeInfo.status === "complete" &&
        tab.url &&
        (
            (tab.url.startsWith("https://people.zoho.in/") && tab.url.includes("zp#attendance/entry/summary-mode:list"))
        )
    ) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ["content.js"],
        });
        console.log("Injected content script on the target page.");
    }
});


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.content) {
        chrome.storage.local.set({ content: message.content });
        chrome.runtime.sendMessage({ content: message.content });

        sendResponse({ status: "Content stored and broadcasted" });
    } else if (message.request === "getContent") {
        chrome.storage.local.get("content", (data) => {
            sendResponse({ content: data.content });
        });
        return true;
    }
});
