/**
 * Timers Module
 * Handles all timer-related functionality for Better Later app
 */

var TimersModule = (function() {
    // Timer interval references
    var smokeTimer;
    var boughtTimer;
    var goalTimer;

/**
 * Convert last timestamp to a running timer
 * @param {string} timerArea - Area of timer (e.g., 'use', 'cost')
 * @param {number} sinceLastAction - Timestamp of last action
 * @param {object} json - JSON object with statistics
 */
function restartTimerAtValues(timerArea, sinceLastAction, json) {
    var timeNow = new Date() / 1000;

    //update json with previous timer values
    var newTimerTotalSeconds = Math.floor(timeNow - sinceLastAction);

    var newTimerSeconds = -1,
        newTimerMinutes = -1,
        newTimerHours = -1,
        newTimerDays = -1;

    //calc mins and secs
    if (newTimerTotalSeconds > 60) {
        newTimerSeconds = newTimerTotalSeconds % 60;
        newTimerMinutes = Math.floor(newTimerTotalSeconds / 60);
        if (newTimerMinutes < 10) {
            newTimerMinutes = "0" + newTimerMinutes;
        }
    } else {
        newTimerSeconds = newTimerTotalSeconds;
        newTimerMinutes = 0;
    }

    //calc hours
    if (newTimerTotalSeconds > (60 * 60)) {
        newTimerMinutes = newTimerMinutes % 60;
        newTimerHours = Math.floor(newTimerTotalSeconds / (60 * 60));
        if (newTimerMinutes < 10) {
            newTimerMinutes = "0" + newTimerMinutes;
        }
        if (newTimerHours < 10) {
            newTimerHours = "0" + newTimerHours;
        }

    } else {
        newTimerHours = 0;
    }

    //calc days
    if (newTimerTotalSeconds > (60 * 60 * 24)) {
        newTimerHours = newTimerHours % 24;
        newTimerDays = Math.floor(newTimerTotalSeconds / (60 * 60 * 24));
        if (newTimerHours < 10) {
            newTimerHours = "0" + newTimerHours;
        }

    } else {
        newTimerDays = 0;
    }

    //update appropriate JSON values
    json.statistics[timerArea].sinceTimerStart.totalSeconds = newTimerTotalSeconds;
    json.statistics[timerArea].sinceTimerStart.seconds = newTimerSeconds;
    json.statistics[timerArea].sinceTimerStart.minutes = newTimerMinutes;
    json.statistics[timerArea].sinceTimerStart.hours = newTimerHours;
    json.statistics[timerArea].sinceTimerStart.days = newTimerDays;
}

/**
 * Hide timers on load if needed
 * @param {object} json - JSON object with statistics
 */
function hideTimersOnLoad(json) {
    if (json.statistics.use.sinceTimerStart.totalSeconds == 0) {
        $("#use-content .fibonacci-timer:first-child").toggle();

    } else {
        //start timer from json values
        TimerStateManager.initiate('smoke', undefined, json);
    }

    if (json.statistics.cost.sinceTimerStart.totalSeconds == 0) {
        $("#cost-content .fibonacci-timer:first-child").toggle();

    } else {
        //start timer from json values
        TimerStateManager.initiate('bought', undefined, json);
    }

    if (json.statistics.goal.untilTimerEnd.totalSeconds == 0) {
        $("#goal-content .fibonacci-timer").toggle();

    } else {
        //start timer from json values
        TimerStateManager.initiate('goal', undefined, json);
    }
}

/**
 * Readjust timer box to correct size
 * @param {string} timerId - ID of the timer element
 * @param {boolean} userWasInactive - Whether user was inactive
 */
function adjustFibonacciTimerToBoxes(timerId, userWasInactive) {

    //came from putting all statistics onto one page
    var relevantPaneIsActive = true;

    if (!userWasInactive && relevantPaneIsActive) {
        var visibleBoxes = $("#" + timerId + " .boxes div:visible"),
            timerElement = document.getElementById(timerId);

        if (visibleBoxes.length == 1) {
            timerElement.style.width = "3rem";
            timerElement.style.height = "3rem";

            //adjustment to align horizontal at 4 boxes shown                    
            timerElement.classList.remove("fully-visible");

        } else if (visibleBoxes.length == 2) {
            timerElement.style.width = "5.9rem";
            timerElement.style.height = "3rem";

            //adjustment to align horizontal at 4 boxes shown                    
            timerElement.classList.remove("fully-visible");

        } else if (visibleBoxes.length == 3) {
            timerElement.style.width = "9rem";
            timerElement.style.height = "6rem";

            //adjustment to align horizontal at 4 boxes shown                    
            timerElement.classList.remove("fully-visible");

        } else if (visibleBoxes.length == 4) {
            timerElement.style.width = "15.4rem";
            timerElement.style.height = "9.4rem";

            //adjustment to align horizontal at 4 boxes shown                    
            timerElement.classList.add("fully-visible");
        }

        //hack to resolve visible boxes = 0 bug
        if (visibleBoxes.length == 0) {
            //adjust .fibonacci-timer to timer height
            timerElement.style.width = "3.3rem";
            timerElement.style.height = "3.3rem";
        }

        //timerElement.style.display = "block";
        timerElement.style.margin = "0 auto";

    }
}

/**
 * Calculate goal timer values from total seconds
 * @param {number} totalSecondsUntilGoalEnd - Total seconds until goal ends
 * @param {object} json - JSON object with statistics
 */
function loadGoalTimerValues(totalSecondsUntilGoalEnd, json) {

    json.statistics.goal.untilTimerEnd.days = 0;
    json.statistics.goal.untilTimerEnd.hours = 0;
    json.statistics.goal.untilTimerEnd.minutes = 0;
    json.statistics.goal.untilTimerEnd.seconds = 0;
    json.statistics.goal.untilTimerEnd.totalSeconds = totalSecondsUntilGoalEnd;

    //calc mins and secs
    if (totalSecondsUntilGoalEnd > 60) {
        json.statistics.goal.untilTimerEnd.seconds = totalSecondsUntilGoalEnd % 60;
        json.statistics.goal.untilTimerEnd.minutes = Math.floor(totalSecondsUntilGoalEnd / 60);
    } else {
        json.statistics.goal.untilTimerEnd.seconds = totalSecondsUntilGoalEnd;
        json.statistics.goal.untilTimerEnd.minutes = 0;
    }

    //calc hours
    if (totalSecondsUntilGoalEnd > (60 * 60)) {
        json.statistics.goal.untilTimerEnd.minutes = json.statistics.goal.untilTimerEnd.minutes % 60;
        json.statistics.goal.untilTimerEnd.hours = Math.floor(totalSecondsUntilGoalEnd / (60 * 60));
    } else {
        json.statistics.goal.untilTimerEnd.hours = 0;
    }

    //calc days
    if (totalSecondsUntilGoalEnd > (60 * 60 * 24)) {
        json.statistics.goal.untilTimerEnd.hours = json.statistics.goal.untilTimerEnd.hours % 24;
        json.statistics.goal.untilTimerEnd.days = Math.floor(totalSecondsUntilGoalEnd / (60 * 60 * 24));
    } else {
        json.statistics.goal.untilTimerEnd.days = 0;
    }

}

    // Public API
    return {
        smokeTimer,
        boughtTimer,
        goalTimer,
        restartTimerAtValues,
        hideTimersOnLoad,
        adjustFibonacciTimerToBoxes,
        loadGoalTimerValues
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimersModule;
} else {
    window.TimersModule = TimersModule;
}


