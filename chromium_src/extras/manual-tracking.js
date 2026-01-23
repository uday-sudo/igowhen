// manual-tracking.js
if (typeof browser === "undefined") {
    var browser = chrome;
}

document.addEventListener('DOMContentLoaded', function() {
    const punchInBtn = document.getElementById('punchInBtn');
    const punchOutBtn = document.getElementById('punchOutBtn');
    const addManualEntryBtn = document.getElementById('addManualEntry');
    const entriesList = document.getElementById('entriesList');
    const manualTotalWorked = document.getElementById('manualTotalWorked');
    const manualEndTime = document.getElementById('manualEndTime');
    const manualRemaining = document.getElementById('manualRemaining');

    // Get today's date key
    function getTodayKey() {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    // Load entries for today
    function loadEntries() {
        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            renderEntries(entries);
            updateSummary(entries);
        });
    }

    // Save entries for today
    function saveEntries(entries) {
        const dateKey = getTodayKey();
        browser.storage.local.set({ [`manualEntries_${dateKey}`]: entries }, () => {
            console.log('Entries saved:', entries);
        });
    }

    // Punch In
    punchInBtn.addEventListener('click', () => {
        const now = new Date();
        const timeString = formatTime(now);
        
        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            
            // Create new entry with punch in time
            entries.push({
                id: Date.now(),
                punchIn: timeString,
                punchOut: null
            });
            
            saveEntries(entries);
            loadEntries();
        });
    });

    // Punch Out
    punchOutBtn.addEventListener('click', () => {
        const now = new Date();
        const timeString = formatTime(now);
        
        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            
            // Find the last entry without punch out
            const lastEntry = entries.reverse().find(e => !e.punchOut);
            
            if (lastEntry) {
                lastEntry.punchOut = timeString;
                entries.reverse(); // Restore original order
                saveEntries(entries);
                loadEntries();
            } else {
                alert('No active punch-in found. Please punch in first.');
            }
        });
    });

    // Add Manual Entry
    addManualEntryBtn.addEventListener('click', () => {
        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            
            // Add empty entry for manual input
            entries.push({
                id: Date.now(),
                punchIn: '',
                punchOut: ''
            });
            
            saveEntries(entries);
            loadEntries();
        });
    });

    // Render entries list
    function renderEntries(entries) {
        entriesList.innerHTML = '';
        
        if (entries.length === 0) {
            entriesList.innerHTML = '<p class="no-entries">No entries for today</p>';
            return;
        }

        entries.forEach((entry, index) => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry-item';
            entryDiv.innerHTML = `
                <div class="entry-row">
                    <div class="entry-time-inputs">
                        <div class="entry-field">
                            <label>In:</label>
                            <input type="time" class="time-input" value="${entry.punchIn}" 
                                   data-index="${index}" data-field="punchIn" step="1">
                        </div>
                        <div class="entry-field">
                            <label>Out:</label>
                            <input type="time" class="time-input" value="${entry.punchOut || ''}" 
                                   data-index="${index}" data-field="punchOut" step="1"
                                   ${!entry.punchOut ? 'placeholder="Active"' : ''}>
                        </div>
                    </div>
                    <div class="entry-actions">
                        <div class="entry-duration">
                            ${calculateDuration(entry.punchIn, entry.punchOut)}
                        </div>
                        <button class="delete-btn" data-index="${index}" title="Delete entry">×</button>
                    </div>
                </div>
            `;
            entriesList.appendChild(entryDiv);
        });

        // Add event listeners for editing
        document.querySelectorAll('.time-input').forEach(input => {
            input.addEventListener('change', handleTimeChange);
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }

    // Handle time input changes
    function handleTimeChange(e) {
        const index = parseInt(e.target.dataset.index);
        const field = e.target.dataset.field;
        const value = e.target.value;

        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            
            if (entries[index]) {
                entries[index][field] = value;
                saveEntries(entries);
                loadEntries();
            }
        });
    }

    // Handle entry deletion
    function handleDelete(e) {
        const index = parseInt(e.target.dataset.index);
        
        // Create custom modal
        const modal = document.createElement('div');
        modal.className = 'delete-modal';
        modal.innerHTML = `
            <div class="delete-modal-content">
                <h3>Delete Entry?</h3>
                <p>Are you sure you want to delete this time entry?</p>
                <div class="delete-modal-buttons">
                    <button class="modal-btn modal-cancel">Cancel</button>
                    <button class="modal-btn modal-delete">Delete</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Handle button clicks
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.modal-delete').addEventListener('click', () => {
            const dateKey = getTodayKey();
            browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
                const entries = data[`manualEntries_${dateKey}`] || [];
                entries.splice(index, 1);
                saveEntries(entries);
                loadEntries();
            });
            modal.remove();
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Calculate duration between two times
    function calculateDuration(punchIn, punchOut) {
        if (!punchIn) return '<span class="active-label">--:--:--</span>';
        
        // If no punch out, calculate from punch in to now
        if (!punchOut) {
            const now = new Date();
            const [inH, inM, inS = 0] = punchIn.split(':').map(Number);
            
            const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
            const punchInSeconds = inH * 3600 + inM * 60 + inS;
            
            let totalSeconds = currentSeconds - punchInSeconds;
            
            // Handle overnight shift
            if (totalSeconds < 0) {
                totalSeconds += 24 * 3600;
            }
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            return `<span class="active-label">${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} (Active)</span>`;
        }

        const [inH, inM, inS = 0] = punchIn.split(':').map(Number);
        const [outH, outM, outS = 0] = punchOut.split(':').map(Number);

        let totalSeconds = (outH * 3600 + outM * 60 + outS) - (inH * 3600 + inM * 60 + inS);
        
        // Handle overnight shift
        if (totalSeconds < 0) {
            totalSeconds += 24 * 3600;
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Calculate total worked time
    function calculateTotalWorked(entries) {
        let totalSeconds = 0;
        const now = new Date();
        const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

        entries.forEach(entry => {
            if (entry.punchIn) {
                const [inH, inM, inS = 0] = entry.punchIn.split(':').map(Number);
                const punchInSeconds = inH * 3600 + inM * 60 + inS;
                
                if (entry.punchOut) {
                    // Completed entry
                    const [outH, outM, outS = 0] = entry.punchOut.split(':').map(Number);
                    let duration = (outH * 3600 + outM * 60 + outS) - punchInSeconds;
                    
                    if (duration < 0) {
                        duration += 24 * 3600;
                    }
                    
                    totalSeconds += duration;
                } else {
                    // Active entry - calculate from punch in to now
                    let duration = currentSeconds - punchInSeconds;
                    
                    if (duration < 0) {
                        duration += 24 * 3600;
                    }
                    
                    totalSeconds += duration;
                }
            }
        });

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return {
            formatted: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
            totalSeconds
        };
    }

    // Update summary
    function updateSummary(entries) {
        const { formatted: totalWorked, totalSeconds } = calculateTotalWorked(entries);
        manualTotalWorked.textContent = totalWorked;

        // Get required work hours
        browser.storage.local.get(['maxWorkHours', 'maxWorkMinutes'], (settings) => {
            const maxWorkHours = settings.maxWorkHours || 8;
            const maxWorkMinutes = settings.maxWorkMinutes || 0;
            const requiredSeconds = maxWorkHours * 3600 + maxWorkMinutes * 60;

            const remainingSeconds = Math.max(0, requiredSeconds - totalSeconds);
            
            // Format remaining time
            const remH = Math.floor(remainingSeconds / 3600);
            const remM = Math.floor((remainingSeconds % 3600) / 60);
            const remS = remainingSeconds % 60;
            manualRemaining.textContent = `${String(remH).padStart(2, '0')}:${String(remM).padStart(2, '0')}:${String(remS).padStart(2, '0')}`;

            // Calculate end time
            if (remainingSeconds > 0) {
                const now = new Date();
                const endTime = new Date(now.getTime() + remainingSeconds * 1000);
                
                browser.storage.local.get(['enable24HourClock'], (data) => {
                    const is24Hour = data.enable24HourClock || false;
                    
                    if (is24Hour) {
                        manualEndTime.textContent = endTime.toTimeString().slice(0, 5);
                    } else {
                        const hours = endTime.getHours();
                        const minutes = endTime.getMinutes();
                        const period = hours >= 12 ? 'PM' : 'AM';
                        const hours12 = hours % 12 || 12;
                        manualEndTime.textContent = `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
                    }
                });
            } else {
                manualEndTime.textContent = 'Done!';
            }
        });
    }

    // Format time as HH:MM:SS
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    // Initial load
    loadEntries();

    // Refresh every second to update active entry duration and remaining time
    setInterval(() => {
        const dateKey = getTodayKey();
        browser.storage.local.get([`manualEntries_${dateKey}`], (data) => {
            const entries = data[`manualEntries_${dateKey}`] || [];
            
            // Re-render entries to update active durations
            renderEntries(entries);
            
            // Update summary
            updateSummary(entries);
        });
    }, 1000);
});
