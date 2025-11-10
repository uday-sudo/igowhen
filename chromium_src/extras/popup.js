const toggleClock = document.getElementById("toggleClock");
const toggleOverlay = document.getElementById("toggleOverlay");
const reloadSettings = document.getElementById("reloadSettings");
const reloadButton = document.getElementById("reloadButton");
const reloadNumber = document.getElementById("reloadNumber");
const maxWorkHours = document.getElementById("maxWorkHours");
const maxWorkMinutes = document.getElementById("maxWorkMinutes");
const contentElement = document.getElementById("time_to_leave");
const countdown = document.getElementById("countdown");
const breaktime = document.getElementById("breaktime");
const updateMessage = document.getElementById("update_message");
const manifest = chrome.runtime.getManifest();

async function checkForUpdate() {
    const versionUrl = "https://raw.githubusercontent.com/wiki/uday-sudo/igowhen/version.md";
    try {
        const response = await fetch(versionUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const latestVersion = (await response.text()).trim();
        const currentVersion = manifest.version;
        console.log(latestVersion, " -- ")

        if (latestVersion !== currentVersion) {
            updateMessage.innerHTML = `Update available at <a href="https://github.com/uday-sudo/igowhen" target="_blank" style="color: #ff4c4c; text-decoration: underline;">GitHub</a>`;
            updateMessage.style.color = "#ff4c4c";
        } else {
            updateMessage.textContent = `You are on the latest version (${currentVersion})`;
            updateMessage.style.color = "#4caf50";
        }
    } catch (error) {
        console.error("Error checking for updates:", error);
    }
}

function updateDisplay(data) {
    if (data.endTime) {
        contentElement.textContent = data.endTime;
    }
    if (data.remainingTime) {
        countdown.textContent = data.remainingTime;
    }
    if (data.breaktime) {
        breaktime.textContent = data.breaktime;
    }
}

// Load data from storage periodically
function loadFromStorage() {
    chrome.storage.local.get(["endTime", "remainingTime", "breaktime"], (data) => {
        updateDisplay({
            endTime: data.endTime || "Waiting for data...",
            remainingTime: data.remainingTime || "N/A",
            breaktime: data.breaktime || "N/A"
        });
    });
}

document.addEventListener("DOMContentLoaded", () => {
    // Initial load
    loadFromStorage();
    
    // Poll storage every 500ms to stay in sync with content.js updates
    setInterval(loadFromStorage, 500);
    
    checkForUpdate();
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
        enableOverlay: toggleOverlay.checked,
        reloadNumber: reloadNumber.value,
        maxWorkHours: maxWorkHours.value,
        maxWorkMinutes: maxWorkMinutes.value
    };
    chrome.storage.local.set(settings, () => {
        console.log("Settings saved:", settings);
    });
}

// Function to load settings from local storage
function loadSettings() {
    chrome.storage.local.get(["enable24HourClock", "enableOverlay", "reloadNumber", "maxWorkHours", "maxWorkMinutes"], (settings) => {
        if (settings.enable24HourClock !== undefined) {
            toggleClock.checked = settings.enable24HourClock;
        }
        if (settings.enableOverlay !== undefined) {
            toggleOverlay.checked = settings.enableOverlay;
        }
        if (settings.reloadNumber !== undefined) {
            reloadNumber.value = settings.reloadNumber;
        }
        if (settings.maxWorkHours !== undefined) {
            maxWorkHours.value = settings.maxWorkHours;
        } else {
            maxWorkHours.value = 8;
        }
        if (settings.maxWorkMinutes !== undefined) {
            maxWorkMinutes.value = settings.maxWorkMinutes;
        } else {
            maxWorkMinutes.value = 0;
        }
        console.log("Settings loaded:", settings);
    });
}

toggleClock.addEventListener("change", saveSettings);
toggleOverlay.addEventListener("change", saveSettings);
reloadNumber.addEventListener("input", saveSettings);
maxWorkHours.addEventListener("input", saveSettings);
maxWorkMinutes.addEventListener("input", saveSettings);
document.addEventListener("DOMContentLoaded", loadSettings);