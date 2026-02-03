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
     * Calculate longest wait from a set of waits
     * @param {Array} waits - Array of wait records
     * @returns {number} - Duration of longest wait in seconds
     */
    function calculateLongestWaitFromSet(waits) {
        var largestDiff = 0;

        for (var i = 0; i < waits.length; i++) {
            var currStartStamp = waits[i].timestamp;
            var currEndStamp = waits[i].waitStopped;
            var currDiff = currEndStamp - currStartStamp;

            if (largestDiff < currDiff) {
                largestDiff = currDiff;
            }
        }

        return largestDiff;
    }

    // Backward compatibility alias for any code still using old name
    var calculateLongestGoalFromSet = calculateLongestWaitFromSet;

    // ============================================
    // Brief Stats Calculation Functions
    // ============================================

    /**
     * Get start of period timestamp
     * @param {string} period - 'day', 'week', or 'month'
     * @param {number} nowSec - Current timestamp in seconds (optional, defaults to now)
     * @returns {number} - Start of period timestamp in seconds
     */
    function getStartOfPeriod(period, nowSec) {
        var now = nowSec ? new Date(nowSec * 1000) : new Date();
        var startDate = new Date(now);
        
        if (period === 'day') {
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'week') {
            var dayOfWeek = startDate.getDay();
            startDate.setDate(startDate.getDate() - dayOfWeek);
            startDate.setHours(0, 0, 0, 0);
        } else if (period === 'month') {
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
        }
        
        return Math.floor(startDate.getTime() / 1000);
    }

    /**
     * Get current resist streak (consecutive 'craved' from most recent action)
     * @param {Array} actions - Array of all actions
     * @returns {number} - Current resist streak count
     */
    function getCurrentResistStreak(actions) {
        var relevantActions = actions.filter(function(a) {
            return a && (a.clickType === 'used' || a.clickType === 'craved');
        });
        
        if (relevantActions.length === 0) return 0;
        
        // Sort by timestamp descending (most recent first)
        relevantActions.sort(function(a, b) {
            return parseInt(b.timestamp) - parseInt(a.timestamp);
        });
        
        var streak = 0;
        for (var i = 0; i < relevantActions.length; i++) {
            if (relevantActions[i].clickType === 'craved') {
                streak++;
            } else {
                break;
            }
        }
        
        return streak;
    }

    /**
     * Get count of 'used' or 'timed' actions for a specific period
     * @param {Array} actions - Array of all actions
     * @param {string} period - 'day', 'week', or 'month'
     * @returns {number} - Count of actions in the period
     */
    function getCountForPeriod(actions, period) {
        var periodStart = getStartOfPeriod(period);
        
        return actions.filter(function(a) {
            return a && (a.clickType === 'used' || a.clickType === 'timed') &&
                   parseInt(a.timestamp) >= periodStart;
        }).length;
    }

    /**
     * Get total amount spent for a specific period
     * @param {Array} actions - Array of all actions
     * @param {string} period - 'day', 'week', or 'month'
     * @returns {number} - Total amount spent in the period
     */
    function getAmountSpentForPeriod(actions, period) {
        var periodStart = getStartOfPeriod(period);
        var total = 0;
        
        actions.forEach(function(a) {
            if (a && a.clickType === 'bought' && parseInt(a.timestamp) >= periodStart) {
                total += parseFloat(a.spent) || 0;
            }
        });
        
        return total;
    }

    /**
     * Get total time spent for a specific period (from 'timed' actions)
     * @param {Array} actions - Array of all actions
     * @param {string} period - 'day', 'week', or 'month'
     * @returns {number} - Total time in seconds
     */
    function getTimeSpentForPeriod(actions, period) {
        var periodStart = getStartOfPeriod(period);
        var total = 0;
        
        actions.forEach(function(a) {
            if (a && a.clickType === 'timed' && parseInt(a.timestamp) >= periodStart) {
                total += parseInt(a.duration) || 0;
            }
        });
        
        return total;
    }

    /**
     * Group actions by day and return daily totals
     * @param {Array} actions - Array of actions to group
     * @param {string} clickType - Type of action to filter ('used', 'timed', 'bought')
     * @param {string} valueField - Field to sum (null for count, 'spent' for money, 'duration' for time)
     * @returns {Object} - Object with date strings as keys and totals as values
     */
    function groupByDay(actions, clickType, valueField) {
        var dailyTotals = {};
        
        actions.forEach(function(a) {
            if (!a) return;
            
            var matchesType = Array.isArray(clickType) 
                ? clickType.indexOf(a.clickType) !== -1 
                : a.clickType === clickType;
            
            if (!matchesType) return;
            
            var dayKey = new Date(parseInt(a.timestamp) * 1000).toDateString();
            
            if (valueField) {
                dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + (parseFloat(a[valueField]) || 0);
            } else {
                dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + 1;
            }
        });
        
        return dailyTotals;
    }

    /**
     * Get best (max) count per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Best count per day
     */
    function getBestCountPerDay(actions) {
        var dailyTotals = groupByDay(actions, ['used', 'timed'], null);
        var max = 0;
        
        for (var day in dailyTotals) {
            if (dailyTotals[day] > max) {
                max = dailyTotals[day];
            }
        }
        
        return max;
    }

    /**
     * Get best (max) amount spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Best amount per day
     */
    function getBestAmountPerDay(actions) {
        var dailyTotals = groupByDay(actions, 'bought', 'spent');
        var max = 0;
        
        for (var day in dailyTotals) {
            if (dailyTotals[day] > max) {
                max = dailyTotals[day];
            }
        }
        
        return max;
    }

    /**
     * Get best (max) time spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Best time in seconds per day
     */
    function getBestTimePerDay(actions) {
        var dailyTotals = groupByDay(actions, 'timed', 'duration');
        var max = 0;
        
        for (var day in dailyTotals) {
            if (dailyTotals[day] > max) {
                max = dailyTotals[day];
            }
        }
        
        return max;
    }

    /**
     * Get average count per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Average count per day (rounded)
     */
    function getAverageCountPerDay(actions) {
        var dailyTotals = groupByDay(actions, ['used', 'timed'], null);
        var days = Object.keys(dailyTotals);
        
        if (days.length === 0) return 0;
        
        var total = 0;
        days.forEach(function(day) {
            total += dailyTotals[day];
        });
        
        return Math.round(total / days.length);
    }

    /**
     * Get average amount spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Average amount per day (rounded to 2 decimals)
     */
    function getAverageAmountPerDay(actions) {
        var dailyTotals = groupByDay(actions, 'bought', 'spent');
        var days = Object.keys(dailyTotals);
        
        if (days.length === 0) return 0;
        
        var total = 0;
        days.forEach(function(day) {
            total += dailyTotals[day];
        });
        
        return Math.round((total / days.length) * 100) / 100;
    }

    /**
     * Get average time spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Average time in seconds per day
     */
    function getAverageTimePerDay(actions) {
        var dailyTotals = groupByDay(actions, 'timed', 'duration');
        var days = Object.keys(dailyTotals);
        
        if (days.length === 0) return 0;
        
        var total = 0;
        days.forEach(function(day) {
            total += dailyTotals[day];
        });
        
        return Math.round(total / days.length);
    }

    /**
     * Convert baseline amount per timeline to amount per day
     * @param {number} amount - The baseline amount
     * @param {string} timeline - 'day', 'week', or 'month'
     * @returns {number} - Amount per day
     */
    function baselineToPerDay(amount, timeline) {
        amount = parseFloat(amount) || 0;
        
        if (timeline === 'day') {
            return amount;
        } else if (timeline === 'week') {
            return amount / 7;
        } else if (timeline === 'month') {
            return amount / 30;
        }
        
        return amount;
    }

    /**
     * Format time duration for brief display (compact)
     * @param {number} seconds - Duration in seconds
     * @returns {string} - Formatted string like "2h 30m" or "45m"
     */
    function formatDurationBrief(seconds) {
        if (seconds < 60) {
            return seconds + 's';
        }
        
        var hours = Math.floor(seconds / 3600);
        var minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return hours + 'h ' + minutes + 'm';
        }
        
        return minutes + 'm';
    }

    // ============================================
    // Milestone Calculation Functions
    // ============================================

    /**
     * Get active behavioral goal for a specific unit type
     * @param {Array} behavioralGoals - Array of behavioral goals
     * @param {string} unit - 'times', 'minutes', or 'dollars'
     * @returns {Object|null} - Active goal or null
     */
    function getActiveGoalForUnit(behavioralGoals, unit) {
        if (!behavioralGoals || !Array.isArray(behavioralGoals)) return null;
        
        return behavioralGoals.find(function(g) {
            return g.status === 'active' && g.type === 'quantitative' && g.unit === unit;
        }) || null;
    }

    /**
     * Calculate milestone schedule for a goal using gradually changing intervals.
     * 
     * The schedule creates milestones that transition from the user's current 
     * frequency to their goal frequency over the completion timeline.
     * 
     * KEY INSIGHT: The number of milestones is DERIVED from:
     * - Goal duration (completionTimeline)
     * - First interval (measurementPeriod / currentAmount)
     * - Last interval (measurementPeriod / goalAmount)
     * - Curve type (affects weighted average of intervals)
     * 
     * Formula: totalMilestones = duration / weightedAverageInterval
     * 
     * This ensures intervals actually match the specified frequencies!
     * 
     * @param {Object} goal - Behavioral goal object
     * @param {Object} options - Optional config {curveType, actionCount, recalculateFromNow}
     * @returns {Array} - Array of milestone objects
     */
    function calculateMilestoneSchedule(goal, options) {
        if (!goal || !goal.createdAt || !goal.completionTimeline) return [];
        
        options = options || {};
        var curveType = options.curveType || 'linear';
        var actionCount = options.actionCount || 0;
        var recalculateFromNow = options.recalculateFromNow || false;
        
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var now = Date.now();
        
        var currentAmount = goal.currentAmount || 0;
        var goalAmount = goal.goalAmount || 0;
        var measurementDays = goal.measurementTimeline || 7;
        var chunkSize = goal.chunkSize || 0;

        // Treat 0 values as 1 for interval calculations (per spec)
        var currentForCalc = Math.max(1, currentAmount);
        var goalForCalc = Math.max(1, goalAmount);

        // Apply chunk size to group milestones (e.g., avg session time for time goals)
        // This converts "minutes per period" to "sessions per period"
        if (chunkSize > 0) {
            currentForCalc = Math.max(1, Math.round(currentForCalc / chunkSize));
            goalForCalc = Math.max(1, Math.round(goalForCalc / chunkSize));
        }

        // Calculate intervals in milliseconds
        // First interval = how often at current rate (e.g., 24/day = 1 per hour)
        // Last interval = how often at goal rate (e.g., 3/day = 1 per 8 hours)
        var measurementPeriodMs = measurementDays * 24 * 60 * 60 * 1000;
        var firstIntervalMs = measurementPeriodMs / currentForCalc;
        var lastIntervalMs = measurementPeriodMs / goalForCalc;
        
        // Calculate full duration for total milestone count
        var fullDurationMs = goalEndMs - goalStartMs;
        
        // DERIVE total milestones from full duration and intervals
        var weightedAvgInterval = calculateWeightedAverageInterval(
            firstIntervalMs, 
            lastIntervalMs, 
            curveType
        );
        
        var originalTotalMilestones = Math.round(fullDurationMs / weightedAvgInterval);
        originalTotalMilestones = Math.max(1, originalTotalMilestones);
        
        // If recalculating based on actions taken
        if (recalculateFromNow && now > goalStartMs && now < goalEndMs) {
            // First, generate the original schedule to find milestone boundaries
            var originalSchedule = generateMilestoneTimestamps(
                goalStartMs,
                goalEndMs,
                originalTotalMilestones,
                firstIntervalMs,
                lastIntervalMs,
                curveType
            );
            
            // Find the last milestone that has passed
            var lastPassedMilestone = null;
            var passedCount = 0;
            for (var i = 0; i < originalSchedule.length; i++) {
                if (originalSchedule[i].timestamp <= now) {
                    lastPassedMilestone = originalSchedule[i];
                    passedCount = i + 1;
                } else {
                    break;
                }
            }
            
            // Calculate start point: use last passed milestone, or goalStart if none passed
            var recalcStartMs = lastPassedMilestone ? lastPassedMilestone.timestamp : goalStartMs;
            
            // Each action consumes a milestone slot
            // Remaining milestones = original total - actions taken
            var remainingMilestones = Math.max(1, originalTotalMilestones - actionCount);
            
            // Calculate what progress we're at based on the milestone boundary
            var timeProgress = (recalcStartMs - goalStartMs) / (goalEndMs - goalStartMs);
            
            // Current interval should be interpolated based on milestone position
            var currentIntervalMs = firstIntervalMs + (lastIntervalMs - firstIntervalMs) * timeProgress;
            
            // Generate milestones from last milestone to goalEnd
            var recalcMilestones = generateMilestoneTimestamps(
                recalcStartMs,
                goalEndMs,
                remainingMilestones,
                currentIntervalMs,
                lastIntervalMs,
                curveType
            );
            
            // Debug: Log recalculated schedule
            if (recalcMilestones.length > 0) {
                console.log('[MilestoneSchedule RECALC] From milestone:', passedCount,
                    '| Remaining:', remainingMilestones,
                    '| Actions:', actionCount,
                    '| Start:', new Date(recalcStartMs).toLocaleTimeString(),
                    '| First interval:', Math.round(recalcMilestones[0].intervalMs / 60000) + 'min');
            }
            
            return recalcMilestones;
        }
        
        // Standard: generate from goalStart to goalEnd
        var milestones = generateMilestoneTimestamps(
            goalStartMs,
            goalEndMs,
            originalTotalMilestones,
            firstIntervalMs,
            lastIntervalMs,
            curveType
        );
        
        // Debug: Log interval breakdown
        if (milestones.length > 0) {
            console.log('[MilestoneSchedule] Curve:', curveType, 
                '| Total:', originalTotalMilestones,
                '| First interval:', Math.round(milestones[0].intervalMs / 60000) + 'min',
                '| Last interval:', Math.round(milestones[milestones.length - 1].intervalMs / 60000) + 'min',
                '| Expected first:', Math.round(firstIntervalMs / 60000) + 'min',
                '| Expected last:', Math.round(lastIntervalMs / 60000) + 'min');
        }
        
        return milestones;
    }
    
    /**
     * Calculate weighted average interval based on curve type.
     * 
     * For linear distribution: avg = (first + last) / 2
     * For power curve (bunched at start): avg is weighted toward first
     * For power-out (bunched at end): avg is weighted toward last
     * 
     * @param {number} firstInterval - First interval duration
     * @param {number} lastInterval - Last interval duration
     * @param {string} curveType - Type of distribution curve
     * @returns {number} - Weighted average interval
     */
    function calculateWeightedAverageInterval(firstInterval, lastInterval, curveType) {
        // For a transition from first to last interval using different curves,
        // we need to calculate the expected average.
        
        // Sample the curve at many points to get accurate average
        var samples = 100;
        var sum = 0;
        
        for (var i = 0; i < samples; i++) {
            var t = i / (samples - 1);
            var curvedT = applyCurve(t, curveType);
            var interval = firstInterval + (lastInterval - firstInterval) * curvedT;
            sum += interval;
        }
        
        return sum / samples;
    }
    
    /**
     * Generate milestone timestamps with gradually changing intervals.
     * 
     * IMPORTANT: Milestones are constrained to fit WITHIN the goal duration.
     * The curve determines how milestones are distributed across the timeline:
     * - Linear: evenly spaced
     * - Power: bunched at start (shorter intervals early, longer late)
     * - Power-out: bunched at end (longer intervals early, shorter late)
     * 
     * @param {number} startMs - Goal start timestamp
     * @param {number} endMs - Goal end timestamp  
     * @param {number} totalMilestones - Number of milestones to generate
     * @param {number} firstIntervalMs - Desired time until first milestone (for weighting)
     * @param {number} lastIntervalMs - Desired interval for final milestones (for weighting)
     * @param {string} curveType - 'linear', 'power', 'power-out', or 'sigmoid'
     * @returns {Array} - Array of milestone objects
     */
    function generateMilestoneTimestamps(startMs, endMs, totalMilestones, firstIntervalMs, lastIntervalMs, curveType) {
        var milestones = [];
        var totalDuration = endMs - startMs;
        
        if (totalMilestones <= 0) return milestones;
        
        // Calculate the weighting ratio from interval preferences
        // If firstInterval is small and lastInterval is large, milestones cluster early
        var intervalRatio = lastIntervalMs / firstIntervalMs;
        
        // Determine curve type based on interval ratio if not specified
        // (intervalRatio > 1 means "do less" - start frequent, end sparse)
        if (!curveType || curveType === 'linear') {
            curveType = intervalRatio > 1 ? 'power' : 'power-out';
        }
        
        // Generate milestone positions using normalized cumulative weights
        // This ensures all milestones fit within the goal duration
        var weights = [];
        var totalWeight = 0;
        
        for (var i = 0; i < totalMilestones; i++) {
            // Progress through milestones (0 to 1)
            var t = i / Math.max(1, totalMilestones - 1);
            
            // Weight is the "interval size" at this point
            // Linear interpolation between first and last interval
            var weight = firstIntervalMs + (lastIntervalMs - firstIntervalMs) * applyCurve(t, curveType);
            weights.push(weight);
            totalWeight += weight;
        }
        
        // Now place milestones proportionally within the duration
        var cumulativeWeight = 0;
        var prevTimestamp = startMs;
        
        for (var i = 0; i < totalMilestones; i++) {
            cumulativeWeight += weights[i];
            
            // Position is proportional to cumulative weight
            var position = cumulativeWeight / totalWeight;
            var timestamp = startMs + (totalDuration * position);
            
            // Calculate actual interval from previous milestone
            var intervalMs = timestamp - prevTimestamp;
            
            milestones.push({
                timestamp: timestamp,
                index: i + 1,
                totalMilestones: totalMilestones,
                intervalMs: intervalMs,
                progress: (i + 1) / totalMilestones
            });
            
            prevTimestamp = timestamp;
        }
        
        return milestones;
    }
    
    /**
     * Apply curve transformation to progress value.
     * 
     * @param {number} t - Progress value from 0 to 1
     * @param {string} curveType - Type of curve to apply
     * @returns {number} - Transformed progress value
     */
    function applyCurve(t, curveType) {
        switch (curveType) {
            case 'power':
                // Power curve (ease-in) - slow start, fast end
                return Math.pow(t, 2);
            case 'power-out':
                // Inverted power curve (ease-out) - fast start, slow end
                return 1 - Math.pow(1 - t, 2);
            case 'sigmoid':
                // Sigmoid curve - slow at both ends, fast in middle
                return 1 / (1 + Math.exp(-10 * (t - 0.5)));
            case 'linear':
            default:
                return t;
        }
    }

    /**
     * Calculate next milestone for a goal based on user actions.
     * 
     * This is DYNAMIC: each action affects the milestone schedule.
     * 
     * DO LESS logic:
     * - Total milestones = your "allowance" for the goal period
     * - Each action "uses up" one milestone from your allowance
     * - Remaining allowance is spread over remaining time using POWER curve
     * - More actions = longer wait time (you've used up your allowance faster)
     * 
     * DO MORE logic:
     * - Each action "earns" a milestone toward your goal
     * - If ahead of schedule, next deadline extends (SIGMOID curve rewards progress)
     * - Doing more than expected = breathing room
     * 
     * @param {Object} goal - Behavioral goal object
     * @param {Array} actions - Array of user actions
     * @param {boolean} isDoLess - Whether this is a "do less" habit
     * @returns {Object|null} - Next milestone info or null if complete
     */
    function calculateNextMilestone(goal, actions, isDoLess) {
        if (!goal) return null;
        
        var now = Date.now();
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        
        // If goal is complete (past end date)
        if (now >= goalEndMs) {
            return { complete: true, message: 'Goal complete!' };
        }
        
        // Get total milestones for this goal
        var totalMilestones = calculateTotalMilestones(goal);
        if (totalMilestones <= 0) return null;
        
        // Get actual action count since goal started
        var goalStartSec = Math.floor(goalStartMs / 1000);
        var actionCount = getActualCountSinceGoalStart(goal, actions, goalStartSec);
        
        // Calculate time progress (0 to 1)
        var totalDurationMs = goalEndMs - goalStartMs;
        var elapsedMs = now - goalStartMs;
        var timeProgress = elapsedMs / totalDurationMs;
        
        // Calculate expected actions at this point (linear baseline)
        var expectedActionsNow = Math.floor(totalMilestones * timeProgress);
        
        if (isDoLess) {
            return calculateDoLessMilestone(
                goal, now, goalStartMs, goalEndMs, 
                totalMilestones, actionCount, expectedActionsNow, timeProgress
            );
        } else {
            return calculateDoMoreMilestone(
                goal, now, goalStartMs, goalEndMs,
                totalMilestones, actionCount, expectedActionsNow, timeProgress
            );
        }
    }
    
    /**
     * Calculate total number of milestones for a goal.
     * Formula: completionPeriods × ((currentAmount + goalAmount) / 2)
     */
    /**
     * Calculate total number of milestones for a goal.
     * 
     * DERIVED from: duration / weightedAverageInterval
     * This ensures the milestone count is consistent with actual interval constraints.
     * 
     * @param {Object} goal - Behavioral goal object
     * @returns {number} - Total number of milestones
     */
    function calculateTotalMilestones(goal) {
        var currentAmount = goal.currentAmount || 0;
        var goalAmount = goal.goalAmount || 0;
        var measurementDays = goal.measurementTimeline || 7;
        var completionDays = goal.completionTimeline || 7;
        var chunkSize = goal.chunkSize || 0;

        // Treat 0 values as 1 for interval calculations
        var currentForCalc = Math.max(1, currentAmount);
        var goalForCalc = Math.max(1, goalAmount);

        // Apply chunk size to group milestones (e.g., avg session time for time goals)
        if (chunkSize > 0) {
            currentForCalc = Math.max(1, Math.round(currentForCalc / chunkSize));
            goalForCalc = Math.max(1, Math.round(goalForCalc / chunkSize));
        }

        // Calculate intervals
        var measurementPeriodMs = measurementDays * 24 * 60 * 60 * 1000;
        var durationMs = completionDays * 24 * 60 * 60 * 1000;
        var firstIntervalMs = measurementPeriodMs / currentForCalc;
        var lastIntervalMs = measurementPeriodMs / goalForCalc;

        // Derive count from duration and weighted average interval
        var curveType = lastIntervalMs > firstIntervalMs ? 'power' : 'power-out';
        var weightedAvgInterval = calculateWeightedAverageInterval(
            firstIntervalMs,
            lastIntervalMs,
            curveType
        );

        var total = Math.round(durationMs / weightedAvgInterval);
        return Math.max(1, total);
    }
    
    /**
     * Calculate next milestone for DO LESS goals.
     * 
     * Key insight: 
     * - The original schedule defines milestone "slots" at specific times
     * - Each action "uses up" one slot from the allowance
     * - When a milestone time passes without action = slot completed (good!)
     * - When action occurs before milestone = slot used (the action consumed it)
     * 
     * The calculation point shifts based on what happened:
     * - If milestone passed without action: recalculate from that milestone's time
     * - If extra actions occurred: spread remaining allowance over remaining time
     * 
     * Uses POWER curve (doing more early = progressively longer waits).
     */
    function calculateDoLessMilestone(goal, now, goalStartMs, goalEndMs, totalMilestones, actionCount, expectedActionsNow, timeProgress) {
        // Get the original milestone schedule to find baseline timing
        var originalSchedule = calculateMilestoneSchedule(goal);
        
        // Find the last milestone that has passed (by time)
        var lastPassedMilestoneIndex = -1;
        var lastPassedMilestoneTime = goalStartMs;
        
        for (var i = 0; i < originalSchedule.length; i++) {
            if (originalSchedule[i].timestamp <= now) {
                lastPassedMilestoneIndex = i;
                lastPassedMilestoneTime = originalSchedule[i].timestamp;
            } else {
                break;
            }
        }
        
        // Count milestones that passed without action (these are COMPLETED for do-less)
        var milestonesPassedByTime = lastPassedMilestoneIndex + 1;
        
        // User's actions "use up" slots. Completed slots = passed by time - used by actions
        // But we need to think of it differently:
        // - Total allowance = totalMilestones  
        // - Used by actions = actionCount
        // - Remaining allowance = totalMilestones - actionCount
        
        var remainingAllowance = totalMilestones - actionCount;
        
        // If user has exceeded their total allowance
        if (remainingAllowance <= 0) {
            return {
                type: 'waitUntil',
                timestamp: goalEndMs,
                actualCount: actionCount,
                totalMilestones: totalMilestones,
                onTrack: false,
                exceeded: true,
                message: 'Allowance exceeded - wait until goal ends'
            };
        }
        
        // Determine if on track: have they done <= expected by now?
        var isOnTrack = actionCount <= expectedActionsNow;
        
        // Calculate the reference point for next milestone:
        // - If on track: use the last passed milestone time as reference
        // - If off track (did more actions): recalculate from NOW
        var referenceTime = isOnTrack ? Math.max(lastPassedMilestoneTime, now) : now;
        var remainingTimeMs = goalEndMs - referenceTime;
        
        // Apply power curve: more actions = steeper curve = longer waits
        // The curve exponent increases based on how far off track
        var excessActions = Math.max(0, actionCount - expectedActionsNow);
        var curveExponent = 1.0 + (excessActions * 0.3); // Gets steeper with more excess
        curveExponent = Math.min(3.0, curveExponent); // Cap at 3.0
        
        // Calculate next interval using power curve
        var nextIntervalMs = calculatePowerCurveInterval(
            remainingTimeMs, 
            remainingAllowance, 
            curveExponent
        );
        
        var nextTimestamp = referenceTime + nextIntervalMs;
        
        // Cap at goal end
        if (nextTimestamp > goalEndMs) {
            nextTimestamp = goalEndMs;
        }
        
        return {
            type: 'waitUntil',
            timestamp: nextTimestamp,
            actualCount: actionCount,
            expectedNow: expectedActionsNow,
            remainingAllowance: remainingAllowance,
            totalMilestones: totalMilestones,
            onTrack: isOnTrack,
            milestoneIndex: actionCount + 1,
            excessActions: excessActions
        };
    }
    
    /**
     * Calculate next milestone for DO MORE goals.
     * 
     * Key insight:
     * - Each action "earns" progress toward your goal
     * - If ahead of schedule, next deadline extends (reward!)
     * - If behind, deadlines get closer (urgency!)
     * 
     * Uses SIGMOID curve (being ahead gives progressively more breathing room).
     */
    function calculateDoMoreMilestone(goal, now, goalStartMs, goalEndMs, totalMilestones, actionCount, expectedActionsNow, timeProgress) {
        // Get original schedule for reference
        var originalSchedule = calculateMilestoneSchedule(goal);
        
        var remainingTimeMs = goalEndMs - now;
        
        // How many more actions needed to complete goal?
        var remainingNeeded = totalMilestones - actionCount;
        
        // If user has completed all required actions
        if (remainingNeeded <= 0) {
            return {
                type: 'doItBy',
                complete: true,
                actualCount: actionCount,
                totalMilestones: totalMilestones,
                onTrack: true,
                message: 'Goal achieved!'
            };
        }
        
        // Determine if on track: have they done >= expected by now?
        var isOnTrack = actionCount >= expectedActionsNow;
        var aheadBy = actionCount - expectedActionsNow;
        
        // Calculate next milestone time using SIGMOID curve
        // Sigmoid: rewards being ahead with more breathing room
        var nextIntervalMs;
        
        if (aheadBy > 0) {
            // User is AHEAD - give them more breathing room
            // Use sigmoid to gradually extend the deadline
            var breathingFactor = 1 + applySigmoidBonus(aheadBy, remainingNeeded);
            nextIntervalMs = (remainingTimeMs / remainingNeeded) * breathingFactor;
        } else {
            // User is BEHIND or on track - spread evenly (with slight urgency if behind)
            var urgencyFactor = isOnTrack ? 1.0 : 0.9; // Slightly shorter intervals if behind
            nextIntervalMs = (remainingTimeMs / remainingNeeded) * urgencyFactor;
        }
        
        var nextTimestamp = now + nextIntervalMs;
        
        // Cap at goal end
        if (nextTimestamp > goalEndMs) {
            nextTimestamp = goalEndMs;
        }
        
        return {
            type: 'doItBy',
            timestamp: nextTimestamp,
            actualCount: actionCount,
            expectedNow: expectedActionsNow,
            remainingNeeded: remainingNeeded,
            totalMilestones: totalMilestones,
            onTrack: isOnTrack,
            aheadBy: Math.max(0, aheadBy),
            milestoneIndex: actionCount + 1
        };
    }
    
    /**
     * Calculate interval using power curve.
     * Higher exponent = steeper curve (longer waits when behind).
     */
    function calculatePowerCurveInterval(remainingTimeMs, remainingSlots, exponent) {
        if (remainingSlots <= 0) return remainingTimeMs;
        
        // Base interval if evenly distributed
        var baseInterval = remainingTimeMs / remainingSlots;
        
        // Apply power curve: first interval is larger
        // This naturally makes the wait longer when you've used more allowance
        var curveFactor = Math.pow(1 / remainingSlots, exponent - 1);
        
        return baseInterval * Math.max(1, curveFactor + 1);
    }
    
    /**
     * Calculate sigmoid bonus for being ahead of schedule.
     * Returns a multiplier (0 to ~0.5) based on how far ahead.
     */
    function applySigmoidBonus(aheadBy, remainingNeeded) {
        if (aheadBy <= 0 || remainingNeeded <= 0) return 0;
        
        // Normalize: how far ahead as proportion of remaining
        var aheadRatio = Math.min(1, aheadBy / Math.max(1, remainingNeeded));
        
        // Sigmoid function centered at 0.3, scaled to max ~0.5 bonus
        var x = (aheadRatio - 0.3) * 10;
        var sigmoid = 1 / (1 + Math.exp(-x));
        
        return sigmoid * 0.5;
    }
    
    /**
     * Get actions since goal start for the relevant unit type.
     */
    function getActionsSinceGoalStart(goal, actions, goalStartSec) {
        if (!actions || !Array.isArray(actions)) return [];
        
        var unit = goal.unit;
        return actions.filter(function(a) {
            if (!a || parseInt(a.timestamp) < goalStartSec) return false;
            
            if (unit === 'times') {
                return a.clickType === 'used' || a.clickType === 'timed';
            } else if (unit === 'minutes') {
                return a.clickType === 'timed' && a.duration;
            } else if (unit === 'dollars') {
                return a.clickType === 'bought' && a.spent;
            }
            return false;
        });
    }
    
    /**
     * Get actual count of actions since goal started
     * @param {Object} goal - Behavioral goal
     * @param {Array} actions - Array of actions
     * @param {number} goalStartSec - Goal start timestamp in seconds
     * @returns {number} - Count of relevant actions
     */
    function getActualCountSinceGoalStart(goal, actions, goalStartSec) {
        if (!actions || !Array.isArray(actions)) return 0;
        
        var count = 0;
        var unit = goal.unit;
        
        // Debug: log what we're looking for
        console.log('[ActionCount] Looking for actions since', goalStartSec, 'for unit:', unit);
        console.log('[ActionCount] Total actions in storage:', actions.length);
        
        actions.forEach(function(a) {
            if (!a) return;
            
            var actionTs = parseInt(a.timestamp);
            
            // Skip actions before goal started
            if (actionTs < goalStartSec) {
                return;
            }
            
            if (unit === 'times') {
                if (a.clickType === 'used' || a.clickType === 'timed') {
                    count++;
                    console.log('[ActionCount] Counted action:', a.clickType, 'at', actionTs);
                }
            } else if (unit === 'minutes') {
                if (a.clickType === 'timed' && a.duration) {
                    count += Math.round(parseInt(a.duration) / 60);
                }
            } else if (unit === 'dollars') {
                if (a.clickType === 'bought' && a.spent) {
                    count += parseFloat(a.spent) || 0;
                }
            }
        });
        
        console.log('[ActionCount] Final count:', count);
        return count;
    }

    /**
     * Format milestone timestamp for display
     * @param {number} timestampMs - Timestamp in milliseconds
     * @returns {string} - Formatted time string
     */
    function formatMilestoneTime(timestampMs) {
        var now = Date.now();
        var diffMs = timestampMs - now;
        
        if (diffMs <= 0) {
            return 'Now';
        }
        
        var diffSec = Math.floor(diffMs / 1000);
        var diffMin = Math.floor(diffSec / 60);
        var diffHour = Math.floor(diffMin / 60);
        var diffDay = Math.floor(diffHour / 24);
        
        if (diffDay > 0) {
            var remainingHours = diffHour % 24;
            return diffDay + 'd ' + remainingHours + 'h';
        } else if (diffHour > 0) {
            var remainingMins = diffMin % 60;
            return diffHour + 'h ' + remainingMins + 'm';
        } else if (diffMin > 0) {
            return diffMin + 'm';
        } else {
            return diffSec + 's';
        }
    }

    /**
     * Format milestone as clock time (e.g., "3:45 PM")
     * @param {number} timestampMs - Timestamp in milliseconds
     * @returns {string} - Formatted clock time
     */
    function formatMilestoneClockTime(timestampMs) {
        var date = new Date(timestampMs);
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        return hours + ':' + minutes + ampm;
    }

    /**
     * Get allotted amount per period for a goal
     * @param {Object} goal - Behavioral goal
     * @returns {number} - Allotted amount per measurement period
     */
    function getAllottedPerPeriod(goal) {
        return goal.goalAmount || 0;
    }

    /**
     * Get current period's actual amount vs allotted for time-based milestone
     * @param {Object} goal - Behavioral goal
     * @param {Array} actions - Array of actions
     * @returns {Object} - {current, allotted, unit}
     */
    function getTimeAllotmentStatus(goal, actions) {
        if (!goal) return null;
        
        var periodStart = getStartOfPeriod(
            goal.measurementTimeline === 1 ? 'day' : 
            goal.measurementTimeline === 7 ? 'week' : 'month'
        );
        
        var current = 0;
        var unit = goal.unit;
        
        actions.forEach(function(a) {
            if (!a || parseInt(a.timestamp) < periodStart) return;
            
            if (unit === 'minutes' && a.clickType === 'timed' && a.duration) {
                current += Math.round(parseInt(a.duration) / 60);
            } else if (unit === 'dollars' && a.clickType === 'bought' && a.spent) {
                current += parseFloat(a.spent) || 0;
            }
        });
        
        return {
            current: Math.round(current),
            allotted: goal.goalAmount,
            unit: unit
        };
    }

    // Public API
    return {
        // Legacy stats functions
        segregatedTimeRange: segregatedTimeRange,
        midnightOfTimestamp: midnightOfTimestamp,
        calculateMaxReportHeight: calculateMaxReportHeight,
        percentChangedBetween: percentChangedBetween,
        timestampToShortHandDate: timestampToShortHandDate,
        convertSecondsToDateFormat: convertSecondsToDateFormat,
        calculateResistStreak: calculateResistStreak,
        calculateAverageTimeBetween: calculateAverageTimeBetween,
        calculateLongestWaitFromSet: calculateLongestWaitFromSet,
        calculateLongestGoalFromSet: calculateLongestGoalFromSet, // backward compat alias

        // Brief stats calculation functions
        getStartOfPeriod: getStartOfPeriod,
        getCurrentResistStreak: getCurrentResistStreak,
        getCountForPeriod: getCountForPeriod,
        getAmountSpentForPeriod: getAmountSpentForPeriod,
        getTimeSpentForPeriod: getTimeSpentForPeriod,
        groupByDay: groupByDay,
        getBestCountPerDay: getBestCountPerDay,
        getBestAmountPerDay: getBestAmountPerDay,
        getBestTimePerDay: getBestTimePerDay,
        getAverageCountPerDay: getAverageCountPerDay,
        getAverageAmountPerDay: getAverageAmountPerDay,
        getAverageTimePerDay: getAverageTimePerDay,
        baselineToPerDay: baselineToPerDay,
        formatDurationBrief: formatDurationBrief,
        
        // Milestone calculation functions
        getActiveGoalForUnit: getActiveGoalForUnit,
        calculateMilestoneSchedule: calculateMilestoneSchedule,
        calculateNextMilestone: calculateNextMilestone,
        calculateTotalMilestones: calculateTotalMilestones,
        formatMilestoneTime: formatMilestoneTime,
        formatMilestoneClockTime: formatMilestoneClockTime,
        getAllottedPerPeriod: getAllottedPerPeriod,
        getTimeAllotmentStatus: getTimeAllotmentStatus,
        getActualCountSinceGoalStart: getActualCountSinceGoalStart
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCalculationsModule;
} else {
    window.StatsCalculationsModule = StatsCalculationsModule;
}
