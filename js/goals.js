/**
 * Goals Module
 * Contains all goal management functionality for Better Later app
 */

var GoalsModule = (function() {
    // Private variables
    var createNotification;
    var updateActionTable;
    var loadGoalTimerValues;
    var initiateGoalTimer;
    var showActiveStatistics;
    var adjustFibonacciTimerToBoxes;
    var closeClickDialog;
    /**
     * Load goal timer values
     * @param {number} totalSecondsUntilGoalEnd - Total seconds until goal end
     * @param {Object} json - The app state object
     */
    function loadGoalTimerValues(totalSecondsUntilGoalEnd, json) {
        // Delegate to TimersModule
        TimersModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);
    }

    /**
     * Change goal status
     * @param {number} newGoalStatus - New status (1=active, 2=partial, 3=completed)
     * @param {string} goalType - Goal type (use, bought, both)
     * @param {number} actualEnd - Actual end timestamp
     * @param {number} goalExtendedTo - Goal extended to timestamp
     * @returns {Object} - Result object with status information
     */
    function changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo) {
        // Use storage module and handle UI updates
        var result = StorageModule.changeGoalStatus(newGoalStatus, goalType, actualEnd, goalExtendedTo);

        return result;
    }

    /**
     * Extend an active goal
     * @param {Object} json - The app state object
     * @param {Object} dependencies - Function dependencies
     */
    function extendActiveGoal(json, dependencies) {
        const { changeGoalStatus } = dependencies;
        
        var goalType;
        if (json.statistics.goal.activeGoalUse !== 0) {
            goalType = "use";
        } else if (json.statistics.goal.activeGoalBought !== 0) {
            goalType = "bought";
        } else if (json.statistics.goal.activeGoalBoth !== 0) {
            goalType = "both";
        }

        var requestedGoalEnd = $('#goalEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var goalStampSeconds = Math.round(new Date(requestedGoalEnd).getTime() / 1000);
        changeGoalStatus(1, goalType, false, goalStampSeconds);
    }

    /**
     * End an active goal
     * @param {Object} json - The app state object
     * @param {Object} dependencies - Function dependencies
     */
    function endActiveGoal(json, dependencies) {
        const { 
            changeGoalStatus, 
            createNotification,
            placeGoalIntoLog, 
            replaceLongestGoal, 
            showActiveStatistics, 
            recalculateAverageTimeBetween,
            updateActionTable,
            loadGoalTimerValues,
            initiateGoalTimer,
            adjustFibonacciTimerToBoxes
        } = dependencies;
        
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);
        var goalType;

        if (json.statistics.goal.activeGoalUse !== 0) {
            goalType = "use";
            json.statistics.goal.activeGoalUse = 0;
        } else if (json.statistics.goal.activeGoalBought !== 0) {
            goalType = "bought";
            json.statistics.goal.activeGoalBought = 0;
        } else if (json.statistics.goal.activeGoalBoth !== 0) {
            goalType = "both";
            json.statistics.goal.activeGoalBoth = 0;
        }
        
        var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
        var message = 'Any progress is good progress! ' + affirmation;

        changeGoalStatus(2, goalType, timestampSeconds);
        createNotification(message);

        var startStamp = json.statistics.goal.lastClickStamp;
        var actualEnd = timestampSeconds;
        placeGoalIntoLog(startStamp, actualEnd, goalType, false);

        replaceLongestGoal(startStamp, actualEnd);
        
        // Update number of goals
        json.statistics.goal.completedGoals++;
        $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
        showActiveStatistics();

        var requestedGoalEnd = $('#goalEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var goalStampSeconds = Math.round(new Date(requestedGoalEnd).getTime() / 1000);

        // Keep lastClickStamp up to date while using app
        json.statistics.goal.lastClickStamp = timestampSeconds;

        // Return to relevant screen
        $(".statistics-tab-toggler").click();

        recalculateAverageTimeBetween(goalType, "total");
        recalculateAverageTimeBetween(goalType, "week");
        recalculateAverageTimeBetween(goalType, "month");

        // Set local json goal type which is active
        var jsonHandle = "activeGoal" + goalType.charAt(0).toUpperCase() + goalType.slice(1);
        json.statistics.goal[jsonHandle] = 1;

        updateActionTable(timestampSeconds, "goal", "", goalStampSeconds, goalType);

        // Convert goalend to days hours minutes seconds
        var totalSecondsUntilGoalEnd = Math.round(goalStampSeconds - timestampSeconds);

        loadGoalTimerValues(totalSecondsUntilGoalEnd);
        initiateGoalTimer();
        showActiveStatistics();
        adjustFibonacciTimerToBoxes("goal-timer");
    }

    /**
     * Place a goal into the log
     * @param {number} startStamp - Start timestamp
     * @param {number} endStamp - End timestamp
     * @param {string} goalType - Goal type
     * @param {boolean} placeBelow - Whether to place the log entry below others
     * @param {Object} json - The app state object
     * @param {Function} convertSecondsToDateFormat - Function to convert seconds to date format
     */
    function placeGoalIntoLog(startStamp, endStamp, goalType, placeBelow, json, convertSecondsToDateFormat) {
        var endDateObj = new Date(parseInt(endStamp + "000"));
        var timeElapsed = convertSecondsToDateFormat(endStamp - startStamp, false);
        var dayOfTheWeek = endDateObj.toString().split(' ')[0];

        var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
            endDateObj.getDate() + "/" +
            (endDateObj.getFullYear());

        var template = '<div class="item goal-record">' +
            '<hr/><p class="title"><i class="far fa-calendar-plus"></i>&nbsp;' +
            'You waited <b><span class="timeElapsed">' + timeElapsed + '</span></b>.' +
            '</p>' +
            '<p class="date" style="text-align:center;color:D8D8D8">' +
            '<span class="dayOfTheWeek">' + dayOfTheWeek + '</span>,&nbsp;' +
            '<span class="shortHandDate">' + shortHandDate + '</span>' +
            '</p>' +
            '</div><!--end habit-log item div-->';

        // Assure user has selected to display this log item type
        // Controller is on settings pane
        if (json.option.logItemsToDisplay.goal === true) {
            if (placeBelow) {
                $('#habit-log').append(template);
            } else {
                $('#habit-log').prepend(template);
            }
            // And make sure the heading exists too
            $("#habit-log-heading").show();
        }
    }

    /**
     * Replace longest goal if the current goal is longer
     * @param {number} start - Start timestamp
     * @param {number} end - End timestamp
     * @param {Object} json - The app state object
     * @param {Function} convertSecondsToDateFormat - Function to convert seconds to date format
     */
    function replaceLongestGoal(start, end, json, convertSecondsToDateFormat) {
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

        var goalLength = end - start;
        
        if (goalLength > json.statistics.goal.longestGoal[timeIncrement]) {
            // If longest goal just happened
            json.statistics.goal.longestGoal[timeIncrement] = goalLength;
            $(".statistic.longestGoal." + timeIncrement).html(
                convertSecondsToDateFormat(goalLength, true)
            );
        }
    }

    /**
     * Initiate goal timer
     * @param {Object} json - The app state object
     * @param {Object} dependencies - Function dependencies
     * @returns {Object} - Timer object
     */
    function initiateGoalTimer(json, dependencies) {
        const { 
            toggleActiveStatGroups, 
            hideInactiveStatistics,
            changeGoalStatus,
            placeGoalIntoLog,
            replaceLongestGoal,
            showActiveStatistics,
            createNotification
        } = dependencies;
        
        // Increment counter first
        json.statistics.goal.clickCounter++;
        
        // Add handler for goal completion
        window.handleGoalCompletion = function(timerSection, json) {
            toggleActiveStatGroups();
            hideInactiveStatistics();

            // Find most recent goal type
            var goalType = "";
            if (json.statistics.goal.activeGoalBoth == 1) {
                goalType = "both";
                json.statistics.goal.activeGoalBoth = 0;
            } else if (json.statistics.goal.activeGoalBought == 1) {
                goalType = "bought";
                json.statistics.goal.activeGoalBought = 0;
            } else if (json.statistics.goal.activeGoalUse == 1) {
                goalType = "use";
                json.statistics.goal.activeGoalUse = 0;
            }

            var actualEnd = Math.round(new Date() / 1000);
            changeGoalStatus(3, goalType, actualEnd);

            // (startStamp, endStamp, goalType) =>
            var startStamp = json.statistics.goal.lastClickStamp;
            placeGoalIntoLog(startStamp, actualEnd, goalType, false);

            // If longest goal just happened
            replaceLongestGoal(startStamp, actualEnd);
            
            // Update number of goals
            json.statistics.goal.completedGoals++;
            $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
            showActiveStatistics();

            var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];
            
            // Notify user that goal ended
            var message = "Congrats! You made it :) . " + affirmation;
            createNotification(message);

            // Disappear zero seconds left timer
            $(timerSection + " .fibonacci-timer").parent().hide();
        };
        
        return TimerStateManager.initiate('goal', undefined, json);
    }

    /**
     * Handle goal dialog submit
     * @param {Object} json - The app state object
     */
    function handleGoalDialogSubmit(json) {
        var date = new Date();
        var timestampSeconds = Math.round(date / 1000);

        // Get time selection from form
        var requestedTimeEndHours = parseInt($(".goal.log-more-info select.time-picker-hour").val());
        var requestedTimeEndMinutes = parseInt($(".goal.log-more-info select.time-picker-minute").val());

        // 12 am is actually the first hour in a day
        if (requestedTimeEndHours == 12) {
            requestedTimeEndHours = 0;
        }
        // Account for am vs pm from userfriendly version of time input
        if ($(".goal.log-more-info select.time-picker-am-pm").val() == "PM") {
            requestedTimeEndHours = requestedTimeEndHours + 12;
        }

        var requestedGoalEnd = $('#goalEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var goalStampSeconds = Math.round(new Date(requestedGoalEnd).getTime() / 1000);

        var secondsUntilRequestedGoal = (requestedTimeEndHours * 60 * 60) + (requestedTimeEndMinutes * 60);
        // Values 1-12 for Hours 0-59 for minutes	

        // Default datepicker time selection
        var secondsUntilDefaultTime = (0);
        var nowHours = date.getHours();
        var nowMinutes = date.getMinutes();
        var secondsUntilNow = (nowHours * 60 * 60) + (nowMinutes * 60);
        // Values 1-12 for Hours 0-59 for minutes	

        if (goalStampSeconds >= timestampSeconds || secondsUntilRequestedGoal > secondsUntilNow) {
            goalStampSeconds += secondsUntilRequestedGoal;

            var goalType = "";
            /* Figure goal type */
            if ($("#boughtGoalInput").is(":checked") && $("#usedGoalInput").is(":checked")) {
                // Both are checked
                goalType = "both";
            } else {
                if ($("#boughtGoalInput").is(":checked")) {
                    goalType = "bought";
                } else if ($("#usedGoalInput").is(":checked")) {
                    goalType = "use";
                }
            }

            // There is an active goal
            if (json.statistics.goal.activeGoalUse !== 0 ||
                json.statistics.goal.activeGoalBought !== 0 ||
                json.statistics.goal.activeGoalBoth !== 0) {

                // Ask if user wants to extend goal
                var message = "You already have an active goal, would you like to extend it?";
                var responseTools =
                    '<button class="notification-response-tool extend-goal" href="#" >' +
                    'Yes</button>' +
                    '<button class="notification-response-tool end-goal" href="#">' +
                    'No</button>';

                createNotification(message, responseTools);
            } else {
                // Keep lastClickStamp up to date while using app
                json.statistics.goal.lastClickStamp = timestampSeconds;

                // Return to relevant screen
                $(".statistics-tab-toggler").click();

                // Set local json goal type which is active
                var jsonHandle = "activeGoal" + goalType.charAt(0).toUpperCase() + goalType.slice(1);
                json.statistics.goal[jsonHandle] = 1;

                updateActionTable(timestampSeconds, "goal", "", goalStampSeconds, goalType);

                // Convert goalend to days hours minutes seconds
                var totalSecondsUntilGoalEnd = Math.round(goalStampSeconds - timestampSeconds);

                loadGoalTimerValues(totalSecondsUntilGoalEnd);
                initiateGoalTimer();

                showActiveStatistics();
                adjustFibonacciTimerToBoxes("goal-timer");
            }

            closeClickDialog(".goal");
        } else {
            /* User selected a time on today (equal to or) prior to current time */
            alert("Please choose a time later than right now!");
        }
    }

    /**
     * Set up goal dialog with current time values
     */
    function setupGoalDialog() {
        var date = new Date();
        var currHours = date.getHours(),
            currMinutes = date.getMinutes();
        if (currHours >= 12) {
            $(".goal.log-more-info .time-picker-am-pm").val("PM");
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
        $(".goal.log-more-info .time-picker-minute").val(currMinutesRounded);
        $(".goal.log-more-info .time-picker-hour").val(currHours);
    }

    /**
     * Initialize the module with required dependencies
     * @param {Object} dependencies - Object containing required functions
     */
    function init(dependencies) {
        createNotification = dependencies.createNotification;
        updateActionTable = dependencies.updateActionTable;
        loadGoalTimerValues = dependencies.loadGoalTimerValues;
        initiateGoalTimer = dependencies.initiateGoalTimer;
        showActiveStatistics = dependencies.showActiveStatistics;
        adjustFibonacciTimerToBoxes = dependencies.adjustFibonacciTimerToBoxes;
        closeClickDialog = dependencies.closeClickDialog;

        // Set up event handlers
        $(".goal.log-more-info button.submit").click(function() {
            handleGoalDialogSubmit(dependencies.json);
        });
    }

    // Public API
    return {
        loadGoalTimerValues: loadGoalTimerValues,
        changeGoalStatus: changeGoalStatus,
        extendActiveGoal: function(json, dependencies) {
            return extendActiveGoal(json, dependencies);
        },
        endActiveGoal: function(json, dependencies) {
            return endActiveGoal(json, dependencies);
        },
        placeGoalIntoLog: function(startStamp, endStamp, goalType, placeBelow, json, convertSecondsToDateFormat) {
            return placeGoalIntoLog(startStamp, endStamp, goalType, placeBelow, json, convertSecondsToDateFormat);
        },
        replaceLongestGoal: function(start, end, json, convertSecondsToDateFormat) {
            return replaceLongestGoal(start, end, json, convertSecondsToDateFormat);
        },
        initiateGoalTimer: function(json, dependencies) {
            return initiateGoalTimer(json, dependencies);
        },
        setupGoalDialog: setupGoalDialog,
        handleGoalDialogSubmit: handleGoalDialogSubmit,
        init: init
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoalsModule;
} else {
    window.GoalsModule = GoalsModule;
}
