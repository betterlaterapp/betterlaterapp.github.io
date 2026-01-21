var TimersModule = (function () {
    var smokeTimer;
    var boughtTimer;
    var waitTimer; // Renamed from goalTimer

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

    function hideTimersOnLoad(json) {
        if (json.statistics.use.sinceTimerStart.totalSeconds == 0) {
            $(".stat-last-done .fibonacci-timer:first-child").toggle();

        } else {
            //start timer from json values
            TimerStateManager.initiate('smoke', undefined, json);
        }

        if (json.statistics.cost.sinceTimerStart.totalSeconds == 0) {
            $(".stat-last-spent .fibonacci-timer:first-child").toggle();

        } else {
            //start timer from json values
            TimerStateManager.initiate('bought', undefined, json);
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

            // Check if timer element exists before manipulating
            if (!timerElement) return;

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
     * Calculate wait timer values from total seconds (renamed from loadGoalTimerValues)
     * @param {number} totalSecondsUntilWaitEnd - Total seconds until wait ends
     * @param {object} json - JSON object with statistics
     */
    function loadWaitTimerValues(totalSecondsUntilWaitEnd, json) {
        var waitStats = json.statistics.wait;
        
        waitStats.untilTimerEnd.days = 0;
        waitStats.untilTimerEnd.hours = 0;
        waitStats.untilTimerEnd.minutes = 0;
        waitStats.untilTimerEnd.seconds = 0;
        waitStats.untilTimerEnd.totalSeconds = totalSecondsUntilWaitEnd;

        //calc mins and secs
        if (totalSecondsUntilWaitEnd > 60) {
            waitStats.untilTimerEnd.seconds = totalSecondsUntilWaitEnd % 60;
            waitStats.untilTimerEnd.minutes = Math.floor(totalSecondsUntilWaitEnd / 60);
        } else {
            waitStats.untilTimerEnd.seconds = totalSecondsUntilWaitEnd;
            waitStats.untilTimerEnd.minutes = 0;
        }

        //calc hours
        if (totalSecondsUntilWaitEnd > (60 * 60)) {
            waitStats.untilTimerEnd.minutes = waitStats.untilTimerEnd.minutes % 60;
            waitStats.untilTimerEnd.hours = Math.floor(totalSecondsUntilWaitEnd / (60 * 60));
        } else {
            waitStats.untilTimerEnd.hours = 0;
        }

        //calc days
        if (totalSecondsUntilWaitEnd > (60 * 60 * 24)) {
            waitStats.untilTimerEnd.hours = waitStats.untilTimerEnd.hours % 24;
            waitStats.untilTimerEnd.days = Math.floor(totalSecondsUntilWaitEnd / (60 * 60 * 24));
        } else {
            waitStats.untilTimerEnd.days = 0;
        }
    }

    /**
     * @deprecated Use loadWaitTimerValues instead
     */
    function loadGoalTimerValues(totalSecondsUntilGoalEnd, json) {
        // Backward compatibility - delegate to new function
        loadWaitTimerValues(totalSecondsUntilGoalEnd, json);
    }

    // Public API
    return {
        smokeTimer,
        boughtTimer,
        waitTimer, // New naming
        goalTimer: waitTimer, // Backward compatibility
        restartTimerAtValues,
        hideTimersOnLoad,
        adjustFibonacciTimerToBoxes,
        loadWaitTimerValues, // New naming
        loadGoalTimerValues // Backward compatibility
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimersModule;
} else {
    window.TimersModule = TimersModule;
}


