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

        // Rewind timer button (toggles footer)
        $(document).on('click', '.activity-timer-rewind-btn', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.activity-timer-panel');
            panel.find('.activity-timer-footer').slideToggle('fast');
        });

        // Footer Cancel button
        $(document).on('click', '.activity-timer-footer .cancel', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.activity-timer-panel');
            panel.find('.activity-timer-footer').slideUp('fast');
            // Reset inputs
            panel.find('.duration-picker-hours').val('0');
            panel.find('.duration-picker-minutes').val('0');
        });

        // Footer Submit button (Rewind & Log)
        $(document).on('click', '.activity-timer-footer .submit', function(e) {
            e.preventDefault();
            var panel = $(this).closest('.activity-timer-panel');
            var timerId = panel.data('timer-id');
            submitRewindTimer(timerId);
        });
    }

    /**
     * Submit manual duration for an active timer
     * Sets the end time to startTime + chosen duration
     * @param {string} timerId - Timer ID
     */
    function submitRewindTimer(timerId) {
        var panel = $('.activity-timer-panel[data-timer-id="' + timerId + '"]');
        var hours = parseInt(panel.find('.duration-picker-hours').val()) || 0;
        var minutes = parseInt(panel.find('.duration-picker-minutes').val()) || 0;
        var totalSeconds = (hours * 3600) + (minutes * 60);

        if (totalSeconds <= 0) {
            alert('Please select a duration greater than 0.');
            return;
        }

        // Stop the interval
        if (activeIntervals[timerId]) {
            clearInterval(activeIntervals[timerId]);
            delete activeIntervals[timerId];
        }

        // Get timer from storage to get its original startedAt
        var activeTimers = StorageModule.getActiveTimers();
        var timer = activeTimers.find(function(t) { return t.id === timerId; });
        if (!timer) return;

        // Calculate original start time (accounting for pauses if any)
        // Note: For rewind, we use the user's manual duration as the total time spent
        var originalStart = timer.startedAt - timer.accumulatedSeconds;

        // Remove from storage
        StorageModule.stopActivityTimer(timerId);

        // Create the timed action record with the manual duration
        StorageModule.updateTimedAction(originalStart, totalSeconds);

        // Add to habit log
        ActionLogModule.placeActionIntoLog(originalStart, 'timed', null, null, null, false, totalSeconds);

        // Remove the panel
        removeTimerPanel(timerId);

        // Update time spent stats
        updateTimeSpentStats();

        // Refresh progress report to show new timed data
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject && typeof StatsDisplayModule !== 'undefined') {
            StatsDisplayModule.initiateReport(jsonObject);
        }
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }

        // Show notification
        var durationStr = StatsCalculationsModule.convertSecondsToDateFormat(totalSeconds, false);
        NotificationsModule.createNotification('Logged manual duration of ' + durationStr + '!', null, { type: 'timer_stopped' });
    }

    /**
     * Start a new activity timer
     */
    function startNewTimer() {
        // Check if there's an active wait timer - starting activity timer ends the wait
        if (typeof WaitTimerModule !== 'undefined' && WaitTimerModule.hasActiveWaitTimer()) {
            // End the active wait timer using the new method
            WaitTimerModule.endActiveWaitTimerOnAction('started_timer');
            
            // Notify user
            NotificationsModule.createNotification(
                'Wait timer ended because you started tracking time.', 
                null, 
                { type: 'wait_ended_by_timer' }
            );
        }

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

        // Refresh progress report to show new timed data
        var jsonObject = StorageModule.retrieveStorageObject();
        if (jsonObject && typeof StatsDisplayModule !== 'undefined') {
            StatsDisplayModule.initiateReport(jsonObject);
        }
        
        // Refresh brief stats
        if (typeof BriefStatsModule !== 'undefined') {
            BriefStatsModule.refresh();
        }

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
                '<div class="activity-timer-title"><i class="fas fa-stopwatch"></i> Since you started</div>' +
                '<button class="activity-timer-discard-btn" title="Discard timer">' +
                    '<i class="fas fa-times"></i>' +
                '</button>' +
            '</div>' +
            '<div class="activity-timer-body">' +
                '<div class="activity-timer-left">' +
                    '<div id="' + timer.id + '" class="fibonacci-timer counting">' +
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
                    '<div class="activity-timer-status">' +
                        '<span class="status-indicator ' + timer.status + '"></span>' +
                        '<span class="status-text">' + (isRunning ? 'Running' : 'Paused') + '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="activity-timer-right">' +
                    '<div class="activity-timer-controls">' +
                        '<button class="activity-timer-rewind-btn btn-timer-control">' +
                            '<i class="fas fa-history"></i> Rewind Timer' +
                        '</button>' +
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
                '</div>' +
            '</div>' +
            '<div class="activity-timer-footer" style="display: none;">' +
                '<p class="text-left text-white" style="font-size: 1.25rem;">How long did you do it?</p>' +
                '<div class="time-picker-container">' +
                    '<select class="duration-picker-hours">' +
                        '<option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>' +
                        '<option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option>' +
                        '<option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option>' +
                        '<option value="12">12</option>' +
                    '</select>' +
                    '<span class="label">h</span>' +
                    '<select class="duration-picker-minutes">' +
                        '<option value="0">00</option><option value="5">05</option><option value="10">10</option><option value="15">15</option>' +
                        '<option value="20">20</option><option value="25">25</option><option value="30">30</option><option value="35">35</option>' +
                        '<option value="40">40</option><option value="45">45</option><option value="50">50</option><option value="55">55</option>' +
                    '</select>' +
                    '<span class="label">m</span>' +
                '</div>' +
                '<div class="row no-gutters mt-3">' +
                    '<div class="col-6" style="padding-right:7px;">' +
                        '<button class="cancel btn btn-outline-light btn-md btn-block">Cancel</button>' +
                    '</div>' +
                    '<div class="col-6" style="padding-left:7px;">' +
                        '<button class="submit btn btn-light btn-md btn-block">Submit</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

        // Use the container already in index.html
        var container = $('#activity-timers-container');
        if (container.length) {
            container.append(html);
        }
        
        // Use standard logic to adjust boxes and sizing - defer to ensure DOM is rendered
        setTimeout(function() {
            adjustTimerBoxVisibility(timer.id);
            TimersModule.adjustFibonacciTimerToBoxes(timer.id);
        }, 0);
    }

    /**
     * Update timer display values
     * @param {string} timerId - Timer ID (also the ID of the fibonacci-timer div)
     * @param {object} timeDisplay - Formatted time object
     */
    function updateTimerUI(timerId, timeDisplay) {
        var timerEl = $('#' + timerId);
        if (!timerEl.length) return;

        timerEl.find('.daysSinceLastClick').text(timeDisplay.days);
        timerEl.find('.hoursSinceLastClick').text(timeDisplay.hours);
        timerEl.find('.minutesSinceLastClick').text(timeDisplay.minutes);
        timerEl.find('.secondsSinceLastClick').text(timeDisplay.seconds);
        
        // Use standard logic to adjust boxes and sizing
        adjustTimerBoxVisibility(timerId);
        TimersModule.adjustFibonacciTimerToBoxes(timerId);
    }

    /**
     * Show/hide timer boxes based on values
     * @param {string} timerId - Timer ID
     */
    function adjustTimerBoxVisibility(timerId) {
        var timerEl = $('#' + timerId);
        var days = parseInt(timerEl.find('.daysSinceLastClick').text()) || 0;
        var hours = parseInt(timerEl.find('.hoursSinceLastClick').text()) || 0;
        var minutes = parseInt(timerEl.find('.minutesSinceLastClick').text()) || 0;

        var boxes = timerEl.find('.boxes > div');
        
        // Match standard logic: hide boxes from left to right if they are zero
        $(boxes[0]).toggle(days > 0);
        $(boxes[1]).toggle(days > 0 || hours > 0);
        $(boxes[2]).toggle(days > 0 || hours > 0 || minutes > 0);
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
            updateTimerUI(timerId, timeDisplay);
        }, 1000);
    }

    /**
     * Format seconds into days:hours:minutes:seconds display
     * @param {number} totalSeconds - Total elapsed seconds
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
                NotificationsModule.createNotification(message, null, {
                    type: 'forgotten_timer',
                    responseType: 'forgotten_timer',
                    responseData: { timerId: timer.id }
                });
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
            return e && e.clickType === 'timed';
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
