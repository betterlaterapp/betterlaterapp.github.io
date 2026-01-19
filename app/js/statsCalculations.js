/**
 * StatsCalculationsModule - Pure calculation functions for statistics
 * No DOM manipulation, no side effects - just data in, data out
 */
var StatsCalculationsModule = (function () {
    /**
     * Calculate statistics for different time ranges
     * @param {number} timeNow - Current timestamp
     * @param {Array} action - Array of actions
     * @param {string} value - Optional value field to sum
     * @returns {Object} - Object with total, week, month, and year values
     */
    function segregatedTimeRange(timeNow, action, value) {
        var runningTotal = 0,
            runningWeek = 0,
            runningMonth = 0,
            runningYear = 0;

        // Calculate timestamps for past week, month, year
        var oneWeekAgoTimeStamp = timeNow - (60 * 60 * 24 * 7);
        var oneMonthAgoTimeStamp = timeNow - (60 * 60 * 24 * 30);
        var oneYearAgoTimeStamp = timeNow - (60 * 60 * 24 * 365);

        for (var i = action.length - 1; i >= 0; i--) {
            // Update every record into running total
            runningTotal = runningTotal + parseInt(value != undefined ? action[i][value] : 1);

            if (action[i].timestamp > oneWeekAgoTimeStamp) {
                runningWeek = runningWeek + parseInt(value != undefined ? action[i][value] : 1);
            }
            if (action[i].timestamp > oneMonthAgoTimeStamp) {
                runningMonth = runningMonth + parseInt(value != undefined ? action[i][value] : 1);
            }
            if (action[i].timestamp > oneYearAgoTimeStamp) {
                runningYear = runningYear + parseInt(value != undefined ? action[i][value] : 1);
            }
        }

        return {
            total: runningTotal,
            week: runningWeek,
            month: runningMonth,
            year: runningYear
        };
    }

    /**
     * Get midnight timestamp of a given timestamp
     * @param {number} timestamp - The timestamp to convert
     * @returns {number} - Timestamp for midnight of that day
     */
    function midnightOfTimestamp(timestamp) {
        var requestedDate = new Date(timestamp * 1000);

        // FORMAT NEEDED == 2020-02-14T14:30:00
        var newMidnightStr = requestedDate.getFullYear() + "-";
        // Add month
        if (requestedDate.getMonth() + 1 < 10) {
            newMidnightStr += "0" + (requestedDate.getMonth() + 1) + "-";
        } else {
            newMidnightStr += (requestedDate.getMonth() + 1) + "-";
        }
        // Add day
        if (requestedDate.getDate() < 10) {
            newMidnightStr += "0" + (requestedDate.getDate());
        } else {
            newMidnightStr += (requestedDate.getDate());
        }
        // Add hours
        newMidnightStr += "T23:59:59";

        var midnightOfTimestamp = Math.round(new Date(newMidnightStr) / 1000);
        return midnightOfTimestamp;
    }

    /**
     * Calculate the maximum report height based on actions
     * @param {Object} storageObject - The storage object
     * @returns {number} - Maximum report height
     */
    function calculateMaxReportHeight(storageObject) {
        var jsonObject = storageObject ? storageObject : StorageModule.retrieveStorageObject();
        var actions = jsonObject.action.filter(function (e) {
            return e && (e.clickType == "used" || e.clickType == "craved");
        });

        var maxHeight = 0;
        var actionCount = 0;
        var currDate = new Date();
        for (var action of actions) {
            var actionDate = new Date(action.timestamp * 1000);
            var actionYear = actionDate.getFullYear();
            var actionMonth = actionDate.getMonth();
            var actionDay = actionDate.getDate();

            var actionOnCurrDate =
                actionYear == currDate.getFullYear()
                && actionMonth == currDate.getMonth()
                && actionDay == currDate.getDate();

            if (actionOnCurrDate) {
                actionCount++;
                if (actionCount > maxHeight) {
                    maxHeight = actionCount;
                }
            } else {
                currDate = actionDate;
                actionCount = 1;
            }
        }

        return maxHeight;
    }

    /**
     * Calculate percent change between two values
     * @param {number} first - First value (baseline/last week)
     * @param {number} second - Second value (this week)
     * @returns {number|string} - Percent change or "N/A"
     */
    function percentChangedBetween(first, second) {
        // Parse to numbers to handle string values from baseline
        first = parseFloat(first) || 0;
        second = parseFloat(second) || 0;

        // Both zero = no change
        if (first === 0 && second === 0) {
            return 0;
        }

        // Baseline is zero but we have activity = can't calculate meaningful %
        if (first === 0 && second !== 0) {
            return "N/A";
        }

        // Normal calculation
        var percentChanged = Math.round(((first - second) / first) * 100);
        
        // Safety check for any edge cases
        if (!isFinite(percentChanged) || isNaN(percentChanged)) {
            return "N/A";
        }

        return percentChanged;
    }

    /**
     * Convert timestamp to short hand date format
     * @param {number} timestamp - Timestamp to convert
     * @param {boolean} includeYear - Whether to include the year
     * @returns {string} - Formatted date string
     */
    function timestampToShortHandDate(timestamp, includeYear) {
        var endDateObj = new Date(parseInt(timestamp + "000"));
        var shortHandDate = (endDateObj.getMonth() + 1) + "/" +
            endDateObj.getDate();
        if (includeYear) {
            var year = String(endDateObj.getFullYear()).substring(2);
            shortHandDate = shortHandDate + "/" + year;
        }
        return shortHandDate;
    }

    /**
     * Convert seconds to formatted date string
     * @param {number} rangeInSeconds - Range in seconds to format
     * @param {boolean} multiline - Whether to use multiline format
     * @returns {string} - Formatted date string
     */
    function convertSecondsToDateFormat(rangeInSeconds, multiline) {
        // Seconds
        var currSeconds = rangeInSeconds % 60;
        if (currSeconds < 10) { currSeconds = "0" + currSeconds; }

        var finalStringStatistic = currSeconds + "s";

        // Minutes
        if (rangeInSeconds >= (60)) {
            var currMinutes = Math.floor(rangeInSeconds / (60)) % 60;
            if (currMinutes < 10) { currMinutes = "0" + currMinutes; }

            finalStringStatistic = currMinutes + "<span>m&nbsp;</span>" + finalStringStatistic;
        }

        // Hours
        if (rangeInSeconds >= (60 * 60)) {
            var currHours = Math.floor(rangeInSeconds / (60 * 60)) % 24;
            if (currHours < 10) { currHours = "0" + currHours; }

            finalStringStatistic = currHours + "<span>h&nbsp;</span>" + finalStringStatistic;
            // Drop seconds
            finalStringStatistic = finalStringStatistic.split("m")[0] + "m</span>";
        }

        // Days
        if (rangeInSeconds >= (60 * 60 * 24)) {
            var dayCount = Math.floor(rangeInSeconds / (60 * 60 * 24));
            var plural = "";
            if (dayCount > 1) {
                plural = "s";
            }
            var newline = "";
            if (multiline) {
                newline = "<br/>";
            }
            finalStringStatistic = dayCount + "<span>&nbsp;day" + plural + "&nbsp;</span>" + newline + finalStringStatistic;
            // Drop minutes
            finalStringStatistic = finalStringStatistic.split("h")[0] + "h</span>";
        }

        // Remove very first 0 from string
        if (finalStringStatistic.charAt(0) === "0") {
            finalStringStatistic = finalStringStatistic.substr(1);
        }

        return finalStringStatistic;
    }

    /**
     * Calculate resist streak from actions (craved vs used)
     * @param {Array} actions - Array of use/crave actions
     * @returns {number} - The longest resist streak
     */
    function calculateResistStreak(actions) {
        var runningTotal = 0;
        var streak = 0;

        for (const [i, action] of actions.entries()) {
            // Last action found
            if (actions.length == i + 1) {
                if (action.clickType == "craved") { streak++; }
                if (streak > runningTotal) { runningTotal = streak; }
                break;
            }

            if (action.clickType == "craved") {
                streak++;
                continue;
            }

            if (action.clickType == "used") {
                if (streak > runningTotal) { runningTotal = streak; }
                streak = 0;
            }
        }

        return runningTotal;
    }

    /**
     * Calculate average time between actions
     * @param {Array} counts - Array of action records with timestamps
     * @param {Array} countsWeek - Week filtered actions
     * @param {Array} countsMonth - Month filtered actions
     * @param {Array} countsYear - Year filtered actions
     * @returns {Object} - Object with total, week, month, year averages
     */
    function calculateAverageTimeBetween(counts, countsWeek, countsMonth, countsYear) {
        var totalTimeBetween = {};
        var avgTimeBetween = {};

        totalTimeBetween.total = counts[counts.length - 1].timestamp - counts[0].timestamp;
        
        if (counts.length > 1) {
            avgTimeBetween.total = Math.round(totalTimeBetween.total / (counts.length - 1));
        } else {
            avgTimeBetween.total = Math.round(totalTimeBetween.total);
        }

        // Week calculation
        if (countsWeek.length > 1) {
            if (countsMonth.length == countsWeek.length) {
                totalTimeBetween.week = countsWeek[countsWeek.length - 1].timestamp - countsWeek[0].timestamp;
                avgTimeBetween.week = Math.round(totalTimeBetween.week / (countsWeek.length - 1));
            } else {
                totalTimeBetween.week = 7 * 24 * 60 * 60;
                avgTimeBetween.week = Math.round(totalTimeBetween.week / (countsWeek.length - 1));
            }
        } else {
            totalTimeBetween.week = 7 * 24 * 60 * 60;
            avgTimeBetween.week = 7 * 24 * 60 * 60;
        }

        // Month calculation
        if (countsMonth.length > 1) {
            if (countsYear.length == countsMonth.length) {
                totalTimeBetween.month = countsMonth[countsMonth.length - 1].timestamp - countsMonth[0].timestamp;
                avgTimeBetween.month = Math.round(totalTimeBetween.month / (countsMonth.length - 1));
            } else {
                totalTimeBetween.month = 30 * 24 * 60 * 60;
                avgTimeBetween.month = Math.round(totalTimeBetween.month / (countsMonth.length - 1));
            }
        } else {
            totalTimeBetween.month = 30 * 24 * 60 * 60;
            avgTimeBetween.month = 30 * 24 * 60 * 60;
        }

        // Year calculation
        if (countsYear.length > 1) {
            if (countsYear.length == counts.length) {
                totalTimeBetween.year = countsYear[countsYear.length - 1].timestamp - countsYear[0].timestamp;
                avgTimeBetween.year = Math.round(totalTimeBetween.year / (countsYear.length - 1));
            } else {
                totalTimeBetween.year = 365 * 24 * 60 * 60;
                avgTimeBetween.year = Math.round(totalTimeBetween.year / (countsYear.length - 1));
            }
        } else {
            totalTimeBetween.year = 365 * 24 * 60 * 60;
            avgTimeBetween.year = 365 * 24 * 60 * 60;
        }

        return avgTimeBetween;
    }

    /**
     * Calculate longest goal from a set of goals
     * @param {Array} goals - Array of goal records
     * @returns {number} - Duration of longest goal in seconds
     */
    function calculateLongestGoalFromSet(goals) {
        var largestDiff = 0;

        for (var i = 0; i < goals.length; i++) {
            var currStartStamp = goals[i].timestamp;
            var currEndStamp = goals[i].goalStopped;
            var currDiff = currEndStamp - currStartStamp;
            
            if (largestDiff < currDiff) {
                largestDiff = currDiff;
            }
        }

        return largestDiff;
    }

    // Public API
    return {
        segregatedTimeRange: segregatedTimeRange,
        midnightOfTimestamp: midnightOfTimestamp,
        calculateMaxReportHeight: calculateMaxReportHeight,
        percentChangedBetween: percentChangedBetween,
        timestampToShortHandDate: timestampToShortHandDate,
        convertSecondsToDateFormat: convertSecondsToDateFormat,
        calculateResistStreak: calculateResistStreak,
        calculateAverageTimeBetween: calculateAverageTimeBetween,
        calculateLongestGoalFromSet: calculateLongestGoalFromSet
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCalculationsModule;
} else {
    window.StatsCalculationsModule = StatsCalculationsModule;
}
