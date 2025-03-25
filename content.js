console.log("content.js executing");
const RELOADSEC = 5;

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

function calculateEndTime(workedTime, maxWork = "08:00", breakTime = "00:00") {
    const [maxH, maxM] = maxWork.split(":").map(Number);
    const [workedH, workedM] = workedTime.split(":").map(Number);
    const [addH, addM] = breakTime.split(":").map(Number);
    const now = new Date();
    const endTime = new Date(now.getTime() + (maxH * 60 + maxM + addH * 60 + addM - workedH * 60 - workedM) * 1000 * 60);
    return endTime;
}

function calculateRemainingTime(endTime) {
    const now = new Date();
    const diffMs = endTime - now;

    if (diffMs <= 0) return "00:00"; // Work time already over

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
}

async function executeLogic() {
    chrome.storage.local.get(["enable24HourClock", "reloadNumber", "maxWorkHours"], (settings) => {
        console.log("Settings loaded in content.js:", settings);

        const is24HourClock = settings.enable24HourClock || false;
        const maxWorkHours = settings.maxWorkHours || "08:00";

        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay();

        const divElements = document.querySelectorAll(".zpl_attentrydtls");
        const divArray = Array.from(divElements);

        // Filter the array to keep only the divs containing <em>Hrs worked</em>
        const filteredDivArray = divArray.filter(div => /Hrs|Hrs worked/i.test(div.textContent));

        let endTimeFormatted = "Couldn't Parse the page";
        let remainingTime = "N/A";

        if (filteredDivArray[dayOfWeek]) {
            const boldElement = filteredDivArray[dayOfWeek].querySelector("b");
            if (boldElement) {
                const boldText = boldElement.textContent.trim();
                const endTime = calculateEndTime(boldText, maxWorkHours);
                remainingTime = calculateRemainingTime(endTime);
                endTimeFormatted = is24HourClock ? endTime.toTimeString().slice(0, 5) : convertTo12Hour(endTime.toTimeString().slice(0, 5));
            } else {
                console.log("No <b> tag found inside the <div> with class 'zpl_attentrydtls'.");
            }
        } else {
            console.log("No <div> found with the class 'zpl_attentrydtls'.");
        }

        // Send endTime and remainingTime to the popup
        chrome.runtime.sendMessage({ endTime: endTimeFormatted, remainingTime }, (response) => {});
    });
}

function main() {
    executeLogic();
    setInterval(() => {
        executeLogic();
    }, RELOADSEC * 1000);
}

// Execute only when the page is fully loaded
if (
    window.location.href.includes("https://people.zoho.in/") &&
    window.location.href.includes("/zp#attendance/entry/summary-mode:list")
) {
    console.log("Correct page detected. Waiting for content to be ready...");

    function checkContentReady() {
        const targetDiv = document.querySelector(".zpl_attentrydtls");
        if (targetDiv) {
            console.log("Target content found. Running content script.");
            clearInterval(checkInterval); // Stop checking once the content is ready
            main();
        }
    }

    // Periodically check for the content every 500ms
    const checkInterval = setInterval(checkContentReady, 500);

    // Optional: Add a timeout to stop checking after 30 seconds
    setTimeout(() => {
        clearInterval(checkInterval);
        console.log("Timeout reached. Content not found.");
    }, 30000);
} else {
    console.log("Content script loaded, but this is not the target page.");
}
