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
    const formattedTime = endTime.toTimeString().slice(0, 5);
    return formattedTime;
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
    
        let endTime = "Couldn't Parse the page";
        if (filteredDivArray[dayOfWeek]) {
            const boldElement = filteredDivArray[dayOfWeek].querySelector("b");    
            if (boldElement) {
                const boldText = boldElement.textContent.trim();
                endTime = is24HourClock ? calculateEndTime(boldText, maxWorkHours) : convertTo12Hour(calculateEndTime(boldText, maxWorkHours));
            } else {
                console.log("No <b> tag found inside the <div> with class 'zpl_attentrydtls'.");
            }
        } else {
            console.log("No <div> found with the class 'zpl_attentrydtls'.");
        }
    
        // Send the content to the popup
        chrome.runtime.sendMessage({ content: endTime }, (response) => {
        });
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
    window.location.href.includes("https://people.zoho.in/") && window.location.href.includes("/zp#attendance/entry/summary-mode:list") || 
    window.location.href === "file:///C:/Users/hooman/Downloads/attendance/Zoho%20People.html"
) {
    console.log("Correct page detected. Waiting for the page to fully load...");
    window.addEventListener("load", () => {
        console.log("Page fully loaded. Running content script.");
        main();
    });
} else {
    console.log("Content script loaded, but this is not the target page.");
}
