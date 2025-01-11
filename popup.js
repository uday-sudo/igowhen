console.log('This is a popup!');

document.addEventListener("DOMContentLoaded", () => {
    // Request the data
    chrome.runtime.sendMessage({ request: "getContent" }, (response) => {
        if (response && response.content) {
            // Display the content in the popup
            const contentElement = document.getElementById("content");
            contentElement.textContent = response.content;
        } else {
            console.log("No content received from the content script.");
        }
    });
});
