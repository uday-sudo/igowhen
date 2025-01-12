const toggleClock = document.getElementById("toggleClock");
const reloadSettings = document.getElementById("reloadSettings");
const reloadButton = document.getElementById("reloadButton");
const reloadNumber = document.getElementById("reloadNumber");
const maxWorkHours = document.getElementById("maxWorkHours");
const contentElement = document.getElementById("time_to_leave");

document.addEventListener("DOMContentLoaded", () => {
    chrome.runtime.sendMessage({ request: "getContent" }, (response) => {
        if (response && response.content) {
            console.log("Initial content received");
            contentElement.textContent = response.content;
        } else {
            console.log("No content received from the content script.");
        }
    });

    // Listen for real-time updates from the content script
    chrome.runtime.onMessage.addListener((message) => {
        if (message.content) {
            console.log("Real-time update received");
            contentElement.textContent = message.content;
        }
    });
});

// Handle the Force Reload button click
reloadButton.addEventListener("click", () => {
    const reloadNumber = document.getElementById("reloadNumber").value;
    if (reloadNumber) {
        chrome.runtime.sendMessage({ action: "forceReload", number: reloadNumber }, (response) => {
            console.log("Page reload triggered:", response);
        });
    } else {
        alert("Please enter a valid number.");
    }
});

// Function to save settings to local storage
function saveSettings() {
    const settings = {
        enable24HourClock: toggleClock.checked,
        reloadNumber: reloadNumber.value,
        maxWorkHours: maxWorkHours.value
    };
    chrome.storage.local.set(settings, () => {
        console.log("Settings saved:", settings);
    });
}

// Function to load settings from local storage
function loadSettings() {
    chrome.storage.local.get(["enable24HourClock", "reloadNumber", "maxWorkHours"], (settings) => {
        if (settings.enable24HourClock !== undefined) {
            toggleClock.checked = settings.enable24HourClock;
        }
        if (settings.reloadNumber !== undefined) {
            reloadNumber.value = settings.reloadNumber;
        }
        if (settings.maxWorkHours !== undefined) {
            maxWorkHours.value = settings.maxWorkHours;
        }
        console.log("Settings loaded:", settings);
    });
}

toggleClock.addEventListener("change", saveSettings);
reloadNumber.addEventListener("input", saveSettings);
maxWorkHours.addEventListener("input", saveSettings);

// Load settings when the popup is opened
document.addEventListener("DOMContentLoaded", loadSettings);

// Force reload logic (if applicable)
// reloadButton.addEventListener("click", () => {
//     const number = reloadNumber.value;
//     if (number) {
//         console.log("Force reload triggered with number:", number);
//         // You can add additional logic for force reload here if needed
//     } else {
//         alert("Please enter a valid reload number.");
//     }
// });