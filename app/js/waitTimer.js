/**
 * WaitTimerModule
 * Handles the wait timer functionality for delayed gratification / procrastination tracking
 * Creates countdown timer panels with Distract Me / Super Resist buttons (for 'do less')
 * or Do It Early button (for 'do more')
 */
var WaitTimerModule = (function () {
    // Private variables
    var json;
    var activeIntervals = {}; // Store interval references by timer ID
    var loadedMemeIndices = []; // Track which memes have been loaded in current session
    var isLoadingMemes = false; // Prevent multiple simultaneous loads
    
    // Hardcoded meme configuration - update MEME_COUNT when more images are renamed
    var MEME_COUNT = 1175; // Number of images named 1.jpg through N.jpg
    var MEME_EXTENSION = 'jpg'; // All images use this extension

    /**
     * Initialize the module with app state
     * @param {Object} appJson - The application JSON object
     */
    function init(appJson) {
        json = appJson;
        setupEventListeners();
        restoreActiveWaitTimers();
    }

    /**
     * Setup event listeners for timer controls
     */
    function setupEventListeners() {
        // Distract Me button
        $(document).on('click', '.wait-timer-distract-btn', function(e) {
            e.preventDefault();
            openDistractionPanel();
        });

        // Super Resist button (for 'do less' habits)
        $(document).on('click', '.wait-timer-resist-btn', function(e) {
            e.preventDefault();
            handleSuperResist();
        });

        // Do It Early button (for 'do more' habits)
        $(document).on('click', '.wait-timer-do-early-btn', function(e) {
            e.preventDefault();
            handleDoItEarly();
        });

        // X button toggles footer with options (like activity timer)
        $(document).on('click', '.wait-timer-discard-btn', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            panel.find('.wait-timer-footer').slideToggle('fast');
        });
        
        // Footer cancel button (hide footer)
        $(document).on('click', '.wait-timer-footer .cancel', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            panel.find('.wait-timer-footer').slideUp('fast');
        });
        
        // End Now button
        $(document).on('click', '.wait-timer-end-now-btn', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            var timerId = panel.data('timer-id');
            endWaitTimerNow(timerId);
        });
        
        // End In Past button
        $(document).on('click', '.wait-timer-end-past-btn', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            var timerId = panel.data('timer-id');
            showEndInPastDialog(timerId, panel);
        });
        
        // Remove Entirely button
        $(document).on('click', '.wait-timer-remove-btn', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            var timerId = panel.data('timer-id');
            removeWaitTimerEntirely(timerId);
        });
        
        // Submit past end time
        $(document).on('click', '.wait-timer-footer .submit-past-time', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.wait-timer-panel');
            var timerId = panel.data('timer-id');
            submitPastEndTime(timerId, panel);
        });

        // Close distraction panel - both the bottom button and X button
        $(document).on('click', '.distraction.log-more-info .cancel, .distraction-close-x', function(e) {
            e.preventDefault();
            closeDistractionPanel();
        });

        // Also close when clicking the overlay
        $(document).on('click', '.distraction-overlay', function(e) {
            e.preventDefault();
            closeDistractionPanel();
        });

        // Lazy load more memes on scroll (using event delegation for dynamic content)
        $('.distraction-memes-container').on('scroll', function() {
            var container = $(this);
            // Trigger load when user scrolls within 200px of bottom
            if (container.scrollTop() + container.innerHeight() >= container[0].scrollHeight - 200) {
                loadMemes();
            }
        });
    }

    /**
     * Check if there's an active wait timer
     * @returns {boolean}
     */
    function hasActiveWaitTimer() {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject || !jsonObject.action) return false;
        
        // Check action records for active waits (status === 1)
        var activeWaits = jsonObject.action.filter(function(e) {
            return e && e.clickType === 'wait' && e.status === 1;
        });

        if (activeWaits.length === 0) return false;

        // Check if the most recent active wait hasn't expired yet
        var mostRecentWait = activeWaits[activeWaits.length - 1];
        var now = Math.round(new Date() / 1000);

        return mostRecentWait.waitStamp > now;
    }

    /**
     * Get the active wait timer type
     * @returns {string|null} 'use', 'bought', 'both', or null
     */
    function getActiveWaitType() {
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject || !jsonObject.action) return null;

        // Check action records for active waits (status === 1)
        var activeWaits = jsonObject.action.filter(function(e) {
            return e && e.clickType === 'wait' && e.status === 1;
        });

        if (activeWaits.length === 0) return null;

        var mostRecentWait = activeWaits[activeWaits.length - 1];
        return mostRecentWait.waitType || null;
    }

    /**
     * Start a new wait timer (called from wait.js when user creates a wait)
     * This creates the visual panel in #wait-timers-container
     * @param {number} waitEndTimestamp - When the wait ends (unix timestamp)
     * @param {string} waitType - 'use', 'bought', or 'both'
     */
    function createWaitTimerPanel(waitEndTimestamp, waitType) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var isdoLess = jsonObject.option.baseline.doLess;
        var isDoEqual = jsonObject.option.baseline.doEqual
        var timerId = 'wait_' + Math.round(new Date() / 1000);
        
        var now = Math.round(new Date() / 1000);
        var remainingSeconds = Math.max(0, waitEndTimestamp - now);
        var timeDisplay = formatTimerDisplay(remainingSeconds);

        // Determine button configuration based on habit direction
        var buttonsHtml = '';
        if (isdoLess || isDoEqual) {
            // 'Do less' habit: Delayed Gratification language
            buttonsHtml = 
                '<button class="wait-timer-distract-btn btn-timer-control">' +
                    'Distract Me!' +
                '</button>' +
                '<button class="wait-timer-resist-btn btn-timer-control btn-super">' +
                    '<i class="fas fa-fist-raised"></i> Super Resist!' +
                '</button>';
        } else {
            // 'Do more' habit: Procrastination language
            buttonsHtml = 
                '<button class="wait-timer-distract-btn btn-timer-control">' +
                    'Distract Me!' +
                '</button>' +
                '<button class="wait-timer-do-early-btn btn-timer-control btn-action">' +
                    '<i class="fas fa-bolt"></i> Do It Early!' +
                '</button>';
        }

        // Title based on habit direction
        var titleText = isdoLess || isDoEqual ? 'Waiting it out...' : 'Countdown to action...';
        var subtitleText = isdoLess || isDoEqual
            ? 'Stay strong! You\'ve got this.' 
            : 'Time until you should do it again';

        // Note: data attributes still use 'goal' prefix for backward compat with existing panels
        var html = '<div class="wait-timer-panel" data-timer-id="' + timerId + '" data-goal-type="' + waitType + '" data-goal-end="' + waitEndTimestamp + '">' +
            '<div class="wait-timer-header">' +
                '<div class="wait-timer-title"><i class="fas fa-hourglass-half"></i> ' + titleText + '</div>' +
                '<button class="wait-timer-discard-btn" title="Options">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="wait-timer-body">' +
                '<div class="wait-timer-left">' +
                    '<div id="' + timerId + '" class="fibonacci-timer counting">' +
                        '<div class="boxes">' +
                            '<div>' +
                                '<span class="timerSpan daysSinceLastClick">' + timeDisplay.days + '</span>' +
                                '<span>Day(s)</span>' +
                            '</div>' +
                            '<div>' +
                                '<span class="timerSpan hoursSinceLastClick">' + timeDisplay.hours + '</span>' +
                                '<span>Hours</span>' +
                            '</div>' +
                            '<div>' +
                                '<span class="timerSpan minutesSinceLastClick">' + timeDisplay.minutes + '</span>' +
                                '<span>Mins</span>' +
                            '</div>' +
                            '<div>' +
                                '<span class="timerSpan secondsSinceLastClick">' + timeDisplay.seconds + '</span>' +
                                '<span>Secs</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="wait-timer-status">' +
                        '<span class="status-text">' + subtitleText + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="wait-timer-right">' +
                    '<div class="wait-timer-controls">' +
                        buttonsHtml +
                    '</div>' +
                '</div>' +
            '</div>' +
            // Footer with end options (hidden by default, toggled by X button)
            '<div class="wait-timer-footer" style="display: none;">' +
                '<p class="text-left text-white mb-3" style="font-size: 1.1rem;">How would you like to end this wait?</p>' +
                '<div class="wait-timer-end-options">' +
                    '<button class="wait-timer-end-now-btn btn btn-outline-light btn-sm">' +
                        '<i class="fas fa-stop-circle"></i> End Now' +
                    '</button>' +
                    '<button class="wait-timer-end-past-btn btn btn-outline-light btn-sm">' +
                        '<i class="fas fa-history"></i> End in the Past' +
                    '</button>' +
                    '<button class="wait-timer-remove-btn btn btn-outline-danger btn-sm">' +
                        '<i class="fas fa-trash"></i> Remove Entirely' +
                    '</button>' +
                '</div>' +
                '<div class="wait-timer-past-picker" style="display: none;">' +
                    '<p class="text-white mt-3 mb-2">How long did you wait?</p>' +
                    '<div class="time-picker-container">' +
                        '<select class="past-picker-hours">' +
                            '<option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>' +
                            '<option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option>' +
                            '<option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option>' +
                            '<option value="12">12</option>' +
                        '</select>' +
                        '<span class="label">h</span>' +
                        '<select class="past-picker-minutes">' +
                            '<option value="0">00</option><option value="15">15</option><option value="30">30</option><option value="45">45</option>' +
                        '</select>' +
                        '<span class="label">m</span>' +
                    '</div>' +
                    '<div class="row no-gutters mt-3">' +
                        '<div class="col-6" style="padding-right:7px;">' +
                            '<button class="cancel btn btn-outline-light btn-md btn-block">Cancel</button>' +
                        '</div>' +
                        '<div class="col-6" style="padding-left:7px;">' +
                            '<button class="submit-past-time btn btn-light btn-md btn-block">Submit</button>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        // Insert into wait-timers-container
        var container = $('#wait-timers-container');
        if (container.length) {
            container.html(html); // Replace any existing (only one wait timer at a time)
        }

        // Start countdown interval
        startCountdownInterval(timerId, waitEndTimestamp);

        // Adjust fibonacci timer sizing - defer to ensure DOM is rendered
        setTimeout(function() {
            adjustTimerBoxVisibility(timerId);
            TimersModule.adjustFibonacciTimerToBoxes(timerId);
        }, 0);
    }

    /**
     * Start countdown interval for wait timer
     * @param {string} timerId - Timer ID
     * @param {number} waitEndTimestamp - When the wait ends
     */
    function startCountdownInterval(timerId, waitEndTimestamp) {
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
        }

        activeIntervals[timerId] = setInterval(function() {
            var now = Math.round(new Date() / 1000);
            var remainingSeconds = Math.max(0, waitEndTimestamp - now);
            
            if (remainingSeconds <= 0) {
                // Timer completed!
                clearInterval(activeIntervals[timerId]);
                delete activeIntervals[timerId];
                handleWaitTimerComplete(timerId);
                return;
            }

            var timeDisplay = formatTimerDisplay(remainingSeconds);
            updateTimerUI(timerId, timeDisplay);
        }, 1000);
    }

    /**
     * Handle wait timer completion
     * @param {string} timerId - Timer ID
     */
    function handleWaitTimerComplete(timerId) {
        var panel = $('.wait-timer-panel[data-timer-id="' + timerId + '"]');
        var waitType = panel.data('goal-type'); // data attribute still named goal-type
        
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;
        
        // Get the start timestamp from the action records
        var waits = jsonObject.action.filter(function(e) {
            return e && (e.clickType === 'wait') && e.status === 1;
        });
        
        var startStamp = 0;
        if (waits.length > 0) {
            startStamp = waits[waits.length - 1].clickStamp;
        }
        
        var actualEnd = Math.round(new Date() / 1000);
        
        // Update storage status (3 = completed on time)
        StorageModule.changeWaitStatus(3, waitType, actualEnd);
        
        // Log to action log (pass null to use module-level json)
        ActionLogModule.placeWaitIntoLog(startStamp, actualEnd, waitType, false, null);
        
        // Update longest wait - pass null to use module-level json
        if (typeof WaitModule !== 'undefined') {
            WaitModule.replaceLongestWait(startStamp, actualEnd, null);
        }
        
        // Update completed waits counter in storage
        if (jsonObject.statistics && jsonObject.statistics.wait) {
            jsonObject.statistics.wait.completedWaits = 
                (jsonObject.statistics.wait.completedWaits || 0) + 1;
            $("#numberOfWaitsCompleted").html(jsonObject.statistics.wait.completedWaits);
            
            // Reset active wait flags
            jsonObject.statistics.wait.activeWaitUse = 0;
            jsonObject.statistics.wait.activeWaitBought = 0;
            jsonObject.statistics.wait.activeWaitBoth = 0;
            
            // Save updated stats back to storage
            StorageModule.setStorageObject(jsonObject);
        }
        
        // Refresh progress report to show new wait data
        if (typeof StatsDisplayModule !== 'undefined' && json) {
            StatsDisplayModule.initiateReport(json);
        }
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }
        
        // Determine habit direction for messaging
        var isdoLess = jsonObject.option && jsonObject.option.baseline && jsonObject.option.baseline.doLess;
        
        // Show completion notification with extend option
        showWaitCompletionNotification(timerId, waitType, isdoLess);
    }
    
    /**
     * Show notification when wait timer completes, offering extension
     * @param {string} timerId - Timer ID
     * @param {string} waitType - 'use', 'bought', or 'both'
     * @param {boolean} isdoLess - Whether this is a 'do less' habit
     */
    function showWaitCompletionNotification(timerId, waitType, isdoLess) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var affirmations = jsonObject && jsonObject.affirmations 
            ? jsonObject.affirmations 
            : ['Great job!', 'Keep it up!', 'You did it!'];
        var affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
        
        var message = isdoLess 
            ? '🎉 Congrats! You made it through the wait! ' + affirmation
            : '⏰ Time\'s up! Ready to take action? ' + affirmation;
        
        NotificationsModule.createNotification(message, null, {
            type: 'wait_completed',
            responseType: 'wait_completed',
            waitType: waitType,
            timerId: timerId
        });
        
        // Remove the panel after showing notification
        removeWaitTimerPanel(timerId);
        
        // Play a sound or trigger confetti for celebration
        if (typeof UIModule !== 'undefined') {
            UIModule.shootConfetti();
        }
    }

    /**
     * Update timer display values
     * @param {string} timerId - Timer ID
     * @param {object} timeDisplay - Formatted time object
     */
    function updateTimerUI(timerId, timeDisplay) {
        var timerEl = $('#' + timerId);
        if (!timerEl.length) return;

        timerEl.find('.daysSinceLastClick').text(timeDisplay.days);
        timerEl.find('.hoursSinceLastClick').text(timeDisplay.hours);
        timerEl.find('.minutesSinceLastClick').text(timeDisplay.minutes);
        timerEl.find('.secondsSinceLastClick').text(timeDisplay.seconds);
        
        adjustTimerBoxVisibility(timerId);
        TimersModule.adjustFibonacciTimerToBoxes(timerId);
    }

    /**
     * Show/hide timer boxes based on values (for countdown, show all non-zero)
     * @param {string} timerId - Timer ID
     */
    function adjustTimerBoxVisibility(timerId) {
        var timerEl = $('#' + timerId);
        var days = parseInt(timerEl.find('.daysSinceLastClick').text()) || 0;
        var hours = parseInt(timerEl.find('.hoursSinceLastClick').text()) || 0;
        var minutes = parseInt(timerEl.find('.minutesSinceLastClick').text()) || 0;

        var boxes = timerEl.find('.boxes > div');
        
        // For countdown: show progressively as values become non-zero
        $(boxes[0]).toggle(days > 0);
        $(boxes[1]).toggle(days > 0 || hours > 0);
        $(boxes[2]).toggle(days > 0 || hours > 0 || minutes > 0);
    }

    /**
     * Format seconds into days:hours:minutes:seconds display
     * @param {number} totalSeconds - Total remaining seconds
     * @returns {object} Object with days, hours, minutes, seconds as strings
     */
    function formatTimerDisplay(totalSeconds) {
        var days = Math.floor(totalSeconds / 86400);
        var hours = Math.floor((totalSeconds % 86400) / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        return {
            days: days.toString(),
            hours: hours.toString(),
            minutes: minutes.toString(),
            seconds: seconds.toString().padStart(2, '0')
        };
    }

    /**
     * Remove wait timer panel from DOM
     * @param {string} timerId - Timer ID
     */
    function removeWaitTimerPanel(timerId) {
        // Stop interval
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
            delete activeIntervals[timerId];
        }

        var panel = $('.wait-timer-panel[data-timer-id="' + timerId + '"]');
        panel.fadeOut(300, function() {
            $(this).remove();
        });
    }

    /**
     * End wait timer now (user chose to end it at current time)
     * @param {string} timerId - Timer ID
     */
    function endWaitTimerNow(timerId) {
        var panel = $('.wait-timer-panel[data-timer-id="' + timerId + '"]');
        var waitType = panel.data('goal-type'); // data attribute still named goal-type
        
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;
        
        // Get start timestamp from action records
        var waits = jsonObject.action.filter(function(e) {
            return e && e.clickType === 'wait' && e.status === 1;
        });
        
        var startStamp = 0;
        if (waits.length > 0) {
            startStamp = waits[waits.length - 1].clickStamp;
        }
        
        var actualEnd = Math.round(new Date() / 1000);
        
        // Update storage status (2 = ended early)
        StorageModule.changeWaitStatus(2, waitType, actualEnd);
        
        // Log to action log (pass null to use module-level json)
        ActionLogModule.placeWaitIntoLog(startStamp, actualEnd, waitType, false, null);
        
        // Update longest wait - pass null to use module-level json
        if (typeof WaitModule !== 'undefined') {
            WaitModule.replaceLongestWait(startStamp, actualEnd, null);
        }
        
        // Update completed waits counter in storage
        if (jsonObject.statistics && jsonObject.statistics.wait) {
            jsonObject.statistics.wait.completedWaits = 
                (jsonObject.statistics.wait.completedWaits || 0) + 1;
            $("#numberOfWaitsCompleted").html(jsonObject.statistics.wait.completedWaits);
            
            // Reset active wait flags
            jsonObject.statistics.wait.activeWaitUse = 0;
            jsonObject.statistics.wait.activeWaitBought = 0;
            jsonObject.statistics.wait.activeWaitBoth = 0;
            
            // Save updated stats back to storage
            StorageModule.setStorageObject(jsonObject);
        }
        
        // Refresh progress report to show new wait data
        if (typeof StatsDisplayModule !== 'undefined' && json) {
            StatsDisplayModule.initiateReport(json);
        }
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }
        
        // Show notification
        var affirmations = ['Great effort!', 'Keep it up!', 'Well done!'];
        if (jsonObject.affirmations && jsonObject.affirmations.length > 0) {
            affirmations = jsonObject.affirmations;
        }
        var affirmation = affirmations[Math.floor(Math.random() * affirmations.length)];
        NotificationsModule.createNotification('Wait ended. ' + affirmation, null, { type: 'wait_ended_early' });
        
        removeWaitTimerPanel(timerId);
    }
    
    /**
     * Show the "end in past" time picker
     * @param {string} timerId - Timer ID
     * @param {jQuery} panel - The panel element
     */
    function showEndInPastDialog(timerId, panel) {
        panel.find('.wait-timer-end-options').hide();
        panel.find('.wait-timer-past-picker').slideDown('fast');
    }
    
    /**
     * Submit the past end time (how long did you wait)
     * @param {string} timerId - Timer ID
     * @param {jQuery} panel - The panel element
     */
    function submitPastEndTime(timerId, panel) {
        var hoursWaited = parseInt(panel.find('.past-picker-hours').val()) || 0;
        var minutesWaited = parseInt(panel.find('.past-picker-minutes').val()) || 0;
        
        var totalSecondsWaited = (hoursWaited * 3600) + (minutesWaited * 60);
        
        // Validate: must wait at least some time
        if (totalSecondsWaited <= 0) {
            alert('Please select how long you waited.');
            return;
        }
        
        var waitType = panel.data('goal-type'); // data attribute still named goal-type
        
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;
        
        // Get start timestamp
        var waits = jsonObject.action.filter(function(e) {
            return e && e.clickType === 'wait' && e.status === 1;
        });
        
        var startStamp = 0;
        if (waits.length > 0) {
            startStamp = waits[waits.length - 1].clickStamp;
        }
        
        // Calculate end time based on how long they waited
        var endTime = startStamp + totalSecondsWaited;
        
        // Validate: end time must not be in the future
        var currentTime = Math.round(new Date() / 1000);
        if (endTime > currentTime) {
            alert('The duration entered would result in an end time in the future. Please enter a shorter duration or end the wait now.');
            return;
        }
        
        // Update storage status (2 = ended early)
        StorageModule.changeWaitStatus(2, waitType, endTime);
        
        // Log to action log (pass null to use module-level json)
        ActionLogModule.placeWaitIntoLog(startStamp, endTime, waitType, false, null);
        
        // Update longest wait - pass null to use module-level json
        if (typeof WaitModule !== 'undefined') {
            WaitModule.replaceLongestWait(startStamp, endTime, null);
        }
        
        // Update completed waits counter in storage
        if (jsonObject.statistics && jsonObject.statistics.wait) {
            jsonObject.statistics.wait.completedWaits = 
                (jsonObject.statistics.wait.completedWaits || 0) + 1;
            $("#numberOfWaitsCompleted").html(jsonObject.statistics.wait.completedWaits);
            
            // Reset active wait flags
            jsonObject.statistics.wait.activeWaitUse = 0;
            jsonObject.statistics.wait.activeWaitBought = 0;
            jsonObject.statistics.wait.activeWaitBoth = 0;
            
            // Save updated stats back to storage
            StorageModule.setStorageObject(jsonObject);
        }
        
        // Refresh progress report to show new wait data
        if (typeof StatsDisplayModule !== 'undefined' && json) {
            StatsDisplayModule.initiateReport(json);
        }
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }
        
        // Show notification
        NotificationsModule.createNotification('Wait logged with adjusted duration.', null, { type: 'wait_ended_past' });
        
        removeWaitTimerPanel(timerId);
    }
    
    /**
     * Remove wait timer entirely (no log entry)
     * @param {string} timerId - Timer ID
     */
    function removeWaitTimerEntirely(timerId) {
        if (!confirm('Remove this wait entirely? It will not be logged.')) return;
        
        var panel = $('.wait-timer-panel[data-timer-id="' + timerId + '"]');
        var waitType = panel.data('goal-type'); // data attribute still named goal-type
        
        var jsonObject = StorageModule.retrieveStorageObject();
        if (!jsonObject) return;
        
        // Update storage status (4 = removed/cancelled without logging)
        StorageModule.changeWaitStatus(4, waitType);
        
        // Reset active wait flags
        if (jsonObject.statistics && jsonObject.statistics.wait) {
            jsonObject.statistics.wait.activeWaitUse = 0;
            jsonObject.statistics.wait.activeWaitBought = 0;
            jsonObject.statistics.wait.activeWaitBoth = 0;
            
            // Save changes to storage
            StorageModule.setStorageObject(jsonObject);
        }
        
        removeWaitTimerPanel(timerId);
    }

    /**
     * Handle Super Resist button click (2x confetti, doesn't end timer)
     */
    function handleSuperResist() {
        // Trigger super confetti (2x intensity)
        UIModule.shootConfetti('super');
        
        // Show encouraging notification
        var messages = [
            'AMAZING willpower! 💪',
            'You\'re crushing it! 🎉',
            'Super strength activated! ⚡',
            'Legendary resist! 🏆',
            'Incredible self-control! 🌟'
        ];
        var message = messages[Math.floor(Math.random() * messages.length)];
        NotificationsModule.createNotification(message, null, { type: 'super_resist' });
    }

    /**
     * Handle Do It Early button click (opens Did It dialog)
     */
    function handleDoItEarly() {
        // Close the wait timer by triggering use button click
        // This will open the "Did it" dialog
        $('#use-button').click();
    }

    /**
     * Restore active wait timers from storage on app load
     */
    function restoreActiveWaitTimers() {
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Check if there's an active goal/wait
        if (!hasActiveWaitTimer()) return;

        var waitType = getActiveWaitType();
        
        // Find the most recent wait action to get end timestamp
        var waits = jsonObject.action.filter(function(e) {
            return e && e.clickType === 'wait' && e.status === 1;
        });

        if (waits.length === 0) return;

        var mostRecentWait = waits[waits.length - 1];
        var waitEndTimestamp = mostRecentWait.waitStamp;
        
        // Only create panel if wait hasn't ended yet
        var now = Math.round(new Date() / 1000);
        if (waitEndTimestamp > now) {
            createWaitTimerPanel(waitEndTimestamp, waitType);
        }
    }

    // ==========================================
    // Distraction Memes Functionality
    // ==========================================

    /**
     * Open the distraction memes panel
     */
    function openDistractionPanel() {
        // Show the overlay first
        $('.distraction-overlay').fadeIn(200);
        
        // Check if online
        if (!navigator.onLine) {
            $('.distraction-offline-message').show();
            $('.distraction-memes-container').hide();
        } else {
            $('.distraction-offline-message').hide();
            $('.distraction-memes-container').show();
            loadMemes();
        }

        // Show the panel (using slideDown for animation, but it's positioned fixed)
        $('.distraction.log-more-info').fadeIn(300);
        
        // Prevent body scrolling
        $('body').css('overflow', 'hidden');
    }

    /**
     * Close the distraction memes panel
     */
    function closeDistractionPanel() {
        // Hide the panel and overlay
        $('.distraction.log-more-info').fadeOut(200);
        $('.distraction-overlay').fadeOut(200);
        
        // Clear loaded memes and reset state
        $('.distraction-memes-container').empty();
        loadedMemeIndices = [];
        isLoadingMemes = false;
        
        // Re-enable body scrolling
        $('body').css('overflow', '');
    }

    /**
     * Load memes into the container
     * Uses hardcoded MEME_COUNT - images are named 1.jpg through N.jpg
     */
    function loadMemes() {
        console.log('[WaitTimer] loadMemes called', { isLoadingMemes, MEME_COUNT, loadedMemeIndices });
        
        if (isLoadingMemes) {
            console.log('[WaitTimer] Already loading memes, skipping');
            return;
        }
        
        if (MEME_COUNT === 0) {
            console.log('[WaitTimer] MEME_COUNT is 0, showing no memes message');
            $('.distraction-memes-container').html(
                '<div class="no-memes-message">' +
                    '<i class="fas fa-image"></i>' +
                    '<p>No distraction memes available yet.</p>' +
                '</div>'
            );
            return;
        }

        // Get random indices that haven't been loaded yet
        var availableIndices = [];
        for (var i = 1; i <= MEME_COUNT; i++) {
            if (loadedMemeIndices.indexOf(i) === -1) {
                availableIndices.push(i);
            }
        }
        
        console.log('[WaitTimer] Available indices:', availableIndices);

        // Shuffle and take first 3 (fewer for larger images)
        availableIndices.sort(function() { return 0.5 - Math.random(); });
        var toLoad = availableIndices.slice(0, 3);

        if (toLoad.length === 0) {
            // All memes loaded, reset for infinite scroll
            console.log('[WaitTimer] All memes loaded, resetting');
            loadedMemeIndices = [];
            loadMemes();
            return;
        }

        var container = $('.distraction-memes-container');
        console.log('[WaitTimer] Container found:', container.length > 0, 'Loading:', toLoad);
        
        // Show loading indicator
        isLoadingMemes = true;
        var loadingHtml = '<div class="distraction-loading">' +
            '<i class="fas fa-circle-notch"></i>' +
            '<div>Loading more...</div>' +
        '</div>';
        container.append(loadingHtml);
        
        // Simulate slight delay for smoother UX, then load images
        setTimeout(function() {
            // Remove loading indicator
            container.find('.distraction-loading').remove();
            
            toLoad.forEach(function(index) {
                var imgSrc = '../assets/distraction-memes/' + index + '.' + MEME_EXTENSION;
                console.log('[WaitTimer] Loading meme:', imgSrc);
                
                var memeHtml = '<div class="meme-item">' +
                    '<img src="' + imgSrc + '" alt="Distraction meme" onerror="console.error(\'[WaitTimer] Failed to load:\', this.src)" />' +
                '</div>';
                
                container.append(memeHtml);
                loadedMemeIndices.push(index);
            });
            
            isLoadingMemes = false;
            console.log('[WaitTimer] Finished loading memes');
        }, 300); // Small delay for smooth UX
    }

    /**
     * End the active wait timer due to user action (did it, started timer, etc.)
     * Called when user performs an action that should end their wait
     * @param {string} reason - Reason for ending ('did_it', 'started_timer', 'spent')
     */
    function endActiveWaitTimerOnAction(reason) {
        if (!hasActiveWaitTimer()) return;

        var waitType = getActiveWaitType();
        var jsonObject = StorageModule.retrieveStorageObject();
        
        // Check if this action type should end the wait based on wait type
        // 'use' waits: end on 'did_it' or 'started_timer'
        // 'bought' waits: only end on 'spent'
        // 'both' waits: end on any action
        if (waitType === 'bought' && reason !== 'spent') {
            // 'To Buy It' waits only end when user spends
            return;
        }
        if (waitType === 'use' && reason === 'spent') {
            // 'To Do It' waits don't end on spending
            return;
        }
        
        // Find the active wait panel and get its timer ID
        var panel = $('.wait-timer-panel');
        if (panel.length > 0) {
            var timerId = panel.data('timer-id');
            
            // Stop the countdown interval
            if (activeIntervals[timerId]) {
                clearInterval(activeIntervals[timerId]);
                delete activeIntervals[timerId];
            }
            
            // Remove the panel
            panel.fadeOut(300, function() {
                $(this).remove();
            });
        }

        // Update the wait status in storage (status 2 = ended early)
        if (waitType) {
            var now = Math.round(new Date() / 1000);
            StorageModule.changeWaitStatus(2, waitType, now);
        }

        // Close distraction panel if open
        closeDistractionPanel();
    }

    // Public API
    return {
        init: init,
        hasActiveWaitTimer: hasActiveWaitTimer,
        getActiveWaitType: getActiveWaitType,
        createWaitTimerPanel: createWaitTimerPanel,
        removeWaitTimerPanel: removeWaitTimerPanel,
        restoreActiveWaitTimers: restoreActiveWaitTimers,
        openDistractionPanel: openDistractionPanel,
        closeDistractionPanel: closeDistractionPanel,
        endActiveWaitTimerOnAction: endActiveWaitTimerOnAction
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaitTimerModule;
} else {
    window.WaitTimerModule = WaitTimerModule;
}
