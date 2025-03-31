console.log("content.js executing");
const RELOADSEC = 0.5;

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

function calculateEndTime(workedTime, maxWorkHours = 8, maxWorkMinutes = 0, breakTime = "00:00") {
    const [maxH, maxM] = [maxWorkHours, maxWorkMinutes];
    let [workedH, workedM, workedS] = workedTime.split(":").map(Number);
    if (typeof workedS == 'undefined') {
        workedS = 0;
    }
    const [addH, addM] = breakTime.split(":").map(Number);
    const remainingTime = ( (maxH*60*60 + maxM*60) - (workedH*60*60 + workedM*60 + workedS) + (addH*60*60 + addM*60) ) * 1000
    const now = new Date();
    const endTime = new Date(now.getTime() + remainingTime);
    return [remainingTime, endTime];
}

async function executeLogic() {
    chrome.storage.local.get(["enable24HourClock", "reloadNumber", "maxWorkHours", "maxWorkMinutes"], (settings) => {

        const is24HourClock = settings.enable24HourClock || false;
        const maxWorkHours = settings.maxWorkHours || 8;
        const maxWorkMinutes = settings.maxWorkMinutes || 0;

        const currentDate = new Date();
        const dayOfWeek = currentDate.getDay();

        const divElements = document.querySelectorAll(".zpl_attentrydtls");
        const divArray = Array.from(divElements);

        // Filter the array to keep only the divs containing <em>Hrs worked</em>
        const filteredDivArray = divArray.filter(div => /Hrs|Hrs worked/i.test(div.textContent));

        let endTimeFormatted = "Couldn't Parse the page";
        let remainingTime = "N/A";
        let remainingTimeFormatted = "N/A";

        if (filteredDivArray[dayOfWeek]) {
            const boldElement = filteredDivArray[dayOfWeek].querySelector("b");
            if (boldElement) {
                const boldText = boldElement.textContent.trim();
                const [remainingTime, endTime] = calculateEndTime(boldText, maxWorkHours, maxWorkMinutes);
                const formatRemainingTime = (ms) => 
                    new Date(ms).toISOString().slice(11, 19);
                remainingTimeFormatted = formatRemainingTime(remainingTime);
                endTimeFormatted = is24HourClock ? endTime.toTimeString().slice(0, 5) : convertTo12Hour(endTime.toTimeString().slice(0, 5));
            } else {
                console.log("No <b> tag found inside the <div> with class 'zpl_attentrydtls'.");
            }
        } else {
            console.log("No <div> found with the class 'zpl_attentrydtls'.");
        }

        // Send endTime and remainingTime to the popup
        chrome.runtime.sendMessage({ endTime: endTimeFormatted, remainingTime: remainingTimeFormatted }, (response) => {});
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
    (
        window.location.href.includes("https://people.zoho.in/") &&
        window.location.href.includes("/zp#attendance/entry/summary-mode:list")
    ) ||
    window.location.href.includes("Zoho%20People.html")
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
