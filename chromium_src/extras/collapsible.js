// collapsible.js
document.addEventListener('DOMContentLoaded', function() {
    const settingsHeader = document.getElementById('settingsHeader');
    const settingsContent = document.getElementById('settingsContent');
    
    if (settingsHeader && settingsContent) {
        settingsHeader.addEventListener('click', function() {
            settingsHeader.classList.toggle('active');
            settingsContent.classList.toggle('active');
        });
    }
});