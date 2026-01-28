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
     * Calculate milestone schedule for a goal
     * Milestones are evenly distributed between goal start and end
     * @param {Object} goal - Behavioral goal object
     * @returns {Array} - Array of milestone objects with {timestamp, targetAmount, index}
     */
    function calculateMilestoneSchedule(goal) {
        if (!goal || !goal.createdAt || !goal.completionTimeline) return [];
        
        var goalStartMs = goal.createdAt;
        var goalEndMs = goalStartMs + (goal.completionTimeline * 24 * 60 * 60 * 1000);
        var totalDurationMs = goalEndMs - goalStartMs;
        
        var currentAmount = goal.currentAmount || 0;
        var goalAmount = goal.goalAmount || 0;
        var measurementDays = goal.measurementTimeline || 7;
        
        // Calculate total actions over the goal period
        var periodsInGoal = goal.completionTimeline / measurementDays;
        var startingTotal = currentAmount * periodsInGoal;
        var goalTotal = goalAmount * periodsInGoal;
        
        // Number of milestones = number of measurement periods
        var numMilestones = Math.max(1, Math.ceil(periodsInGoal));
        var milestones = [];
        
        for (var i = 1; i <= numMilestones; i++) {
            var progress = i / numMilestones;
            var milestoneTimestamp = goalStartMs + (totalDurationMs * progress);
            
            // Linear interpolation from startingTotal to goalTotal
            var targetAmount = Math.round(startingTotal + (goalTotal - startingTotal) * progress);
            
            milestones.push({
                timestamp: milestoneTimestamp,
                targetAmount: targetAmount,
                index: i,
                totalMilestones: numMilestones,
                progress: progress
            });
        }
        
        return milestones;
    }

    /**
     * Calculate next milestone for a goal using FIXED milestone schedule
     * 
     * Milestones are permanent targets calculated from goal start → goal end.
     * They do NOT shift based on current time.
     * 
     * If user violates a milestone (do-more: misses deadline, do-less: acts too early),
     * we recalculate ONLY from the violated milestone timestamp to goal end.
     * 
     * @param {Object} goal - Behavioral goal object
     * @param {Array} actions - Array of actions
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
        
        // Get the FIXED milestone schedule (never changes based on progress)
        var schedule = calculateMilestoneSchedule(goal);
        if (!schedule || schedule.length === 0) return null;
        
        // Get actual count since goal started
        var goalStartSec = Math.floor(goalStartMs / 1000);
        var actualCount = getActualCountSinceGoalStart(goal, actions, goalStartSec);
        
        console.log('[Milestone] Schedule:', schedule);
        console.log('[Milestone] Actual count:', actualCount, 'isDoLess:', isDoLess);
        
        // Find the next milestone in time (we haven't passed it yet)
        var nextMilestoneIndex = -1;
        for (var i = 0; i < schedule.length; i++) {
            if (now < schedule[i].timestamp) {
                nextMilestoneIndex = i;
                break;
            }
        }
        
        // If all milestones are in the past, goal period is complete
        if (nextMilestoneIndex === -1) {
            return { complete: true, message: 'All milestones passed' };
        }
        
        var nextMilestone = schedule[nextMilestoneIndex];
        
        // Check previous milestone to see if user is on track
        // For milestone 0, compare against starting point (0 actions expected at goal start)
        var previousExpected = nextMilestoneIndex > 0 
            ? schedule[nextMilestoneIndex - 1].targetAmount 
            : 0;
        
        // Determine if user is on track
        var isOnTrack;
        if (isDoLess) {
            // Do-less: user should have done <= expected by now
            isOnTrack = actualCount <= previousExpected || 
                       (nextMilestoneIndex === 0 && actualCount === 0);
        } else {
            // Do-more: user should have done >= expected by now
            isOnTrack = actualCount >= previousExpected;
        }
        
        console.log('[Milestone] Next milestone index:', nextMilestoneIndex);
        console.log('[Milestone] Previous expected:', previousExpected, 'On track:', isOnTrack);
        
        if (isOnTrack) {
            // ON TRACK: Return the fixed milestone from the original schedule
            return {
                type: isDoLess ? 'waitUntil' : 'doItBy',
                timestamp: nextMilestone.timestamp,
                targetAmount: nextMilestone.targetAmount,
                actualCount: actualCount,
                milestoneIndex: nextMilestoneIndex + 1,
                totalMilestones: schedule.length,
                onTrack: true
            };
        } else {
            // OFF TRACK: Recalculate from the violated milestone point to goal end
            // Use the PREVIOUS milestone timestamp as the recalculation start point
            var recalcStartMs = nextMilestoneIndex > 0 
                ? schedule[nextMilestoneIndex - 1].timestamp 
                : goalStartMs;
            
            return calculateCatchUpMilestone(
                goal, 
                actualCount, 
                recalcStartMs, 
                goalEndMs, 
                schedule.length - nextMilestoneIndex, // remaining milestones
                isDoLess
            );
        }
    }
    
    /**
     * Calculate catch-up milestone when user is off track
     * Redistributes remaining work from violation point to goal end
     * 
     * @param {Object} goal - Behavioral goal
     * @param {number} actualCount - Current actual count
     * @param {number} violationStartMs - Timestamp when violation occurred
     * @param {number} goalEndMs - Goal end timestamp
     * @param {number} remainingMilestones - Number of milestones left
     * @param {boolean} isDoLess - Whether this is a "do less" habit
     * @returns {Object} - Catch-up milestone info
     */
    function calculateCatchUpMilestone(goal, actualCount, violationStartMs, goalEndMs, remainingMilestones, isDoLess) {
        var now = Date.now();
        var periodsInGoal = goal.completionTimeline / (goal.measurementTimeline || 7);
        var goalTotal = (goal.goalAmount || 0) * periodsInGoal;
        
        // Remaining work to reach goal
        var remainingActions = goalTotal - actualCount;
        var remainingMs = goalEndMs - violationStartMs;
        
        console.log('[Milestone] CATCH-UP: Remaining actions:', remainingActions, 'from', new Date(violationStartMs));
        
        if (isDoLess) {
            // Do-less catch-up: User did too many actions
            // Calculate when they can next act based on remaining time/actions
            if (remainingActions <= 0) {
                // Exceeded limit - must wait until goal ends
                return {
                    type: 'waitUntil',
                    timestamp: goalEndMs,
                    actualCount: actualCount,
                    onTrack: false,
                    exceeded: true,
                    message: 'Limit exceeded - wait until goal ends'
                };
            }
            
            // Recalculate interval: spread remaining actions over remaining time
            var msPerAction = remainingMs / remainingActions;
            // Next allowed action is from violation point + one interval
            var nextAllowedMs = violationStartMs + msPerAction;
            
            // If next allowed is in the past, calculate from now
            if (nextAllowedMs < now) {
                var actionsUsedSinceViolation = Math.floor((now - violationStartMs) / msPerAction);
                nextAllowedMs = violationStartMs + ((actionsUsedSinceViolation + 1) * msPerAction);
            }
            
            if (nextAllowedMs > goalEndMs) {
                nextAllowedMs = goalEndMs;
            }
            
            return {
                type: 'waitUntil',
                timestamp: nextAllowedMs,
                actualCount: actualCount,
                targetAmount: goalTotal,
                onTrack: false,
                catchUp: true
            };
        } else {
            // Do-more catch-up: User hasn't done enough actions
            // Calculate new deadline to get back on track
            if (remainingActions <= 0) {
                // Already hit goal
                return {
                    complete: true,
                    message: 'Goal achieved!'
                };
            }
            
            // Recalculate interval: spread remaining actions over remaining time
            var msPerAction = remainingMs / remainingActions;
            // Next required action is from now (urgency!)
            var nextRequiredMs = now + msPerAction;
            
            if (nextRequiredMs > goalEndMs) {
                nextRequiredMs = goalEndMs;
            }
            
            return {
                type: 'doItBy',
                timestamp: nextRequiredMs,
                actualCount: actualCount,
                targetAmount: goalTotal,
                onTrack: false,
                catchUp: true
            };
        }
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
        
        actions.forEach(function(a) {
            if (!a || parseInt(a.timestamp) < goalStartSec) return;
            
            if (unit === 'times') {
                if (a.clickType === 'used' || a.clickType === 'timed') {
                    count++;
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
        formatMilestoneTime: formatMilestoneTime,
        formatMilestoneClockTime: formatMilestoneClockTime,
        getAllottedPerPeriod: getAllottedPerPeriod,
        getTimeAllotmentStatus: getTimeAllotmentStatus
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCalculationsModule;
} else {
    window.StatsCalculationsModule = StatsCalculationsModule;
}
