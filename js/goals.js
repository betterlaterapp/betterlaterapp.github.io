var GoalsModule = (function () {
    var json;

    function extendActiveGoal(json) {

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
        StorageModule.changeGoalStatus(1, goalType, false, goalStampSeconds);
    }

    function endActiveGoal(json) {
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

        StorageModule.changeGoalStatus(2, goalType, timestampSeconds);
        NotificationsModule.createNotification(message);

        var startStamp = json.statistics.goal.lastClickStamp;
        var actualEnd = timestampSeconds;
        ActionLogModule.placeGoalIntoLog(startStamp, actualEnd, goalType, false);

        replaceLongestGoal(startStamp, actualEnd);

        // Update number of goals
        json.statistics.goal.completedGoals++;
        $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
        UIModule.showActiveStatistics(json);

        var requestedGoalEnd = $('#goalEndPicker').datepicker({
            dateFormat: 'yy-mm-dd'
        }).val();

        var goalStampSeconds = Math.round(new Date(requestedGoalEnd).getTime() / 1000);

        // Keep lastClickStamp up to date while using app
        json.statistics.goal.lastClickStamp = timestampSeconds;

        // Return to relevant screen
        $(".statistics-tab-toggler").click();

        StatisticsModule.recalculateAverageTimeBetween(goalType, "total", json);
        StatisticsModule.recalculateAverageTimeBetween(goalType, "week", json);
        StatisticsModule.recalculateAverageTimeBetween(goalType, "month", json);

        // Set local json goal type which is active
        var jsonHandle = "activeGoal" + goalType.charAt(0).toUpperCase() + goalType.slice(1);
        json.statistics.goal[jsonHandle] = 1;

        StorageModule.updateActionTable(timestampSeconds, "goal", "", goalStampSeconds, goalType);

        // Convert goalend to days hours minutes seconds
        var totalSecondsUntilGoalEnd = Math.round(goalStampSeconds - timestampSeconds);

        TimersModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);

        json.statistics.goal.clickCounter++;
        TimerStateManager.initiate('goal', undefined, json);
        UIModule.showActiveStatistics(json);
        UIModule.adjustFibonacciTimerToBoxes("goal-timer");
    }

    function replaceLongestGoal(start, end) {
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
                StatisticsModule.convertSecondsToDateFormat(goalLength, true)
            );
        }
    }

    function handleGoalCompletion(timerSection, json) {
        UIModule.toggleActiveStatGroups(json);
        UIModule.hideInactiveStatistics(json);

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
        StorageModule.changeGoalStatus(3, goalType, actualEnd);

        // (startStamp, endStamp, goalType) =>
        var startStamp = json.statistics.goal.lastClickStamp;
        ActionLogModule.placeGoalIntoLog(startStamp, actualEnd, goalType, false);

        // If longest goal just happened
        replaceLongestGoal(startStamp, actualEnd);

        // Update number of goals
        json.statistics.goal.completedGoals++;
        $("#numberOfGoalsCompleted").html(json.statistics.goal.completedGoals);
        UIModule.showActiveStatistics(json);

        var affirmation = json.affirmations[Math.floor(Math.random() * json.affirmations.length)];

        // Notify user that goal ended
        var message = "Congrats! You made it :) . " + affirmation;
        NotificationsModule.createNotification(message);

        // Disappear zero seconds left timer
        $(timerSection + " .fibonacci-timer").parent().hide();
    }

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

                NotificationsModule.createNotification(message, responseTools);
            } else {
                // Keep lastClickStamp up to date while using app
                json.statistics.goal.lastClickStamp = timestampSeconds;

                // Return to relevant screen
                $(".statistics-tab-toggler").click();

                // Set local json goal type which is active
                var jsonHandle = "activeGoal" + goalType.charAt(0).toUpperCase() + goalType.slice(1);
                json.statistics.goal[jsonHandle] = 1;

                StorageModule.updateActionTable(timestampSeconds, "goal", "", goalStampSeconds, goalType);

                // Convert goalend to days hours minutes seconds
                var totalSecondsUntilGoalEnd = Math.round(goalStampSeconds - timestampSeconds);

                TimersModule.loadGoalTimerValues(totalSecondsUntilGoalEnd, json);


                json.statistics.goal.clickCounter++;
                TimerStateManager.initiate('goal', undefined, json);

                UIModule.showActiveStatistics(json);
                UIModule.adjustFibonacciTimerToBoxes("goal-timer");
            }

            UIModule.closeClickDialog(".goal");
        } else {
            /* User selected a time on today (equal to or) prior to current time */
            alert("Please choose a time later than right now!");
        }
    }

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

    function replaceLongestGoalPublic(start, end, appJson) {
        // Update module json reference if different
        if (appJson && appJson !== json) {
            json = appJson;
        }
        return replaceLongestGoal(start, end);
    }

    function init(appJson) {
        json = appJson;

        // Set up event handlers
        $(".goal.log-more-info button.submit").click(function () {
            handleGoalDialogSubmit(json);
        });
    }

    // Public API
    return {
        handleGoalCompletion: handleGoalCompletion,
        extendActiveGoal: extendActiveGoal,
        endActiveGoal: endActiveGoal,
        replaceLongestGoal: replaceLongestGoalPublic,
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
