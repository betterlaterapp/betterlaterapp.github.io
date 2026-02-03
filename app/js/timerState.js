/**
 * Centralized Timer State Manager
 * Handles all timer functionality for Better Later app
 */

var TimerStateManager = (function () {
    var timers = {
        smoke: {
            id: 'smoke-timer',
            selector: '.stat-last-done',
            jsonPath: 'use',
            intervalRef: null,
            countdown: false
        },
        bought: {
            id: 'bought-timer',
            selector: '.stat-last-spent',
            jsonPath: 'cost',
            intervalRef: null,
            countdown: false
        },
        // New naming: 'wait' timer
        wait: {
            id: 'wait-timer',
            selector: '#wait-timers-container',
            jsonPath: 'wait', // Will fall back to 'goal' if 'wait' doesn't exist
            intervalRef: null,
            countdown: true,
            stateKey: 'untilTimerEnd'
        }
    }

    /**
     * Get statistics object for a timer, with fallback for wait/goal compatibility
     * @param {object} json - The app state
     * @param {string} jsonPath - The path in statistics ('wait', 'goal', 'use', 'cost')
     * @returns {object} The statistics object
     */
    function getStatsForPath(json, jsonPath) {
        return json.statistics[jsonPath];
    }

    /**
     * Calculate time units from total seconds
     * @param {number} totalSeconds
     * @returns {object} Object with days, hours, minutes, seconds
     */
    function calculateTimeUnits(totalSeconds) {
        const days = Math.floor(totalSeconds / (60 * 60 * 24));
        const hours = Math.floor(totalSeconds / (60 * 60)) % 24;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const seconds = totalSeconds % 60;

        return { days, hours, minutes, seconds };
    }

    function updateTimerDisplay(timerSection, seconds, minutes, hours, days) {
        // Format seconds with leading zero if needed
        const formattedSeconds = seconds >= 10 ? seconds : "0" + seconds;

        $(`${timerSection} .secondsSinceLastClick:first-child`).html(formattedSeconds);
        $(`${timerSection} .minutesSinceLastClick:first-child`).html(minutes);
        $(`${timerSection} .hoursSinceLastClick:first-child`).html(hours);
        $(`${timerSection} .daysSinceLastClick:first-child`).html(days);
    }

    function resetTimerBoxVisibility(timerSection) {
        if (!$(`${timerSection} .fibonacci-timer`).is(':visible')) {
            $(`${timerSection} .fibonacci-timer:first-child`).toggle();
        }

        while ($(`${timerSection} .boxes div:visible`).length > 1) {
            $($(`${timerSection} .boxes div:visible`)[0]).toggle();
        }
    }

    function adjustTimerBoxVisibility(timerSection, fromValues, timeValues) {
        if (fromValues) {
            // For initiation with values
            for (let timerBox of $(`${timerSection} .boxes div:visible`)) {
                if (parseInt($(timerBox).find(".timerSpan").html()) === 0) {
                    $(timerBox).hide();
                } else { // Found a non-zero value
                    $(timerBox).show();
                    break;
                }
            }
        } else {
            // For restarting from storage
            let foundNonZero = false;

            if (timeValues.days === 0) {
                $(`${timerSection} .daysSinceLastClick`).parent().toggle();
            } else {
                foundNonZero = true;
            }

            if (timeValues.hours === 0 && !foundNonZero) {
                $(`${timerSection} .hoursSinceLastClick`).parent().toggle();
            } else {
                foundNonZero = true;
            }

            if (timeValues.minutes === 0 && !foundNonZero) {
                $(`${timerSection} .minutesSinceLastClick`).parent().toggle();
            } else if (timeValues.minutes === 0) {
                $(`${timerSection} .minutesSinceLastClick:first-child`).html(timeValues.minutes);
            } else {
                foundNonZero = true;
            }
        }
    }

    function hideZeroValueTimerBoxes(timerSection) {
        //make boxes with value of zero hidden until find a non zero value
        for (var i = 0; i < $(`#${timerSection} .boxes div`).length; i++) {
            var currTimerSpanValue = $(`#${timerSection} .boxes div .timerSpan`)[i];
            if (currTimerSpanValue.innerHTML === "0") {
                $(currTimerSpanValue).parent().hide();
            } else {
                break;
            }
        }
    }

    function createCountdownInterval(timer, timerSection, json) {
        const stateKey = timer.stateKey || 'untilTimerEnd';
        const stats = getStatsForPath(json, timer.jsonPath);

        // Get initial values from json
        let days = stats[stateKey].days;
        let hours = stats[stateKey].hours;
        let minutes = stats[stateKey].minutes;
        let seconds = stats[stateKey].seconds;
        let totalSeconds = stats[stateKey].totalSeconds;

        return setInterval(() => {
            // Decrease seconds
            totalSeconds--;
            seconds--;

            // Format seconds
            if (seconds >= 10) {
                $(`${timerSection} .secondsSinceLastClick:first-child`).html(seconds);
            } else {
                $(`${timerSection} .secondsSinceLastClick:first-child`).html("0" + seconds);
            }

            // Handle seconds rollover
            if (seconds < 0) {
                if (minutes > 0 || hours > 0 || days > 0) {
                    seconds = 59;
                    minutes--;

                    // Handle visibility when down to last minute
                    if (minutes === 0 && hours === 0 && days === 0) {
                        if ($(`${timerSection} .boxes div:visible`).length > 1) {
                            $($(`${timerSection} .boxes div:visible`)[0]).toggle();
                            TimersModule.adjustFibonacciTimerToBoxes(timer.id);
                        }
                    }
                } else {
                    /* ENTIRE GOAL IS DONE */
                    seconds = 0;
                    clearInterval(timer.intervalRef);
                    timer.intervalRef = null;

                    // Call the goal completion handler from GoalsModule
                    if (typeof GoalsModule !== 'undefined' && GoalsModule.handleGoalCompletion) {
                        GoalsModule.handleGoalCompletion(timerSection, json);
                    }
                }

                $(`${timerSection} .minutesSinceLastClick:first-child`).html(minutes);
                $(`${timerSection} .secondsSinceLastClick:first-child`).html(seconds);
            }

            // Handle minutes rollover
            if (minutes < 0) {
                if (hours > 0 || days > 0) {
                    minutes = 59;
                    hours--;

                    // Handle visibility when down to last hour
                    if (hours === 0 && days === 0) {
                        if ($(`${timerSection} .boxes div:visible`).length > 1) {
                            $($(`${timerSection} .boxes div:visible`)[0]).toggle();
                            TimersModule.adjustFibonacciTimerToBoxes(timer.id);
                        }
                    }
                }

                $(`${timerSection} .minutesSinceLastClick:first-child`).html(minutes);
                $(`${timerSection} .hoursSinceLastClick:first-child`).html(hours);
            }

            // Handle hours rollover
            if (hours < 0) {
                if (days > 0) {
                    hours = 23;
                    days--;

                    if (days === 0) {
                        setTimeout(() => {
                            $($(`#wait-timers-container .boxes div`)[0]).hide();
                            TimersModule.adjustFibonacciTimerToBoxes(timer.id);
                        }, 0);
                    }
                }

                if ($(`${timerSection} .boxes div:visible`).length === 3) {
                    const numberOfBoxesHidden = $(`${timerSection} .boxes div:hidden`).length;
                    $($(`${timerSection} .boxes div:hidden`)[numberOfBoxesHidden - 1]).toggle();
                }

                $(`${timerSection} .hoursSinceLastClick:first-child`).html(hours);
                $(`${timerSection} .daysSinceLastClick:first-child`).html(days);
            }

            // Update json with current values
            stats[stateKey].totalSeconds = totalSeconds;
            stats[stateKey].seconds = seconds;
            stats[stateKey].minutes = minutes;
            stats[stateKey].hours = hours;
            stats[stateKey].days = days;

        }, 1000); // End interval
    }

    function createCountupInterval(timer, timerSection, json) {
        const stateKey = timer.stateKey || 'sinceTimerStart';
        const stats = getStatsForPath(json, timer.jsonPath);

        // Get initial values
        let days = stats[stateKey].days;
        let hours = stats[stateKey].hours;
        let minutes = stats[stateKey].minutes;
        let seconds = stats[stateKey].seconds;
        let totalSeconds = stats[stateKey].totalSeconds;

        return setInterval(() => {
            // Increment seconds
            totalSeconds++;
            seconds++;

            // Update json
            stats[stateKey].totalSeconds++;
            stats[stateKey].seconds++;

            // Format seconds
            if (seconds >= 10) {
                $(`${timerSection} .secondsSinceLastClick:first-child`).html(seconds);
            } else {
                $(`${timerSection} .secondsSinceLastClick:first-child`).html("0" + seconds);
            }

            // Handle seconds rollover
            if (seconds >= 60) {
                seconds = 0;
                minutes++;

                // Update json
                stats[stateKey].seconds = 0;
                stats[stateKey].minutes++;

                // Handle box visibility
                if ($(`${timerSection} .boxes div:visible`).length === 1) {
                    const numberOfBoxesHidden = $(`${timerSection} .boxes div:hidden`).length;
                    $($(`${timerSection} .boxes div:hidden`)[numberOfBoxesHidden - 1]).toggle();
                }

                // Format minutes
                if (minutes >= 10) {
                    $(`${timerSection} .minutesSinceLastClick:first-child`).html(minutes);
                } else {
                    $(`${timerSection} .minutesSinceLastClick:first-child`).html("0" + minutes);
                }

                $(`${timerSection} .secondsSinceLastClick:first-child`).html("0" + seconds);
                TimersModule.adjustFibonacciTimerToBoxes(timer.id);
            }

            // Handle minutes rollover
            if (minutes >= 60) {
                minutes = 0;
                hours++;

                // Update json
                stats[stateKey].minutes = 0;
                stats[stateKey].hours++;

                // Handle box visibility
                if ($(`${timerSection} .boxes div:visible`).length === 2) {
                    const numberOfBoxesHidden = $(`${timerSection} .boxes div:hidden`).length;
                    $($(`${timerSection} .boxes div:hidden`)[numberOfBoxesHidden - 1]).toggle();
                }

                // Format hours
                if (hours >= 10) {
                    $(`${timerSection} .hoursSinceLastClick:first-child`).html(hours);
                } else {
                    $(`${timerSection} .hoursSinceLastClick:first-child`).html("0" + hours);
                }

                $(`${timerSection} .minutesSinceLastClick:first-child`).html("0" + minutes);
                TimersModule.adjustFibonacciTimerToBoxes(timer.id);
            }

            // Handle hours rollover
            if (hours >= 24) {
                hours = 0;
                days++;

                // Update json
                stats[stateKey].hours = 0;
                stats[stateKey].days++;

                // Handle box visibility
                if ($(`${timerSection} .boxes div:visible`).length === 3) {
                    const numberOfBoxesHidden = $(`${timerSection} .boxes div:hidden`).length;
                    $($(`${timerSection} .boxes div:hidden`)[numberOfBoxesHidden - 1]).toggle();
                }

                $(`${timerSection} .hoursSinceLastClick:first-child`).html("0" + hours);
                $(`${timerSection} .daysSinceLastClick:first-child`).html(days);
                TimersModule.adjustFibonacciTimerToBoxes(timer.id);
            }
        }, 1000); // End interval
    }

    /**
    * Initialize a timer with optional timestamp
    * @param {string} timerType - 'smoke', 'bought', or 'goal'
    * @param {number} requestedTimestamp - Optional timestamp for initialization
    * @param {object} json - App data object
    */
    function initiate(timerType, requestedTimestamp, json) {
        const timer = timers[timerType];
        if (!timer) return console.error(`Timer type '${timerType}' not found`);

        const timerElement = $(`#${timer.id}`);
        const timerSection = timer.selector;
        const stateKey = timer.stateKey || 'sinceTimerStart';
        const jsonPath = timer.jsonPath;
        const stats = getStatsForPath(json, jsonPath);

        // Clear existing interval
        if (timer.intervalRef) {
            clearInterval(timer.intervalRef);
        }

        // For smoke timer only - check if requested timestamp is valid
        if (timerType === 'smoke' && requestedTimestamp !== undefined) {
            if (requestedTimestamp < json.statistics.use.lastClickStamp) {
                return false; // Requested timestamp is earlier than last tracked timestamp
            }
        }

        // Initialize local variables for the timer
        let days, hours, minutes, seconds, totalSeconds;

        // Handle the counting case
        if (timerElement.hasClass("counting")) {
            // Reset timer values
            days = 0;
            hours = 0;
            minutes = 0;
            seconds = 0;
            totalSeconds = 0;

            // Handle timestamp initialization
            if (requestedTimestamp !== undefined && !timer.countdown) {
                const nowTimestamp = Math.floor(new Date().getTime() / 1000);
                totalSeconds = nowTimestamp - requestedTimestamp;
                const timeValues = this.calculateTimeUnits(totalSeconds);
                days = timeValues.days;
                hours = timeValues.hours;
                minutes = timeValues.minutes;
                seconds = timeValues.seconds;

                // Update json with calculated values
                stats[stateKey].days = days;
                stats[stateKey].hours = hours;
                stats[stateKey].minutes = minutes;
                stats[stateKey].seconds = seconds;
                stats[stateKey].totalSeconds = requestedTimestamp;
            } else {
                // Reset json vars for fresh timer
                stats[stateKey].days = 0;
                stats[stateKey].hours = 0;
                stats[stateKey].minutes = 0;
                stats[stateKey].seconds = 0;
                stats[stateKey].totalSeconds = timer.countdown ? totalSeconds : 0;
            }

            // Insert initial values into timer display
            this.updateTimerDisplay(timerSection, seconds, minutes, hours, days);

            // Handle visibility based on timestamp
            if (requestedTimestamp !== undefined && !timer.countdown) {
                this.adjustTimerBoxVisibility(timerSection, true, { days, hours, minutes, seconds });
            } else {
                this.resetTimerBoxVisibility(timerSection);
            }
        }
        // Handle the restart case (loading from saved state)
        else {
            // Get stored timer values
            days = stats[stateKey].days;
            hours = stats[stateKey].hours;
            minutes = stats[stateKey].minutes;
            seconds = stats[stateKey].seconds;
            totalSeconds = stats[stateKey].totalSeconds;

            if (!timer.countdown && requestedTimestamp !== undefined) {
                const nowTimestamp = Math.floor(new Date().getTime() / 1000);
                totalSeconds = nowTimestamp - requestedTimestamp;
                const timeValues = this.calculateTimeUnits(totalSeconds);
                days = timeValues.days;
                hours = timeValues.hours;
                minutes = timeValues.minutes;
                seconds = timeValues.seconds;
            }

            // Update display with calculated values
            this.updateTimerDisplay(timerSection, seconds, minutes, hours, days);
            this.adjustTimerBoxVisibility(timerSection, false, { days, hours, minutes, seconds });
        }

        // Special handling for goal timer (all boxes visible initially)
        if (timerType === 'goal') {
            // Show all boxes first, then hide the zeros
            $(`${timerSection} .boxes div`).show();
            this.hideZeroValueTimerBoxes('wait-timers-container');
        }

        // Adjust the timer box sizing
        TimersModule.adjustFibonacciTimerToBoxes(timer.id);

        // Create interval for updating the timer
        const intervalFunction = timer.countdown ?
            this.createCountdownInterval(timer, timerSection, json) :
            this.createCountupInterval(timer, timerSection, json);

        timer.intervalRef = intervalFunction;

        // Add active class and show timer
        timerElement.addClass("counting");
        timerElement.show();

        return true;
    }

    // Public API
    return {
        initiate: initiate,
        calculateTimeUnits: calculateTimeUnits,
        updateTimerDisplay: updateTimerDisplay,
        resetTimerBoxVisibility: resetTimerBoxVisibility,
        adjustTimerBoxVisibility: adjustTimerBoxVisibility,
        hideZeroValueTimerBoxes: hideZeroValueTimerBoxes,
        createCountdownInterval: createCountdownInterval,
        createCountupInterval: createCountupInterval
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerStateManager;
} else {
    window.TimerStateManager = TimerStateManager;
}