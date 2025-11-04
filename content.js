console.log("content.js executing");

// Constants
const RELOADSEC = 0.5;
const SELECTORS = {
    ATTENDANCE_DETAILS: ".zpl_attentrydtls",
    TODAY_ACTIVE: ".today-active",
    HOURS_WORKED: "b"
};
const DEFAULT_SETTINGS = {
    MAX_WORK_HOURS: 8,
    MAX_WORK_MINUTES: 0,
    BREAK_TIME: "00:00"
};

// Utility Functions
function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function convertTo12Hour(time24) {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function isValidTimeFormat(time) {
    const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
    return timeRegex.test(time);
}

function formatTime(ms) {
    return new Date(ms).toISOString().slice(11, 19);
}

function minutesToHHMM(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  // Pad with leading zeros if needed
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}`;
}

function calculateEndTime(workedTime, maxWorkHours = 8, maxWorkMinutes = 0, breakTime = "00:00") {
    const [maxH, maxM] = [maxWorkHours, maxWorkMinutes];
    let [workedH, workedM, workedS = 0] = workedTime.split(":").map(Number);
    const [addH, addM] = breakTime.split(":").map(Number);
    
    const remainingTime = ((maxH * 60 * 60 + maxM * 60) - 
                          (workedH * 60 * 60 + workedM * 60 + workedS) + 
                          (addH * 60 * 60 + addM * 60)) * 1000;
    
    const now = new Date();
    const endTime = new Date(now.getTime() + remainingTime);
    
    return [remainingTime, endTime];
}


function calculateBreakTime(checkInTime, workedTime) {
  const now = new Date();

  // Parse check-in time "HH:MM AM/PM"
  const [time, modifier] = checkInTime.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier.toUpperCase() === "PM" && hours !== 12) {
    hours += 12;
  }
  if (modifier.toUpperCase() === "AM" && hours === 12) {
    hours = 0;
  }

  const checkInDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );

  // Handle case if check-in was before midnight and current time is next day
  if (now < checkInDate) {
    checkInDate.setDate(checkInDate.getDate() - 1);
  }

  // Calculate total minutes elapsed since check-in
  const elapsedMinutes = Math.floor((now - checkInDate) / 60000);

  // Parse workedTime "HH:MM:SS"
  const [workedH, workedM, workedS] = workedTime.split(":").map(Number);
  const totalWorkedMinutes = workedH * 60 + workedM + workedS / 60;

  // Calculate break time (in minutes)
  const breakTime = Math.max(0, Math.floor(elapsedMinutes - totalWorkedMinutes));

  return breakTime;
}

// DOM Extraction
function extractWorkedHours(dayOfWeek) {
    const divElements = document.querySelectorAll(SELECTORS.TODAY_ACTIVE);
    const divArray = Array.from(divElements);
    
    if (divArray.length > 0) {
        const parentDiv = divArray[0];
        const innerDiv = parentDiv.querySelectorAll(SELECTORS.ATTENDANCE_DETAILS);
        if (innerDiv.length < 2) {
            return null;
        }

        const boldElement = innerDiv[innerDiv.length - 1].querySelector(SELECTORS.HOURS_WORKED); // last index is worked hours
        
        if (!boldElement) {
            console.error("No <b> tag found inside the div with 'Worked hours'.");
            return null;
        }
        return boldElement.textContent.trim();
    }
    return null;
}

function extractCheckInTime() {
    const divElements = document.querySelectorAll(SELECTORS.TODAY_ACTIVE);
    const divArray = Array.from(divElements);
    
    if (divArray.length > 0) {
        const parentDiv = divArray[0];
        const innerDiv = parentDiv.querySelectorAll(SELECTORS.ATTENDANCE_DETAILS);
        if (innerDiv.length < 2) {
            return null;
        }

        const boldElement = innerDiv[0].querySelector(SELECTORS.HOURS_WORKED); // 0 index is check in time
        
        if (!boldElement) {
            console.error("No <b> tag found inside the div with 'Check-in Time'.");
            return null;
        }
        return boldElement.textContent.trim();
    }
    return null;
}

// Overlay Functions
function createOverlay() {
    // Check if overlay already exists
    if (document.getElementById("igowhen-overlay")) {
        return;
    }

    // Find the target container
    const targetContainer = document.querySelector(".zpl_act.zpl_attnLstvw");
    if (!targetContainer) {
        console.error("Target container .zpl_act.zpl_attnLstvw not found");
        return;
    }

    const overlay = document.createElement("div");
    overlay.id = "igowhen-overlay";
    overlay.style.cssText = `
        position: absolute;
        bottom: 6px;
        right: 18px;
        background: #ffffff;
        color: #333333;
        padding: 10px 14px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        font-size: 10px;
        z-index: 1000;
        min-width: 140px;
    `;

    overlay.innerHTML = `
        <div id="igowhen-time" style="font-size: 18px; font-weight: 600; letter-spacing: 0.3px; color: #333333ff; margin-bottom: 3px;">
            --:--
        </div>
        <div id="igowhen-countdown" style="font-size: 10px; color: #5f6368; font-weight: 400;">
            <span style="font-weight: 500;">--:--:--</span> left
        </div>
    `;

    // Ensure parent has relative positioning
    if (getComputedStyle(targetContainer).position === 'static') {
        targetContainer.style.position = 'relative';
    }

    targetContainer.appendChild(overlay);
    console.log("Overlay created inside .zpl_act.zpl_attnLstvw");
}

function updateOverlay(endTime, remainingTime) {
    const timeElement = document.getElementById("igowhen-time");
    const countdownElement = document.getElementById("igowhen-countdown");
    
    if (timeElement) {
        timeElement.textContent = endTime || "--:--";
    }
    if (countdownElement) {
        countdownElement.textContent = `Remaining: ${remainingTime || "--:--:--"}`;
    }
}

function removeOverlay() {
    const overlay = document.getElementById("igowhen-overlay");
    if (overlay) {
        overlay.remove();
        console.log("Overlay removed");
    }
}

function toggleOverlayVisibility(enableOverlay) {
    if (enableOverlay) {
        createOverlay();
    } else {
        removeOverlay();
    }
}

// Main Logic
async function executeLogic() {
    chrome.storage.local.get(
        ["enable24HourClock", "enableOverlay", "reloadNumber", "maxWorkHours", "maxWorkMinutes"], 
        (settings) => {
            const is24HourClock = settings.enable24HourClock || false;
            const enableOverlay = settings.enableOverlay || false;
            const maxWorkHours = settings.maxWorkHours || DEFAULT_SETTINGS.MAX_WORK_HOURS;
            const maxWorkMinutes = settings.maxWorkMinutes || DEFAULT_SETTINGS.MAX_WORK_MINUTES;

            const currentDate = new Date();
            const dayOfWeek = currentDate.getDay();

            let endTimeFormatted = "Couldn't Parse the page";
            let remainingTimeFormatted = "N/A";
            let breakTimeFormatted = "N/A";

            const workedTime = extractWorkedHours(dayOfWeek);
            const checkInTime = extractCheckInTime();

            if (checkInTime && workedTime) {
                const breakTime = calculateBreakTime(checkInTime, workedTime);
                breakTimeFormatted = minutesToHHMM(breakTime);
            }
            
            if (workedTime) {
                const [remainingTime, endTime] = calculateEndTime(
                    workedTime, 
                    maxWorkHours, 
                    maxWorkMinutes
                );
                
                remainingTimeFormatted = formatTime(remainingTime);
                endTimeFormatted = is24HourClock 
                    ? endTime.toTimeString().slice(0, 5)
                    : convertTo12Hour(endTime.toTimeString().slice(0, 5));
            }

            // Save to storage
            chrome.storage.local.set({ 
                endTime: endTimeFormatted, 
                remainingTime: remainingTimeFormatted,
                breaktime: breakTimeFormatted,
                lastUpdateTime: Date.now()
            });
            
            // Update overlay
            toggleOverlayVisibility(enableOverlay);
            if (enableOverlay) {
                updateOverlay(endTimeFormatted, remainingTimeFormatted);
            }
            
            // Send message to extension (with error handling)
            chrome.runtime.sendMessage({ 
                endTime: endTimeFormatted, 
                remainingTime: remainingTimeFormatted,
                breaktime: breakTimeFormatted
            }, (response) => {
                if (chrome.runtime.lastError) {
                    // Suppress error - receiver might not be active
                    console.debug("Message sent but no receiver:", chrome.runtime.lastError.message);
                }
            });
        }
    );
}

function main() {
    executeLogic();
    
    // Listen for update requests
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "requestUpdate") {
            executeLogic();
            sendResponse({ status: "Update triggered" });
        }
        return true;
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local" && changes.enableOverlay) {
            toggleOverlayVisibility(changes.enableOverlay.newValue);
        }
    });

    // Periodic updates
    setInterval(() => {
        executeLogic();
    }, RELOADSEC * 1000);
}

// Page Detection and Initialization
function isTargetPage() {
    const url = window.location.href;
    return (
        (url.includes("https://people.zoho.in/") && 
         url.includes("/zp#attendance/entry/summary-mode:list")) ||
        url.includes("Zoho%20People.html")
    );
}

// Entry Point
if (isTargetPage()) {
    console.log("Correct page detected. Waiting for content to be ready...");

    const checkInterval = setInterval(() => {
        const targetDiv = document.querySelector(SELECTORS.ATTENDANCE_DETAILS);
        if (targetDiv) {
            console.log("Target content found. Running content script.");
            clearInterval(checkInterval);
            main();
        }
    }, 500);
    
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log("Timeout reached. Content not found.");
    }, 30000);
} else {
    console.log("Content script loaded, but this is not the target page.");
}