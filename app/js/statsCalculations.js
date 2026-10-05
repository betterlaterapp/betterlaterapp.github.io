/**
 * StatsCalculationsModule - Pure calculation functions for statistics
 * No DOM manipulation, no side effects - just data in, data out
 */
var StatsCalculationsModule = (function () {
    var DAY_MS = 24 * 60 * 60 * 1000;

    // "Did it" entries this close together (seconds, measured from the end of
    // the previous entry) belong to the same session, e.g. pushups then situps.
    var SESSION_GAP_SECONDS = 60 * 60;

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
        var sorted = actions.filter(function(a) {
            return a && (a.clickType === 'craved' || isDidItAction(a));
        }).sort(function(a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });

        var longest = 0;
        var streak = 0;
        sorted.forEach(function(action) {
            streak = action.clickType === 'craved' ? streak + 1 : 0;
            if (streak > longest) longest = streak;
        });

        return longest;
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
            return a && (a.clickType === 'craved' || isDidItAction(a));
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
        var matching = actions.filter(isDidItAction);
        if (matching.length === 0) return 0;
        return Math.round(matching.length / getDaysSinceFirst(matching));
    }

    /**
     * Get average amount spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Average amount per day (rounded to 2 decimals)
     */
    function getAverageAmountPerDay(actions) {
        var matching = actions.filter(function(a) { return a && a.clickType === 'bought'; });
        if (matching.length === 0) return 0;
        var total = matching.reduce(function(sum, a) { return sum + (parseFloat(a.spent) || 0); }, 0);
        return Math.round((total / getDaysSinceFirst(matching)) * 100) / 100;
    }

    /**
     * Get average time spent per day from history
     * @param {Array} actions - Array of all actions
     * @returns {number} - Average time in seconds per day
     */
    function getAverageTimePerDay(actions) {
        var matching = actions.filter(function(a) { return a && a.clickType === 'timed'; });
        if (matching.length === 0) return 0;
        var total = matching.reduce(function(sum, a) { return sum + (parseInt(a.duration) || 0); }, 0);
        return Math.round(total / getDaysSinceFirst(matching));
    }

    /**
     * Calendar days from the earliest action's day through today (inclusive),
     * so averages include the days nothing was logged.
     * @param {Array} actions - Non-empty array of actions
     * @returns {number} - At least 1
     */
    function getDaysSinceFirst(actions) {
        var first = Math.min.apply(null, actions.map(function(a) { return parseInt(a.timestamp); }));
        var firstDay = new Date(first * 1000);
        firstDay.setHours(0, 0, 0, 0);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.max(1, Math.round((today - firstDay) / DAY_MS) + 1);
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
     * Size of one milestone in the goal's unit (e.g. 1 time, 60 minutes, $15).
     * Spending goals without an explicit chunk get one sized to roughly one
     * milestone per day at the larger rate, so $100/week isn't 100 milestones.
     * @param {Object} goal - Behavioral goal object
     * @returns {number} - Goal units per milestone
     */
    function getMilestoneUnitSize(goal) {
        if (goal.chunkSize > 0) return goal.chunkSize;
        if (goal.unit === 'minutes') return 60;
        if (goal.unit === 'dollars') {
            var larger = Math.max(goal.currentAmount || 0, goal.goalAmount || 0);
            return Math.max(1, Math.round(larger / (goal.measurementTimeline || 7)));
        }
        return 1;
    }

    /**
     * Target rate (milestones per measurement period) for one step of the plan.
     *
     * Increasing: rises linearly in equal steps (progressive overload), so the
     * first step is already one step above the current amount.
     * Decreasing: falls by a constant percentage each step (taper), so the
     * absolute cuts get smaller as the amount gets smaller. A taper to zero
     * runs down to 1 per period, then the final step is zero.
     */
    function getStepRate(startRate, endRate, step, stepCount) {
        if (endRate >= startRate) {
            return startRate + (endRate - startRate) * (step / stepCount);
        }
        if (endRate > 0) {
            return startRate * Math.pow(endRate / startRate, step / stepCount);
        }
        if (step === stepCount) return 0;
        var floorRate = Math.min(1, startRate);
        return startRate * Math.pow(floorRate / startRate, step / (stepCount - 1));
    }

    /**
     * Break a goal into steps. Goals of 2+ weeks step weekly; shorter goals
     * step daily so they still ramp instead of jumping straight to the target.
     * @param {Object} goal - Behavioral goal object
     * @returns {Array} - [{startDay, endDay, rate}] with rate in milestones per measurement period
     */
    function getGoalStepPlan(goal) {
        var unitSize = getMilestoneUnitSize(goal);
        var startRate = (goal.currentAmount || 0) / unitSize;
        var endRate = (goal.goalAmount || 0) / unitSize;
        var totalDays = goal.completionTimeline;
        var stepDays = totalDays >= 14 ? 7 : 1;
        var stepCount = Math.ceil(totalDays / stepDays);

        var steps = [];
        for (var k = 1; k <= stepCount; k++) {
            steps.push({
                startDay: (k - 1) * stepDays,
                endDay: Math.min(totalDays, k * stepDays),
                rate: getStepRate(startRate, endRate, k, stepCount)
            });
        }
        return steps;
    }

    /**
     * Calculate the milestone schedule for a goal. This is the single source of
     * truth for milestone timing and count.
     *
     * Each step contributes rate × stepLength milestones, spread evenly across
     * the step. Cumulative totals are rounded so fractional rates carry into
     * later steps instead of being lost.
     *
     * @param {Object} goal - Behavioral goal object
     * @returns {Array} - Milestones {timestamp, index, totalMilestones, intervalMs, progress, stepIndex}
     */
    function calculateMilestoneSchedule(goal) {
        if (!goal || !goal.createdAt || !goal.completionTimeline) return [];

        var measurementDays = goal.measurementTimeline || 7;
        var milestones = [];
        var expectedSoFar = 0;

        getGoalStepPlan(goal).forEach(function(step, stepIndex) {
            var stepDays = step.endDay - step.startDay;
            var stepStartMs = goal.createdAt + step.startDay * DAY_MS;
            var expectedAfter = expectedSoFar + step.rate * stepDays / measurementDays;
            var count = Math.round(expectedAfter) - Math.round(expectedSoFar);

            for (var j = 1; j <= count; j++) {
                milestones.push({
                    timestamp: stepStartMs + (stepDays * DAY_MS) * (j / count),
                    stepIndex: stepIndex
                });
            }
            expectedSoFar = expectedAfter;
        });

        var prevTimestamp = goal.createdAt;
        milestones.forEach(function(m, i) {
            m.index = i + 1;
            m.totalMilestones = milestones.length;
            m.progress = (i + 1) / milestones.length;
            m.intervalMs = m.timestamp - prevTimestamp;
            prevTimestamp = m.timestamp;
        });

        return milestones;
    }

    /**
     * Total number of milestones in a goal's schedule.
     * @param {Object} goal - Behavioral goal object
     * @returns {number}
     */
    function calculateTotalMilestones(goal) {
        return calculateMilestoneSchedule(goal).length;
    }

    /**
     * How many milestones an action is worth for a goal (0 if it doesn't count).
     * @param {Object} goal - Behavioral goal object
     * @param {Object} action - Action from the action log
     * @returns {number} - Possibly fractional milestone units
     */
    function getActionMilestoneUnits(goal, action) {
        if (!action) return 0;
        var unitSize = getMilestoneUnitSize(goal);
        if (goal.unit === 'times') {
            return (action.clickType === 'used' || action.clickType === 'timed') ? 1 / unitSize : 0;
        } else if (goal.unit === 'minutes') {
            return (action.clickType === 'timed' && action.duration) ? (parseInt(action.duration) / 60) / unitSize : 0;
        } else if (goal.unit === 'dollars') {
            return (action.clickType === 'bought' && action.spent) ? (parseFloat(action.spent) || 0) / unitSize : 0;
        }
        return 0;
    }

    /**
     * Whole milestones' worth of actions since the goal started.
     * @param {Object} goal - Behavioral goal
     * @param {Array} actions - Array of actions
     * @param {number} goalStartSec - Goal start timestamp in seconds
     * @returns {number}
     */
    function getActualCountSinceGoalStart(goal, actions, goalStartSec) {
        if (!actions || !Array.isArray(actions)) return 0;

        var units = 0;
        actions.forEach(function(a) {
            if (!a || parseInt(a.timestamp) < goalStartSec) return;
            units += getActionMilestoneUnits(goal, a);
        });
        return Math.floor(units + 1e-9);
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

    /**
     * Calculate the average time gap between consecutive actions (all-time).
     * @param {Array} actions - Array of actions with a timestamp field
     * @returns {number} - Average gap in seconds, or 0 if fewer than 2 actions
     */
    function getAverageTimeBetweenActions(actions) {
        if (!actions || actions.length < 2) return 0;
        var sorted = actions.slice().sort(function (a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });
        var first = parseInt(sorted[0].timestamp);
        var last = parseInt(sorted[sorted.length - 1].timestamp);
        return Math.round((last - first) / (sorted.length - 1));
    }

    /**
     * Calculate the longest single gap between consecutive actions.
     * @param {Array} actions - Array of actions with a timestamp field
     * @returns {number} - Longest gap in seconds, or 0 if fewer than 2 actions
     */
    function getBestTimeBetweenActions(actions) {
        if (!actions || actions.length < 2) return 0;
        var sorted = actions.slice().sort(function (a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });
        var best = 0;
        for (var i = 1; i < sorted.length; i++) {
            var gap = parseInt(sorted[i].timestamp) - parseInt(sorted[i - 1].timestamp);
            if (gap > best) best = gap;
        }
        return best;
    }

    // ============================================
    // Sessions (several "did it" entries done together)
    // ============================================

    /**
     * Whether an action is a "did it" entry (plain or timed)
     */
    function isDidItAction(action) {
        return !!action && (action.clickType === 'used' || action.clickType === 'timed');
    }

    /**
     * What kind of thing an entry was: its unit if it has one ("pushups"),
     * otherwise "timed" for timer entries or "times" for plain ones.
     */
    function getEntryType(action) {
        if (action.unit) return String(action.unit);
        return action.clickType === 'timed' ? 'timed' : 'times';
    }

    /**
     * Amount an entry represents in its own unit (1 when no amount was given).
     */
    function getEntryAmount(action) {
        return parseFloat(action.amount) || 1;
    }

    /**
     * Group "did it" entries into sessions: entries starting within
     * SESSION_GAP_SECONDS of the previous entry's end are one session.
     * @param {Array} actions - Array of actions (any types; non-"did it" are ignored)
     * @returns {Array} - [{start, end, entries}] oldest first, times in seconds
     */
    function groupIntoSessions(actions) {
        var entries = actions.filter(isDidItAction).sort(function(a, b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp);
        });

        var sessions = [];
        entries.forEach(function(entry) {
            var start = parseInt(entry.timestamp);
            var end = start + (entry.clickType === 'timed' ? (parseInt(entry.duration) || 0) : 0);
            var current = sessions[sessions.length - 1];
            if (current && start - current.end <= SESSION_GAP_SECONDS) {
                current.entries.push(entry);
                current.end = Math.max(current.end, end);
            } else {
                sessions.push({ start: start, end: end, entries: [entry] });
            }
        });
        return sessions;
    }

    /**
     * Typical amount per session for each entry type (median across sessions
     * that included it), so different exercises can share one chart scale.
     * @param {Array} sessions - From groupIntoSessions
     * @returns {Object} - {type: typicalAmount}
     */
    function getTypicalAmountPerSession(sessions) {
        var perType = {};
        sessions.forEach(function(session) {
            var sums = {};
            session.entries.forEach(function(entry) {
                var type = getEntryType(entry);
                sums[type] = (sums[type] || 0) + getEntryAmount(entry);
            });
            Object.keys(sums).forEach(function(type) {
                (perType[type] = perType[type] || []).push(sums[type]);
            });
        });

        var typical = {};
        Object.keys(perType).forEach(function(type) {
            var sorted = perType[type].sort(function(a, b) { return a - b; });
            var mid = Math.floor(sorted.length / 2);
            typical[type] = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        });
        return typical;
    }

    /**
     * Seconds between sessions that keeps a steady habit going ("do more").
     * Prefers the active goal's current weekly step, then the user's own
     * recent rhythm (median gap of their last 6 sessions), then their baseline.
     * @param {Array} sessions - From groupIntoSessions
     * @param {Object} baseline - Baseline settings
     * @param {Object|null} goal - Active quantitative goal for times/minutes, if any
     * @param {number} nowSec - Current time in seconds
     * @returns {number|null}
     */
    function getSteadyHabitGapSeconds(sessions, baseline, goal, nowSec) {
        if (goal && goal.createdAt) {
            var dayOfGoal = (nowSec * 1000 - goal.createdAt) / DAY_MS;
            var step = getGoalStepPlan(goal).find(function(s) {
                return dayOfGoal >= s.startDay && dayOfGoal < s.endDay;
            });
            if (step && step.rate > 0) {
                var sessionsPerPeriod = goal.unit === 'times' ? step.rate * getMilestoneUnitSize(goal) : step.rate;
                return Math.round((goal.measurementTimeline || 7) * 86400 / sessionsPerPeriod);
            }
        }

        if (sessions.length >= 2) {
            var recent = sessions.slice(-6);
            var gaps = [];
            for (var i = 1; i < recent.length; i++) {
                gaps.push(recent[i].start - recent[i - 1].end);
            }
            gaps.sort(function(a, b) { return a - b; });
            var mid = Math.floor(gaps.length / 2);
            return gaps.length % 2 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2);
        }

        var timesDone = parseFloat(baseline && baseline.timesDone) || 0;
        if (timesDone > 0) {
            var periodDays = { day: 1, week: 7, month: 30 }[baseline.usageTimeline] || 7;
            return Math.round(periodDays * 86400 / timesDone);
        }
        return null;
    }

    /**
     * When the next session is due to keep a steady habit ("do more").
     * @returns {number|null} - Unix seconds, or null if there's nothing to go on
     */
    function getDoBeforeTimestamp(actions, baseline, goal, nowSec) {
        var sessions = groupIntoSessions(actions);
        if (sessions.length === 0) return null;
        var gap = getSteadyHabitGapSeconds(sessions, baseline, goal, nowSec);
        if (gap === null) return null;
        return sessions[sessions.length - 1].end + gap;
    }

    // ============================================
    // Report buckets
    // ============================================

    /**
     * Calendar-aligned bucket boundaries for a report ending on the day that
     * contains endStampSec: 24 hours for 'day', 7 or 30 days otherwise.
     * Built from local dates, so daylight-saving days stay aligned.
     * @param {string} period - 'day', 'week', or 'month'
     * @param {number} endStampSec - Any time on the report's last day
     * @returns {Array} - Boundaries in seconds (buckets + 1 entries)
     */
    function getReportBucketEdges(period, endStampSec) {
        var lastDay = new Date(endStampSec * 1000);
        lastDay.setHours(0, 0, 0, 0);
        var edges = [];

        if (period === 'day') {
            for (var hour = 0; hour <= 24; hour++) {
                var h = new Date(lastDay);
                h.setHours(hour);
                edges.push(Math.floor(h.getTime() / 1000));
            }
        } else {
            var days = period === 'month' ? 30 : 7;
            for (var i = days - 1; i >= -1; i--) {
                var d = new Date(lastDay);
                d.setDate(d.getDate() - i);
                edges.push(Math.floor(d.getTime() / 1000));
            }
        }
        return edges;
    }

    /**
     * Noon on the day containing a timestamp. Report navigation steps from
     * noon so adding or subtracting whole days never crosses a day boundary.
     */
    function noonOfTimestamp(timestampSec) {
        var d = new Date(timestampSec * 1000);
        d.setHours(12, 0, 0, 0);
        return Math.floor(d.getTime() / 1000);
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
        getMilestoneUnitSize: getMilestoneUnitSize,
        getGoalStepPlan: getGoalStepPlan,
        calculateMilestoneSchedule: calculateMilestoneSchedule,
        calculateTotalMilestones: calculateTotalMilestones,
        getActionMilestoneUnits: getActionMilestoneUnits,
        formatMilestoneTime: formatMilestoneTime,
        formatMilestoneClockTime: formatMilestoneClockTime,
        getAllottedPerPeriod: getAllottedPerPeriod,
        getTimeAllotmentStatus: getTimeAllotmentStatus,
        getActualCountSinceGoalStart: getActualCountSinceGoalStart,

        // Time-between helpers
        getAverageTimeBetweenActions: getAverageTimeBetweenActions,
        getBestTimeBetweenActions: getBestTimeBetweenActions,

        // Sessions
        isDidItAction: isDidItAction,
        getEntryType: getEntryType,
        getEntryAmount: getEntryAmount,
        groupIntoSessions: groupIntoSessions,
        getTypicalAmountPerSession: getTypicalAmountPerSession,
        getDoBeforeTimestamp: getDoBeforeTimestamp,

        // Report buckets
        getReportBucketEdges: getReportBucketEdges,
        noonOfTimestamp: noonOfTimestamp
    };
})();

// Make the module available globally
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsCalculationsModule;
} else {
    window.StatsCalculationsModule = StatsCalculationsModule;
}
