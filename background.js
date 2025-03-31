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
        chrome.storage.local.set({ targetTabId: tabId });
        chrome.alarms.create("updateAttendanceData", {
            periodInMinutes: 0.16
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateAttendanceData") {
        chrome.storage.local.get("targetTabId", (data) => {
            if (data.targetTabId) {
                chrome.tabs.sendMessage(data.targetTabId, { action: "requestUpdate" }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.log("Could not reach content script: ", chrome.runtime.lastError);
                    } else if (response) {
                        console.log("Content script update triggered: ", response.status);
                    }
                });
            }
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.endTime && message.remainingTime) {
        // Forward the data to any open popups
        chrome.runtime.sendMessage({ 
            endTime: message.endTime, 
            remainingTime: message.remainingTime 
        });
        
        sendResponse({ status: "Time data processed" });
    } else if (message.request === "getContent") {
        chrome.storage.local.get(["endTime", "remainingTime"], (data) => {
            sendResponse({ 
                endTime: data.endTime || "Waiting for data...", 
                remainingTime: data.remainingTime || "N/A" 
            });
        });
        return true; // Required for async response
    }
});