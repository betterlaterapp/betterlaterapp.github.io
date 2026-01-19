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
    var MEME_COUNT = 15; // Number of images named 1.jpg through N.jpg
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

        // Cancel/discard wait timer button
        $(document).on('click', '.wait-timer-discard-btn', function(e) {
            e.preventDefault();
            var timerId = $(this).closest('.wait-timer-panel').data('timer-id');
            discardWaitTimer(timerId);
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
            return e && (e.clickType === 'wait' || e.clickType === 'goal') && e.status === 1;
        });
        
        if (activeWaits.length === 0) return false;
        
        // Check if the most recent active wait hasn't expired yet
        var mostRecentWait = activeWaits[activeWaits.length - 1];
        var waitEndTimestamp = mostRecentWait.waitStamp || mostRecentWait.goalStamp;
        var now = Math.round(new Date() / 1000);
        
        return waitEndTimestamp > now;
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
            return e && (e.clickType === 'wait' || e.clickType === 'goal') && e.status === 1;
        });
        
        if (activeWaits.length === 0) return null;
        
        var mostRecentWait = activeWaits[activeWaits.length - 1];
        return mostRecentWait.waitType || mostRecentWait.goalType || null;
    }

    /**
     * Start a new wait timer (called from goals.js when user creates a wait)
     * This creates the visual panel in #wait-timers-container
     * @param {number} goalEndTimestamp - When the wait ends (unix timestamp)
     * @param {string} goalType - 'use', 'bought', or 'both'
     */
    function createWaitTimerPanel(goalEndTimestamp, goalType) {
        var jsonObject = StorageModule.retrieveStorageObject();
        var isDecreaseHabit = jsonObject.baseline.decreaseHabit;
        var timerId = 'wait_' + Math.round(new Date() / 1000);
        
        var now = Math.round(new Date() / 1000);
        var remainingSeconds = Math.max(0, goalEndTimestamp - now);
        var timeDisplay = formatTimerDisplay(remainingSeconds);

        // Determine button configuration based on habit direction
        var buttonsHtml = '';
        if (isDecreaseHabit) {
            // 'Do less' habit: Delayed Gratification language
            buttonsHtml = 
                '<button class="wait-timer-distract-btn btn-timer-control">' +
                    '<i class="fas fa-gamepad"></i> Distract Me!' +
                '</button>' +
                '<button class="wait-timer-resist-btn btn-timer-control btn-super">' +
                    '<i class="fas fa-fist-raised"></i> Super Resist!' +
                '</button>';
        } else {
            // 'Do more' habit: Procrastination language
            buttonsHtml = 
                '<button class="wait-timer-distract-btn btn-timer-control">' +
                    '<i class="fas fa-gamepad"></i> Distract Me!' +
                '</button>' +
                '<button class="wait-timer-do-early-btn btn-timer-control btn-action">' +
                    '<i class="fas fa-bolt"></i> Do It Early!' +
                '</button>';
        }

        // Title based on habit direction
        var titleText = isDecreaseHabit ? 'Waiting it out...' : 'Countdown to action...';
        var subtitleText = isDecreaseHabit 
            ? 'Stay strong! You\'ve got this.' 
            : 'Time until you should do it again';

        var html = '<div class="wait-timer-panel" data-timer-id="' + timerId + '" data-goal-type="' + goalType + '" data-goal-end="' + goalEndTimestamp + '">' +
            '<div class="wait-timer-header">' +
                '<div class="wait-timer-title"><i class="fas fa-hourglass-half"></i> ' + titleText + '</div>' +
                '<button class="wait-timer-discard-btn" title="Cancel wait">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="wait-timer-body">' +
                '<div class="wait-timer-left">' +
                    '<div id="' + timerId + '" class="fibonacci-timer counting">' +
                        '<div class="boxes">' +
                            '<div>' +
                                '<span class="timerSpan daysSinceLastClick">' + timeDisplay.days + '</span>' +
                                '<span>Days</span>' +
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
        '</div>';

        // Insert into wait-timers-container
        var container = $('#wait-timers-container');
        if (container.length) {
            container.html(html); // Replace any existing (only one wait timer at a time)
        }

        // Start countdown interval
        startCountdownInterval(timerId, goalEndTimestamp);

        // Adjust fibonacci timer sizing
        adjustTimerBoxVisibility(timerId);
        TimersModule.adjustFibonacciTimerToBoxes(timerId);
    }

    /**
     * Start countdown interval for wait timer
     * @param {string} timerId - Timer ID
     * @param {number} goalEndTimestamp - When the wait ends
     */
    function startCountdownInterval(timerId, goalEndTimestamp) {
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
        }

        activeIntervals[timerId] = setInterval(function() {
            var now = Math.round(new Date() / 1000);
            var remainingSeconds = Math.max(0, goalEndTimestamp - now);
            
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
        var goalType = panel.data('goal-type');
        
        // The goal completion is already handled by GoalsModule/TimerStateManager
        // Just remove the panel
        removeWaitTimerPanel(timerId);
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
     * Discard a wait timer (user cancelled)
     * @param {string} timerId - Timer ID
     */
    function discardWaitTimer(timerId) {
        if (!confirm('Cancel this wait timer? The goal will be marked as incomplete.')) return;

        var panel = $('.wait-timer-panel[data-timer-id="' + timerId + '"]');
        var goalType = panel.data('goal-type');

        // End the goal early via GoalsModule
        if (typeof GoalsModule !== 'undefined' && GoalsModule.endActiveGoal) {
            GoalsModule.endActiveGoal(json);
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
        
        // Find the most recent goal/wait action to get end timestamp
        var waits = jsonObject.action.filter(function(e) {
            return e && (e.clickType === 'wait' || e.clickType === 'goal') && e.status === 1;
        });
        
        if (waits.length === 0) return;
        
        var mostRecentWait = waits[waits.length - 1];
        var waitEndTimestamp = mostRecentWait.waitStamp || mostRecentWait.goalStamp;
        
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
        if (isLoadingMemes) return; // Prevent multiple loads
        
        if (MEME_COUNT === 0) {
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

        // Shuffle and take first 3 (fewer for larger images)
        availableIndices.sort(function() { return 0.5 - Math.random(); });
        var toLoad = availableIndices.slice(0, 3);

        if (toLoad.length === 0) {
            // All memes loaded, reset for infinite scroll
            loadedMemeIndices = [];
            loadMemes();
            return;
        }

        var container = $('.distraction-memes-container');
        
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
                
                var memeHtml = '<div class="meme-item">' +
                    '<img src="' + imgSrc + '" alt="Distraction meme" />' +
                '</div>';
                
                container.append(memeHtml);
                loadedMemeIndices.push(index);
            });
            
            isLoadingMemes = false;
        }, 300); // Small delay for smooth UX
    }

    /**
     * End the active wait timer due to user action (did it, started timer, etc.)
     * Called when user performs an action that should end their wait
     * @param {string} reason - Reason for ending ('did_it', 'started_timer', etc.)
     */
    function endActiveWaitTimerOnAction(reason) {
        if (!hasActiveWaitTimer()) return;

        var waitType = getActiveWaitType();
        var jsonObject = StorageModule.retrieveStorageObject();
        
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
