if (typeof browser === "undefined") {
  var browser = chrome;
}


browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log("Tab updated:", tab.url);

  if (
    changeInfo.status === "complete" &&
    tab.url &&
    (
      tab.url.startsWith("https://people.zoho.in/") &&
      tab.url.includes("zp#attendance/entry/summary-mode:list")
    )
  ) {
    console.log("Target URL matched. Injecting content.js...");

    // Handle script injection for Chrome (MV3) vs Firefox (MV2)
    if (browser.scripting && browser.scripting.executeScript) {
      // ✅ Chrome MV3
      browser.scripting.executeScript({
        target: { tabId: tabId },
        files: ["content.js"],
      });
    } else if (browser.tabs && browser.tabs.executeScript) {
      // ✅ Firefox MV2 fallback
      browser.tabs.executeScript(tabId, { file: "content.js" });
    } else {
      console.warn("No script injection API available in this browser.");
    }

    // Store target tab ID
    browser.storage.local.set({ targetTabId: tabId });

    // Create periodic alarm
    if (browser.alarms && browser.alarms.create) {
      browser.alarms.create("updateAttendanceData", {
        periodInMinutes: 0.16,
      });
    }
  }
});

browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "updateAttendanceData") {
        browser.storage.local.get("targetTabId", (data) => {
            if (data.targetTabId) {
                browser.tabs.sendMessage(data.targetTabId, { action: "requestUpdate" }, (response) => {
                    if (browser.runtime.lastError) {
                        console.log("Could not reach content script: ", browser.runtime.lastError);
                    } else if (response) {
                        console.log("Content script update triggered: ", response.status);
                    }
                });
            }
        });
    }
});

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.endTime && message.remainingTime) {
        // Forward the data to any open popups
        browser.runtime.sendMessage({ 
            endTime: message.endTime, 
            remainingTime: message.remainingTime,
            breaktime: message.breaktime,
        });
        
        sendResponse({ status: "Time data processed" });
    } else if (message.request === "getContent") {
        browser.storage.local.get(["endTime", "remainingTime", "breaktime"], (data) => {
            sendResponse({ 
                endTime: data.endTime || "Waiting for data...", 
                remainingTime: data.remainingTime || "N/A",
                breaktime: data.breaktime || "N/A",
            });
        });
        return true; // Required for async response
    }
});