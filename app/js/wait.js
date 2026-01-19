/**
 * WaitModule (formerly GoalsModule)
 * Handles the "Wait" countdown timer functionality
 * - For 'do it less' habits: Delayed gratification timers
 * - For 'do it more' habits: Procrastination/reminder timers
 * 
 * Note: This was renamed from "goals" to "wait" to avoid confusion with
 * the newer behavioralGoals feature.
 */
var WaitModule = (function () {
    var json;

    /**
     * Get the wait statistics object, supporting both new 'wait' and legacy 'goal' structures
     * @param {object} jsonObj - App state
     * @returns {object} - The wait/goal statistics object
     */
    function getWaitStats(jsonObj) {
        if (jsonObj && jsonObj.statistics) {
            // Prefer 'wait' but fall back to 'goal'
            return jsonObj.statistics.wait || jsonObj.statistics.goal || {};
        }
        return {};
    }

    /**
     * Extend an active wait timer
     * @param {object} json - App state
     */
    function extendActiveWait(json) {
        var waitStats = getWaitStats(json);
        var waitType;
        // Check both new (activeWaitUse) and legacy (activeGoalUse) property names
        if ((waitStats.activeWaitUse || waitStats.activeGoalUse || 0) !== 0) {
            waitType = "use";
        } else if ((waitStats.activeWaitBought || waitStats.activeGoalBought || 0) !== 0) {
            waitType = "bought";
        } else if ((waitStats.activeWaitBoth || waitStats.activeGoalBoth || 0) !== 0) {
            waitType = "both";
        }

        var requestedWaitEnd = $('#waitEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var waitStampSeconds = Math.round(new Date(requestedWaitEnd).getTime() / 1000);
        StorageModule.changeWaitStatus(1, waitType, false, waitStampSeconds);
    }

    /**
     * End an active wait timer early
     * @param {object} json - App state
     */
    function endActiveWait(json) {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);
        var waitStats = getWaitStats(json);
        var waitType;

        // Check both new and legacy property names
        if ((waitStats.activeWaitUse || waitStats.activeGoalUse || 0) !== 0) {
            waitType = "use";
            if (waitStats.activeWaitUse !== undefined) waitStats.activeWaitUse = 0;
            if (waitStats.activeGoalUse !== undefined) waitStats.activeGoalUse = 0;
        } else if ((waitStats.activeWaitBought || waitStats.activeGoalBought || 0) !== 0) {
            waitType = "bought";
            if (waitStats.activeWaitBought !== undefined) waitStats.activeWaitBought = 0;
            if (waitStats.activeGoalBought !== undefined) waitStats.activeGoalBought = 0;
        } else if ((waitStats.activeWaitBoth || waitStats.activeGoalBoth || 0) !== 0) {
            waitType = "both";
            if (waitStats.activeWaitBoth !== undefined) waitStats.activeWaitBoth = 0;
            if (waitStats.activeGoalBoth !== undefined) waitStats.activeGoalBoth = 0;
        }

        var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        var message = 'Any progress is good progress! ' + affirmation;

        StorageModule.changeWaitStatus(2, waitType, timestampSeconds);
        NotificationsModule.createNotification(message, null, { type: 'wait_ended_early' });

        var startStamp = waitStats.lastClickStamp;
        var actualEnd = timestampSeconds;
        ActionLogModule.placeWaitIntoLog(startStamp, actualEnd, waitType, false);

        replaceLongestWait(startStamp, actualEnd);

        // Update number of completed waits
        var completedCount = (waitStats.completedWaits || waitStats.completedGoals || 0) + 1;
        if (waitStats.completedWaits !== undefined) waitStats.completedWaits = completedCount;
        if (waitStats.completedGoals !== undefined) waitStats.completedGoals = completedCount;
        $("#numberOfWaitsCompleted").html(completedCount);
        UIModule.showActiveStatistics(json);

        var requestedWaitEnd = $('#waitEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var waitStampSeconds = Math.round(new Date(requestedWaitEnd).getTime() / 1000);

        // Keep lastClickStamp up to date while using app
        waitStats.lastClickStamp = timestampSeconds;

        // Return to relevant screen
        $(".statistics-tab-toggler").click();

        StatsDisplayModule.recalculateAverageTimeBetween(waitType, "total", json);
        StatsDisplayModule.recalculateAverageTimeBetween(waitType, "week", json);
        StatsDisplayModule.recalculateAverageTimeBetween(waitType, "month", json);

        // Set local json wait type which is active
        var jsonHandle = "activeWait" + waitType.charAt(0).toUpperCase() + waitType.slice(1);
        waitStats[jsonHandle] = 1;

        StorageModule.updateActionTable(timestampSeconds, "wait", "", waitStampSeconds, waitType);

        // Increment click counter if it exists
        if (waitStats.clickCounter !== undefined) waitStats.clickCounter++;
        
        // Update statistics display
        UIModule.showActiveStatistics(json);
        
        // Note: Wait timer is now handled by WaitTimerModule, not the old TimerStateManager
    }

    /**
     * Update the longest wait record if applicable
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     * @param {object} jsonParam - Optional json override
     */
    function replaceLongestWait(start, end, jsonParam) {
        // Use passed json if provided, otherwise use module-level json
        var jsonToUse = jsonParam || json;
        
        // Safety check for required structure
        if (!jsonToUse || !jsonToUse.statistics || !jsonToUse.statistics.wait || 
            !jsonToUse.statistics.wait.longestWait) {
            console.warn('replaceLongestWait: Invalid json structure');
            return;
        }
        
        var timeNow = Math.round(new Date() / 1000);
        var timestampLength = {
            week: 7 * 24 * 60 * 60,
            month: 30 * 24 * 60 * 60,
            year: 365 * 24 * 60 * 60
        };

        var timeIncrement = "total";
        if (start > timeNow - timestampLength["week"]) {
            timeIncrement = "week";
        } else if (start > timeNow - timestampLength["month"]) {
            timeIncrement = "month";
        } else if (start > timeNow - timestampLength["year"]) {
            timeIncrement = "year";
        }

        var waitLength = end - start;

        if (waitLength > (jsonToUse.statistics.wait.longestWait[timeIncrement] || 0)) {
            // If longest wait just happened
            jsonToUse.statistics.wait.longestWait[timeIncrement] = waitLength;
            $(".statistic.longestWait." + timeIncrement).html(
                StatsCalculationsModule.convertSecondsToDateFormat(waitLength, true)
            );
        }
    }

    /**
     * Handle wait timer completion (called when countdown reaches zero)
     * @param {string} timerSection - CSS selector for timer section
     * @param {object} json - App state
     */
    function handleWaitCompletion(timerSection, json) {
        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);

        var waitStats = getWaitStats(json);

        // Find most recent wait type (check both new and legacy property names)
        var waitType = "";
        if ((waitStats.activeWaitBoth || waitStats.activeGoalBoth) == 1) {
            waitType = "both";
            if (waitStats.activeWaitBoth !== undefined) waitStats.activeWaitBoth = 0;
            if (waitStats.activeGoalBoth !== undefined) waitStats.activeGoalBoth = 0;
        } else if ((waitStats.activeWaitBought || waitStats.activeGoalBought) == 1) {
            waitType = "bought";
            if (waitStats.activeWaitBought !== undefined) waitStats.activeWaitBought = 0;
            if (waitStats.activeGoalBought !== undefined) waitStats.activeGoalBought = 0;
        } else if ((waitStats.activeWaitUse || waitStats.activeGoalUse) == 1) {
            waitType = "use";
            if (waitStats.activeWaitUse !== undefined) waitStats.activeWaitUse = 0;
            if (waitStats.activeGoalUse !== undefined) waitStats.activeGoalUse = 0;
        }

        var actualEnd = Math.round(new Date() / 1000);
        StorageModule.changeWaitStatus(3, waitType, actualEnd);

        var startStamp = waitStats.lastClickStamp;
        ActionLogModule.placeWaitIntoLog(startStamp, actualEnd, waitType, false, json);

        // If longest wait just happened
        replaceLongestWait(startStamp, actualEnd, json);

        // Update number of completed waits
        var completedCount = (waitStats.completedWaits || waitStats.completedGoals || 0) + 1;
        if (waitStats.completedWaits !== undefined) waitStats.completedWaits = completedCount;
        if (waitStats.completedGoals !== undefined) waitStats.completedGoals = completedCount;
        $("#numberOfWaitsCompleted").html(completedCount);
        UIModule.showActiveStatistics(json);

        var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];

        // Notify user that wait ended
        var isDecreaseHabit = json.baseline.decreaseHabit;
        var message = isDecreaseHabit 
            ? "Congrats! You made it through the wait! " + affirmation
            : "Time's up! Ready to take action? " + affirmation;
        NotificationsModule.createNotification(message, null, { type: 'wait_completed' });

        // Remove the wait timer panel
        if (typeof WaitTimerModule !== 'undefined') {
            $('#wait-timers-container').empty();
        }

        // Disappear the entire timer section
        $(timerSection + " .timer-recepticle").hide();
    }

    /**
     * Handle wait dialog form submission
     * @param {object} json - App state
     */
    function handleWaitDialogSubmit(json) {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);

        // Check if there's an active activity timer - can't create wait while timer running
        if (typeof ActivityTimerModule !== 'undefined' && ActivityTimerModule.hasActiveTimers()) {
            var message = "You have an active timer running. Would you like to cancel it to start a wait?";
            var responseTools =
                '<button class="notification-response-tool cancel-timer-for-wait" href="#">' +
                'Yes, cancel timer</button>' +
                '<button class="notification-response-tool keep-timer" href="#">' +
                'No, keep timer</button>';
            NotificationsModule.createNotification(message, responseTools, { type: 'timer_conflict' });
            return;
        }

        var waitStampSeconds;
        
        // Check which radio is selected
        var selectedOption = $('input[name="waitDurationRadios"]:checked').val();
        
        // If "quick" radio is selected, user should use the quick buttons instead
        if (selectedOption === 'quick') {
            alert("Please click one of the quick wait buttons, or select 'Choose a time' to set a specific time.");
            return;
        }
        
        // Custom time selected - use time picker and date picker
        var requestedTimeEndHours = parseInt($(".wait.log-more-info select.time-picker-hour").val());
        var requestedTimeEndMinutes = parseInt($(".wait.log-more-info select.time-picker-minute").val());

        // 12 am is actually the first hour in a day
        if (requestedTimeEndHours == 12) {
            requestedTimeEndHours = 0;
        }
        // Account for am vs pm from userfriendly version of time input
        if ($(".wait.log-more-info select.time-picker-am-pm").val() == "PM") {
            requestedTimeEndHours = requestedTimeEndHours + 12;
        }

        var requestedWaitEnd = $('#waitEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        waitStampSeconds = Math.round(new Date(requestedWaitEnd).getTime() / 1000);

        var secondsUntilRequestedWait = (requestedTimeEndHours * 60 * 60) + (requestedTimeEndMinutes * 60);

        var nowHours = date.getHours();
        var nowMinutes = date.getMinutes();
        var secondsUntilNow = (nowHours * 60 * 60) + (nowMinutes * 60);

        // Validate custom time is in the future
        if (waitStampSeconds < timestampSeconds && secondsUntilRequestedWait <= secondsUntilNow) {
            alert("Please choose a time later than right now!");
            return;
        }
        
        waitStampSeconds += secondsUntilRequestedWait;

        if (waitStampSeconds > timestampSeconds) {

            // Get wait type from active tab (new UI) or checkboxes (fallback)
            var waitType = "";
            var activeTab = $('.wait-dialog-tab.active').data('wait-type');
            
            if (activeTab) {
                waitType = activeTab;
            } else {
                // Fallback to checkboxes for backwards compatibility
                if ($("#boughtWaitInput").is(":checked") && $("#usedWaitInput").is(":checked")) {
                    waitType = "both";
                } else if ($("#boughtWaitInput").is(":checked")) {
                    waitType = "bought";
                } else if ($("#usedWaitInput").is(":checked")) {
                    waitType = "use";
                }
            }

            // Get wait stats using helper (supports both 'wait' and legacy 'goal')
            var waitStats = getWaitStats(json);
            
            // Ensure the waitStats object has the required structure
            if (!waitStats.untilTimerEnd) {
                waitStats.untilTimerEnd = {
                    totalSeconds: 0, seconds: 0, minutes: 0, hours: 0, days: 0
                };
            }
            
            // Check for active wait (using both new and legacy property names)
            var hasActiveWait = (waitStats.activeWaitUse || waitStats.activeGoalUse || 0) !== 0 ||
                (waitStats.activeWaitBought || waitStats.activeGoalBought || 0) !== 0 ||
                (waitStats.activeWaitBoth || waitStats.activeGoalBoth || 0) !== 0;

            if (hasActiveWait) {
                // Ask if user wants to extend wait
                var isDecreaseHabit = json.baseline.decreaseHabit;
                var message = isDecreaseHabit
                    ? "You already have an active wait. Would you like to extend it?"
                    : "You already have a reminder set. Would you like to change it?";
                var responseTools =
                    '<button class="notification-response-tool extend-wait" href="#" >' +
                    'Yes</button>' +
                    '<button class="notification-response-tool end-wait" href="#">' +
                    'No</button>';

                NotificationsModule.createNotification(message, responseTools, { type: 'wait_extend_prompt' });
            } else {
                // Keep lastClickStamp up to date while using app
                waitStats.lastClickStamp = timestampSeconds;

                // Return to relevant screen
                $(".statistics-tab-toggler").click();

                // Set local json wait type which is active
                var jsonHandle = "activeWait" + waitType.charAt(0).toUpperCase() + waitType.slice(1);
                waitStats[jsonHandle] = 1;

                StorageModule.updateActionTable(timestampSeconds, "wait", "", waitStampSeconds, waitType);

                // Increment click counter if it exists
                if (waitStats.clickCounter !== undefined) {
                    waitStats.clickCounter++;
                }

                UIModule.showActiveStatistics(json);

                // Create the wait timer panel (WaitTimerModule handles the countdown)
                if (typeof WaitTimerModule !== 'undefined') {
                    WaitTimerModule.createWaitTimerPanel(waitStampSeconds, waitType);
                }
            }

            UIModule.closeClickDialog(".wait");
        }
    }

    /**
     * Setup the wait dialog with current time defaults
     */
    function setupWaitDialog() {
        var date = new Date();
        var currHours = date.getHours(),
            currMinutes = date.getMinutes();
        if (currHours >= 12) {
            $(".wait.log-more-info .time-picker-am-pm").val("PM");
            currHours = currHours % 12;
        }

        // Set minutes to 0, 15, 30, or 45
        var currMinutesRounded = 0;
        if (currMinutes < 15) {
            currMinutesRounded = 15;
        } else if (currMinutes < 30) {
            currMinutesRounded = 30;
        } else if (currMinutes < 45) {
            currMinutesRounded = 45;
        } else {
            currHours += 1;
        }
        $(".wait.log-more-info .time-picker-minute").val(currMinutesRounded);
        $(".wait.log-more-info .time-picker-hour").val(currHours);
        
        // Reset to Quick wait option by default
        $('#waitQuickRadio').prop('checked', true);
        $('.wait.log-more-info').removeClass('show-custom');
        
        // Reset tabs to default (To Do It)
        $('.wait-dialog-tab').removeClass('active');
        $('.wait-dialog-tab[data-wait-type="use"]').addClass('active');
        $('#usedWaitInput').prop('checked', true);
        $('#boughtWaitInput').prop('checked', false);
    }

    /**
     * Handle quick wait with specified minutes
     * @param {number} minutes - Duration in minutes
     */
    function handleQuickWait(minutes) {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);
        var waitStampSeconds = timestampSeconds + (minutes * 60);
        
        // Get wait type from active tab
        var waitType = $('.wait-dialog-tab.active').data('wait-type') || 'use';
        
        var waitStats = getWaitStats(json);
        
        // Check for active wait
        var hasActiveWait = (waitStats.activeWaitUse || 0) !== 0 ||
            (waitStats.activeWaitBought || 0) !== 0 ||
            (waitStats.activeWaitBoth || 0) !== 0;
            
        if (hasActiveWait) {
            var message = "You already have an active wait. Would you like to replace it?";
            if (!confirm(message)) return;
        }
        
        // Keep lastClickStamp up to date
        waitStats.lastClickStamp = timestampSeconds;
        
        // Return to statistics screen
        $(".statistics-tab-toggler").click();
        
        // Set active wait type
        var jsonHandle = "activeWait" + waitType.charAt(0).toUpperCase() + waitType.slice(1);
        waitStats[jsonHandle] = 1;
        
        // Update hidden checkboxes for compatibility
        $('#boughtWaitInput').prop('checked', waitType === 'bought' || waitType === 'both');
        $('#usedWaitInput').prop('checked', waitType === 'use' || waitType === 'both');
        
        StorageModule.updateActionTable(timestampSeconds, "wait", "", waitStampSeconds, waitType);
        
        // Increment click counter
        if (waitStats.clickCounter !== undefined) {
            waitStats.clickCounter++;
        }
        
        UIModule.showActiveStatistics(json);
        
        // Create the wait timer panel
        if (typeof WaitTimerModule !== 'undefined') {
            WaitTimerModule.createWaitTimerPanel(waitStampSeconds, waitType);
        }
        
        UIModule.closeClickDialog(".wait");
    }
    
    /**
     * Setup wait dialog UI event handlers
     */
    function setupWaitDialogHandlers() {
        // Wait type tab switching (styled like use dialog)
        $(document).on('click', '.wait-dialog-tab', function() {
            var $this = $(this);
            var waitType = $this.data('wait-type');
            
            // Update active state
            $('.wait-dialog-tab').removeClass('active');
            $this.addClass('active');
            
            // Update hidden checkboxes for compatibility
            if (waitType === 'bought') {
                $('#boughtWaitInput').prop('checked', true);
                $('#usedWaitInput').prop('checked', false);
            } else if (waitType === 'use') {
                $('#boughtWaitInput').prop('checked', false);
                $('#usedWaitInput').prop('checked', true);
            }
        });
        
        // Duration radio button selection - toggle between quick and custom
        $(document).on('change', 'input[name="waitDurationRadios"]', function() {
            var value = $(this).val();
            var $dialog = $('.wait.log-more-info');
            
            if (value === 'custom') {
                $dialog.addClass('show-custom');
            } else {
                $dialog.removeClass('show-custom');
            }
        });
        
        // Quick wait buttons - immediately start wait and close dialog
        $(document).on('click', '.wait-quick-btn', function() {
            var minutes = parseInt($(this).data('minutes'));
            handleQuickWait(minutes);
        });
        
        // Clicking on custom time inputs should select the custom radio
        $(document).on('focus', '.wait-custom-inputs select', function() {
            $('#waitCustomRadio').prop('checked', true).trigger('change');
        });
    }
    
    /**
     * Initialize the module
     * @param {object} appJson - App state
     */
    function init(appJson) {
        json = appJson;

        // Set up event handlers
        $(".wait.log-more-info button.submit").click(function () {
            handleWaitDialogSubmit(json);
        });
        
        // Setup new dialog UI handlers
        setupWaitDialogHandlers();
    }

    // Public API
    return {
        // New naming
        handleWaitCompletion: handleWaitCompletion,
        extendActiveWait: extendActiveWait,
        endActiveWait: endActiveWait,
        replaceLongestWait: replaceLongestWait,
        setupWaitDialog: setupWaitDialog,
        handleWaitDialogSubmit: handleWaitDialogSubmit,
        init: init,
        
        // Backward compatibility aliases (deprecated)
        handleGoalCompletion: handleWaitCompletion,
        extendActiveGoal: extendActiveWait,
        endActiveGoal: endActiveWait,
        replaceLongestGoal: replaceLongestWait,
        setupGoalDialog: setupWaitDialog,
        handleGoalDialogSubmit: handleWaitDialogSubmit
    };
})();

// Make the module available globally
// Provide both new and old names for backward compatibility during migration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WaitModule;
} else {
    window.WaitModule = WaitModule;
    window.GoalsModule = WaitModule; // Backward compatibility alias
}
