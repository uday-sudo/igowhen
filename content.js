function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function calculateEndTime(workedTime, breakTime = "00:00") {
    const [remH, remM] = workedTime.split(":").map(Number);
    const [addH, addM] = breakTime.split(":").map(Number);
    const now = new Date();
    const endTime = new Date(now.getTime() + 8 * 60 * 60 * 1000 + addH * 60 * 60 * 1000 + addM * 60 * 1000 - remH * 60 * 60 * 1000 - remM * 60 * 1000);
    // Format the time as HH:mm
    const formattedTime = endTime.toTimeString().slice(0, 5);
    return formattedTime;
}

async function executeLogic() {
    await sleep(1000); // Sleep for 1 seconds
    
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay();
    
    const divElements = document.querySelectorAll(".zpl_attentrydtls"); // class of timer div
    const divArray = Array.from(divElements);

    // Filter the array to keep only the divs containing <em>Hrs worked</em>
    const filteredDivArray = divArray.filter((div) => {
        const emElement = div.querySelector("em");
        return emElement && (emElement.textContent.trim() === "Hrs worked" || emElement.textContent.trim() === "Hrs");
    });

    endTime = "Couldn't Parse the page"
    if (filteredDivArray[dayOfWeek]) {
        const boldElement = filteredDivArray[dayOfWeek].querySelector("b");
        console.log("Total List of divs ", filteredDivArray)
    
        if (boldElement) {
            const boldText = boldElement.textContent.trim();
            endTime = calculateEndTime(boldText)
            console.log("End Time", endTime);
        } else {
            console.log("No <b> tag found inside the <div> with class 'zpl_attentrydtls'.");
        }
    } else {
        console.log("No <div> found with the class 'zpl_attentrydtls'.");
    }
    // Send the content to the popup
    chrome.runtime.sendMessage({ content: endTime }, (response) => {
        console.log("Message sent to popup:", response.status);
    });
    // if (endTime === "Error") {
    //     return false;
    // }
    // return true;
}

function main() {
    // Execute logic immediately, then every 5 seconds
    executeLogic();
    setInterval(() => {
        executeLogic();
    }, 5000);
}

if (window.location.href === "https://people.zoho.in/aihifusion/zp#attendance/entry/summary-mode:list") {
    console.log("Correct page detected. Running content script.");
    main();
} else {
    console.log("Content script loaded, but this is not the target page.");
}