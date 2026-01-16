/**
 * ActivityTimerModule
 * Handles the active timer functionality for time-spent tracking
 * Creates a full-width stat panel with start/pause/resume/stop controls
 */
var ActivityTimerModule = (function () {
    // Private variables
    var json;
    var activeIntervals = {}; // Store interval references by timer ID

    /**
     * Initialize the module with app state
     * @param {Object} appJson - The application JSON object
     */
    function init(appJson) {
        json = appJson;
        setupEventListeners();
        restoreActiveTimers();
    }

    /**
     * Setup event listeners for timer controls
     */
    function setupEventListeners() {
        // Start new timer button
        $(document).on('click', '.activity-timer-start-btn', function(e) {
            e.preventDefault();
            startNewTimer();
        });

        // Pause timer button
        $(document).on('click', '.activity-timer-pause-btn', function(e) {
            e.preventDefault();
            var timerId = $(this).closest('.activity-timer-panel').data('timer-id');
            pauseTimer(timerId);
        });

        // Resume timer button
        $(document).on('click', '.activity-timer-resume-btn', function(e) {
            e.preventDefault();
            var timerId = $(this).closest('.activity-timer-panel').data('timer-id');
            resumeTimer(timerId);
        });

        // Stop timer button
        $(document).on('click', '.activity-timer-stop-btn', function(e) {
            e.preventDefault();
            var timerId = $(this).closest('.activity-timer-panel').data('timer-id');
            stopTimer(timerId);
        });

        // Cancel/discard timer button
        $(document).on('click', '.activity-timer-discard-btn', function(e) {
            e.preventDefault();
            var timerId = $(this).closest('.activity-timer-panel').data('timer-id');
            discardTimer(timerId);
        });
    }

    /**
     * Start a new activity timer
     */
    function startNewTimer() {
        var now = Math.round(new Date() / 1000);
        var timerId = 'timer_' + now;
        
        // Create timer in storage
        var timer = StorageModule.startActivityTimer(timerId);
        
        // Render the timer panel
        renderTimerPanel(timer);
        
        // Start the interval to update the display
        startTimerInterval(timerId);

        // Show notification
        NotificationsModule.createNotification('Timer started! Tap stop when you\'re done.', null, { type: 'timer_started' });

        return timer;
    }

    /**
     * Pause an active timer
     * @param {string} timerId - ID of the timer to pause
     */
    function pauseTimer(timerId) {
        var timer = StorageModule.pauseActivityTimer(timerId);
        if (!timer) return;

        // Stop the interval
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
            delete activeIntervals[timerId];
        }

        // Update UI
        updateTimerPanelState(timerId, 'paused');
    }

    /**
     * Resume a paused timer
     * @param {string} timerId - ID of the timer to resume
     */
    function resumeTimer(timerId) {
        var timer = StorageModule.resumeActivityTimer(timerId);
        if (!timer) return;

        // Restart the interval
        startTimerInterval(timerId);

        // Update UI
        updateTimerPanelState(timerId, 'running');
    }

    /**
     * Stop a timer and log the time
     * @param {string} timerId - ID of the timer to stop
     */
    function stopTimer(timerId) {
        // Stop the interval
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
            delete activeIntervals[timerId];
        }

        var result = StorageModule.stopActivityTimer(timerId);
        if (!result) return;

        // Create the timed action record
        var originalStart = result.originalStartedAt || Math.round(new Date() / 1000);
        StorageModule.updateTimedAction(originalStart, result.totalSeconds);

        // Add to habit log
        ActionLogModule.placeActionIntoLog(originalStart, 'timed', null, null, null, false, result.totalSeconds);

        // Remove the panel
        removeTimerPanel(timerId);

        // Update time spent stats
        updateTimeSpentStats();

        // Show notification with duration
        var durationStr = StatsCalculationsModule.convertSecondsToDateFormat(result.totalSeconds, false);
        NotificationsModule.createNotification('Logged ' + durationStr + ' of activity!', null, { type: 'timer_stopped' });
    }

    /**
     * Discard a timer without logging
     * @param {string} timerId - ID of the timer to discard
     */
    function discardTimer(timerId) {
        if (!confirm('Discard this timer without logging?')) return;

        // Stop the interval
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
            delete activeIntervals[timerId];
        }

        // Remove from storage without creating action
        StorageModule.stopActivityTimer(timerId);

        // Remove the panel
        removeTimerPanel(timerId);
    }

    /**
     * Render the timer panel HTML
     * @param {object} timer - Timer object from storage
     */
    function renderTimerPanel(timer) {
        var elapsedSeconds = StorageModule.getTimerElapsedSeconds(timer.id) || 0;
        var timeDisplay = formatTimerDisplay(elapsedSeconds);
        var isRunning = timer.status === 'running';
        var isPaused = timer.status === 'paused';

        var html = '<div class="activity-timer-panel" data-timer-id="' + timer.id + '">' +
            '<div class="activity-timer-header">' +
                '<div class="activity-timer-icon"><i class="fas fa-stopwatch"></i></div>' +
                '<div class="activity-timer-title">Activity Timer</div>' +
                '<button class="activity-timer-discard-btn" title="Discard timer">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="activity-timer-display">' +
                '<span class="timer-hours">' + timeDisplay.hours + '</span>' +
                '<span class="timer-separator">:</span>' +
                '<span class="timer-minutes">' + timeDisplay.minutes + '</span>' +
                '<span class="timer-separator">:</span>' +
                '<span class="timer-seconds">' + timeDisplay.seconds + '</span>' +
            '</div>' +
            '<div class="activity-timer-status">' +
                '<span class="status-indicator ' + timer.status + '"></span>' +
                '<span class="status-text">' + (isRunning ? 'Running' : 'Paused') + '</span>' +
            '</div>' +
            '<div class="activity-timer-controls">' +
                '<button class="activity-timer-pause-btn btn-timer-control" ' + (isPaused ? 'style="display:none;"' : '') + '>' +
                    '<i class="fas fa-pause"></i> Pause' +
                '</button>' +
                '<button class="activity-timer-resume-btn btn-timer-control" ' + (isRunning ? 'style="display:none;"' : '') + '>' +
                    '<i class="fas fa-play"></i> Resume' +
                '</button>' +
                '<button class="activity-timer-stop-btn btn-timer-control btn-stop">' +
                    '<i class="fas fa-stop"></i> Stop & Log' +
                '</button>' +
            '</div>' +
        '</div>';

        // Insert at the top of the use-content stats area
        var container = $('#activity-timers-container');
        if (container.length === 0) {
            // Create container if it doesn't exist
            $('#use-content').prepend('<div id="activity-timers-container"></div>');
            container = $('#activity-timers-container');
        }
        container.append(html);
    }

    /**
     * Update timer panel state (running/paused)
     * @param {string} timerId - Timer ID
     * @param {string} state - 'running' or 'paused'
     */
    function updateTimerPanelState(timerId, state) {
        var panel = $('.activity-timer-panel[data-timer-id="' + timerId + '"]');
        if (!panel.length) return;

        var isRunning = state === 'running';
        
        panel.find('.status-indicator').removeClass('running paused').addClass(state);
        panel.find('.status-text').text(isRunning ? 'Running' : 'Paused');
        panel.find('.activity-timer-pause-btn').toggle(isRunning);
        panel.find('.activity-timer-resume-btn').toggle(!isRunning);
    }

    /**
     * Remove timer panel from DOM
     * @param {string} timerId - Timer ID
     */
    function removeTimerPanel(timerId) {
        var panel = $('.activity-timer-panel[data-timer-id="' + timerId + '"]');
        panel.fadeOut(300, function() {
            $(this).remove();
        });
    }

    /**
     * Start interval to update timer display
     * @param {string} timerId - Timer ID
     */
    function startTimerInterval(timerId) {
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
        }

        activeIntervals[timerId] = setInterval(function() {
            var elapsedSeconds = StorageModule.getTimerElapsedSeconds(timerId);
            if (elapsedSeconds === null) {
                clearInterval(activeIntervals[timerId]);
                delete activeIntervals[timerId];
                return;
            }

            var timeDisplay = formatTimerDisplay(elapsedSeconds);
            var panel = $('.activity-timer-panel[data-timer-id="' + timerId + '"]');
            
            panel.find('.timer-hours').text(timeDisplay.hours);
            panel.find('.timer-minutes').text(timeDisplay.minutes);
            panel.find('.timer-seconds').text(timeDisplay.seconds);
        }, 1000);
    }

    /**
     * Format seconds into hours:minutes:seconds display
     * @param {number} totalSeconds - Total elapsed seconds
     * @returns {object} Object with hours, minutes, seconds as formatted strings
     */
    function formatTimerDisplay(totalSeconds) {
        var hours = Math.floor(totalSeconds / 3600);
        var minutes = Math.floor((totalSeconds % 3600) / 60);
        var seconds = totalSeconds % 60;

        return {
            hours: hours.toString().padStart(2, '0'),
            minutes: minutes.toString().padStart(2, '0'),
            seconds: seconds.toString().padStart(2, '0')
        };
    }

    /**
     * Restore active timers from storage on app load
     */
    function restoreActiveTimers() {
        var activeTimers = StorageModule.getActiveTimers();
        
        activeTimers.forEach(function(timer) {
            // Render the panel
            renderTimerPanel(timer);

            // Start interval if running
            if (timer.status === 'running') {
                startTimerInterval(timer.id);
            }
        });

        // Check for forgotten timers (running for more than 24 hours)
        checkForForgottenTimers(activeTimers);
    }

    /**
     * Check for timers that may have been forgotten (running > 24 hours)
     * @param {Array} activeTimers - Array of active timer objects
     */
    function checkForForgottenTimers(activeTimers) {
        var now = Math.round(new Date() / 1000);
        var twentyFourHours = 24 * 60 * 60;

        activeTimers.forEach(function(timer) {
            var elapsed = StorageModule.getTimerElapsedSeconds(timer.id);
            if (elapsed > twentyFourHours) {
                // Notify user about forgotten timer
                var hours = Math.floor(elapsed / 3600);
                var message = 'You have a timer running for ' + hours + '+ hours. Did you forget to stop it?';
                var responseTools = '<button class="notification-response-tool stop-forgotten-timer" data-timer-id="' + timer.id + '">Stop Timer</button>';
                NotificationsModule.createNotification(message, responseTools, { type: 'forgotten_timer' });
            }
        });
    }

    /**
     * Update time spent statistics display
     */
    function updateTimeSpentStats() {
        var jsonObject = StorageModule.retrieveStorageObject();
        var timeNow = Math.round(new Date() / 1000);
        
        // Filter timed actions
        var timedActions = jsonObject.action.filter(function(e) {
            return e.clickType === 'timed';
        });

        if (timedActions.length === 0) {
            return;
        }

        // Calculate time spent for different periods
        var oneWeekAgo = timeNow - (7 * 24 * 60 * 60);
        var oneMonthAgo = timeNow - (30 * 24 * 60 * 60);

        var totalTimeSpent = 0;
        var weekTimeSpent = 0;
        var monthTimeSpent = 0;

        timedActions.forEach(function(action) {
            var duration = parseInt(action.duration) || 0;
            totalTimeSpent += duration;
            
            if (parseInt(action.timestamp) >= oneWeekAgo) {
                weekTimeSpent += duration;
            }
            if (parseInt(action.timestamp) >= oneMonthAgo) {
                monthTimeSpent += duration;
            }
        });

        // Update display
        if (totalTimeSpent > 0) {
            $('.statistic.timeSpentDoing.total').html(
                StatsCalculationsModule.convertSecondsToDateFormat(totalTimeSpent, true)
            );
            $('.stat-group.timeSpentDoing').parent().show();
        }
        if (weekTimeSpent > 0) {
            $('.statistic.timeSpentDoing.week').html(
                StatsCalculationsModule.convertSecondsToDateFormat(weekTimeSpent, true)
            );
            $('.statistic.timeSpentDoing.week').parent().show();
        }
        if (monthTimeSpent > 0 && monthTimeSpent !== weekTimeSpent) {
            $('.statistic.timeSpentDoing.month').html(
                StatsCalculationsModule.convertSecondsToDateFormat(monthTimeSpent, true)
            );
            $('.statistic.timeSpentDoing.month').parent().show();
        }
    }

    /**
     * Check if there are any active timers
     * @returns {boolean}
     */
    function hasActiveTimers() {
        return StorageModule.getActiveTimers().length > 0;
    }

    /**
     * Get count of active timers
     * @returns {number}
     */
    function getActiveTimerCount() {
        return StorageModule.getActiveTimers().length;
    }

    // Public API
    return {
        init: init,
        startNewTimer: startNewTimer,
        pauseTimer: pauseTimer,
        resumeTimer: resumeTimer,
        stopTimer: stopTimer,
        discardTimer: discardTimer,
        hasActiveTimers: hasActiveTimers,
        getActiveTimerCount: getActiveTimerCount,
        updateTimeSpentStats: updateTimeSpentStats,
        restoreActiveTimers: restoreActiveTimers
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ActivityTimerModule;
} else {
    window.ActivityTimerModule = ActivityTimerModule;
}
